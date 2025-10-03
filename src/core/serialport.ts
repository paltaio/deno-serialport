/**
 * Main SerialPort class implementation
 */

import {
  cfsetispeed,
  cfsetospeed,
  close,
  closeLibc,
  ioctl,
  open,
  read,
  tcdrain,
  tcflush,
  tcgetattr,
  tcsendbreak,
  tcsetattr,
  write,
} from '../ffi/libc.ts'
import {
  CFLAG,
  createTermiosBuffer,
  getBaudRateValue,
  IFLAG,
  makeRaw,
  parseTermios,
  TCSA,
  writeTermios,
} from '../ffi/termios.ts'
import { FLUSH, IOCTL, O_FLAGS, TIOCM } from '../ffi/types.ts'
import { isDarwin, isLinux } from '../utils/platform.ts'
import {
  SerialPortError,
  SerialPortErrorCode,
  type SerialPortOptions,
  type SerialPortSignals,
  type SetSignals,
} from './types.ts'
import { DEFAULT_BUFFER_SIZE, POLL_INTERVAL_MS, WRITE_CHUNK_SIZE } from './constants.ts'

/**
 * SerialPort class for communication with serial devices
 */
export class SerialPort {
  private fd: number | null = null
  private options: Required<SerialPortOptions>
  private readBuffer: Uint8Array
  private isOpen = false
  private originalTermios: ArrayBuffer | null = null
  private _readableStream: ReadableStream<Uint8Array> | null = null
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.error(`[SerialPort ${this.options.path}]`, message, ...args)
    }
  }

  constructor(options: SerialPortOptions) {
    // Set defaults
    this.options = {
      path: options.path,
      baudRate: options.baudRate,
      dataBits: options.dataBits ?? 8,
      stopBits: options.stopBits ?? 1,
      parity: options.parity ?? 'none',
      rtscts: options.rtscts ?? false,
      xon: options.xon ?? false,
      xoff: options.xoff ?? false,
      xany: options.xany ?? false,
      autoOpen: options.autoOpen ?? true,
      hupcl: options.hupcl ?? true,
      highWaterMark: options.highWaterMark ?? DEFAULT_BUFFER_SIZE,
      lock: options.lock ?? true,
      debug: options.debug ?? false,
    }

    // Validate options
    this.validateOptions()

    // Initialize read buffer
    this.readBuffer = new Uint8Array(this.options.highWaterMark)

    // Auto-open if requested
    if (this.options.autoOpen) {
      this.open()
    }
  }

  private validateOptions(): void {
    // Validate baud rate
    try {
      getBaudRateValue(this.options.baudRate)
    } catch {
      throw new SerialPortError(
        `Invalid baud rate: ${this.options.baudRate}`,
        SerialPortErrorCode.INVALID_BAUD_RATE,
      )
    }

    // Validate data bits
    if (![5, 6, 7, 8].includes(this.options.dataBits)) {
      throw new SerialPortError(
        `Invalid data bits: ${this.options.dataBits}`,
        SerialPortErrorCode.INVALID_CONFIGURATION,
      )
    }

    // Validate stop bits
    if (![1, 2].includes(this.options.stopBits)) {
      throw new SerialPortError(
        `Invalid stop bits: ${this.options.stopBits}`,
        SerialPortErrorCode.INVALID_CONFIGURATION,
      )
    }

    // Validate parity
    if (!['none', 'even', 'odd', 'mark', 'space'].includes(this.options.parity)) {
      throw new SerialPortError(
        `Invalid parity: ${this.options.parity}`,
        SerialPortErrorCode.INVALID_CONFIGURATION,
      )
    }
  }

  /**
   * Open the serial port
   */
  open(): void {
    if (this.isOpen) {
      return
    }

    try {
      // Open the device
      const flags = O_FLAGS.O_RDWR | O_FLAGS.O_NOCTTY | O_FLAGS.O_NONBLOCK
      this.fd = open(this.options.path, flags)

      // Apply exclusive lock if requested
      if (this.options.lock) {
        try {
          ioctl(this.fd, IOCTL.TIOCEXCL)
        } catch (error) {
          try {
            if (this.fd !== null) {
              close(this.fd)
            }
          } catch (_) {
            // ignore
          }
          this.fd = null
          throw new SerialPortError(
            `Failed to acquire exclusive lock on ${this.options.path}`,
            SerialPortErrorCode.ACCESS_DENIED,
            error as Error,
          )
        }
      }

      // Save original termios settings
      this.originalTermios = createTermiosBuffer()
      tcgetattr(this.fd, this.originalTermios)

      // Configure the port
      this.configurePort()

      this.isOpen = true
    } catch (error) {
      if (this.fd !== null) {
        try {
          close(this.fd)
        } catch (e) {
          this.log(`Failed to close file descriptor ${this.fd} during cleanup:`, e)
        }
        this.fd = null
      }

      if (error instanceof Error) {
        if (error.message.includes('errno 2')) {
          throw new SerialPortError(
            `Port not found: ${this.options.path}`,
            SerialPortErrorCode.PORT_NOT_FOUND,
          )
        } else if (error.message.includes('errno 13')) {
          throw new SerialPortError(
            `Access denied: ${this.options.path}`,
            SerialPortErrorCode.ACCESS_DENIED,
          )
        }
      }
      throw error
    }
  }

  private configurePort(): void {
    if (this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    // Create and configure termios structure
    const termiosBuffer = createTermiosBuffer()
    tcgetattr(this.fd, termiosBuffer)
    const termios = parseTermios(termiosBuffer)

    // Configure for raw mode
    makeRaw(termios)

    // Set baud rate - platform specific
    const baudValue = getBaudRateValue(this.options.baudRate)

    if (!isDarwin()) {
      // On Linux, baud rates are bit flags in c_cflag
      // @ts-expect-error - CBAUD only exists on Linux
      termios.c_cflag &= ~CFLAG.CBAUD
      termios.c_cflag |= baudValue
      termios.c_ispeed = baudValue
      termios.c_ospeed = baudValue
    }

    // Set data bits
    termios.c_cflag &= ~CFLAG.CSIZE
    switch (this.options.dataBits) {
      case 5:
        termios.c_cflag |= CFLAG.CS5
        break
      case 6:
        termios.c_cflag |= CFLAG.CS6
        break
      case 7:
        termios.c_cflag |= CFLAG.CS7
        break
      case 8:
        termios.c_cflag |= CFLAG.CS8
        break
    }

    // Set stop bits
    if (this.options.stopBits === 2) {
      termios.c_cflag |= CFLAG.CSTOPB
    } else {
      termios.c_cflag &= ~CFLAG.CSTOPB
    }

    // Set parity
    switch (this.options.parity) {
      case 'none':
        termios.c_cflag &= ~CFLAG.PARENB
        break
      case 'even':
        termios.c_cflag |= CFLAG.PARENB
        termios.c_cflag &= ~CFLAG.PARODD
        break
      case 'odd':
        termios.c_cflag |= CFLAG.PARENB
        termios.c_cflag |= CFLAG.PARODD
        break
      case 'mark':
        if (isLinux()) {
          termios.c_cflag |= CFLAG.PARENB
          termios.c_cflag |= CFLAG.PARODD
          // @ts-expect-error - CMSPAR only exists on Linux
          termios.c_cflag |= CFLAG.CMSPAR
        } else {
          // macOS doesn't support mark/space parity
          throw new SerialPortError(
            'Mark parity is not supported on macOS',
            SerialPortErrorCode.INVALID_CONFIGURATION,
          )
        }
        break
      case 'space':
        if (isLinux()) {
          termios.c_cflag |= CFLAG.PARENB
          termios.c_cflag &= ~CFLAG.PARODD
          // @ts-expect-error - CMSPAR only exists on Linux
          termios.c_cflag |= CFLAG.CMSPAR
        } else {
          // macOS doesn't support mark/space parity
          throw new SerialPortError(
            'Space parity is not supported on macOS',
            SerialPortErrorCode.INVALID_CONFIGURATION,
          )
        }
        break
    }

    // Hardware flow control
    if (this.options.rtscts) {
      termios.c_cflag |= CFLAG.CRTSCTS
    } else {
      termios.c_cflag &= ~CFLAG.CRTSCTS
    }

    // Software flow control
    if (this.options.xon || this.options.xoff) {
      termios.c_iflag |= IFLAG.IXON | IFLAG.IXOFF
      if (this.options.xany) {
        termios.c_iflag |= IFLAG.IXANY
      }
    } else {
      termios.c_iflag &= ~(IFLAG.IXON | IFLAG.IXOFF | IFLAG.IXANY)
    }

    // Enable receiver
    termios.c_cflag |= CFLAG.CREAD

    // Local connection (ignore modem control)
    termios.c_cflag |= CFLAG.CLOCAL

    // Hang up on close
    if (this.options.hupcl) {
      termios.c_cflag |= CFLAG.HUPCL
    } else {
      termios.c_cflag &= ~CFLAG.HUPCL
    }

    // Apply settings
    writeTermios(termios, termiosBuffer)
    // On macOS, ensure speeds are set via cfset* for portability
    if (isDarwin()) {
      cfsetispeed(termiosBuffer, baudValue)
      cfsetospeed(termiosBuffer, baudValue)
    }
    tcsetattr(this.fd, TCSA.TCSANOW, termiosBuffer)

    // Flush any pending I/O
    tcflush(this.fd, FLUSH.TCIOFLUSH)
  }

  /**
   * Close the serial port
   */
  close(): void {
    if (!this.isOpen || this.fd === null) {
      return
    }

    try {
      // Restore original termios if we have it
      if (this.originalTermios) {
        try {
          tcsetattr(this.fd, TCSA.TCSANOW, this.originalTermios)
        } catch (e) {
          this.log(`Failed to restore original termios settings for ${this.options.path}:`, e)
        }
      }

      try {
        if (this.options.lock) {
          try {
            ioctl(this.fd, IOCTL.TIOCNXCL)
          } catch {
            // ignore
          }
        }
      } finally {
        close(this.fd)
      }
    } finally {
      this.fd = null
      this.isOpen = false
      this.originalTermios = null
      this._readableStream = null
    }
  }

  /**
   * Write data to the serial port
   */
  async write(data: Uint8Array | string): Promise<number> {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data

    let totalWritten = 0
    let offset = 0

    while (offset < buffer.length) {
      const chunk = buffer.slice(offset, offset + WRITE_CHUNK_SIZE)
      const written = await write(this.fd, chunk)

      if (written === 0) {
        // Would block, wait a bit
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
        continue
      }

      totalWritten += written
      offset += written
    }

    return totalWritten
  }

  /**
   * Read data from the serial port
   */
  async read(size?: number): Promise<Uint8Array> {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    const buffer = size
      ? new Uint8Array(Math.min(size, this.options.highWaterMark))
      : this.readBuffer

    const bytesRead = await read(this.fd, buffer)

    if (bytesRead === 0) {
      return new Uint8Array(0)
    }

    return buffer.slice(0, bytesRead)
  }

  /**
   * Flush the serial port buffers
   */
  flush(direction: 'input' | 'output' | 'both' = 'both'): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    let queue: number
    switch (direction) {
      case 'input':
        queue = FLUSH.TCIFLUSH
        break
      case 'output':
        queue = FLUSH.TCOFLUSH
        break
      case 'both':
        queue = FLUSH.TCIOFLUSH
        break
    }

    tcflush(this.fd, queue)
  }

  drain(): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    tcdrain(this.fd)
  }

  /**
   * Send a break signal
   */
  sendBreak(duration = 0): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    tcsendbreak(this.fd, duration)
  }

  /**
   * Get modem control signals
   *
   * NOTE: On macOS, this functionality is not supported due to Deno FFI limitations
   * with ioctl's varargs interface. The operation will return default values.
   */
  getSignals(): SerialPortSignals {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    // On macOS, ioctl with TIOCMGET fails due to Deno FFI's inability to handle varargs
    if (isDarwin()) {
      return {
        cts: false,
        dsr: false,
        dcd: false,
        ring: false,
      }
    }

    try {
      const bits = new ArrayBuffer(4)
      ioctl(this.fd, IOCTL.TIOCMGET, bits)
      const view = new DataView(bits)
      const status = view.getUint32(0, true)

      return {
        cts: (status & TIOCM.TIOCM_CTS) !== 0,
        dsr: (status & TIOCM.TIOCM_DSR) !== 0,
        dcd: (status & TIOCM.TIOCM_CD) !== 0,
        ring: (status & TIOCM.TIOCM_RI) !== 0,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('errno 25')) {
        // ENOTTY - inappropriate ioctl for device (e.g., USB-serial adapters)
        throw new SerialPortError(
          'Modem control signals not supported by this device',
          SerialPortErrorCode.OPERATION_NOT_SUPPORTED,
          error,
        )
      } else if (error instanceof Error && error.message.includes('errno 19')) {
        // ENODEV - operation not supported by device
        throw new SerialPortError(
          'Modem control signals not supported by this device',
          SerialPortErrorCode.OPERATION_NOT_SUPPORTED,
          error,
        )
      }
      throw error
    }
  }

  /**
   * Set modem control signals
   *
   * NOTE: On macOS, this functionality is not supported due to Deno FFI limitations
   * with ioctl's varargs interface. The operation will be silently ignored.
   */
  setSignals(signals: SetSignals): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    // On macOS, ioctl with TIOCMSET fails due to Deno FFI's inability to handle varargs
    if (isDarwin()) {
      // Silently ignore on macOS - modem control signals not supported
      return
    }

    try {
      const bits = new ArrayBuffer(4)
      const view = new DataView(bits)

      // Read current modem control state
      ioctl(this.fd, IOCTL.TIOCMGET, bits)
      let value = view.getUint32(0, true)

      // Update DTR if specified
      if (signals.dtr !== undefined) {
        if (signals.dtr) {
          value |= TIOCM.TIOCM_DTR
        } else {
          value &= ~TIOCM.TIOCM_DTR
        }
      }

      // Update RTS if specified
      if (signals.rts !== undefined) {
        if (signals.rts) {
          value |= TIOCM.TIOCM_RTS
        } else {
          value &= ~TIOCM.TIOCM_RTS
        }
      }

      // Write back modified state
      view.setUint32(0, value, true)
      ioctl(this.fd, IOCTL.TIOCMSET, bits)
    } catch (error) {
      if (error instanceof Error && error.message.includes('errno 25')) {
        // ENOTTY - inappropriate ioctl for device (e.g., USB-serial adapters)
        throw new SerialPortError(
          'Modem control signals not supported by this device',
          SerialPortErrorCode.OPERATION_NOT_SUPPORTED,
          error,
        )
      } else if (error instanceof Error && error.message.includes('errno 19')) {
        // ENODEV - operation not supported by device
        throw new SerialPortError(
          'Modem control signals not supported by this device',
          SerialPortErrorCode.OPERATION_NOT_SUPPORTED,
          error,
        )
      }
      throw error
    }
  }

  /**
   * Check if the port is open
   */
  get isPortOpen(): boolean {
    return this.isOpen
  }

  /**
   * Get the port path
   */
  get path(): string {
    return this.options.path
  }

  /**
   * Create a readable stream for this port
   * This allows the port to be used with parsers and stream transformations
   *
   * NOTE: This property returns a cached ReadableStream. Once a reader is obtained
   * from this stream, it locks the stream. To work around this, either:
   * 1. Keep a single reader for the entire session
   * 2. Use the createReadableStream() method to get a new independent stream
   *
   * @example
   * ```typescript
   * // For single reader usage (recommended)
   * const reader = port.readable.getReader()
   * while (true) {
   *   const { done, value } = await reader.read()
   *   if (done) break
   *   console.log('Data:', value)
   * }
   * ```
   */
  get readable(): ReadableStream<Uint8Array> {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }

    // Return existing stream if already created
    if (this._readableStream) {
      return this._readableStream
    }

    const fd = this.fd
    const readBuffer = new Uint8Array(this.options.highWaterMark)

    // Create and cache the stream
    this._readableStream = new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          const bytesRead = await read(fd, readBuffer)
          if (bytesRead === 0) {
            // No data available, wait a bit before next read
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
          } else if (bytesRead > 0) {
            controller.enqueue(readBuffer.slice(0, bytesRead))
          }
        } catch (error) {
          controller.error(error)
        }
      },
      cancel: () => {
        // Stream cancelled
        this._readableStream = null
      },
    })

    return this._readableStream
  }

  /**
   * Clean up resources on object destruction
   */
  [Symbol.dispose](): void {
    this.close()
  }
}

/**
 * Clean up FFI resources on exit
 */
globalThis.addEventListener('unload', () => {
  closeLibc()
})
