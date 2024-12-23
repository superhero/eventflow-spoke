import assert           from 'node:assert/strict'
import { suite, test }  from 'node:test'
import ListenersManager from '@superhero/eventflow-spoke/manager/listeners'

suite('ListenersManager', () =>
{
  test('Add and retrieve listeners by domain', async () =>
  {
    const 
      manager   = new ListenersManager(),
      domain1   = 'domain1',
      domain2   = 'domain2',
      listener1 = new ListenersManager.Listener(),
      listener2 = new ListenersManager.Listener()

    manager[domain1] = listener1
    manager[domain2] = listener2

    assert.strictEqual(manager[domain1], listener1)
    assert.strictEqual(manager[domain2], listener2)
  })

  test('Throw error when overwriting existing domain', async () =>
  {
    const 
      manager  = new ListenersManager(),
      domain   = 'domain1',
      listener = new ListenersManager.Listener()

    manager[domain] = listener

    assert.throws(() => 
    {
      manager[domain] = new ListenersManager.Listener()
    }, 
    {
      code: 'E_EVENTFLOW_LISTENERS_DOMAIN_ALREADY_EXISTS'
    })
  })

  test('Throw error when setting invalid listener instance', async () =>
  {
    const 
      manager = new ListenersManager(),
      domain  = 'domain1'

    assert.throws(() => 
    {
      manager[domain] = {}
    }, 
    {
      code: 'E_EVENTFLOW_LISTENERS_INVLAID_INSTANCE_OF_LISTENER'
    })
  })

  test('Lazy-load listener for non-existent domain', async () =>
  {
    const 
      manager = new ListenersManager(),
      domain  = 'domain1'

    const listener = manager[domain]
    assert.ok(listener instanceof ListenersManager.Listener)
    assert.strictEqual(manager[domain], listener)
  })

  test('Delete listener by domain', async () =>
  {
    const 
      manager  = new ListenersManager(),
      domain   = 'domain1',
      listener = new ListenersManager.Listener()

    manager[domain] = listener
    assert.strictEqual(manager[domain], listener)

    delete manager[domain]
    assert.ok(manager[domain] instanceof ListenersManager.Listener)

    assert.notStrictEqual(manager[domain], listener)
  })

  test('Wildcard event emission', async () =>
  {
    const 
      listener      = new ListenersManager.Listener(),
      emittedEvents = []

    listener.on('*', (...args) => emittedEvents.push({ event: '*', args }))
    listener.emit('nonexistentEvent', 'arg1', 'arg2')

    assert.deepStrictEqual(emittedEvents, 
    [
      {
        event : '*',
        args  : ['arg1', 'arg2']
      }
    ])
  })

  test('Emit specific event if listeners exist', async () =>
  {
    const 
      listener      = new ListenersManager.Listener(),
      emittedEvents = []

    listener.on('specificEvent', (...args) => emittedEvents.push({ event: 'specificEvent', args }))
    listener.emit('specificEvent', 'arg1', 'arg2')

    assert.deepStrictEqual(emittedEvents, 
    [
      {
        event : 'specificEvent',
        args  : ['arg1', 'arg2']
      }
    ])
  })
})
