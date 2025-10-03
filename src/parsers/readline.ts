/**
 * Parser that splits data on line endings
 */

import { BaseParser, type BaseParserOptions } from './base.ts'
import { DEFAULT_MAX_BUFFER_SIZE } from '../core/constants.ts'

/**
 * Options for the readline parser
 */
export interface ReadlineParserOptions extends BaseParserOptions {
  /** The line delimiter (default: '\n') */
  delimiter?: string | Uint8Array
  /** Encoding to use when converting to string (default: 'utf-8') */
  encoding?: string
  /** Include the delimiter in the result (default: false) */
  includeDelimiter?: boolean
  /** Maximum buffer size in bytes before throwing an error (default: 65536) */
  maxBufferSize?: number
}

/**
 * Parser that splits incoming data on line endings and returns strings
 *
 * @example
 * ```typescript
 * const parser = new ReadlineParser()
 * const reader = port.readable
 *   .pipeThrough(parser)
 *   .getReader()
 *
 * while (true) {
 *   const { done, value } = await reader.read()
 *   if (done) break
 *   console.log('Line:', value) // value is a string
 * }
 * ```
 */
export class ReadlineParser extends BaseParser<string> {
  private delimiter: Uint8Array
  private includeDelimiter: boolean
  private maxBufferSize: number
  private decoder: TextDecoder

  constructor(options: ReadlineParserOptions = {}) {
    super(options)

    // Convert string delimiter to Uint8Array
    const delimiter = options.delimiter ?? '\n'
    if (typeof delimiter === 'string') {
      this.delimiter = new TextEncoder().encode(delimiter)
    } else {
      this.delimiter = delimiter
    }

    if (this.delimiter.length === 0) {
      throw new Error('Delimiter must not be empty')
    }

    this.includeDelimiter = options.includeDelimiter ?? false
    this.maxBufferSize = options.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE
    this.decoder = new TextDecoder(options.encoding ?? 'utf-8')
  }

  protected processChunk(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<string>,
  ): void {
    // Add new data to buffer
    this.buffer = this.concat(this.buffer, chunk)

    // Check buffer size limit
    if (this.buffer.length > this.maxBufferSize) {
      const error = new Error(
        `ReadlineParser buffer exceeded max size of ${this.maxBufferSize} bytes`,
      )
      controller.error(error)
      return
    }

    // Look for delimiters and emit lines
    let position: number
    while ((position = this.indexOf(this.buffer, this.delimiter)) !== -1) {
      const data = this.includeDelimiter
        ? this.buffer.slice(0, position + this.delimiter.length)
        : this.buffer.slice(0, position)

      // Decode to string and emit
      if (data.length > 0 || this.includeDelimiter) {
        const line = this.decoder.decode(data, { stream: true })
        if (line.length > 0) {
          controller.enqueue(line)
        }
      }

      // Remove processed data from buffer
      this.buffer = this.buffer.slice(position + this.delimiter.length)
    }
  }

  protected override processFlush(controller: TransformStreamDefaultController<string>): void {
    // Emit any remaining data in the buffer
    if (this.buffer.length > 0) {
      const line = this.decoder.decode(this.buffer, { stream: false })
      if (line.length > 0) {
        controller.enqueue(line)
      }
      this.buffer = new Uint8Array(0)
    }

    // Flush the decoder
    const final = this.decoder.decode(new Uint8Array(0), { stream: false })
    if (final.length > 0) {
      controller.enqueue(final)
    }
  }
}
