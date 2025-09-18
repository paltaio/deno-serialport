/**
 * Parser that splits data on a delimiter
 */

import { BaseParser, type BaseParserOptions } from './base.ts'

/**
 * Options for the delimiter parser
 */
export interface DelimiterParserOptions extends BaseParserOptions {
  /** The delimiter to split on */
  delimiter: Uint8Array | string
  /** Include the delimiter in the result (default: false) */
  includeDelimiter?: boolean
  /** Maximum buffer size in bytes before throwing an error (default: 65536) */
  maxBufferSize?: number
}

/**
 * Parser that splits incoming data on a specified delimiter
 *
 * @example
 * ```typescript
 * const parser = new DelimiterParser({ delimiter: '\n' })
 * const reader = port.readable
 *   .pipeThrough(parser)
 *   .getReader()
 *
 * while (true) {
 *   const { done, value } = await reader.read()
 *   if (done) break
 *   console.log('Line:', new TextDecoder().decode(value))
 * }
 * ```
 */
export class DelimiterParser extends BaseParser<Uint8Array> {
  private delimiter: Uint8Array
  private includeDelimiter: boolean
  private maxBufferSize: number

  constructor(options: DelimiterParserOptions) {
    super(options)

    // Convert string delimiter to Uint8Array
    if (typeof options.delimiter === 'string') {
      this.delimiter = new TextEncoder().encode(options.delimiter)
    } else {
      this.delimiter = options.delimiter
    }

    if (this.delimiter.length === 0) {
      throw new Error('Delimiter must not be empty')
    }

    this.includeDelimiter = options.includeDelimiter ?? false
    this.maxBufferSize = options.maxBufferSize ?? 65536
  }

  protected processChunk(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<Uint8Array>,
  ): void {
    // Add new data to buffer
    this.buffer = this.concat(this.buffer, chunk)

    // Check buffer size limit
    if (this.buffer.length > this.maxBufferSize) {
      const error = new Error(
        `DelimiterParser buffer exceeded max size of ${this.maxBufferSize} bytes`,
      )
      controller.error(error)
      return
    }

    // Look for delimiters and emit chunks
    let position: number
    while ((position = this.indexOf(this.buffer, this.delimiter)) !== -1) {
      const data = this.includeDelimiter
        ? this.buffer.slice(0, position + this.delimiter.length)
        : this.buffer.slice(0, position)

      // Skip empty chunks unless includeDelimiter is true
      if (data.length > 0 || this.includeDelimiter) {
        controller.enqueue(data)
      }

      // Remove processed data from buffer
      this.buffer = this.buffer.slice(position + this.delimiter.length)
    }
  }

  protected override processFlush(controller: TransformStreamDefaultController<Uint8Array>): void {
    // Emit any remaining data in the buffer
    if (this.buffer.length > 0) {
      controller.enqueue(this.buffer)
      this.buffer = new Uint8Array(0)
    }
  }
}