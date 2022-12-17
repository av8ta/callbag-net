import { describe } from 'node:test'
import assert from 'node:assert/strict'
import { pipe, fromIter } from 'callbag-basics-esmodules'
import subscribe from 'callbag-subscribe'
import net from 'node:net'
import Debug from 'debug'
const log = Debug('callbag-net:client:test')

describe('1 equals 1', () => {
  return new Promise((resolve, reject) => {
    pipe(
      fromIter([1, 1, 1]),
      subscribe({
        next: v => resolve(assert(v === 1, '1 equals 1')),
        error: e => reject(e),
        complete: () => { }
      })
    )
  })
})

describe('Creates test server', () => {
  return new Promise((resolve, _reject) => {
    const server = createServer('hello')
    log(server instanceof net.Server)
    resolve(assert(server instanceof net.Server))
    server.close()
  })
})

function createServer(message) {
  const server = net.createServer(client => {
    log('client connected')
    client.on('end', () => {
      log('client disconnected')
    })
    client.write(message)
  })

  server.on('error', error => {
    log(error)
    throw error
  })

  server.on('close', () => {
    log('close event')
  })

  server.listen(2222, () => {
    log('server bound')
  })
  return server
}
