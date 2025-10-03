/**
 * macOS-specific integration tests for SerialPort
 * These tests account for macOS limitations (no signal support via FFI)
 */

import { assertEquals, assertThrows } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { createVirtualSerialPorts, writeAll } from '../helpers/socat.ts'
import { isDarwin } from '../../src/utils/platform.ts'

// Skip all tests if not on macOS
const describeMacOS = isDarwin() ? describe : describe.ignore

describeMacOS('SerialPort - macOS-Specific Tests', () => {
  it('should return default signal values on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({ path: virtualPorts.port1, baudRate: 9600 })

      // On macOS, signals return default values due to FFI limitations
      const signals = port.getSignals()

      // Verify we get a signals object with default values
      assertEquals(signals, { cts: false, dsr: false, dcd: false, ring: false })

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should silently ignore setSignals on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port = new SerialPort({ path: virtualPorts.port1, baudRate: 9600 })

      // On macOS, setSignals is silently ignored (doesn't throw)
      port.setSignals({ dtr: true, rts: true })
      port.setSignals({ dtr: false, rts: false })

      // Port should still be functional
      assertEquals(port.isPortOpen, true)

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should reject mark parity on macOS', () => {
    assertThrows(
      () => {
        new SerialPort({
          path: '/tmp/vserial0',
          baudRate: 9600,
          parity: 'mark',
          autoOpen: false,
        })
      },
      Error,
      'Mark parity is not supported on macOS',
    )
  })

  it('should reject space parity on macOS', () => {
    assertThrows(
      () => {
        new SerialPort({
          path: '/tmp/vserial0',
          baudRate: 9600,
          parity: 'space',
          autoOpen: false,
        })
      },
      Error,
      'Space parity is not supported on macOS',
    )
  })

  it('should use cfsetispeed/cfsetospeed for baud rate on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      // macOS uses actual baud rate values, not bit flags
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
      })

      assertEquals(port.isPortOpen, true)

      // Verify communication works (baud rate was set correctly)
      await writeAll(port, 'macOS baud test')

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should support standard parities on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const parities = ['none', 'even', 'odd'] as const

      for (const parity of parities) {
        const port = new SerialPort({
          path: virtualPorts.port1,
          baudRate: 9600,
          parity,
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

  it('should handle cu.* device paths on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      // macOS typically uses /dev/cu.* for call-out devices
      // Our test uses /tmp/vserial* but verifies the port system works

      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 9600,
      })

      assertEquals(port.isPortOpen, true)
      assertEquals(port.path, virtualPorts.port1)

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle hardware flow control on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      const port1 = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
        rtscts: true,
      })

      const port2 = new SerialPort({
        path: virtualPorts.port2,
        baudRate: 115200,
        rtscts: true,
      })

      // Test communication with RTS/CTS enabled
      await writeAll(port1, 'macOS RTS/CTS test')
      await new Promise((resolve) => setTimeout(resolve, 100))

      const data = await port2.read()
      assertEquals(new TextDecoder().decode(data), 'macOS RTS/CTS test')

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle software flow control on macOS', async () => {
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

      // Test communication with XON/XOFF
      await writeAll(port1, 'macOS XON/XOFF test')
      await new Promise((resolve) => setTimeout(resolve, 100))

      const data = await port2.read()
      assertEquals(new TextDecoder().decode(data), 'macOS XON/XOFF test')

      port1.close()
      port2.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })

  it('should handle different data bits on macOS', async () => {
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

  it('should handle different stop bits on macOS', async () => {
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

  it('should handle 72-byte termios structure on macOS', async () => {
    const virtualPorts = await createVirtualSerialPorts()

    try {
      // macOS uses a 72-byte termios structure (different from Linux's 60 bytes)
      const port = new SerialPort({
        path: virtualPorts.port1,
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      })

      assertEquals(port.isPortOpen, true)

      // Verify the port works correctly with macOS termios structure
      await writeAll(port, 'macOS termios test')

      port.close()
    } finally {
      await virtualPorts.cleanup()
    }
  })
})
