/**
 * @memberof Eventflow.Spoke
 */
export default
{
  bootstrap:
  {
    '@superhero/eventflow-spoke'          : true,
    '@superhero/eventflow-spoke/consume'  : true
  },
  dependency:
  {
    '@superhero/eventflow-certificates'   : true,
    '@superhero/eventflow-db'             : true
  },
  locator:
  {
    '@superhero/eventflow-spoke'          : true,
    '@superhero/eventflow-spoke/consume'  : true
  },
  destroy: { '@superhero/eventflow-db' : false },
  eventflow:
  {
    spoke:
    {
      NAME                      : process.env.EVENTFLOW_SPOKE_NAME                   ?? 'EVENTFLOW-SPOKE',
      CONNECT_TO_HUB_TIMEOUT    : process.env.EVENTFLOW_SPOKE_CONNECT_TO_HUB_TIMEOUT ?? 5e3,
      KEEP_ALIVE_INTERVAL       : process.env.EVENTFLOW_SPOKE_KEEP_ALIVE_INTERVAL    ?? 60e3,
      TCP_SOCKET_CLIENT_OPTIONS : process.env.EVENTFLOW_SPOKE_TCP_SOCKET_CLIENT_OPTIONS,

      consume:
      {
        // '<event_domain>' : '*',
        // '<event_domain>' : '<event_name>'
      }
    }
  }
}