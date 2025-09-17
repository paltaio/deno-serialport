/**
 * FFI bindings for system library functions used for serial port operations
 * Supports both Linux (libc) and macOS (libSystem.dylib)
 */

import { ERRNO } from './types.ts'
import { getPlatformConfig, isDarwin, isLinux } from '../utils/platform.ts'

// Get platform-specific configuration
const platformConfig = getPlatformConfig()

// Build the dynamic symbols object based on platform
function buildSymbols() {
  const baseSymbols = {
    // File operations
    open: {
      parameters: ['buffer', 'i32'] as const,
      result: 'i32' as const,
    },
    close: {
      parameters: ['i32'] as const,
      result: 'i32' as const,
    },
    read: {
      parameters: ['i32', 'buffer', 'usize'] as const,
      result: 'isize' as const,
      nonblocking: true,
    },
    write: {
      parameters: ['i32', 'buffer', 'usize'] as const,
      result: 'isize' as const,
      nonblocking: true,
    },

    // Terminal control
    tcgetattr: {
      parameters: ['i32', 'buffer'] as const,
      result: 'i32' as const,
    },
    tcsetattr: {
      parameters: ['i32', 'i32', 'buffer'] as const,
      result: 'i32' as const,
    },
    tcflush: {
      parameters: ['i32', 'i32'] as const,
      result: 'i32' as const,
    },
    tcdrain: {
      parameters: ['i32'] as const,
      result: 'i32' as const,
    },
    tcflow: {
      parameters: ['i32', 'i32'] as const,
      result: 'i32' as const,
    },
    tcsendbreak: {
      parameters: ['i32', 'i32'] as const,
      result: 'i32' as const,
    },

    // Baud rate functions
    cfsetispeed: {
      parameters: ['buffer', 'u32'] as const,
      result: 'i32' as const,
    },
    cfsetospeed: {
      parameters: ['buffer', 'u32'] as const,
      result: 'i32' as const,
    },
    cfgetispeed: {
      parameters: ['buffer'] as const,
      result: 'u32' as const,
    },
    cfgetospeed: {
      parameters: ['buffer'] as const,
      result: 'u32' as const,
    },

    // IOCTL for advanced control
    ioctl: {
      parameters: ['i32', 'usize', 'pointer'] as const,
      result: 'i32' as const,
    },

    // File status
    fcntl: {
      parameters: ['i32', 'i32', 'i32'] as const,
      result: 'i32' as const,
    },
  }

  // Add platform-specific errno function
  if (isDarwin()) {
    return {
      ...baseSymbols,
      __error: {
        parameters: [] as const,
        result: 'pointer' as const,
      },
    }
  } else {
    return {
      ...baseSymbols,
      __errno_location: {
        parameters: [] as const,
        result: 'pointer' as const,
      },
    }
  }
}

// Define the library interface based on platform
const libcSymbols = buildSymbols()

// Load the system library
let libc: Deno.DynamicLibrary<typeof libcSymbols> | null = null

/**
 * Get the system library instance
 */
export function getLibc(): Deno.DynamicLibrary<typeof libcSymbols> {
  if (!libc) {
    try {
      // Determine library paths based on platform
      let libPaths: string[]

      if (isDarwin()) {
        // macOS system library
        libPaths = [
          'libSystem.dylib',
          '/usr/lib/libSystem.dylib',
          '/System/Library/Frameworks/System.framework/System',
        ]
      } else if (isLinux()) {
        // Linux libc locations
        libPaths = [
          'libc.so.6',
          '/lib/x86_64-linux-gnu/libc.so.6',
          '/lib64/libc.so.6',
          '/usr/lib/libc.so.6',
          '/lib/libc.so.6',
        ]
      } else {
        throw new Error(`Unsupported platform: ${platformConfig.platform}`)
      }

      let lastError: Error | null = null

      for (const path of libPaths) {
        try {
          libc = Deno.dlopen(path, libcSymbols)
          break
        } catch (err) {
          lastError = err as Error
        }
      }

      if (!libc) {
        throw lastError || new Error(`Failed to load system library for ${platformConfig.platform}`)
      }
    } catch (error) {
      throw new Error(`Failed to load system library: ${error}`)
    }
  }

  return libc
}

/**
 * Get the current errno value
 */
export function getErrno(): number {
  const lib = getLibc()

  // Get errno pointer based on platform
  let errnoPtr: Deno.PointerValue

  if (isDarwin()) {
    // @ts-expect-error - Platform-specific symbol
    errnoPtr = lib.symbols.__error()
  } else {
    // @ts-expect-error - Platform-specific symbol
    errnoPtr = lib.symbols.__errno_location()
  }

  if (!errnoPtr) {
    return 0
  }

  // Read the errno value from the pointer
  const view = new Deno.UnsafePointerView(errnoPtr)
  return view.getInt32(0)
}

/**
 * Open a file/device
 */
export function open(path: string, flags: number): number {
  const lib = getLibc()
  const pathBuffer = new TextEncoder().encode(path + '\0')
  const fd = lib.symbols.open(pathBuffer, flags)

  if (fd === -1) {
    const errno = getErrno()
    throw new Error(`Failed to open ${path}: errno ${errno}`)
  }

  return fd
}

/**
 * Close a file descriptor
 */
export function close(fd: number): void {
  const lib = getLibc()
  const result = lib.symbols.close(fd)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`Failed to close fd ${fd}: errno ${errno}`)
  }
}

/**
 * Read from a file descriptor
 */
export async function read(fd: number, buffer: Uint8Array): Promise<number> {
  const lib = getLibc()
  // @ts-expect-error - TypeScript 5.7+ generic Uint8Array issue. FFI works correctly at runtime.
  const result = await lib.symbols.read(fd, buffer, BigInt(buffer.length))

  if (result === -1n) {
    const errno = getErrno()
    if (errno === ERRNO.EAGAIN) {
      return 0 // Would block, return 0 bytes read
    }
    throw new Error(`Read failed: errno ${errno}`)
  }

  return Number(result)
}

/**
 * Write to a file descriptor
 */
export async function write(fd: number, buffer: Uint8Array): Promise<number> {
  const lib = getLibc()
  // @ts-expect-error - TypeScript 5.7+ generic Uint8Array issue. FFI works correctly at runtime.
  const result = await lib.symbols.write(fd, buffer, BigInt(buffer.length))

  if (result === -1n) {
    const errno = getErrno()
    if (errno === ERRNO.EAGAIN) {
      return 0 // Would block, return 0 bytes written
    }
    throw new Error(`Write failed: errno ${errno}`)
  }

  return Number(result)
}

/**
 * Get terminal attributes
 */
export function tcgetattr(fd: number, termiosBuffer: ArrayBuffer): void {
  const lib = getLibc()
  const buffer = new Uint8Array(termiosBuffer)
  const result = lib.symbols.tcgetattr(fd, buffer)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcgetattr failed: errno ${errno}`)
  }
}

/**
 * Set terminal attributes
 */
export function tcsetattr(fd: number, action: number, termiosBuffer: ArrayBuffer): void {
  const lib = getLibc()
  const buffer = new Uint8Array(termiosBuffer)
  const result = lib.symbols.tcsetattr(fd, action, buffer)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcsetattr failed: errno ${errno}`)
  }
}

/**
 * Flush terminal I/O
 */
export function tcflush(fd: number, queue: number): void {
  const lib = getLibc()
  const result = lib.symbols.tcflush(fd, queue)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcflush failed: errno ${errno}`)
  }
}

/**
 * Wait for all output to be transmitted
 */
export function tcdrain(fd: number): void {
  const lib = getLibc()
  const result = lib.symbols.tcdrain(fd)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcdrain failed: errno ${errno}`)
  }
}

/**
 * Control terminal I/O flow
 */
export function tcflow(fd: number, action: number): void {
  const lib = getLibc()
  const result = lib.symbols.tcflow(fd, action)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcflow failed: errno ${errno}`)
  }
}

/**
 * Send break signal
 */
export function tcsendbreak(fd: number, duration: number): void {
  const lib = getLibc()
  const result = lib.symbols.tcsendbreak(fd, duration)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`tcsendbreak failed: errno ${errno}`)
  }
}

/**
 * Set input baud rate
 */
export function cfsetispeed(termiosBuffer: ArrayBuffer, speed: number): void {
  const lib = getLibc()
  const buffer = new Uint8Array(termiosBuffer)
  const result = lib.symbols.cfsetispeed(buffer, speed)

  if (result === -1) {
    throw new Error(`cfsetispeed failed`)
  }
}

/**
 * Set output baud rate
 */
export function cfsetospeed(termiosBuffer: ArrayBuffer, speed: number): void {
  const lib = getLibc()
  const buffer = new Uint8Array(termiosBuffer)
  const result = lib.symbols.cfsetospeed(buffer, speed)

  if (result === -1) {
    throw new Error(`cfsetospeed failed`)
  }
}

/**
 * Perform ioctl operation
 */
export function ioctl(fd: number, request: number, argBuffer?: ArrayBuffer): number {
  const lib = getLibc()

  // Create a pointer to the buffer
  let ptr: Deno.PointerValue = null

  if (argBuffer) {
    const buffer = new Uint8Array(argBuffer)
    // Create an unsafe pointer to the buffer
    ptr = Deno.UnsafePointer.of(buffer)
  }

  const result = lib.symbols.ioctl(fd, BigInt(request), ptr)

  if (result === -1) {
    const errno = getErrno()
    throw new Error(`ioctl failed: errno ${errno}`)
  }

  return result
}

/**
 * Clean up and close the libc library
 */
export function closeLibc(): void {
  if (libc) {
    libc.close()
    libc = null
  }
}
