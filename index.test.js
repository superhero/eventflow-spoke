import assert  from 'node:assert/strict'
import util    from 'node:util'
import Config  from '@superhero/config'
import Locator from '@superhero/locator'
import { suite, test, before, after } from 'node:test'

util.inspect.defaultOptions.depth = 5

suite('@superhero/eventflow-spoke', () =>
{
  let locator, spoke, hub

  before(async () =>
  {
    locator = new Locator()

    const config = new Config()
    await config.add('@superhero/eventflow-db')
    await config.add('@superhero/eventflow-hub')
    await config.add('./config.js')
    config.assign({ eventflow: { spoke: { certificates: { CERT_PASS_ENCRYPTION_KEY: 'encryptionKey123' }}}})
    config.assign({ eventflow: { hub:   { certificates: { CERT_PASS_ENCRYPTION_KEY: 'encryptionKey123' }}}})

    locator.set('@superhero/config', config)
    await locator.eagerload('@superhero/eventflow-db')
    await locator.eagerload(config.find('locator'))

    spoke = locator('@superhero/eventflow-spoke')
    hub   = locator('@superhero/eventflow-hub')

    await hub.bootstrap()
    await spoke.bootstrap()
  })

  after(async () =>
  {
    await locator.destroy()
    locator.clear()
  })

  suite('Lifecycle', () => 
  {
    test('Can initialize EventflowSpoke correctly', () =>
    {
      assert.strictEqual(spoke.config.NAME, 'EVENTFLOW-SPOKE')
      assert.ok(spoke.channel)
      assert.ok(spoke.certificates)
      assert.ok(spoke.hubs)
      assert.ok(spoke.subscriptions)
      assert.ok(spoke.consumers)
    })
  })

  suite('Event Management', () => 
  {
    test('Subscribe', async () =>
    {
      await spoke.publish({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
      const event = await new Promise((accept) => spoke.subscribe('domain1', 'event1', accept))
      assert.ok(event)
      assert.strictEqual(event.name, 'event1')
    })

    test('Consume', async () =>
    {
      await spoke.publish({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
      const event = await new Promise((accept) => spoke.consume('domain1', 'event1', accept))
      assert.ok(event)
      assert.strictEqual(event.name, 'event1')
    })

    test('Wait for event', async () =>
    {
      const event = { domain: 'domain1', name: 'success', pid: 'pid1', data: {} }
      await spoke.publish(event)
      const waitPromise = await spoke.wait('domain1', 'pid1', 'success', 1e3)
      const result = await waitPromise
      assert.strictEqual(result.name, 'success')
    })

    test('Schedule events', async () =>
    {
      const scheduled = Date.now()
      await spoke.schedule(scheduled, { domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
    })

    test('Delete event', async () =>
    {
      const id = await spoke.persist({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
      await spoke.delete(id)
      await assert.rejects(spoke.read(id), { code:'E_EVENTFLOW_DB_EVENT_NOT_FOUND' })
    })

    test('Delete event log', async () =>
    {
      await spoke.deleteEventlog('domain1', 'pid1')
      await spoke.persist({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
      const preEvents = await spoke.readEventlog('domain1', 'pid1')
      assert.strictEqual(preEvents.length, 1)
      await spoke.deleteEventlog('domain1', 'pid1')
      const postEvents = await spoke.readEventlog('domain1', 'pid1')
      assert.strictEqual(postEvents.length, 0)
    })

    test('Read event', async () =>
    {
      const 
        id    = await spoke.persist({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} }),
        event = await spoke.read(id)

      assert.strictEqual(event.id, id)
    })

    test('Read event log', async () =>
    {
      await spoke.deleteEventlog('domain1', 'pid1')
      await spoke.persist({ domain: 'domain1', name: 'event1', pid: 'pid1', data: {} })
      const events = await spoke.readEventlog('domain1', 'pid1')
      assert.strictEqual(events.length, 1)
      assert.strictEqual(events[0].name, 'event1')
    })

    test('Read event log state', async () =>
    {
      await spoke.deleteEventlog('domain1', 'pid1')
      await spoke.persist({ domain: 'domain1', name: 'event1', pid: 'pid1', data: { key1: 'value1' } })
      await spoke.persist({ domain: 'domain1', name: 'event2', pid: 'pid1', data: { key2: 'value2' } })
      const state = await spoke.readEventlogState('domain1', 'pid1')
      assert.strictEqual(state.key1, 'value1')
      assert.strictEqual(state.key2, 'value2')
    })

    test('Compose event log state', () =>
    {
      const eventlog = 
      [
        { data: { key1: 'value1' } },
        { data: { key2: 'value2' } },
        { data: { key3: 'value3' } }
      ]
      const state = spoke.composeEventlogState(eventlog)
      assert.strictEqual(state.key1, 'value1')
      assert.strictEqual(state.key2, 'value2')
      assert.strictEqual(state.key3, 'value3')
    })
  })
})
