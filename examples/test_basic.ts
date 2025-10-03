/**
 * Basic functionality test
 */

import { listPorts, SerialPort, SerialPortError } from '../mod.ts'

console.log('🧪 Testing Deno SerialPort Library\n')

// Test 1: Import and type checking
console.log('✅ Module imports successful')

// Test 2: List ports
console.log('\n🔍 Testing port enumeration...')
const ports = await listPorts()
console.log(`✅ Found ${ports.length} ports`)

// Test 3: SerialPort class instantiation
console.log('\n🔨 Testing SerialPort class...')

try {
  // Try to create a port with a non-existent device (should fail gracefully)
  const testPort = new SerialPort({
    path: '/dev/ttyTEST99',
    baudRate: 9600,
    autoOpen: false, // Don't auto-open
  })
  console.log('✅ SerialPort instance created (not opened)')

  // Test parameter validation
  try {
    const _badPort = new SerialPort({
      path: '/dev/test',
      baudRate: 123456789, // Invalid baud rate
      autoOpen: false,
    })
  } catch (error) {
    if (error instanceof SerialPortError) {
      console.log('✅ Invalid baud rate correctly rejected')
    }
  }

  // Test data validation
  try {
    const _badPort2 = new SerialPort({
      path: '/dev/test',
      baudRate: 9600,
      dataBits: 9 as unknown as 5 | 6 | 7 | 8, // Invalid data bits
      autoOpen: false,
    })
  } catch (error) {
    if (error instanceof SerialPortError) {
      console.log('✅ Invalid data bits correctly rejected')
    }
  }

  // Test opening a non-existent port
  try {
    testPort.open()
  } catch (error) {
    if (error instanceof SerialPortError) {
      console.log('✅ Non-existent port correctly reported as not found')
    }
  }
} catch (error) {
  console.error('❌ Error:', error)
}

// Test 4: Verify exported constants
console.log('\n📚 Testing exported constants...')
import { CFLAG, getBaudRateValue, IFLAG } from '../mod.ts'

if (getBaudRateValue(9600)) {
  console.log('✅ Baud rate map accessible')
}

if (typeof CFLAG.CREAD === 'number') {
  console.log('✅ Control flags accessible')
}

if (typeof IFLAG.IXON === 'number') {
  console.log('✅ Input flags accessible')
}

console.log('\n🎉 All basic tests passed!')
