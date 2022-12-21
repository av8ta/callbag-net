import { Signal, SourceInitiator, SinkTalkback, SourceTalkback, ErrorPayload, PullableSourceTalkback, Callbag } from './typings/types.js'
import type { Options } from './typings/interface.js'
import type { SocketConnectOpts } from 'node:net'
import net from 'node:net'
import Debug from 'debug'
const log = Debug('callbag-net:client')

export type Data = string | Buffer | Uint8Array

export function Client(socketOptions: SocketConnectOpts, { connectionListener = undefined, retries = 0, reconnectOnEnd = false }: Options = {}): SourceInitiator {
  let ready = false
  let socket: net.Socket | null = null
  let timeout: NodeJS.Timeout | undefined = undefined
  let attempts = 0
  let finished = false

  const printOptions = JSON.stringify(socketOptions)
  const buffer: (SourceTalkback | Data | ErrorPayload)[] = []
  const sinks: SinkTalkback[] = []

  return (signal: Signal | SourceTalkback, payload: unknown) => {
    switch (signal) {
      case Signal.START:
        if (!isSinkTalkback(signal, payload)) throw new Error("SourceInitiator not passed to handshakeFactory")
        handshakeFactory()(signal, payload)
        break
      case Signal.DATA:
        if (isData(payload)) data(payload)
        break
      case Signal.END:
        if (isError(payload) || payload === undefined) end(payload)
        break
      default:
        if (likelyPullableSourceTalkback(signal)) pull(signal)
        break
    }

    function handshakeFactory(): SourceInitiator {
      return (_start, sink) => {
        addSink(sink)
        connect()

        sink(Signal.START, talkback)

        function talkback(): PullableSourceTalkback {
          return (signal: Signal, error?: ErrorPayload) => {
            if (isEndSignal(signal)) {
              removeSink(sink)
              if (error) log('Received an error from sink', error)
            }
            if (sinks.length === 0) {
              disconnect()
            }
          }
        }
      }
    }

    function data(payload: Data) {
      socket?.write(payload)
    }

    function end(error?: ErrorPayload) {
      sendToSinks(Signal.END, error)
      disconnect()
    }

    function pull(talkback: PullableSourceTalkback) {
      talkback(Signal.DATA)
    }
  }


  function handshakeBack(sink: SinkTalkback, sourceTalkback: SourceTalkback) {
    log('Sending START handshake to sink')
    sink(Signal.START, sourceTalkback)
  }

  function deliver(sink: SinkTalkback, data: Data) {
    log(`Sending DATA to sink`, data?.toString(), data)
    sink(Signal.DATA, data)
  }

  function terminate(sink: SinkTalkback, error?: ErrorPayload) {
    log(`Sending END sink`, error?.toString())
    if (error) sink(Signal.END, error)
    else sink(Signal.END)
  }

  function addSink(sink: SinkTalkback) {
    log('Adding sink')
    sinks.push(sink)
  }

  function removeSink(sink: SinkTalkback) {
    log('Removing sink')
    if (sinks.includes(sink)) sinks.splice(sinks.indexOf(sink), 1)
  }

  function sendToSinks(signal: Signal, payload?: SourceTalkback | Data | ErrorPayload) {
    if (socket && ready) sinks.forEach(sink => {
      if (isStartSignal(signal) && likelySourceTalkBack(payload)) handshakeBack(sink, payload)
      else if (isDataSignal(signal) && isData(payload)) deliver(sink, payload)
      else if (isEndSignal(signal) && (isError(payload) || payload === undefined)) terminate(sink, payload)
    })
    else if (payload) buffer.push(payload)
  }

  function connect() {
    if (!socket) {
      socket = new net.Socket()
      socket.on('connect', (error: Error | undefined) => {
        clearTimeout(timeout)
        if (error) throw new Error(`Error connecting with options: ${printOptions} ${error}`)
        log(`Connected with: ${printOptions}`)
        let payload
        while ((payload = buffer.pop())) {
          if (likelySourceTalkBack(payload)) { continue }
          if (isError(payload)) { continue } // don't send error ? if so, do: send sink(2, error)
          if (isData(payload)) socket?.write(payload)
        }
      })
      socket.on('ready', () => {
        log('socket ready')
        ready = true
      })
      socket.on('data', chunk => {
        log(`Received from: ${printOptions}:`, chunk.toString())
        sendToSinks(Signal.DATA, chunk)
      })
      socket.on('end', () => {
        log('socket end')
        if (reconnectOnEnd) {
          tryReconnect(() => {
            sendToSinks(Signal.END)
            disconnect()
          })
        } else {
          log(`Disconnecting from ${printOptions} on end`)
          sendToSinks(Signal.END)
          disconnect()
        }
      })
      socket.on('close', (error: Error | null) => {
        log('socket close', error ? error : '')
        tryReconnect(() => {
          sendToSinks(Signal.END)
          disconnect()
        })
        sendToSinks(Signal.END, error ? error.toString() : undefined)
      })
      socket.on('error', error => {
        log('socket close', error)
        if (reconnectOnEnd) {
          tryReconnect(() => {
            log(error)
            sendToSinks(Signal.END, error ? error.toString() : undefined)
            disconnect()
          })
        } else {
          log(`Disconnecting from ${printOptions}`, error)
          sendToSinks(Signal.END)
          disconnect()
        }
      })
      socket.connect(socketOptions, connectionListener)
    }
  }

  function disconnect() {
    log('disconnect called')
    socket?.destroy()
  }

  function tryReconnect(callback: () => void) {
    const shouldReconnect = () => retries === -1 || !finished && attempts < retries

    if (retries === -1) finished = false
    if (shouldReconnect()) {
      log(`Attempting reconnection to ${printOptions} ${retries === -1 ? 'for eternity' : `: attempt ${attempts + 1} of ${retries}`}`)
      reconnect()
    }
    else {
      log(`Ending reconnection attempts to ${printOptions}`)
      if (callback) callback()
      disconnect()
      socket = null
    }
  }

  function reconnect() {
    clearTimeout(timeout)
    timeout = setTimeout(() => socket?.connect(socketOptions, () => {
      attempts = 0
      // connectionListener && connectionListener()
    }
    ), 1000)
    attempts++
    if (attempts >= retries && retries !== -1) {
      disconnect()
      finished = true
    }
  }
}

function isStartSignal(signal: Signal): signal is Signal.START { return signal === 0 }
function isDataSignal(signal: Signal): signal is Signal.DATA { return signal === 1 }
function isEndSignal(signal: Signal): signal is Signal.END { return signal === 2 }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function likelyCallbag(fn: any): fn is Callbag { return isFunction(fn) && fn.length === 2 }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function likelySourceTalkBack(fn: any): fn is SourceTalkback { return isFunction(fn) && fn.length === 1 }
function likelyPullableSourceTalkback(fn: unknown): fn is PullableSourceTalkback { return likelySourceTalkBack(fn) }
function isSinkTalkback(signal: Signal, payload: unknown): payload is SinkTalkback { return isStartSignal(signal) && likelyCallbag(payload) && payload.length === 2 }

function isFunction(fn: unknown) { return Object.prototype.toString.call(fn) === '[object Function]' }
function isString(string: unknown) { return !!(typeof string === 'string' || string instanceof String) }
function isError(payload: unknown): payload is ErrorPayload { return payload instanceof Error || isString(payload) }
function isData(payload: unknown): payload is Data { return Buffer.isBuffer(payload) || Uint8Array.name === 'Uint8Array' }
