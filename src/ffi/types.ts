/**
 * FFI Type Definitions for Deno SerialPort
 * Provides type mappings between Deno FFI and native types
 */

// Native type aliases for clarity
export type NativeFileDescriptor = number
export type NativeErrno = number
export type NativeSpeed = number

// Buffer type for FFI calls
export type NativeBuffer = Uint8Array

// Termios structure size (usually 60 bytes on Linux x86_64)
export const TERMIOS_SIZE = 60

// Common errno values
export const ERRNO = {
  SUCCESS: 0,
  EPERM: 1,
  ENOENT: 2,
  EIO: 5,
  ENXIO: 6,
  EBADF: 9,
  EAGAIN: 11,
  EACCES: 13,
  EBUSY: 16,
  ENODEV: 19,
  EINVAL: 22,
  ENOTTY: 25,
  ENOSYS: 38,
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

// IOCTL commands for serial ports
export const IOCTL = {
  TIOCGSERIAL: 0x541E,
  TIOCSSERIAL: 0x541F,
  TIOCMGET: 0x5415,
  TIOCMSET: 0x5418,
  TIOCMBIS: 0x5416,
  TIOCMBIC: 0x5417,
  FIONREAD: 0x541B,
  TIOCOUTQ: 0x5411,
  TCFLSH: 0x540B,
} as const

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
