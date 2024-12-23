# Eventflow Spoke

Eventflow Spoke is the client component in the Eventflow ecosystem. It enables communication with hubs in the Eventflow network, allowing events to be published, consumed, subscribed to, and managed efficiently.

## Features

- Publish and subscribe to events.
- Consume events with callback support.
- Schedule events for future execution.
- Wait for specific event outcomes.
- Manage event logs and their states.
- Communicates with hubs via secure TLS connections.

## Installation

Install the package using npm:

```bash
npm install @superhero/eventflow-spoke
```

## Usage

### Initialization

To initialize a Spoke instance:

```javascript
import { locate } from '@superhero/eventflow-spoke'

const locator = new Locator()
locator.set('@superhero/config', config)
locator.eagerload('@superhero/eventflow-db')
locator.eagerload(config.find('locator'))

const spoke = locate(locator)
await spoke.bootstrap()
```

### Publishing Events

Publish an event to the Eventflow network:

```javascript
await spoke.publish(
{
  domain : 'example-domain',
  name   : 'example-event',
  pid    : 'example-pid',
  data   : { key: 'value' }
})
```

### Subscribing to Events

Subscribe to specific events:

```javascript
await spoke.subscribe('example-domain', 'example-event', (event) => 
{
  console.log('Event received:', event)
})
```

### Consuming Events

Consume events with a callback:

```javascript
await spoke.consume('example-domain', 'example-event', (event) => 
{
  console.log('Consuming event:', event)
})
```

### Waiting for Events

Wait for a specific event outcome:

```javascript
const result = await spoke.wait('example-domain', 'example-pid', ['success', 'failed'], 10000)
console.log('Event result:', result) // result = "success" or "failed"
```

### Scheduling Events

Schedule an event to be executed at a later time:

```javascript
const scheduledTime = new Date(Date.now() + 60e3) // 1 minute from now
await spoke.schedule(scheduledTime.toISOString(), 
{
  domain : 'example-domain',
  name   : 'example-event',
  pid    : 'example-pid',
  data   : { key: 'value' }
})
```

### Managing Event Logs

#### Deleting Event Logs

```javascript
await spoke.deleteEventlog('example-domain', 'example-pid')
```

#### Reading Event Logs

```javascript
const events = await spoke.readEventlog('example-domain', 'example-pid')
console.log('Event log:', events)
```

#### Reading Event Log State

```javascript
const state = await spoke.readEventlogState('example-domain', 'example-pid')
console.log('Event log state:', state)
```

#### Composing Event Log State

Manual composition of an eventlog state.

```javascript
const eventlog = 
[
  { data: { key1: 'value1' } },
  { data: { key2: 'value2' } }
]
const state = spoke.composeEventlogState(eventlog)
console.log('Composed state:', state)
```

## API Reference

### Methods

- `bootstrap()` - Initializes the spoke and connects to online hubs.
- `destroy()` - Cleans up resources and disconnects from hubs.
- `publish(event)` - Publishes an event.
- `subscribe(domain, name, callback)` - Subscribes to a specific event.
- `consume(domain, name, callback)` - Consumes a specific event.
- `wait(domain, pid, eventNames, timeout)` - Waits for specific event outcomes.
- `schedule(scheduled, event)` - Schedules an event for future execution.
- `delete(eventID)` - Deletes an event by ID.
- `deleteEventlog(domain, pid)` - Deletes an event log by domain and PID.
- `read(eventID)` - Reads a specific event by ID.
- `readEventlog(domain, pid)` - Reads all events for a domain and PID.
- `readEventlogState(domain, pid)` - Reads the state of an event log.
- `composeEventlogState(eventlog, size)` - Composes the state from a series of event logs.

## Testing

Run the test suite using:

```bash
npm run test-build
npm test
```

### Test Coverage

```
▶ @superhero/eventflow-spoke
  ▶ Lifecycle
    ✔ Can initialize EventflowSpoke correctly (2.456916ms)
  ✔ Lifecycle (3.674219ms)

  ▶ Event Management
    ✔ Subscribe (25.140172ms)
    ✔ Consume (27.952574ms)
    ✔ Wait for event (22.296145ms)
    ✔ Schedule events (19.80376ms)
    ✔ Delete event (13.513563ms)
    ✔ Delete event log (18.829043ms)
    ✔ Read event (7.612599ms)
    ✔ Read event log (12.595032ms)
    ✔ Read event log state (16.270482ms)
    ✔ Compose event log state (0.206373ms)
  ✔ Event Management (165.303115ms)
✔ @superhero/eventflow-spoke (11673.269989ms)

▶ @superhero/eventflow-spoke/manager/hubs
  ✔ Add and retrieve sockets (1.926647ms)
  ✔ Check size and has methods (0.425031ms)
  ✔ Retrieve socket by IP and port (0.242366ms)
  ✔ Delete a socket (0.22056ms)
  ✔ Handle deleting non-existent socket gracefully (0.322003ms)
  ✔ Return empty array if no sockets exist (0.194319ms)
✔ @superhero/eventflow-spoke/manager/hubs (5.00919ms)

▶ ListenersManager
  ✔ Add and retrieve listeners by domain (1.716958ms)
  ✔ Throw error when overwriting existing domain (1.135766ms)
  ✔ Throw error when setting invalid listener instance (0.246827ms)
  ✔ Lazy-load listener for non-existent domain (0.365931ms)
  ✔ Delete listener by domain (0.345558ms)
  ✔ Wildcard event emission (1.018036ms)
  ✔ Emit specific event if listeners exist (0.530123ms)
✔ ListenersManager (7.564682ms)

tests 24
suites 5
pass 24

-------------------------------------------------------------------------------------------------------------------------
file                 | line % | branch % | funcs % | uncovered lines
-------------------------------------------------------------------------------------------------------------------------
config.js            | 100.00 |   100.00 |  100.00 | 
consume.js           |  42.24 |   100.00 |   42.86 | 43-55 58-91 94-103 106-115
index.js             |  86.26 |    80.43 |   88.89 | 34-36 44-47 100-104 111-112 148-151 179-183 205-210 219-231 287-29…
index.test.js        | 100.00 |   100.00 |  100.00 | 
manager              |        |          |         | 
 hubs.js             | 100.00 |   100.00 |  100.00 | 
 hubs.test.js        | 100.00 |   100.00 |  100.00 | 
 listeners.js        | 100.00 |   100.00 |   88.89 | 
 listeners.test.js   | 100.00 |   100.00 |  100.00 | 
-------------------------------------------------------------------------------------------------------------------------
all files            |  88.17 |    92.44 |   91.00 | 
-------------------------------------------------------------------------------------------------------------------------
```

---

## License

This project is licensed under the MIT License.

## Contributing

Feel free to submit issues or pull requests for improvements or additional features.
