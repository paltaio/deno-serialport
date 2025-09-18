# deno-serialport

FFI-based serial port library for Deno on Linux and macOS. Zero dependencies.

## Install

```bash
deno install jsr:@paltaio/serialport
```

## Usage

```typescript
import { SerialPort } from '@paltaio/serialport'

const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 115200,
})

await port.open()
await port.write('data')
const response = await port.read()
await port.close()
```

## API

### SerialPort

```typescript
new SerialPort({
  path: string,
  baudRate: number,
  dataBits?: 5 | 6 | 7 | 8,     // default: 8
  stopBits?: 1 | 2,              // default: 1
  parity?: "none" | "even" | "odd", // default: "none"
  autoOpen?: boolean              // default: true
})
```

Methods:

- `open()` / `close()`
- `write(data: string | Uint8Array)`
- `read(size?: number)`
- `flush(direction?: 'input' | 'output' | 'both')`
- `isPortOpen`
- `readable` - ReadableStream for use with parsers

### List Ports

```typescript
import { listPorts } from '@paltaio/serialport'

const ports = await listPorts()
```

### Parsers

```typescript
import { ReadlineParser, SerialPort } from '@paltaio/serialport'

const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 115200,
})

await port.open()

// Use ReadlineParser for line-based protocols
const parser = new ReadlineParser()
const reader = port.readable
  .pipeThrough(parser)
  .getReader()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log('Line:', value) // value is a string
}
```

Available parsers:

- `DelimiterParser` - Split data on any delimiter
- `ReadlineParser` - Split data on line endings (returns strings)
- `ByteLengthParser` - Emit fixed-length chunks

## Requirements

- Deno 2.4.3+
- Linux or macOS
- Permissions: `--allow-ffi --allow-read`
- Serial port access (dialout group on Linux, or device permissions on macOS)

## Platform Support

- ✅ **Linux** - Full support
- ⚠️ **macOS** - Partial support (see limitations below)

### macOS Limitations

Due to Deno FFI's inability to handle ioctl's varargs interface, modem control signals are **not available on macOS**:

- `getSignals()` returns default false values
- `setSignals()` operations are silently ignored
- DTR, RTS, CTS, DSR signals cannot be read or set

**Note:** Basic serial communication (read/write) works perfectly on macOS. This is a fundamental limitation of Deno's FFI system that cannot be worked around in pure TypeScript.

## Dev

```bash
deno task test      # Run tests
deno task dev       # Watch mode
deno task check     # Lint + fmt + test
```

## License

MIT
