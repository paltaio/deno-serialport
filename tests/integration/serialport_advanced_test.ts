/**
 * Advanced integration tests for SerialPort
 * Tests autoOpen, ReadableStream lifecycle, and edge cases
 */

import { assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { SerialPortError } from '../../src/core/types.ts'
import { createVirtualSerialPorts, writeAll } from '../helpers/socat.ts'

describe('SerialPort - Advanced Tests', {
  sanitizeResources: false,
}, () => {
  it('should work with autoOpen: false', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        autoOpen: false,
      })

      assertEquals(port.isPortOpen, false)

      // Operations should fail before manual open
      await assertRejects(
        () => port.read(),
        SerialPortError,
        'Port not open',
      )

      await assertRejects(
        () => port.write('test'),
        SerialPortError,
        'Port not open',
      )

      // Manually open the port
      port.open()
      assertEquals(port.isPortOpen, true)

      // Now operations should work
      const data = await port.read()
      assertEquals(data instanceof Uint8Array, true)

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should fail when trying to get multiple readers on ReadableStream', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      const reader1 = port.readable.getReader()

      // Try to get second reader - should fail (stream is locked)
      try {
        port.readable.getReader()
        throw new Error('Expected getReader to throw')
      } catch (err) {
        assertEquals(err instanceof TypeError, true)
      }

      reader1.releaseLock()
      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle stream cancellation and stop reading', async () => {
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

      const reader = port2.readable.getReader()

      // Send data
      await writeAll(port1, 'Test data')
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Read once
      const { value } = await reader.read()
      assertEquals(value !== undefined, true)

      // Cancel the stream
      await reader.cancel()

      // After cancel, stream should be done
      const { done } = await reader.read()
      assertEquals(done, true)

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle ReadableStream with sequential readers', async () => {
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

      // First reader
      const reader1 = port2.readable.getReader()

      await writeAll(port1, 'Message 1')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const { value: value1 } = await reader1.read()
      assertEquals(value1 !== undefined, true)
      assertEquals(new TextDecoder().decode(value1), 'Message 1')

      reader1.releaseLock()

      // Second reader should work after first is released
      const reader2 = port2.readable.getReader()

      await writeAll(port1, 'Message 2')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const { value: value2 } = await reader2.read()
      assertEquals(value2 !== undefined, true)
      assertEquals(new TextDecoder().decode(value2), 'Message 2')

      reader2.releaseLock()

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle port close and reopen cycle correctly', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        autoOpen: false,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 9600,
      })

      // Open, use, close, reopen cycle
      for (let i = 0; i < 3; i++) {
        port1.open()
        assertEquals(port1.isPortOpen, true, `Port should be open on iteration ${i}`)

        // Actually transfer data to verify port works
        await writeAll(port1, `Test ${i}`)
        await new Promise((resolve) => setTimeout(resolve, 50))

        const received = await port2.read()
        assertEquals(new TextDecoder().decode(received), `Test ${i}`)

        port1.close()
        assertEquals(port1.isPortOpen, false, `Port should be closed on iteration ${i}`)
      }

      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })
})
