/**
 * Base parser class for SerialPort data transformation
 *
 * All parsers extend TransformStream to provide stream-based data processing
 */

/**
 * Base parser class that all parsers extend
 * Provides common functionality for transforming serial port data
 */
export type BaseParserOptions = Record<string, unknown>

export abstract class BaseParser<T = Uint8Array> extends TransformStream<Uint8Array, T> {
  protected buffer: Uint8Array = new Uint8Array(0)

  constructor(_options: BaseParserOptions = {}) {
    super({
      transform: (chunk: Uint8Array, controller) => {
        this.processChunk(chunk, controller)
      },
      flush: (controller) => {
        this.processFlush(controller)
      },
    })
  }

  /**
   * Process an incoming chunk of data
   * Must be implemented by subclasses
   */
  protected abstract processChunk(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<T>,
  ): void

  /**
   * Process any remaining data when the stream is closing
   * Can be overridden by subclasses if needed
   */
  protected processFlush(_controller: TransformStreamDefaultController<T>): void {
    // Default implementation does nothing
    // Subclasses can override if they need to handle remaining buffer data
  }

  /**
   * Concatenate two Uint8Arrays
   */
  protected concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length)
    result.set(a, 0)
    result.set(b, a.length)
    return result
  }

  /**
   * Find the index of a delimiter in a buffer
   */
  protected indexOf(buffer: Uint8Array, delimiter: Uint8Array): number {
    if (delimiter.length === 0) return -1
    if (buffer.length < delimiter.length) return -1

    outer: for (let i = 0; i <= buffer.length - delimiter.length; i++) {
      for (let j = 0; j < delimiter.length; j++) {
        if (buffer[i + j] !== delimiter[j]) continue outer
      }
      return i
    }
    return -1
  }
}
