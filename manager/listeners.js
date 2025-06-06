import EventEmitter from 'node:events'

/**
 * A class that extends EventEmitter and emits events by name. If there are no listeners 
 * for the event name, the event will be emitted to the wildcard event name '*'.
 * 
 * @memberof Eventflow.Spoke
 */
export class Listener extends EventEmitter
{
  emit(name, ...args)
  {
    return this.listenerCount(name)
         ? super.emit(name, ...args)
         : super.emit('*',  ...args)
  }
}

/**
 * Manage event emitters for listeners to events by domain and name.
 * Each domain has it's own listener/event-emitter which is expected to emit events by name.
 * 
 * @memberof Eventflow.Spoke
 */
export default class ListenersManager
{
  static Listener = Listener

  #map = new Map

  get listeners()
  {
    const 
      entries     = [...this.#map.entries()],
      entriesMap  = entries.map(([domain, listener]) => [domain, listener.eventNames()]),
      listeners   = Object.fromEntries(entriesMap)

    return listeners
  }

  constructor()
  {
    const self = this
    return new Proxy(self, 
    {
      set: (_, domain, listener) =>
      {
        if(self.#map.has(domain))
        {
          const error = new Error(`cannot overwrite an existing domain listener: ${domain}`)
          error.code  = 'E_EVENTFLOW_LISTENERS_DOMAIN_ALREADY_EXISTS'
          throw error
        }

        if(listener instanceof Listener)
        {
          self.#map.set(domain, listener)
          return true
        }
        else
        {
          const error = new Error('can only set a listener that is of instance Listener')
          error.code  = 'E_EVENTFLOW_LISTENERS_INVLAID_INSTANCE_OF_LISTENER'
          throw error
        }
      },
      deleteProperty  : (_, domain) => self.#map.delete(domain),
      has             : (_, domain) => self.#map.has(domain),
      get             : (target, domain) => 'symbol' === typeof domain 
                                          ? Reflect.get(target, domain)
                                          : self.#map.get(domain)
                                            ?? ( domain in target
                                               ? target[domain]
                                               : target.lazyload(domain))
    })
  }

  lazyload(domain)
  {
    if(false === this.#map.has(domain))
    {
      const listener = new Listener()
      this.#map.set(domain, listener)
    }

    return this.#map.get(domain)
  }
}
