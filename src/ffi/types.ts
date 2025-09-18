/**
 * FFI Type Definitions for Deno SerialPort
 * Provides type mappings between Deno FFI and native types
 * Supports both Linux and macOS/Darwin
 */

import { getPlatformConfig, type PlatformConfig } from '../utils/platform.ts'

// Native type aliases for clarity
export type NativeFileDescriptor = number
export type NativeErrno = number
export type NativeSpeed = number

// Buffer type for FFI calls
export type NativeBuffer = Uint8Array

// Get platform configuration
const platformConfig: PlatformConfig = getPlatformConfig()

// Termios structure size (platform-specific)
export const TERMIOS_SIZE = platformConfig.termiosSize

// Common errno values
export const ERRNO = {
  SUCCESS: 0,
  EPERM: 1,
  ENOENT: 2,
  EINTR: 4,     // Interrupted system call
  EIO: 5,
  ENXIO: 6,
  EBADF: 9,
  EAGAIN: 11,   // Resource temporarily unavailable (Linux value)
  EACCES: 13,
  EBUSY: 16,
  ENODEV: 19,
  EINVAL: 22,
  ENOTTY: 25,
  ENOSYS: 38,
  // Platform-specific aliases
  EWOULDBLOCK: 11,  // Same as EAGAIN on Linux/macOS (though macOS uses 35)
  EAGAIN_MACOS: 35, // EAGAIN value on macOS
} as const

// Open flags
export const O_FLAGS = {
  O_RDONLY: 0x0000,
  O_WRONLY: 0x0001,
  O_RDWR: 0x0002,
  O_CREAT: 0x0040,
  O_EXCL: 0x0080,
  O_NOCTTY: 0x0100,
  O_TRUNC: 0x0200,
  O_APPEND: 0x0400,
  O_NONBLOCK: 0x0800,
  O_SYNC: 0x101000,
} as const

// IOCTL commands for serial ports (platform-specific)
export const IOCTL = platformConfig.ioctlConstants

// Modem control lines
export const TIOCM = {
  TIOCM_LE: 0x001,
  TIOCM_DTR: 0x002,
  TIOCM_RTS: 0x004,
  TIOCM_ST: 0x008,
  TIOCM_SR: 0x010,
  TIOCM_CTS: 0x020,
  TIOCM_CAR: 0x040,
  TIOCM_RNG: 0x080,
  TIOCM_DSR: 0x100,
  TIOCM_CD: 0x040,
  TIOCM_RI: 0x080,
} as const

// Flush queue selectors
export const FLUSH = {
  TCIFLUSH: 0,
  TCOFLUSH: 1,
  TCIOFLUSH: 2,
} as const
