import { describe } from 'node:test'
import assert from 'node:assert/strict'
import { pipe, fromIter } from 'callbag-basics-esmodules'
import subscribe from 'callbag-subscribe'
import { Client } from '../lib/client.js'
import { Signal } from '../lib/typings/types.js'
import net from 'node:net'

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
    resolve(assert(server instanceof net.Server))
    server.close()
  })
})

describe('Client receives data from server', () => {
  const message = 'hello\r\n'
  const server = createServer(message)
  const source = Client({ port: 8124, host: 'localhost' })

  return new Promise((resolve, reject) => {
    pipe(
      source,
      subscribe({
        next: v => {
          if (v.toString() === message) {
            console.log('Data received from server:', message)
            source(Signal.END)
            server.close()
            resolve('Pass')
          }
          else {
            server.close()
            reject()
          }
        },
        error: e => {
          server.close()
          reject(e)
        },
        complete: () => { server.close() }
      })
    )
  })
})

function createServer(message) {
  const server = net.createServer(client => {
    console.log('client connected')
    client.on('end', () => {
      console.log('client disconnected')
    })
    client.write(message)
  })

  server.on('error', error => {
    console.log(error)
    throw error
  })

  server.on('close', () => {
    console.log('close event')
  })

  server.listen(2222, () => {
    console.log('server bound')
  })
  return server
}
