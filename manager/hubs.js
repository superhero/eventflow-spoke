/**
 * Manage eventflow hub sockets.
 * @memberof Eventflow.Spoke
 */
export default class HubsManager
{
  #socketMap = new Map
  #ipPortMap = new Map

  destroy()
  {
    this.#socketMap.clear()
    this.#ipPortMap.clear()
  }

  #serialize(ip, port)
  {
    return `${ip.replace(/^::ffff:/, '')}:${port}`
  }

  get size()
  {
    return this.#socketMap.size
  }

  add(ip, port, socket)
  {
    const ipPort = this.#serialize(ip, port)

    this.#socketMap.set(socket, ipPort)
    this.#ipPortMap.set(ipPort, socket)
  }

  hasSocket(ip, port)
  {
    const ipPort = this.#serialize(ip, port)
    return this.#ipPortMap.has(ipPort)
  }

  has(socket)
  {
    return this.#socketMap.has(socket)
  }

  get all()
  {
    return [...this.#ipPortMap.values()]
  }

  getSocket(ip, port)
  {
    const ipPort = this.#serialize(ip, port)
    return this.#ipPortMap.get(ipPort)
  }

  delete(socket)
  {
    const ipPort = this.#socketMap.get(socket)

    this.#socketMap.delete(socket)
    this.#ipPortMap.delete(ipPort)
  }
}
