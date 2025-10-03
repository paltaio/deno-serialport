/**
 * Integration tests for SerialPort with parsers using virtual serial ports
 */

import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { ByteLengthParser, DelimiterParser, ReadlineParser } from '../../src/parsers/mod.ts'
import { createVirtualSerialPorts, writeAll } from '../helpers/socat.ts'

describe('SerialPort - Parser Integration Tests', {
  sanitizeResources: false, // FFI library remains loaded globally
}, () => {
  it('should work with DelimiterParser', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser
      const parser = new DelimiterParser({ delimiter: '|' })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Send delimited data
      await writeAll(port1, 'hello|world|foo|bar|')

      // Read parsed chunks
      const results: string[] = []

      for (let i = 0; i < 4; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(new TextDecoder().decode(value))
        }
      }

      assertEquals(results, ['hello', 'world', 'foo', 'bar'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should work with ReadlineParser', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser
      const parser = new ReadlineParser({ delimiter: '\n' })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Send line-delimited data
      await writeAll(port1, 'line1\nline2\nline3\n')

      // Read parsed lines
      const results: string[] = []

      for (let i = 0; i < 3; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(value)
        }
      }

      assertEquals(results, ['line1', 'line2', 'line3'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should work with ByteLengthParser', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser for 5-byte chunks
      const parser = new ByteLengthParser({ length: 5 })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Send data
      await writeAll(port1, 'HelloWorld12345')

      // Read parsed chunks
      const results: string[] = []

      for (let i = 0; i < 3; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(new TextDecoder().decode(value))
        }
      }

      assertEquals(results, ['Hello', 'World', '12345'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle multiple parsers in chain', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Chain TWO parsers: first split by delimiter '|', then split each segment by newline
      const delimiterParser = new DelimiterParser({ delimiter: '|' })
      const lineParser = new ReadlineParser({ delimiter: '\n' })

      // Actually chain them together
      const reader = port2.readable
        .pipeThrough(delimiterParser) // First parser: split by '|'
        .pipeThrough(lineParser) // Second parser: split by newline
        .getReader()

      // Send data with both delimiters: segments separated by '|', lines separated by '\n'
      await writeAll(port1, 'line1\nline2\n|line3\nline4\n|')

      // Read parsed results (should get individual lines from both segments)
      const results: string[] = []

      for (let i = 0; i < 4; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(value)
        }
      }

      assertEquals(results, ['line1', 'line2', 'line3', 'line4'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle AT command style communication', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser for CRLF-delimited responses
      const parser = new ReadlineParser({ delimiter: '\r\n' })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Simulate AT command responses
      await writeAll(port1, 'AT\r\n')
      await writeAll(port1, 'OK\r\n')
      await writeAll(port1, 'AT+CSQ\r\n')
      await writeAll(port1, '+CSQ: 25,0\r\n')
      await writeAll(port1, 'OK\r\n')

      // Read responses
      const results: string[] = []

      for (let i = 0; i < 5; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(value)
        }
      }

      assertEquals(results, ['AT', 'OK', 'AT+CSQ', '+CSQ: 25,0', 'OK'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle binary protocol with ByteLengthParser', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser for 4-byte messages
      const parser = new ByteLengthParser({ length: 4 })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Send binary messages
      const message1 = new Uint8Array([0x01, 0x02, 0x03, 0x04])
      const message2 = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD])
      const message3 = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC])

      await writeAll(port1, message1)
      await writeAll(port1, message2)
      await writeAll(port1, message3)

      // Read messages
      const results: Uint8Array[] = []

      for (let i = 0; i < 3; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(value)
        }
      }

      assertEquals(results[0], message1)
      assertEquals(results[1], message2)
      assertEquals(results[2], message3)

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle parser with custom delimiter bytes', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
      })

      // Setup parser with null byte delimiter
      const parser = new DelimiterParser({ delimiter: new Uint8Array([0x00]) })
      const readable = port2.readable.pipeThrough(parser)
      const reader = readable.getReader()

      // Send null-delimited data
      await writeAll(
        port1,
        new Uint8Array([
          0x48,
          0x65,
          0x6C,
          0x6C,
          0x6F,
          0x00, // "Hello\0"
          0x57,
          0x6F,
          0x72,
          0x6C,
          0x64,
          0x00, // "World\0"
        ]),
      )

      // Read parsed chunks
      const results: string[] = []

      for (let i = 0; i < 2; i++) {
        const { value } = await reader.read()
        if (value) {
          results.push(new TextDecoder().decode(value))
        }
      }

      assertEquals(results, ['Hello', 'World'])

      reader.releaseLock()
      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })
})
