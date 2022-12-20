/**
 * Aadapted from callbag-types which is based on the work of krawaller
 * 
 * Spec: https://github.com/callbag/callbag
 * Original Typing work: http://blog.krawaller.se/posts/explaining-callbags-via-typescript-definitions/
 */

export enum Signal {
  START = 0,
  DATA = 1,
  END = 2
}

export type ErrorPayload = string | Error

/**
 * Quoth the spec:
 *
 * "A callbag is terminated when the first argument is 2 and the second
 * argument is either undefined (signalling termination due to success)
 * or any truthy value (signalling termination due to failure)."
 */
export type PullableSourceTalkback = (request: Signal.DATA | Signal.END) => void
export type ListenableSourceTalkback = (terminate: Signal.END) => void
export type SourceTalkback = PullableSourceTalkback | ListenableSourceTalkback

export type SinkTalkback = ((start: Signal.START, sourceTalkback: SourceTalkback) => void) &
  ((deliver: Signal.DATA, data: unknown) => void) &
  ((terminate: Signal.END, error?: ErrorPayload) => void)

/**
 * Quoth the spec:
 *
 * "When a source is greeted and given a sink as payload, the sink MUST
 * be greeted back with a callbag payload that is either the source
 * itself or another callbag (known as the 'talkback'). In other
 * words, greets are mutual. Reciprocal greeting is called a handshake."
 */
export type SourceInitiator = (type: Signal.START, payload: SinkTalkback) => void
export type SinkConnector = (source: SourceInitiator) => SourceInitiator | void
export type SourceFactory = (...args: Array<unknown>) => SourceInitiator
export type Operator = (...args: Array<unknown>) => SinkConnector

export type Callbag =
  | SourceTalkback
  | SinkTalkback
  | SourceFactory
  | SourceInitiator
  | SinkConnector
