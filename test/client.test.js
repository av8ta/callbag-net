import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { pipe } from 'callbag-basics-esmodules'
import subscribe from 'callbag-subscribe'
import { Client } from '../lib/client.js'
import { Signal } from '../lib/typings/types.js'
import net from 'node:net'

const port = 2222, host = 'localhost'
const fail = (expected, value, error, done) => setTimeout(() => done(new Error(`Expected ${expected} but got ${value} ${error}`)), 1)
const succeed = done => setTimeout(() => done(), 1)
const subscribeError = (error, done) => setImmediate(() => done(new Error('Subscribe errored', error)))

describe('Creates test server', () => {
  return new Promise((resolve, _reject) => {
    const server = createServer('hello')
    resolve(assert(server instanceof net.Server))
    server.close()
  })
})

test('Client receives data from server', (_t, done) => {
  const message = 'hello\r\n'
  const server = createServer(message)
  const source = Client({ port, host })

  pipe(
    source,
    subscribe({
      next: v => {
        try {
          assert.equal(v.toString(), message, 'Subscribe next had unexpected value')
          source(Signal.END)
          server.close()
          succeed(done)
        } catch (error) {
          source(Signal.END)
          server.close()
          fail(message, v.toString(), error, done)
        }
      },
      error: error => {
        server.close()
        subscribeError(error, done)
      },
      complete: () => {
        server.close()
      }
    })
  )
})

function createServer(message) {
  const server = net.createServer(client => {
    console.log('server net.createServer - client connected')
    client.on('end', () => {
      console.log('client.on end - client disconnected')
    })
    client.write(message)
  })

  server.on('error', error => {
    console.log('server.on error', error)
    throw error
  })

  server.on('close', () => {
    console.log('server.on close')
  })

  server.listen(port, () => {
    console.log('server.listen on:', port)
  })
  return server
}
