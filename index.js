import { setTimeout as wait } from 'node:timers/promises'
import Channel                from '@superhero/tcp-record-channel'
import IdNameGenerator        from '@superhero/id-name-generator'
import Log                    from '@superhero/log'
import deepmerge              from '@superhero/deep/merge'
import deepassign             from '@superhero/deep/assign'
import CertificatesManager    from '@superhero/eventflow-certificates'
import HubsManager            from '@superhero/eventflow-spoke/manager/hubs'
import ListenersManager       from '@superhero/eventflow-spoke/manager/listeners'

export function locate(locator)
{
  const
    config = locator.config.find('eventflow/spoke'),
    db     = locator.locate('@superhero/eventflow-db')

  return new Spoke(config, db)
}

/**
 * @memberof Eventflow
 */
export default class Spoke
{
  #spokeID

  idNameGenerator = new IdNameGenerator()
  abortion        = new AbortController()
  channel         = new Channel()
  hubs            = new HubsManager()
  subscriptions   = new ListenersManager()
  consumers       = new ListenersManager()

  get spokeID()
  {
    return this.#spokeID
  }

  constructor(config, db)
  {
    if('string' !== typeof config.NAME
    || 0 === config.NAME.length
    || (/[^a-z0-9\-\.]/i).test(config.NAME))
    {
      const error = new Error(`invalid config.NAME (${config.NAME})`)
      error.code  = 'E_EVENTFLOW_HUB_INVALID_CONFIG_NAME'
      throw error
    }

    this.#spokeID     = (new IdNameGenerator().generateId() + '.' + config.NAME).toUpperCase()
    this.config       = config
    this.db           = db
    this.log          = new Log({ label: `[${config.NAME}]` })
    this.certificates = new CertificatesManager(config.NAME, this.#spokeID, config.certificates, db, this.log)

    this.channel.on('record', this.#onRecord.bind(this))
  }

  async bootstrap()
  {
    await this.#pollOnlineHubs()
  }

  async destroy()
  {
    const reason = new Error('hub is destroyed')
    reason.code  = 'E_EVENTFLOW_HUB_DESTROYED'

    this.abortion.abort(reason)

    for(const socket of this.hubs.all)
    {
      socket.end()
    }

    this.hubs.destroy()
    this.log.warn`destroyed`
    // setTimeout(() => this.db.close(), 5000)
  }

  async #pollOnlineHubs()
  {
    if(this.abortion.signal.aborted)
    {
      return
    }

    this.log.warn`polling for online hubs`

    const hubs = await this.db.readOnlineHubs()

    for(const hub of hubs)
    {
      await this.#connectToHub(hub)
    }

    if(this.hubs.size)
    {
      this.log.info`polling for online hubs completed`
    }
    else
    {
      await wait(3e3)
      await this.#pollOnlineHubs()
    }
  }

  async #connectToHub({ id:hubID, external_ip:hubIP, external_port:hubPort })
  {
    if(this.abortion.signal.aborted)
    {
      return
    }

    try
    {
      if(this.hubs.hasSocket(hubIP, hubPort))
      {
        const error = new Error('already connected to hub')
        error.code  = 'E_EVENTFLOW_SPOKE_ALREADY_CONNECTED_TO_HUB'
        reject(error)
      }
      else
      {
        this.log.info`connecting to hub ${hubID} › ${hubIP}:${hubPort}`

        const
          rootCA          = await this.certificates.root,
          spokeICA        = await this.certificates.intermediate,
          spokeLeaf       = await this.certificates.leaf,
          ca              = rootCA.cert,
          certChain       = spokeLeaf.cert + spokeICA.cert,
          dynamicConfig   = { servername:hubID, host:hubIP, port:hubPort, ca, cert:certChain, key:spokeLeaf.key, passphrase:spokeLeaf.pass },
          peerHubConfig   = deepmerge(dynamicConfig, this.config.TCP_SOCKET_CLIENT_OPTIONS),
          hub             = await this.channel.createTlsClient(peerHubConfig)

        hub.id = hubID
        this.hubs.add(hubIP, hubPort, hub)
        hub.on('close', this.#onHubDisconnected .bind(this, hub))
        hub.on('error', this.#onHubError        .bind(this, hub))
        this.log.info`connected to hub ${hubID} › ${hubIP}:${hubPort}`
      }
    }
    catch(error)
    {
      switch(error.code)
      {
        case 'E_EVENTFLOW_SPOKE_ALREADY_CONNECTED_TO_HUB':
        {
          this.log.warn`already connected to hub ${hubID} › ${hubIP}:${hubPort}`
          break
        }
        default:
        {
          const message = `failed to connect to hub ${hubID} › ${hubIP}:${hubPort} [${error.code}] ${error.message}`
          this.log.fail`failed to connect to hub ${hubID} › ${hubIP}:${hubPort} [${error.code}] ${error.message}`
          await this.db.persistLog({ agent:this.#spokeID, message, error })
        }
      }
    }
  }

  /**
   * @see @superhero/tcp-record-channel
   * @param {String[]} record The unit seperated record
   * @param {node:tls.TLSSocket} hub A hub tls socket
   */
  async #onRecord([ event, ...args ], hub)
  {
    switch(event)
    {
      case 'online'  : return this.#onHubOnlineMessage  (hub, ...args)
      case 'publish' : return this.#onHubPublishMessage (hub, ...args)
      // only recognize the above listed events
      default: this.log.fail`observed invalid message ${event} from hub ${hub.id}`
    }
  }

  async #onHubError(hub, error)
  {
    const message = `hub socket error ${hub.id} [${error.code}] ${error.message}`
    this.log.fail`hub socket error ${hub.id} [${error.code}] ${error.message}`
    await this.db.persistLog({ agent:this.#spokeID, message, error })
  }

  async #onHubDisconnected(hub)
  {
    this.hubs.delete(hub)

    this.log.warn`disconnected from hub ${hub.id}`

    if(this.hubs.size === 0)
    {
      await this.#pollOnlineHubs()
    }
  }

  async #onHubPublishMessage(_, domain, id, name, pid)
  {
    this.subscriptions[domain].emit(name, { domain, id, name, pid })
    await this.db.updateEventPublishedToConsumedBySpoke(id, this.#spokeID)
    && this.consumers[domain].emit(name, { domain, id, name, pid })
  }

  async #onHubOnlineMessage(hub, hubID, hubIP, hubPort)
  {
    const message = `recieved hub online message ${hubID} › ${hubIP}:${hubPort} from hub ${hub.id}`
    this.log.info`recieved hub online message ${hubID} › ${hubIP}:${hubPort} from hub ${hub.id}`
    await this.db.persistLog({ agent:this.#spokeID, message })
    await this.#connectToHub({ id:hubID, external_ip:hubIP, external_port:hubPort })
  }

  async #onConsumed(callback, event)
  {
    try
    {
      await callback(event)
    }
    catch(reason)
    {
      const error = new Error(`spoke callback failed to consume event ${event.domain} › ${event.name} › ${event.pid} › ${event.id}`)
      error.code  = 'E_EVENTFLOW_SPOKE_CONSUME_OBSERVER_ERROR'
      error.cause = reason
      error.event = event

      await this.db.updateEventPublishedToFailed(event.id)
      const message = `failed to consume event ${event.domain} › ${event.name} › ${event.pid} › ${event.id}`
      this.log.fail`failed to consume event ${event.domain} › ${event.name} › ${event.pid} › ${event.id}`
      await this.db.persistLog({ agent:this.#spokeID, message, error })

      return
    }

    await this.db.updateEventPublishedToSuccess(event.id)
  }

  #broadcast(type, ...args)
  {
    return this.channel.broadcast(this.hubs.all, [ type, ...args ])
  }

  consume(domain, name, callback)
  {
    this.consumers[domain].on(name, this.#onConsumed.bind(this, callback))
    this.#broadcast('subscribe', domain, name)
    this.log.info`consuming: ${domain} › ${name}`
  }

  subscribe(domain, name, callback)
  {
    this.subscriptions[domain].on(name, callback)
    this.#broadcast('subscribe', domain, name)
    this.log.info`subscribes to: ${domain} › ${name}`
  }

  unsubscribe(domain, name, callback)
  {
    this.subscriptions[domain].off(name, callback)

    // If there are no listeners for the domain and name
    // then broadcast an unsubscribe message.
    if(0 === this.subscriptions[domain].listenerCount(name)
    && 0 === this.consumers    [domain].listenerCount(name))
    {
      this.#broadcast('unsubscribe', domain, name)
      delete this.subscriptions[domain]
      delete this.consumers    [domain]
    }
  }

  /**
   * @param {string} domain
   * @param {string} pid
   * @param {string} [eventNames=["success","failed"]] string or array of event names that will be waited for
   * @param {number} [timeout=10e3] milliseconds to wait before throwing a timeout error
   * @throws E_EVENTFLOW_WAIT_TIMEOUT
   */
  wait(domain, pid, eventNames=['success','failed'], timeout=10e3)
  {
    if(false === Array.isArray(eventNames))
    {
      eventNames = [eventNames]
    }

    return new Promise(async (accept, reject) =>
    {
      const waitTimeout = setTimeout(() =>
      {
        const error = new Error(`wait timed out (${timeout}) for ${domain} › ${pid} › ${eventNames.join(' | ')}`)
        error.code  = 'E_EVENTFLOW_WAIT_TIMEOUT'
        reject(error)
      }, timeout)

      const subscriber = (event) =>
      {
        if(event.pid === pid)
        {
          Promise.allSettled(eventNames.map((name) => this.unsubscribe(domain, name, subscriber)))
            .then(() => 
            {
              clearTimeout(waitTimeout)
              accept(event)
            })
        }
      }

      await Promise.allSettled(eventNames.map((name) => this.subscribe(domain, name, subscriber)))
    })
  }

  generatePid()
  {
    return this.idNameGenerator.generateId()
  }

  async publish(event)
  {
    const eventID = await this.persist(event)
    await this.db.persistEventPublished({ event_id:eventID, publisher:this.#spokeID })
    this.#broadcast('publish', event.domain, eventID, event.name, event.pid)
    this.log.info`published event ${eventID} › ${event.domain} › ${event.name} › ${event.pid}`
  }

  async schedule(scheduled, event)
  {
    const scheduledDate = new Date(scheduled)

    if(isNaN(scheduledDate))
    {
      const error = new Error(`invalid scheduled date ${scheduled}`)
      error.code  = 'E_EVENTFLOW_SPOKE_SCHEDULE_INVALID_DATE'
      error.event = event
      throw error
    }

    scheduled = scheduledDate.toJSON().replace('T', ' ').substring(0, 19)

    const eventID = await this.persist(event)
    await this.db.persistEventPublished({ event_id:eventID, publisher:this.#spokeID })
    await this.db.persistEventScheduled({ event_id:eventID, scheduled })
    this.log.info`scheduled event ${eventID} › ${event.domain} › ${event.name} › ${scheduled}`
  }

  async persist(event)
  {
    return await this.db.persistEvent(event)
  }

  async delete(eventID)
  {
    return await this.db.deleteEvent(eventID)
  }

  async deleteEventlog(domain, pid)
  {
    return await this.db.deleteEventByDomainAndPid(domain, pid)
  }

  async read(eventID)
  {
    return await this.db.readEvent(eventID)
  }

  async readEventlog(domain, pid)
  {
    return await this.db.readEventsByDomainAndPid(domain, pid)
  }

  async readEventlogState(domain, pid)
  {
    const
      eventlog = await this.readEventlog(domain, pid),
      state    = this.composeEventlogState(eventlog)

    return state
  }

  composeEventlogState(eventlog, size=10)
  {
    const
      merge   = (start, end) => deepmerge(...eventlog.slice(start, end).map((event) => event.data)),
      state   = {},
      length  = eventlog.length

    for(let i = size; i < length; i += size)
    {
      const segment = merge(i - size, i)
      deepassign(state, segment)
    }

    const
      spare   = length % size,
      segment = merge(length - spare, length)

    deepassign(state, segment)

    return state
  }
}