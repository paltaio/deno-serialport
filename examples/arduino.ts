/**
 * Arduino/ACM device connection example
 * Connects to /dev/ttyACM0 (common for Arduino boards)
 * Simply listens for incoming data
 */

import { SerialPort, SerialPortError, portExists } from '../mod.ts'

const PORT_PATH = '/dev/ttyACM0'
const BAUD_RATE = 9600 // Standard Arduino baud rate

console.log('🤖 Arduino/ACM Device Listener\n')
console.log(`Connecting to: ${PORT_PATH}`)
console.log(`Baud rate: ${BAUD_RATE}\n`)

// First check if the port exists
const exists = await portExists(PORT_PATH)
if (!exists) {
  console.error(`❌ Port ${PORT_PATH} not found!\n`)
  console.log('Troubleshooting tips:')
  console.log('  1. Check if your Arduino/device is plugged in')
  console.log('  2. Run "dmesg | grep tty" to see connected devices')
  console.log('  3. You might need to add your user to the dialout group:')
  console.log('     sudo usermod -a -G dialout $USER')
  console.log('  4. Try running with sudo (not recommended for production)')
  console.log('\nRun list_ports.ts to see available ports:')
  console.log('  deno run --allow-ffi --allow-read examples/list_ports.ts')
  Deno.exit(1)
}

console.log(`✅ Port ${PORT_PATH} exists\n`)

// Create serial port instance
let port: SerialPort

try {
  port = new SerialPort({
    path: PORT_PATH,
    baudRate: BAUD_RATE,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    autoOpen: false, // We'll open it manually to handle errors
  })

  console.log('📡 Opening port...')
  port.open()
  console.log('✅ Port opened successfully!\n')

} catch (error) {
  if (error instanceof SerialPortError) {
    console.error(`❌ Failed to open port: ${error.message}\n`)

    if (error.code === 'ACCESS_DENIED') {
      console.log('Permission denied. Try:')
      console.log('  1. sudo usermod -a -G dialout $USER (then logout/login)')
      console.log('  2. sudo chmod 666 /dev/ttyACM0 (temporary fix)')
      console.log('  3. Run with sudo (not recommended)')
    }
  } else {
    console.error('Unexpected error:', error)
  }
  Deno.exit(1)
}

// Display port signals
console.log('📊 Port signals:')
const signals = port.getSignals()
console.log(`  CTS: ${signals.cts ? '✓' : '✗'}`)
console.log(`  DSR: ${signals.dsr ? '✓' : '✗'}`)
console.log(`  DCD: ${signals.dcd ? '✓' : '✗'}`)
console.log(`  Ring: ${signals.ring ? '✓' : '✗'}\n`)

// Set DTR and RTS (often needed for Arduino reset)
port.setSignals({ dtr: true, rts: true })
console.log('✅ DTR and RTS signals set\n')

// Listen for incoming data
console.log('👂 Listening for data (Press Ctrl+C to exit)\n')
console.log('─'.repeat(50))

// Handle Ctrl+C gracefully
const abortController = new AbortController()
Deno.addSignalListener('SIGINT', () => {
  console.log('\n\n🛑 Interrupt received, closing port...')
  abortController.abort()
})

// Read loop
try {
  while (port.isPortOpen && !abortController.signal.aborted) {
    try {
      const data = await port.read(256)
      if (data.length > 0) {
        const text = new TextDecoder().decode(data)
        // Display with timestamp
        const timestamp = new Date().toLocaleTimeString()
        console.log(`[${timestamp}] ${text.trim()}`)
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Read error:', error)
        break
      }
    }
    // Small delay to prevent tight loop
    await new Promise(resolve => setTimeout(resolve, 10))
  }
} finally {
  // Cleanup
  port.close()
  console.log('\n✅ Port closed')
  console.log('👋 Goodbye!')
}
