/**
 * Serial port enumeration utility
 */

import { type PortInfo } from '../core/types.ts'

/**
 * List all available serial ports
 */
export async function listPorts(): Promise<PortInfo[]> {
  const ports: PortInfo[] = []
  
  try {
    // Read from /sys/class/tty for all TTY devices
    const ttyDir = '/sys/class/tty'
    const entries = []
    
    for await (const entry of Deno.readDir(ttyDir)) {
      if (entry.isSymlink || entry.isDirectory) {
        entries.push(entry.name)
      }
    }
    
    // Filter to actual serial ports
    for (const name of entries) {
      // Check if it's a real serial port by looking for device/driver
      const driverPath = `${ttyDir}/${name}/device/driver`
      
      try {
        const stat = await Deno.lstat(driverPath)
        if (stat.isSymlink) {
          // This is likely a real serial port
          const portInfo = await getPortInfo(name)
          if (portInfo) {
            ports.push(portInfo)
          }
        }
      } catch {
        // Not a serial port or no access
        continue
      }
    }
    
    // Also check /dev/serial/by-id and by-path for USB serial devices
    await addUsbSerialPorts(ports)
    
  } catch (error) {
    // If we can't read the directories, return empty list
    if (error instanceof Deno.errors.PermissionDenied) {
      console.warn('Permission denied reading serial ports. Try running with --allow-read')
    }
  }
  
  return ports
}

/**
 * Get detailed information about a specific port
 */
async function getPortInfo(name: string): Promise<PortInfo | null> {
  const path = `/dev/${name}`
  
  // Skip pseudo terminals and other non-serial devices
  if (name.startsWith('tty') && !name.startsWith('ttyS') && 
      !name.startsWith('ttyUSB') && !name.startsWith('ttyACM') &&
      !name.startsWith('ttyAMA')) {
    return null
  }
  
  const info: PortInfo = { path }
  
  try {
    // Try to get USB device information
    const sysPath = `/sys/class/tty/${name}`
    
    // Read manufacturer
    try {
      const manufacturer = await Deno.readTextFile(
        `${sysPath}/device/../manufacturer`
      )
      info.manufacturer = manufacturer.trim()
    } catch {}
    
    // Read serial number
    try {
      const serial = await Deno.readTextFile(
        `${sysPath}/device/../serial`
      )
      info.serialNumber = serial.trim()
    } catch {}
    
    // Read product
    try {
      const product = await Deno.readTextFile(
        `${sysPath}/device/../product`
      )
      info.pnpId = product.trim()
    } catch {}
    
    // Read vendor and product IDs
    try {
      const vendorId = await Deno.readTextFile(
        `${sysPath}/device/../idVendor`
      )
      info.vendorId = vendorId.trim()
    } catch {}
    
    try {
      const productId = await Deno.readTextFile(
        `${sysPath}/device/../idProduct`
      )
      info.productId = productId.trim()
    } catch {}
    
  } catch {
    // Couldn't get extra info, but the port still exists
  }
  
  return info
}

/**
 * Add USB serial ports from /dev/serial
 */
async function addUsbSerialPorts(ports: PortInfo[]): Promise<void> {
  const serialDirs = [
    '/dev/serial/by-id',
    '/dev/serial/by-path',
  ]
  
  for (const dir of serialDirs) {
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isSymlink) {
          // Resolve the symlink to get the actual device
          const linkPath = `${dir}/${entry.name}`
          const realPath = await Deno.realPath(linkPath)
          
          // Check if we already have this port
          if (!ports.some(p => p.path === realPath)) {
            // Extract the tty name from the real path
            const match = realPath.match(/\/dev\/(tty\w+)/)
            if (match) {
              const portInfo = await getPortInfo(match[1])
              if (portInfo) {
                // Add location ID from the symlink name
                if (dir.includes('by-id')) {
                  portInfo.locationId = entry.name
                }
                ports.push(portInfo)
              }
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or no permission
      continue
    }
  }
}

/**
 * Check if a specific port exists and is accessible
 */
export async function portExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path)
    return stat.isCharDevice
  } catch {
    return false
  }
}
