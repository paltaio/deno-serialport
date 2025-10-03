/**
 * Core type definitions for SerialPort
 */

/**
 * Serial port configuration options
 */
export interface SerialPortOptions {
  /** Path to the serial port device (e.g., '/dev/ttyUSB0') */
  path: string

  /** Baud rate (e.g., 9600, 115200) */
  baudRate: number

  /** Number of data bits (5, 6, 7, or 8) */
  dataBits?: 5 | 6 | 7 | 8

  /** Number of stop bits (1 or 2) */
  stopBits?: 1 | 2

  /** Parity checking mode */
  parity?: 'none' | 'even' | 'odd' | 'mark' | 'space'

  /** Hardware flow control (RTS/CTS) */
  rtscts?: boolean

  /** Software flow control (XON/XOFF) */
  /** Enable XON/XOFF flow control on output */
  xon?: boolean
  /** Enable XON/XOFF flow control on input */
  xoff?: boolean
  /** Allow any character to restart output */
  xany?: boolean

  /** Automatically open the port on instantiation */
  autoOpen?: boolean

  /** Hup on close */
  hupcl?: boolean

  /** Buffer size for reads */
  highWaterMark?: number

  /** Lock the port to prevent other processes from opening it */
  lock?: boolean

  /** Enable debug logging */
  debug?: boolean
}

/**
 * Information about a serial port
 */
export interface PortInfo {
  /** Device path (e.g., '/dev/ttyUSB0') */
  path: string

  /** Device manufacturer */
  manufacturer?: string

  /** Serial number */
  serialNumber?: string

  /** PnP ID */
  pnpId?: string

  /** Location ID */
  locationId?: string

  /** Product ID */
  productId?: string

  /** Vendor ID */
  vendorId?: string
}

/**
 * Serial port signals/pins state
 */
export interface SerialPortSignals {
  /** Clear To Send */
  cts: boolean

  /** Data Set Ready */
  dsr: boolean

  /** Data Carrier Detect */
  dcd: boolean

  /** Ring Indicator */
  ring: boolean
}

/**
 * Set state for control signals
 */
export interface SetSignals {
  /** Data Terminal Ready */
  dtr?: boolean

  /** Request To Send */
  rts?: boolean
}

/**
 * Serial port error codes
 */
export enum SerialPortErrorCode {
  UNKNOWN = 'UNKNOWN',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PORT_NOT_FOUND = 'PORT_NOT_FOUND',
  INVALID_BAUD_RATE = 'INVALID_BAUD_RATE',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  PORT_CLOSED = 'PORT_CLOSED',
  DISCONNECTED = 'DISCONNECTED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',
}

/**
 * Serial port error
 */
export class SerialPortError extends Error {
  /** Error code indicating the type of error */
  code: SerialPortErrorCode
  /** System error number if applicable */
  errno?: number
  /** System call that failed if applicable */
  syscall?: string

  constructor(
    message: string,
    code: SerialPortErrorCode = SerialPortErrorCode.UNKNOWN,
    cause?: Error | number,
    syscall?: string,
  ) {
    super(message)
    this.name = 'SerialPortError'
    this.code = code
    if (typeof cause === 'number') {
      this.errno = cause
    } else if (cause instanceof Error) {
      this.cause = cause
    }
    if (syscall !== undefined) {
      this.syscall = syscall
    }
  }
}
