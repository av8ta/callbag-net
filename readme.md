# callbag-net

Callbag listenable source that connects using nodejs [net.Socket](https://nodejs.org/api/net.html#class-netsocket) interface.

Read more about the Callbag standard [here](https://github.com/callbag/callbag).

## Example

```javascript
// see: ./example/client.js
import { Client } from 'callbag-net'
import { createServer } from './server.mjs'
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
```

```shell
<Buffer 68 65 6c 6c 6f>
hello
```

```typescript
Client(options: net.SocketConnectOpts, connectionListener?: (() => void))
```
