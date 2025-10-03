# SerialPort Tests

## Prerequisites

The integration tests require `socat` to be installed on your system to create virtual serial port pairs.

### Installing socat

**On Linux or macOS (with Nix):**

```bash
nix-shell -p socat
```

## Running Tests

### Run All Tests

```bash
deno test --allow-ffi --allow-read --allow-write --allow-run
```

### Run Only Unit Tests

```bash
deno test tests/unit/ --allow-ffi
```

### Run Only Integration Tests

```bash
deno test tests/integration/ --allow-ffi --allow-read --allow-write --allow-run
```

### Run Platform-Specific Tests

**Linux only:**

```bash
deno test tests/integration/serialport_linux_test.ts --allow-ffi --allow-read --allow-write --allow-run
```

**macOS only:**

```bash
deno test tests/integration/serialport_macos_test.ts --allow-ffi --allow-read --allow-write --allow-run
```

### Run a Specific Test File

```bash
deno test tests/integration/serialport_basic_test.ts --allow-ffi --allow-read --allow-write --allow-run
```
