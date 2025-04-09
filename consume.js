import Log from '@superhero/log'

export function locate(locator)
{
  const
    spoke   = locator('@superhero/eventflow-spoke'),
    consume = new ConsumeService(locator, spoke)

  return consume
}

/**
 * Attaches consumers on bootstrap according to a consumer map 
 * routed to be handled by an aligned domain service method.
 * 
 * The event name is transformed into a camelcase method name
 * by removing any non-alphanumeric characters and capitalizing
 * the first letter of each word.
 * 
 * The consumer method is called with the event as an argument.
 * 
 * If the consumer method does not exist in the domain service,
 * an error is composed and forwarded to the domain service error
 * handler method, if it exists. Otherwise, the error is thrown.
 * 
 * If the domain service error handler method fails to handle the
 * error, a new error describing the failure is composed and 
 * thrown.
 * 
 * @memberof Eventflow.Spoke
 */
export default class ConsumeService
{
  #locator
  #spoke
  #lookupConsumerMap = new Map
  log = new Log({ label: '[EVENTFLOW:SPOKE:CONSUME]' })

  constructor(locator, spoke)
  {
    this.#locator = locator
    this.#spoke   = spoke
  }

  async bootstrap(consumerMap)
  {
    for(const domain in consumerMap)
    {
      const
        service   = this.#locator.locate(domain),
        consumer  = this.#consumer.bind(this, service),
        names     = Array.isArray(consumerMap[domain])
                  ? consumerMap[domain]
                  :[consumerMap[domain]]

      for(const name of names)
      {
        await this.#spoke.consume(domain, name, consumer)
      }
    }
  }

  async #consumer(service, event)
  {
    const consumer = this.#lazyloadConsumer(service, event)

    try
    {
      await consumer(event)
    }
    catch(reason)
    {
      const error = new Error('consumer failed to handle event')
      error.code  = 'E_EVENTFLOW_SPOKE_CONSUMER_FAILED'
      error.cause = reason
      error.event = { ...event }
      delete error.event.data

      if('function' === typeof service.onError)
      {
        try
        {
          await service.onError(error, event)
        }
        catch(onErrorReason)
        {
          const onErrorFailed = new Error('error handler failed')
          onErrorFailed.code  = 'E_EVENTFLOW_SPOKE_CONSUMER_ERROR_HANDLER_FAILED'
          onErrorFailed.cause = [ onErrorReason, error ]
          throw onErrorFailed
        }
      }
      else
      {
        throw error
      }
    }
  }

  #lazyloadConsumer(service, event)
  {
    const lookupKey = event.domain + '.' + event.name

    if(false === this.#lookupConsumerMap.has(lookupKey))
    {
      const consumerName = this.#composeConsumerName(event.name)
      this.#lookupConsumerMap.set(lookupKey, 
        consumerName in service
        ? service[consumerName].bind(service)
        : this.#fallbackConsumerCallback.bind(this, service, consumerName))
    }
    
    return this.#lookupConsumerMap.get(lookupKey)
  }

  #composeConsumerName(eventName)
  {
    const
      observerLowercase  = eventName.toLowerCase(),
      observerSeperated  = observerLowercase.replace(/\W+/g, ' '),
      observerDivided    = observerSeperated.split(' '),
      observerCamelcase  = observerDivided.map((s) => s[0].toUpperCase() + s.slice(1)),
      observerName       = 'on' + observerCamelcase.join('')

    return observerName
  }

  #fallbackConsumerCallback(service, consumerName, event)
  {
    this.log.warn`consumer missing ${event.domain} › ${event.name} not found in service ${service.constructor.name} › ${consumerName}`
  }
}
