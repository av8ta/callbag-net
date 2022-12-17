import { describe } from 'node:test'
import assert from 'node:assert/strict'
import Debug from 'debug'
const log = Debug('callbag-net:client:test')

describe('true is true', () => {
  assert(true)
})

describe.skip('true is true', () => {
  assert(false)
})
