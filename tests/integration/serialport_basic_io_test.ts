/**
 * Basic I/O integration tests for SerialPort without parsers
 * Tests fundamental read/write operations
 */

import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { SerialPort } from '../../src/core/serialport.ts'
import { createVirtualSerialPorts, writeAll } from '../helpers/socat.ts'

describe('SerialPort - Basic I/O Tests', {
    sanitizeResources: false,
}, () => {
    it('should write and read raw bytes (loopback)', async () => {
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

            // Write raw bytes
            const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05])
            await writeAll(port1, testData)

            await new Promise((resolve) => setTimeout(resolve, 50))

            const received = await port2.read()

            assertEquals(received.length, testData.length)
            assertEquals(received, testData)

            port1.close()
            port2.close()
        } finally {
            await virtualPorts.cleanup()
        }
    })

    it('should read with size parameter (partial read)', async () => {
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

            const testData = 'Hello World from Serial Port!'
            await writeAll(port1, testData)

            await new Promise((resolve) => setTimeout(resolve, 50))

            // Read only first 5 bytes
            const received = await port2.read(5)

            assertEquals(received.length, 5)
            assertEquals(new TextDecoder().decode(received), 'Hello')

            // Read remaining data
            await new Promise((resolve) => setTimeout(resolve, 20))
            const remaining = await port2.read()
            assertEquals(new TextDecoder().decode(remaining), ' World from Serial Port!')

            port1.close()
            port2.close()
        } finally {
            await virtualPorts.cleanup()
        }
    })

    it('should handle binary data with all byte values', async () => {
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

            // Test all byte values including null bytes and high values
            const binaryData = new Uint8Array([
                0x00,
                0x01,
                0x7F,
                0x80,
                0xFF,
                0xAA,
                0x55,
                0xDE,
                0xAD,
                0xBE,
                0xEF,
            ])
            await writeAll(port1, binaryData)

            await new Promise((resolve) => setTimeout(resolve, 50))

            const received = await port2.read()

            assertEquals(received, binaryData)

            port1.close()
            port2.close()
        } finally {
            await virtualPorts.cleanup()
        }
    })
})
