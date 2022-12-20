import { Client } from '../lib/client.js'
import { createServer } from './server.js'
import { pipe, forEach } from 'callbag-basics-esmodules'

const source = Client({ port: 1234, host: 'localhost' })
createServer(1234, 'hello')

pipe(
  source,
  forEach(v /* Buffer */ => {
    console.log(v)
    console.log(v.toString())
  })
)
