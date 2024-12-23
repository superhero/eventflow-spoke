import assert           from 'node:assert/strict'
import { suite, test }  from 'node:test'
import HubsManager      from '@superhero/eventflow-spoke/manager/hubs'

suite('@superhero/eventflow-spoke/manager/hubs', () =>
{
  test('Add and retrieve sockets', async () =>
  {
    const 
      hubs    = new HubsManager(),
      socket1 = {},
      socket2 = {}

    hubs.add('127.0.0.1', 8080, socket1)
    hubs.add('127.0.0.1', 8081, socket2)

    assert.deepStrictEqual(hubs.all, [socket1, socket2])
  })

  test('Check size and has methods', async () =>
  {
    const 
      hubs    = new HubsManager(),
      socket  = {}

    hubs.add('192.168.1.1', 9090, socket)

    assert.strictEqual(hubs.size, 1)
    assert.strictEqual(hubs.has(socket), true)
    assert.strictEqual(hubs.hasSocket('192.168.1.1', 9090), true)
    assert.strictEqual(hubs.hasSocket('192.168.1.2', 9090), false)
  })

  test('Retrieve socket by IP and port', async () =>
  {
    const 
      hubs    = new HubsManager(),
      socket  = {}

    hubs.add('10.0.0.1', 8080, socket)

    const retrievedSocket = hubs.getSocket('10.0.0.1', 8080)
    assert.strictEqual(retrievedSocket, socket)

    const nonExistentSocket = hubs.getSocket('10.0.0.2', 8080)
    assert.strictEqual(nonExistentSocket, undefined)
  })

  test('Delete a socket', async () =>
  {
    const 
      hubs    = new HubsManager(),
      socket1 = {},
      socket2 = {}

    hubs.add('172.16.0.1', 3000, socket1)
    hubs.add('172.16.0.2', 3001, socket2)
    hubs.delete(socket1)

    assert.deepStrictEqual(hubs.all, [socket2])
    assert.strictEqual(hubs.size, 1)
  })

  test('Handle deleting non-existent socket gracefully', async () =>
  {
    const 
      hubs    = new HubsManager(),
      socket  = {}

    assert.doesNotThrow(() => hubs.delete(socket))
  })

  test('Return empty array if no sockets exist', async () =>
  {
    const hubs = new HubsManager()
    assert.deepStrictEqual(hubs.all, [])
  })
})
