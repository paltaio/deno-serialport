# deno-serialport

FFI-based serial port library for Deno on Linux. Zero dependencies.

## Install

```typescript
import { SerialPort } from 'jsr:@deno/serialport' // Coming soon
// For now: import from local mod.ts
```

## Usage

```typescript
import { SerialPort } from './mod.ts'

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
- `flush()` / `drain()`
- `isOpen()`

### List Ports

```typescript
import { listPorts } from './mod.ts'
const ports = await listPorts()
```

### Parsers

```typescript
import { ReadlineParser, SerialPort } from './mod.ts'

const parser = new ReadlineParser({ delimiter: '\n' })
port.pipe(parser)
parser.on('data', console.log)
```

Available: `DelimiterParser`, `ReadlineParser`, `ByteLengthParser`, `InterByteTimeoutParser`, `RegexParser`

## Requirements

- Deno 2.4.3+
- Linux or macOS
- Permissions: `--allow-ffi --allow-read`
- Serial port access (dialout group on Linux, or device permissions on macOS)

## Platform Support

- ✅ **Linux** - Full support
- ⚠️  **macOS** - Partial support (see limitations below)

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
