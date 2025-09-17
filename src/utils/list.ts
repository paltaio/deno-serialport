/**
 * Serial port enumeration utility
 * Supports both Linux and macOS/Darwin serial port discovery
 */

import type { PortInfo } from '../core/types.ts'
import { isDarwin, isLinux } from './platform.ts'

/**
 * List all available serial ports
 */
export async function listPorts(): Promise<PortInfo[]> {
  if (isDarwin()) {
    return await listPortsDarwin()
  } else if (isLinux()) {
    return await listPortsLinux()
  } else {
    return []
  }
}

/**
 * List serial ports on macOS/Darwin
 */
async function listPortsDarwin(): Promise<PortInfo[]> {
  const ports: PortInfo[] = []

  try {
    // On macOS, serial ports are under /dev/cu.* and /dev/tty.*
    // We use /dev/cu.* for call-out devices
    const devDir = '/dev'

    for await (const entry of Deno.readDir(devDir)) {
      // Check if it's a device file and starts with 'cu.'
      if (entry.name.startsWith('cu.')) {
        // Common patterns: cu.usbmodem*, cu.usbserial*, cu.Bluetooth*
        if (
          entry.name.includes('usbmodem') ||
          entry.name.includes('usbserial') ||
          entry.name.includes('SLAB_USBtoUART') ||
          entry.name.includes('wchusbserial') ||
          entry.name.includes('PL2303') ||
          entry.name.includes('FTDISerial')
        ) {
          const path = `/dev/${entry.name}`
          const info: PortInfo = { path }

          // Try to extract some info from the device name
          if (entry.name.includes('usbmodem')) {
            info.pnpId = 'USB Modem'
          } else if (entry.name.includes('usbserial')) {
            info.pnpId = 'USB Serial'
          } else if (entry.name.includes('SLAB')) {
            info.manufacturer = 'Silicon Labs'
          } else if (entry.name.includes('FTDISerial')) {
            info.manufacturer = 'FTDI'
          } else if (entry.name.includes('PL2303')) {
            info.manufacturer = 'Prolific'
          }

          // Extract location from device name (e.g., cu.usbmodem101 -> 101)
          const match = entry.name.match(/(\d+)$/)
          if (match && match[1]) {
            info.locationId = match[1]
          }

          ports.push(info)
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.PermissionDenied) {
      console.warn('Permission denied reading /dev. Try running with --allow-read')
    }
  }

  return ports
}

/**
 * List serial ports on Linux
 */
async function listPortsLinux(): Promise<PortInfo[]> {
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
          const portInfo = await getPortInfoLinux(name)
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
 * Get detailed information about a specific port on Linux
 */
async function getPortInfoLinux(name: string): Promise<PortInfo | null> {
  const path = `/dev/${name}`

  // Skip pseudo terminals and other non-serial devices
  if (
    name.startsWith('tty') && !name.startsWith('ttyS') &&
    !name.startsWith('ttyUSB') && !name.startsWith('ttyACM') &&
    !name.startsWith('ttyAMA')
  ) {
    return null
  }

  const info: PortInfo = { path }

  try {
    // Try to get USB device information
    const sysPath = `/sys/class/tty/${name}`

    // Read manufacturer
    try {
      const manufacturer = await Deno.readTextFile(
        `${sysPath}/device/../manufacturer`,
      )
      info.manufacturer = manufacturer.trim()
    } catch {
      // Ignore - couldn't read manufacturer
    }

    // Read serial number
    try {
      const serial = await Deno.readTextFile(
        `${sysPath}/device/../serial`,
      )
      info.serialNumber = serial.trim()
    } catch {
      // Ignore - couldn't read serial number
    }

    // Read product
    try {
      const product = await Deno.readTextFile(
        `${sysPath}/device/../product`,
      )
      info.pnpId = product.trim()
    } catch {
      // Ignore - couldn't read product
    }

    // Read vendor and product IDs
    try {
      const vendorId = await Deno.readTextFile(
        `${sysPath}/device/../idVendor`,
      )
      info.vendorId = vendorId.trim()
    } catch {
      // Ignore - couldn't read vendor ID
    }

    try {
      const productId = await Deno.readTextFile(
        `${sysPath}/device/../idProduct`,
      )
      info.productId = productId.trim()
    } catch {
      // Ignore - couldn't read product ID
    }
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
          if (!ports.some((p) => p.path === realPath)) {
            // Extract the tty name from the real path
            const match = realPath.match(/\/dev\/(tty\w+)/)
            if (match && match[1]) {
              const portInfo = await getPortInfoLinux(match[1])
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
    return stat.isCharDevice ?? false
  } catch {
    return false
  }
}
