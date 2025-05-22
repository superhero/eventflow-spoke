/**
 * @memberof Eventflow.Spoke
 */
export default
{
  bootstrap:
  {
    '@superhero/eventflow-spoke/consume'  : 'eventflow/spoke/consume',
    '@superhero/eventflow-spoke'          : true,
  },
  dependency:
  {
    '@superhero/eventflow-certificates'   : true,
    '@superhero/eventflow-db'             : true
  },
  locator:
  {
    '@superhero/eventflow-spoke/consume': 
    {
      uses:
      [
        '@superhero/eventflow-spoke'
      ]
    },
    '@superhero/eventflow-spoke': 
    {
      uses:
      [
        '@superhero/eventflow-db'
      ]
    }
  },
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