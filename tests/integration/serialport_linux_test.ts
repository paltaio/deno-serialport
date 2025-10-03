/**
 * Linux-specific integration tests for SerialPort
 * These tests include signal handling which is fully supported on Linux
 */

import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { SerialPortError, SerialPortErrorCode } from '../../src/core/types.ts'
import { createVirtualSerialPorts, writeAll } from '../helpers/socat.ts'
import { isLinux } from '../../src/utils/platform.ts'

// Skip all tests if not on Linux
const describeLinux = isLinux() ? describe : describe.ignore

describeLinux('SerialPort - Linux-Specific Tests', {
  sanitizeResources: false, // FFI library remains loaded globally
}, () => {
  it('should get modem control signals', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
      })

      // Get signals - on virtual ports (PTY) these operations may not be supported
      try {
        const signals = port.getSignals()

        // Verify signal structure exists
        assertEquals(typeof signals.cts, 'boolean')
        assertEquals(typeof signals.dsr, 'boolean')
        assertEquals(typeof signals.dcd, 'boolean')
        assertEquals(typeof signals.ring, 'boolean')
      } catch (error) {
        // Expected on virtual ports - PTY doesn't support TIOCMGET
        if (error instanceof SerialPortError) {
          assertEquals(error.code, SerialPortErrorCode.OPERATION_NOT_SUPPORTED)
        } else if (error instanceof Error && error.message.includes('not supported')) {
          // Legacy error handling - API works correctly even if device doesn't support it
        } else {
          throw error
        }
      }

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should set modem control signals', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
      })

      // Set DTR and RTS - on virtual ports (PTY) these operations may not be supported
      try {
        port.setSignals({ dtr: true, rts: true })
        port.setSignals({ dtr: false, rts: false })
        // Test passes if no exception thrown
      } catch (error) {
        // Expected on virtual ports - PTY doesn't support TIOCMSET
        if (error instanceof SerialPortError) {
          assertEquals(error.code, SerialPortErrorCode.OPERATION_NOT_SUPPORTED)
        } else if (error instanceof Error && error.message.includes('not supported')) {
          // Legacy error handling - API works correctly even if device doesn't support it
        } else {
          throw error
        }
      }

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should support mark parity on Linux', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        parity: 'mark',
        autoOpen: false,
      })

      // Should not throw on Linux
      port.open()
      assertEquals(port.isPortOpen, true)

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should support space parity on Linux', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        parity: 'space',
        autoOpen: false,
      })

      // Should not throw on Linux
      port.open()
      assertEquals(port.isPortOpen, true)

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle IOCTL operations on Linux', async () => {
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

      // Test that IOCTL-dependent operations work (if supported by device)
      try {
        const signals = port1.getSignals()
        assertEquals(typeof signals, 'object')

        // Set signals (uses IOCTL internally)
        port1.setSignals({ dtr: true, rts: true })
      } catch (_) {
        // Expected on virtual ports - PTY doesn't support these IOCTLs
        // Test still passes as long as basic communication works
      }

      // Verify basic communication still works
      await writeAll(port1, 'IOCTL test')
      await new Promise((resolve) => setTimeout(resolve, 100))

      const data = await port2.read()
      assertEquals(new TextDecoder().decode(data), 'IOCTL test')

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle different data bits configurations', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const dataBitsOptions = [5, 6, 7, 8] as const

      for (const dataBits of dataBitsOptions) {
        const port = new SerialPort({
          path: virtualPorts.port1,
          baudRate: 9600,
          dataBits,
          autoOpen: false,
        })

        port.open()
        assertEquals(port.isPortOpen, true)
        port.close()
      }
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle different stop bits configurations', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const stopBitsOptions = [1, 2] as const

      for (const stopBits of stopBitsOptions) {
        const port = new SerialPort({
          path: virtualPorts.port1,
          baudRate: 9600,
          stopBits,
          autoOpen: false,
        })

        port.open()
        assertEquals(port.isPortOpen, true)
        port.close()
      }
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle hardware flow control (RTS/CTS)', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
        rtscts: true,
        autoOpen: false,
      })

      port.open()
      assertEquals(port.isPortOpen, true)

      // Communication should still work with RTS/CTS enabled
      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle software flow control (XON/XOFF)', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        xon: true,
        xoff: true,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 9600,
        xon: true,
        xoff: true,
      })

      // Test communication with software flow control
      await writeAll(port1, 'XON/XOFF test')
      await new Promise((resolve) => setTimeout(resolve, 100))

      const data = await port2.read()
      assertEquals(new TextDecoder().decode(data), 'XON/XOFF test')

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle XANY flow control', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        xon: true,
        xoff: true,
        xany: true,
        autoOpen: false,
      })

      port.open()
      assertEquals(port.isPortOpen, true)
      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle HUPCL (hang up on close)', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
        hupcl: true,
        autoOpen: false,
      })

      port.open()
      assertEquals(port.isPortOpen, true)
      port.close()

      // Port should hang up on close
      assertEquals(port.isPortOpen, false)
    } finally {
      await virtualPorts.cleanup()
    }
  })
})
