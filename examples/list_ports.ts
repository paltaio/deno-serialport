/**
 * List all available serial ports
 */

import { listPorts, portExists } from '../mod.ts'

console.log('🔍 Scanning for serial ports...\n')

const ports = await listPorts()

if (ports.length === 0) {
  console.log('❌ No serial ports found!')
  console.log('\nPossible reasons:')
  console.log('  • No serial devices connected')
  console.log('  • Insufficient permissions (try with sudo or add user to dialout group)')
  console.log('  • Running in a container without device access')
  console.log('\nTry running with: deno run --allow-ffi --allow-read examples/list_ports.ts')
} else {
  console.log(`✅ Found ${ports.length} port(s):\n`)
  
  for (const port of ports) {
    console.log(`📟 ${port.path}`)
    
    const details = []
    if (port.manufacturer) details.push(`Manufacturer: ${port.manufacturer}`)
    if (port.serialNumber) details.push(`Serial: ${port.serialNumber}`)
    if (port.pnpId) details.push(`PnP ID: ${port.pnpId}`)
    if (port.vendorId) details.push(`Vendor ID: ${port.vendorId}`)
    if (port.productId) details.push(`Product ID: ${port.productId}`)
    if (port.locationId) details.push(`Location: ${port.locationId}`)
    
    if (details.length > 0) {
      for (const detail of details) {
        console.log(`   ${detail}`)
      }
    }
    console.log()
  }
}

// Check for common serial port paths
console.log('\n🔎 Checking common serial port paths:')

const commonPaths = [
  '/dev/ttyS0',
  '/dev/ttyS1',
  '/dev/ttyUSB0',
  '/dev/ttyACM0',
  '/dev/ttyAMA0',
  '/dev/cu.usbserial',
  '/dev/cu.usbmodem',
]

for (const path of commonPaths) {
  const exists = await portExists(path)
  if (exists) {
    console.log(`  ✓ ${path} exists`)
  }
}
