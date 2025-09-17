/**
 * Deno SerialPort - Pure FFI-based serial port library for Linux
 *
 * @module
 *
 * @example
 * ```typescript
 * import { SerialPort, listPorts } from '@deno/serialport'
 *
 * // List available ports
 * const ports = await listPorts()
 * console.log('Available ports:', ports)
 *
 * // Open a port
 * const port = new SerialPort({
 *   path: '/dev/ttyUSB0',
 *   baudRate: 115200,
 * })
 *
 * // Write data
 * await port.write('Hello Arduino!')
 *
 * // Read data
 * const data = await port.read()
 * console.log('Received:', new TextDecoder().decode(data))
 *
 * // Close the port
 * port.close()
 * ```
 */

// Core exports
export { SerialPort } from './src/core/serialport.ts'
export {
  type PortInfo,
  SerialPortError,
  SerialPortErrorCode,
  type SerialPortOptions,
  type SerialPortSignals,
  type SetSignals,
} from './src/core/types.ts'

// Utilities
export { listPorts, portExists } from './src/utils/list.ts'

// Constants for advanced usage
export { BAUD_RATE_MAP, CC, CFLAG, IFLAG, LFLAG, OFLAG, TCSA } from './src/ffi/termios.ts'

export { ERRNO, FLUSH, IOCTL, O_FLAGS, TIOCM } from './src/ffi/types.ts'
