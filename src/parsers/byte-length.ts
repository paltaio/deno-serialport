/**
 * Parser that emits data in fixed-length chunks
 */

import { BaseParser, type BaseParserOptions } from './base.ts'

/**
 * Options for the byte length parser
 */
export interface ByteLengthParserOptions extends BaseParserOptions {
  /** The number of bytes to emit at a time */
  length: number
}

/**
 * Parser that emits data in fixed-length chunks
 *
 * @example
 * ```typescript
 * // Emit data in 10-byte chunks
 * const parser = new ByteLengthParser({ length: 10 })
 * const reader = port.readable
 *   .pipeThrough(parser)
 *   .getReader()
 *
 * while (true) {
 *   const { done, value } = await reader.read()
 *   if (done) break
 *   console.log('Chunk:', value) // Always 10 bytes (except possibly the last chunk)
 * }
 * ```
 */
export class ByteLengthParser extends BaseParser<Uint8Array> {
  private length: number

  constructor(options: ByteLengthParserOptions) {
    super(options)

    if (options.length <= 0) {
      throw new Error('ByteLengthParser length must be greater than 0')
    }

    if (!Number.isInteger(options.length)) {
      throw new Error('ByteLengthParser length must be an integer')
    }

    this.length = options.length
  }

  protected processChunk(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<Uint8Array>,
  ): void {
    // Add new data to buffer
    this.buffer = this.concat(this.buffer, chunk)

    // Emit chunks of the specified length
    while (this.buffer.length >= this.length) {
      const data = this.buffer.slice(0, this.length)
      controller.enqueue(data)
      this.buffer = this.buffer.slice(this.length)
    }
  }

  protected override processFlush(controller: TransformStreamDefaultController<Uint8Array>): void {
    // Emit any remaining data in the buffer
    // This might be less than the specified length
    if (this.buffer.length > 0) {
      controller.enqueue(this.buffer)
      this.buffer = new Uint8Array(0)
    }
  }
}
