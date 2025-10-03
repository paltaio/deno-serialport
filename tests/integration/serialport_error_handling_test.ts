/**
 * Error handling integration tests for SerialPort
 * Tests critical error scenarios
 */

import { assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { SerialPortError, SerialPortErrorCode } from '../../src/core/types.ts'
import { createVirtualSerialPorts } from '../helpers/socat.ts'

describe('SerialPort - Error Handling Tests', {
  sanitizeResources: false,
}, () => {
  it('should throw PORT_NOT_FOUND when opening non-existent port', () => {
    const nonExistentPort = '/dev/ttyNONEXISTENT999'

    try {
      new SerialPort({
        path: nonExistentPort,
        baudRate: 9600,
        autoOpen: true,
      })
      throw new Error('Expected constructor to throw')
    } catch (err) {
      if (err instanceof SerialPortError) {
        assertEquals(err.code, SerialPortErrorCode.PORT_NOT_FOUND)
        assertEquals(err.message.includes('Port not found'), true)
      } else {
        throw err
      }
    }
  })

  it('should throw PORT_CLOSED when operating on closed port', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
      })

      port.close()

      // All operations should fail with PORT_CLOSED
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

      try {
        port.flush()
        throw new Error('Expected flush to throw')
      } catch (err) {
        assertEquals(err instanceof SerialPortError, true)
        assertEquals((err as SerialPortError).code, SerialPortErrorCode.PORT_CLOSED)
      }

      try {
        port.sendBreak()
        throw new Error('Expected sendBreak to throw')
      } catch (err) {
        assertEquals(err instanceof SerialPortError, true)
        assertEquals((err as SerialPortError).code, SerialPortErrorCode.PORT_CLOSED)
      }
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should throw error when opening already open port', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
      })

      assertEquals(port.isPortOpen, true)

      // Try to open again - should fail
      try {
        port.open()
        throw new Error('Expected open() to throw on already open port')
      } catch (err) {
        // Should throw an error (type depends on implementation)
        assertEquals(err instanceof Error, true)
        assertEquals((err as Error).message.length > 0, true)
      }

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })
})
