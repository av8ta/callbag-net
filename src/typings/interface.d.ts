export interface Options {
  connectionListener?: () => void | undefined
  reconnectOnEnd?: boolean,
  retries?: number
}
