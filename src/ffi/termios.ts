/**
 * Termios structure definitions and constants for serial port control
 * Supports both Linux and macOS/Darwin termios structures
 */

import { getPlatformConfig, isDarwin } from '../utils/platform.ts'

// Get platform configuration
const platformConfig = getPlatformConfig()

// termios optional_actions for tcsetattr()
export const TCSA = {
  TCSANOW: 0, // Change immediately
  TCSADRAIN: 1, // Change when pending output is written
  TCSAFLUSH: 2, // Change after pending I/O is discarded
} as const

// Input flags (c_iflag)
export const IFLAG = {
  IGNBRK: 0x0001, // Ignore break condition
  BRKINT: 0x0002, // Break causes interrupt
  IGNPAR: 0x0004, // Ignore parity errors
  PARMRK: 0x0008, // Mark parity errors
  INPCK: 0x0010, // Enable input parity check
  ISTRIP: 0x0020, // Strip 8th bit
  INLCR: 0x0040, // Map NL to CR
  IGNCR: 0x0080, // Ignore CR
  ICRNL: 0x0100, // Map CR to NL
  IUCLC: 0x0200, // Map uppercase to lowercase
  IXON: 0x0400, // Enable XON/XOFF flow control
  IXANY: 0x0800, // Any character restarts output
  IXOFF: 0x1000, // Enable input flow control
  IMAXBEL: 0x2000, // Ring bell on input buffer full
  IUTF8: 0x4000, // Input is UTF8
} as const

// Output flags (c_oflag)
export const OFLAG = {
  OPOST: 0x0001, // Post-process output
  OLCUC: 0x0002, // Map lowercase to uppercase
  ONLCR: 0x0004, // Map NL to CR-NL
  OCRNL: 0x0008, // Map CR to NL
  ONOCR: 0x0010, // No CR output at column 0
  ONLRET: 0x0020, // NL performs CR function
  OFILL: 0x0040, // Send fill characters
  OFDEL: 0x0080, // Fill character is DEL
} as const

// Control flags (c_cflag) - platform specific
type CFLAGType = {
  readonly CSIZE: number;
  readonly CS5: number;
  readonly CS6: number;
  readonly CS7: number;
  readonly CS8: number;
  readonly CSTOPB: number;
  readonly CREAD: number;
  readonly PARENB: number;
  readonly PARODD: number;
  readonly HUPCL: number;
  readonly CLOCAL: number;
  readonly CRTSCTS: number;
  readonly [key: string]: number;
}

function getCFLAG(): CFLAGType {
  if (isDarwin()) {
    // macOS Darwin specific constants
    return {
      // Character size
      CSIZE: 0x0300,
      CS5: 0x0000,
      CS6: 0x0100,
      CS7: 0x0200,
      CS8: 0x0300,

      // Stop bits
      CSTOPB: 0x0400, // 2 stop bits (1 if not set)

      // Read control
      CREAD: 0x0800, // Enable receiver

      // Parity
      PARENB: 0x1000, // Enable parity
      PARODD: 0x2000, // Odd parity (even if not set)

      // Hardware flow control
      HUPCL: 0x4000, // Hang up on last close
      CLOCAL: 0x8000, // Ignore modem control lines

      // macOS specific hardware flow control
      CRTSCTS: 0x00030000, // RTS/CTS flow control

      // Note: On macOS, baud rates are actual values, not bit flags
      // They are handled by the platform config baudRateConstants
    } as const
  } else {
    // Linux specific constants
    return {
      // Baud rates
      B0: 0x0000,
      B50: 0x0001,
      B75: 0x0002,
      B110: 0x0003,
      B134: 0x0004,
      B150: 0x0005,
      B200: 0x0006,
      B300: 0x0007,
      B600: 0x0008,
      B1200: 0x0009,
      B1800: 0x000A,
      B2400: 0x000B,
      B4800: 0x000C,
      B9600: 0x000D,
      B19200: 0x000E,
      B38400: 0x000F,
      B57600: 0x1001,
      B115200: 0x1002,
      B230400: 0x1003,
      B460800: 0x1004,
      B500000: 0x1005,
      B576000: 0x1006,
      B921600: 0x1007,
      B1000000: 0x1008,
      B1152000: 0x1009,
      B1500000: 0x100A,
      B2000000: 0x100B,
      B2500000: 0x100C,
      B3000000: 0x100D,
      B3500000: 0x100E,
      B4000000: 0x100F,

      // Character size
      CSIZE: 0x0030,
      CS5: 0x0000,
      CS6: 0x0010,
      CS7: 0x0020,
      CS8: 0x0030,

      // Stop bits
      CSTOPB: 0x0040, // 2 stop bits (1 if not set)

      // Read control
      CREAD: 0x0080, // Enable receiver

      // Parity
      PARENB: 0x0100, // Enable parity
      PARODD: 0x0200, // Odd parity (even if not set)

      // Hardware flow control
      HUPCL: 0x0400, // Hang up on last close
      CLOCAL: 0x0800, // Ignore modem control lines

      // Linux specific
      CBAUD: 0x100F, // Baud speed mask
      CIBAUD: 0x100F0000, // Input baud rate
      CMSPAR: 0x40000000, // Mark/space parity
      CRTSCTS: 0x80000000, // Hardware flow control
    } as const
  }
}

export const CFLAG: CFLAGType = getCFLAG()

// Local flags (c_lflag)
export const LFLAG = {
  ISIG: 0x0001, // Enable signals
  ICANON: 0x0002, // Canonical mode
  XCASE: 0x0004, // Case conversion
  ECHO: 0x0008, // Enable echo
  ECHOE: 0x0010, // Echo erase character
  ECHOK: 0x0020, // Echo kill character
  ECHONL: 0x0040, // Echo NL
  NOFLSH: 0x0080, // No flush after interrupt
  TOSTOP: 0x0100, // Stop background jobs
  ECHOCTL: 0x0200, // Echo control characters
  ECHOPRT: 0x0400, // Echo erased characters
  ECHOKE: 0x0800, // Kill line
  FLUSHO: 0x1000, // Output being flushed
  PENDIN: 0x4000, // Retype pending input
  IEXTEN: 0x8000, // Enable extended functions
  EXTPROC: 0x10000, // External processing
} as const

// Control characters indices (c_cc)
type CCType = {
  readonly VINTR: number;
  readonly VQUIT: number;
  readonly VERASE: number;
  readonly VKILL: number;
  readonly VEOF: number;
  readonly VTIME: number;
  readonly VMIN: number;
  readonly VSWTC: number;
  readonly VSTART: number;
  readonly VSTOP: number;
  readonly VSUSP: number;
  readonly VEOL: number;
  readonly VREPRINT: number;
  readonly VDISCARD: number;
  readonly VWERASE: number;
  readonly VLNEXT: number;
  readonly VEOL2: number;
  readonly NCCS: number;
}

export const CC: CCType = {
  VINTR: 0, // Interrupt character
  VQUIT: 1, // Quit character
  VERASE: 2, // Erase character
  VKILL: 3, // Kill character
  VEOF: 4, // End of file
  VTIME: 5, // Timeout for non-canonical read
  VMIN: 6, // Minimum number of characters
  VSWTC: 7, // Switch character (Linux)
  VSTART: 8, // Start character
  VSTOP: 9, // Stop character
  VSUSP: 10, // Suspend character
  VEOL: 11, // End of line
  VREPRINT: 12, // Reprint unread characters
  VDISCARD: 13, // Discard pending output
  VWERASE: 14, // Word erase
  VLNEXT: 15, // Literal next character
  VEOL2: 16, // Second EOL character
  NCCS: isDarwin() ? 20 : 19, // Size of c_cc array
} as const

// Get baud rate value for the platform
export function getBaudRateValue(baudRate: number): number {
  const baudRates = platformConfig.baudRateConstants

  // Check if we have a direct mapping
  switch (baudRate) {
    case 0: return baudRates.B0
    case 50: return baudRates.B50
    case 75: return baudRates.B75
    case 110: return baudRates.B110
    case 134: return baudRates.B134
    case 150: return baudRates.B150
    case 200: return baudRates.B200
    case 300: return baudRates.B300
    case 600: return baudRates.B600
    case 1200: return baudRates.B1200
    case 1800: return baudRates.B1800
    case 2400: return baudRates.B2400
    case 4800: return baudRates.B4800
    case 9600: return baudRates.B9600
    case 19200: return baudRates.B19200
    case 38400: return baudRates.B38400
    case 57600: return baudRates.B57600
    case 115200: return baudRates.B115200
    case 230400: return baudRates.B230400
  }

  // For macOS, the baud rate is the actual value
  // For Linux, we'd need extended baud rate handling
  if (isDarwin()) {
    return baudRate
  }

  throw new Error(`Unsupported baud rate: ${baudRate}`)
}

/**
 * Termios structure layout
 * Linux: 60 bytes on x86_64
 * macOS: 72 bytes on x86_64 (64-bit mode)
 */
export interface Termios {
  c_iflag: number // Input modes
  c_oflag: number // Output modes
  c_cflag: number // Control modes
  c_lflag: number // Local modes
  c_line?: number // Line discipline (Linux only)
  c_cc: Uint8Array // Control characters (19-20 bytes)
  c_ispeed: number // Input speed
  c_ospeed: number // Output speed
}

/**
 * Create an empty termios structure buffer
 */
export function createTermiosBuffer(): ArrayBuffer {
  return new ArrayBuffer(platformConfig.termiosSize)
}

/**
 * Parse a termios buffer into a structured object
 */
export function parseTermios(buffer: ArrayBuffer): Termios {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  if (isDarwin()) {
    // macOS Darwin structure (64-bit)
    // Flags are 8 bytes each, followed by c_cc[20], padding, then speeds
    const littleEndian = true
    return {
      c_iflag: Number(view.getBigUint64(0, littleEndian)),
      c_oflag: Number(view.getBigUint64(8, littleEndian)),
      c_cflag: Number(view.getBigUint64(16, littleEndian)),
      c_lflag: Number(view.getBigUint64(24, littleEndian)),
      c_cc: bytes.slice(32, 52), // 20 bytes
      // 4 bytes padding at 52-55
      c_ispeed: Number(view.getBigUint64(56, littleEndian)),
      c_ospeed: Number(view.getBigUint64(64, littleEndian)),
    }
  } else {
    // Linux structure
    return {
      c_iflag: view.getUint32(0, true),
      c_oflag: view.getUint32(4, true),
      c_cflag: view.getUint32(8, true),
      c_lflag: view.getUint32(12, true),
      c_line: bytes[16] ?? 0,
      c_cc: bytes.slice(17, 36), // 19 bytes
      c_ispeed: view.getUint32(36, true),
      c_ospeed: view.getUint32(40, true),
    }
  }
}

/**
 * Write a termios structure to a buffer
 */
export function writeTermios(termios: Termios, buffer: ArrayBuffer): void {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  if (isDarwin()) {
    // macOS Darwin structure (64-bit)
    const littleEndian = true
    view.setBigUint64(0, BigInt(termios.c_iflag), littleEndian)
    view.setBigUint64(8, BigInt(termios.c_oflag), littleEndian)
    view.setBigUint64(16, BigInt(termios.c_cflag), littleEndian)
    view.setBigUint64(24, BigInt(termios.c_lflag), littleEndian)
    bytes.set(termios.c_cc, 32)
    // 4 bytes padding at 52-55
    view.setBigUint64(56, BigInt(termios.c_ispeed), littleEndian)
    view.setBigUint64(64, BigInt(termios.c_ospeed), littleEndian)
  } else {
    // Linux structure
    view.setUint32(0, termios.c_iflag, true)
    view.setUint32(4, termios.c_oflag, true)
    view.setUint32(8, termios.c_cflag, true)
    view.setUint32(12, termios.c_lflag, true)
    bytes[16] = termios.c_line ?? 0
    bytes.set(termios.c_cc, 17)
    view.setUint32(36, termios.c_ispeed, true)
    view.setUint32(40, termios.c_ospeed, true)
  }
}

/**
 * Configure termios for raw mode (no processing)
 */
export function makeRaw(termios: Termios): void {
  // Input: turn off break, parity, strip, and translation
  termios.c_iflag &= ~(IFLAG.IGNBRK | IFLAG.BRKINT | IFLAG.PARMRK |
    IFLAG.ISTRIP | IFLAG.INLCR | IFLAG.IGNCR |
    IFLAG.ICRNL | IFLAG.IXON)

  // Output: turn off post-processing
  termios.c_oflag &= ~OFLAG.OPOST

  // Local: turn off echo, canonical, signals, and extended
  termios.c_lflag &= ~(LFLAG.ECHO | LFLAG.ECHONL | LFLAG.ICANON |
    LFLAG.ISIG | LFLAG.IEXTEN)

  // Control: set 8-bit characters
  termios.c_cflag &= ~(CFLAG.CSIZE | CFLAG.PARENB)
  termios.c_cflag |= CFLAG.CS8

  // Set VMIN and VTIME for non-blocking reads
  termios.c_cc[CC.VMIN] = 0
  termios.c_cc[CC.VTIME] = 0
}
