import net from 'node:net'

export function createServer(port, message) {
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
