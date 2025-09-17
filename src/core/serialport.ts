/**
 * Main SerialPort class implementation
 */

import {
  close,
  closeLibc,
  ioctl,
  open,
  read,
  tcflush,
  tcgetattr,
  tcsetattr,
  write,
} from '../ffi/libc.ts'
import {
  BAUD_RATE_MAP,
  CC,
  CFLAG,
  createTermiosBuffer,
  IFLAG,
  LFLAG,
  makeRaw,
  OFLAG,
  parseTermios,
  TCSA,
  writeTermios,
} from '../ffi/termios.ts'
import { FLUSH, IOCTL, O_FLAGS, TIOCM } from '../ffi/types.ts'
import {
  type SerialPortOptions,
  type SetSignals,
  type SerialPortSignals,
  SerialPortError,
  SerialPortErrorCode,
} from './types.ts'

/**
 * SerialPort class for communication with serial devices
 */
export class SerialPort {
  private fd: number | null = null
  private options: Required<SerialPortOptions>
  private readBuffer: Uint8Array
  private isOpen = false
  private originalTermios: ArrayBuffer | null = null
  
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
      highWaterMark: options.highWaterMark ?? 65536,
      lock: options.lock ?? true,
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
    if (!BAUD_RATE_MAP.has(this.options.baudRate)) {
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
        } catch {}
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
    
    // Set baud rate
    const baudFlag = BAUD_RATE_MAP.get(this.options.baudRate)!
    termios.c_cflag &= ~CFLAG.CBAUD
    termios.c_cflag |= baudFlag
    termios.c_ispeed = baudFlag
    termios.c_ospeed = baudFlag
    
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
        termios.c_cflag |= CFLAG.PARENB
        termios.c_cflag |= CFLAG.PARODD
        termios.c_cflag |= CFLAG.CMSPAR
        break
      case 'space':
        termios.c_cflag |= CFLAG.PARENB
        termios.c_cflag &= ~CFLAG.PARODD
        termios.c_cflag |= CFLAG.CMSPAR
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
        } catch {}
      }
      
      close(this.fd)
    } finally {
      this.fd = null
      this.isOpen = false
      this.originalTermios = null
    }
  }
  
  /**
   * Write data to the serial port
   */
  async write(data: Uint8Array | string): Promise<number> {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }
    
    const buffer = typeof data === 'string' 
      ? new TextEncoder().encode(data)
      : data
    
    let totalWritten = 0
    let offset = 0
    
    while (offset < buffer.length) {
      const chunk = buffer.slice(offset, offset + 4096)
      const written = await write(this.fd, chunk)
      
      if (written === 0) {
        // Would block, wait a bit
        await new Promise(resolve => setTimeout(resolve, 10))
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
  
  /**
   * Send a break signal
   */
  sendBreak(duration = 0): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }
    
    // Set break
    const bits = new ArrayBuffer(4)
    const view = new DataView(bits)
    ioctl(this.fd, IOCTL.TIOCMBIS, bits)
    
    // Wait for duration
    if (duration > 0) {
      const start = Date.now()
      while (Date.now() - start < duration) {}
    }
    
    // Clear break
    ioctl(this.fd, IOCTL.TIOCMBIC, bits)
  }
  
  /**
   * Get modem control signals
   */
  getSignals(): SerialPortSignals {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }
    
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
  }
  
  /**
   * Set modem control signals
   */
  setSignals(signals: SetSignals): void {
    if (!this.isOpen || this.fd === null) {
      throw new SerialPortError('Port not open', SerialPortErrorCode.PORT_CLOSED)
    }
    
    const bits = new ArrayBuffer(4)
    const view = new DataView(bits)
    let value = 0
    
    if (signals.dtr !== undefined) {
      if (signals.dtr) {
        value |= TIOCM.TIOCM_DTR
      }
    }
    
    if (signals.rts !== undefined) {
      if (signals.rts) {
        value |= TIOCM.TIOCM_RTS
      }
    }
    
    view.setUint32(0, value, true)
    ioctl(this.fd, IOCTL.TIOCMSET, bits)
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
