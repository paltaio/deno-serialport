/**
 * Tests for SerialPort parsers
 */

import { assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import {
  ByteLengthParser,
  DelimiterParser,
  ReadlineParser,
} from '../../src/parsers/mod.ts'

describe('DelimiterParser', () => {
  it('should split data on delimiter', async () => {
    const parser = new DelimiterParser({ delimiter: '|' })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello|world|'))
        controller.enqueue(new TextEncoder().encode('foo|bar'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['hello', 'world', 'foo', 'bar'])
  })

  it('should handle delimiter as Uint8Array', async () => {
    const delimiter = new Uint8Array([0x00])
    const parser = new DelimiterParser({ delimiter })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00])) // "Hello\0"
        controller.enqueue(new Uint8Array([0x57, 0x6f, 0x72, 0x6c, 0x64, 0x00])) // "World\0"
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['Hello', 'World'])
  })

  it('should include delimiter if specified', async () => {
    const parser = new DelimiterParser({
      delimiter: '|',
      includeDelimiter: true,
    })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello|world|'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['hello|', 'world|'])
  })

  it('should emit remaining data on flush', async () => {
    const parser = new DelimiterParser({ delimiter: '|' })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello|world'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['hello', 'world'])
  })

  it('should error on buffer overflow', async () => {
    const parser = new DelimiterParser({
      delimiter: '|',
      maxBufferSize: 5,
    })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello world'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()

    await assertRejects(
      async () => {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      },
      Error,
      'buffer exceeded',
    )
  })

  it('should throw on empty delimiter', () => {
    try {
      new DelimiterParser({ delimiter: '' })
      throw new Error('Should have thrown')
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, 'Delimiter must not be empty')
      }
    }
  })
})

describe('ReadlineParser', () => {
  it('should split data on newlines', async () => {
    const parser = new ReadlineParser()

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello\nworld\n'))
        controller.enqueue(new TextEncoder().encode('foo\nbar'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(value)
    }

    assertEquals(results, ['hello', 'world', 'foo', 'bar'])
  })

  it('should handle custom delimiter', async () => {
    const parser = new ReadlineParser({ delimiter: '\r\n' })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('hello\r\nworld\r\n'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(value)
    }

    assertEquals(results, ['hello', 'world'])
  })

  it('should handle custom encoding', async () => {
    const parser = new ReadlineParser({ encoding: 'utf-8' })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('héllo\nwörld\n'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(value)
    }

    assertEquals(results, ['héllo', 'wörld'])
  })
})

describe('ByteLengthParser', () => {
  it('should emit fixed-length chunks', async () => {
    const parser = new ByteLengthParser({ length: 5 })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('HelloWorld'))
        controller.enqueue(new TextEncoder().encode('12345'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['Hello', 'World', '12345'])
  })

  it('should emit remaining data on flush', async () => {
    const parser = new ByteLengthParser({ length: 5 })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('HelloWor'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['Hello', 'Wor'])
  })

  it('should handle data across multiple chunks', async () => {
    const parser = new ByteLengthParser({ length: 6 })

    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('He'))
        controller.enqueue(new TextEncoder().encode('llo'))
        controller.enqueue(new TextEncoder().encode('Wor'))
        controller.enqueue(new TextEncoder().encode('ld!'))
        controller.close()
      },
    })

    const reader = input.pipeThrough(parser).getReader()
    const results: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      results.push(new TextDecoder().decode(value))
    }

    assertEquals(results, ['HelloW', 'orld!'])
  })

  it('should throw on zero length', () => {
    try {
      new ByteLengthParser({ length: 0 })
      throw new Error('Should have thrown')
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, 'ByteLengthParser length must be greater than 0')
      }
    }
  })

  it('should throw on negative length', () => {
    try {
      new ByteLengthParser({ length: -1 })
      throw new Error('Should have thrown')
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, 'ByteLengthParser length must be greater than 0')
      }
    }
  })

  it('should throw on non-integer length', () => {
    try {
      new ByteLengthParser({ length: 3.5 })
      throw new Error('Should have thrown')
    } catch (error) {
      if (error instanceof Error) {
        assertEquals(error.message, 'ByteLengthParser length must be an integer')
      }
    }
  })
})