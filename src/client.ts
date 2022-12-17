import { SourceInitiator } from 'callbag-types'
import { SocketConnectOpts } from 'node:net'
import { pipe, fromIter } from 'callbag-basics-esmodules'

export function Client(options?: SocketConnectOpts): typeof SourceInitiator {
  console.log(options)
  const message = 'hello\r\n'

  return pipe(
    fromIter([message])
  )
}


