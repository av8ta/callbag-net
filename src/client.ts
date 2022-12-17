import { SourceInitiator } from 'callbag-types'
import { SocketConnectOpts } from 'node:net'

export function Client(options?: SocketConnectOpts): typeof SourceInitiator {
  console.log(options)
 }
