/**
 * Basic SerialPort usage example
 */

import { listPorts, SerialPort } from '../mod.ts'

// List all available serial ports
console.log('Scanning for serial ports...')
const ports = await listPorts()

if (ports.length === 0) {
  console.log('No serial ports found!')
  console.log('Make sure you have:')
  console.log('  1. A serial device connected')
  console.log('  2. Permission to access /dev/tty* devices')
  console.log('  3. Run with: deno run --allow-ffi --allow-read examples/basic.ts')
  Deno.exit(1)
}

console.log('\nFound ports:')
for (const port of ports) {
  console.log(`  ${port.path}`)
  if (port.manufacturer) {
    console.log(`    Manufacturer: ${port.manufacturer}`)
  }
  if (port.serialNumber) {
    console.log(`    Serial: ${port.serialNumber}`)
  }
}

// Use the first available port or specify your own
const portPath = ports?.[0]?.path
if (!portPath) {
  throw new Error('No port found')
}
console.log(`\nUsing port: ${portPath}`)

// Create and open a serial port
const port = new SerialPort({
  path: portPath,
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
})

console.log('Port opened successfully!')

// Get port signals
const signals = port.getSignals()
console.log('\nPort signals:', signals)

// Write some data
const message = 'Hello from Deno SerialPort!\r\n'
console.log(`\nSending: ${message.trim()}`)
const bytesWritten = await port.write(message)
console.log(`Wrote ${bytesWritten} bytes`)

// Read data (with timeout)
console.log('\nWaiting for response (3 seconds)...')
const timeout = setTimeout(() => {
  console.log('No response received')
  port.close()
  Deno.exit(0)
}, 3000)

// Read loop
while (port.isPortOpen) {
  const data = await port.read(256)
  if (data.length > 0) {
    clearTimeout(timeout)
    const text = new TextDecoder().decode(data)
    console.log(`Received: ${text}`)
    break
  }
  await new Promise((resolve) => setTimeout(resolve, 100))
}

// Close the port
port.close()
console.log('\nPort closed')
