# deno-serialport

FFI-based serial port library for Deno on Linux. Zero dependencies.

## Install

```typescript
import { SerialPort } from "jsr:@deno/serialport"  // Coming soon
// For now: import from local mod.ts
```

## Usage

```typescript
import { SerialPort } from "./mod.ts"

const port = new SerialPort({
  path: "/dev/ttyUSB0",
  baudRate: 115200
})

await port.open()
await port.write("data")
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
import { listPorts } from "./mod.ts"
const ports = await listPorts()
```

### Parsers

```typescript
import { SerialPort, ReadlineParser } from "./mod.ts"

const parser = new ReadlineParser({ delimiter: "\n" })
port.pipe(parser)
parser.on("data", console.log)
```

Available: `DelimiterParser`, `ReadlineParser`, `ByteLengthParser`, `InterByteTimeoutParser`, `RegexParser`

## Requirements

- Deno 2.4.3+
- Linux (uses termios)
- Permissions: `--allow-ffi --allow-read`
- Serial port access (dialout group or sudo)

## Dev

```bash
deno task test      # Run tests
deno task dev       # Watch mode
deno task check     # Lint + fmt + test
```

## License

MIT