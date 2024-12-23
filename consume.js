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
        consumer  = this.#consumer.bind(this, service)

      for(const name of consumerMap[domain])
      {
        await this.#spoke.consume(domain, name, consumer)
      }
    }
  }

  async #consumer(service, event)
  {
    const consumer = this.#lazyloadConsumerName(event.name)

    try
    {
      await service[consumer](event)
    }
    catch(reason)
    {
      const error     = new Error('consumer failed to handle event')
      error.code      = 'E_EVENTFLOW_SPOKE_CONSUMER_FAILED'
      error.cause     = reason
      error.consumer  = consumer

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

  #lazyloadConsumerName(eventName)
  {
    if(this.#lookupConsumerMap.has(eventName))
    {
      return this.#lookupConsumerMap.get(eventName)
    }

    const consumer = this.#composeConsumerName(eventName)
    this.#lookupConsumerMap.set(eventName, consumer)
    return consumer
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
}
