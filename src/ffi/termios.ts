/**
 * Termios structure definitions and constants for serial port control
 * Based on Linux termios.h
 */

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

// Control flags (c_cflag)
export const CFLAG = {
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
export const CC = {
  VINTR: 0, // Interrupt character
  VQUIT: 1, // Quit character
  VERASE: 2, // Erase character
  VKILL: 3, // Kill character
  VEOF: 4, // End of file
  VTIME: 5, // Timeout for non-canonical read
  VMIN: 6, // Minimum number of characters
  VSWTC: 7, // Switch character
  VSTART: 8, // Start character
  VSTOP: 9, // Stop character
  VSUSP: 10, // Suspend character
  VEOL: 11, // End of line
  VREPRINT: 12, // Reprint unread characters
  VDISCARD: 13, // Discard pending output
  VWERASE: 14, // Word erase
  VLNEXT: 15, // Literal next character
  VEOL2: 16, // Second EOL character
  NCCS: 19, // Size of c_cc array
} as const

// Common baud rate mappings
export const BAUD_RATE_MAP = new Map<number, number>([
  [50, CFLAG.B50],
  [75, CFLAG.B75],
  [110, CFLAG.B110],
  [134, CFLAG.B134],
  [150, CFLAG.B150],
  [200, CFLAG.B200],
  [300, CFLAG.B300],
  [600, CFLAG.B600],
  [1200, CFLAG.B1200],
  [1800, CFLAG.B1800],
  [2400, CFLAG.B2400],
  [4800, CFLAG.B4800],
  [9600, CFLAG.B9600],
  [19200, CFLAG.B19200],
  [38400, CFLAG.B38400],
  [57600, CFLAG.B57600],
  [115200, CFLAG.B115200],
  [230400, CFLAG.B230400],
  [460800, CFLAG.B460800],
  [500000, CFLAG.B500000],
  [576000, CFLAG.B576000],
  [921600, CFLAG.B921600],
  [1000000, CFLAG.B1000000],
  [1152000, CFLAG.B1152000],
  [1500000, CFLAG.B1500000],
  [2000000, CFLAG.B2000000],
  [2500000, CFLAG.B2500000],
  [3000000, CFLAG.B3000000],
  [3500000, CFLAG.B3500000],
  [4000000, CFLAG.B4000000],
])

/**
 * Termios structure layout for Linux
 * Total size: 60 bytes on x86_64
 */
export interface Termios {
  c_iflag: number // 4 bytes - Input modes
  c_oflag: number // 4 bytes - Output modes
  c_cflag: number // 4 bytes - Control modes
  c_lflag: number // 4 bytes - Local modes
  c_line: number // 1 byte  - Line discipline
  c_cc: Uint8Array // 19 bytes - Control characters
  c_ispeed: number // 4 bytes - Input speed
  c_ospeed: number // 4 bytes - Output speed
}

/**
 * Create an empty termios structure buffer
 */
export function createTermiosBuffer(): ArrayBuffer {
  return new ArrayBuffer(60)
}

/**
 * Parse a termios buffer into a structured object
 */
export function parseTermios(buffer: ArrayBuffer): Termios {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  return {
    c_iflag: view.getUint32(0, true),
    c_oflag: view.getUint32(4, true),
    c_cflag: view.getUint32(8, true),
    c_lflag: view.getUint32(12, true),
    c_line: bytes[16] ?? 0,
    c_cc: bytes.slice(17, 36),
    c_ispeed: view.getUint32(36, true),
    c_ospeed: view.getUint32(40, true),
  }
}

/**
 * Write a termios structure to a buffer
 */
export function writeTermios(termios: Termios, buffer: ArrayBuffer): void {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint32(0, termios.c_iflag, true)
  view.setUint32(4, termios.c_oflag, true)
  view.setUint32(8, termios.c_cflag, true)
  view.setUint32(12, termios.c_lflag, true)
  bytes[16] = termios.c_line
  bytes.set(termios.c_cc, 17)
  view.setUint32(36, termios.c_ispeed, true)
  view.setUint32(40, termios.c_ospeed, true)
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
