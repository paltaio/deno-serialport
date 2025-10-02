/**
 * Helper utilities for creating virtual serial ports using socat
 */

/**
 * Virtual serial port pair created by socat
 */
export interface VirtualPortPair {
    port1: string
    port2: string
    process: Deno.ChildProcess
    cleanup: () => Promise<void>
}

/**
 * Parse socat output to extract PTY paths
 */
function parseSocatOutput(output: string): [string, string] | null {
    // socat outputs lines like:
    // 2024/01/15 10:30:45 socat[12345] N PTY is /dev/pts/2
    // 2024/01/15 10:30:45 socat[12345] N PTY is /dev/pts/3
    const ptyRegex = /PTY is (\/dev\/(?:pts|ttys)\d+)/g
    const matches = [...output.matchAll(ptyRegex)]

    if (matches.length >= 2) {
        return [matches[0]?.[1] ?? '', matches[1]?.[1] ?? '']
    }

    return null
}

/**
 * Create a pair of virtual serial ports using socat
 *
 * @returns Promise resolving to VirtualPortPair with port paths and cleanup function
 * @throws Error if socat fails to create ports or timeout occurs
 */
export async function createVirtualSerialPorts(): Promise<VirtualPortPair> {
    // Clean up any existing symlinks first
    try {
        await Deno.remove('/tmp/vserial0')
    } catch {
        // Ignore if doesn't exist
    }
    try {
        await Deno.remove('/tmp/vserial1')
    } catch {
        // Ignore if doesn't exist
    }

    // Create socat command to generate virtual serial port pair
    const command = new Deno.Command('socat', {
        args: [
            '-d',
            '-d',
            'pty,raw,echo=0,link=/tmp/vserial0',
            'pty,raw,echo=0,link=/tmp/vserial1',
        ],
        stderr: 'piped',
        stdout: 'null',
    })

    const process = command.spawn()

    // Wait for symlinks to be created (simpler approach)
    const maxAttempts = 50 // 5 seconds max
    let attempts = 0

    while (attempts < maxAttempts) {
        try {
            await Deno.stat('/tmp/vserial0')
            await Deno.stat('/tmp/vserial1')
            // Both symlinks exist, we're good to go
            break
        } catch {
            // Not ready yet, wait a bit
            await new Promise((resolve) => setTimeout(resolve, 100))
            attempts++
        }
    }

    // Verify the ports were created
    try {
        await Deno.stat('/tmp/vserial0')
        await Deno.stat('/tmp/vserial1')
    } catch {
        process.kill('SIGTERM')
        throw new Error('Failed to create virtual serial port symlinks')
    }

    // Create cleanup function
    const cleanup = async () => {
        // Close stderr stream to prevent resource leak
        try {
            process.stderr.cancel()
        } catch {
            // Ignore if already closed
        }

        process.kill('SIGTERM')
        try {
            await process.status
        } catch {
            // Ignore exit errors
        }

        // Clean up symlinks
        try {
            await Deno.remove('/tmp/vserial0')
        } catch {
            // Ignore if already removed
        }
        try {
            await Deno.remove('/tmp/vserial1')
        } catch {
            // Ignore if already removed
        }
    }

    return {
        port1: '/tmp/vserial0',
        port2: '/tmp/vserial1',
        process,
        cleanup,
    }
}

/**
 * Wait for data to be available on a file descriptor
 * Uses polling since we're in non-blocking mode
 */
export async function waitForData(
    port: { read: (size?: number) => Promise<Uint8Array> },
    timeoutMs = 5000,
): Promise<Uint8Array> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
        const data = await port.read()
        if (data.length > 0) {
            return data
        }
        // Wait a bit before polling again
        await new Promise((resolve) => setTimeout(resolve, 10))
    }

    throw new Error('Timeout waiting for data')
}

/**
 * Write data and ensure it's all written
 */
export async function writeAll(
    port: { write: (data: Uint8Array | string) => Promise<number> },
    data: Uint8Array | string,
): Promise<void> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
    let offset = 0

    while (offset < buffer.length) {
        const chunk = buffer.slice(offset)
        const written = await port.write(chunk)
        offset += written

        // Give time for the write to complete
        if (written === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10))
        }
    }
}

/**
 * Read exactly n bytes from a port
 */
export async function readExactly(
    port: { read: (size?: number) => Promise<Uint8Array> },
    n: number,
    timeoutMs = 5000,
): Promise<Uint8Array> {
    const result = new Uint8Array(n)
    let offset = 0
    const startTime = Date.now()

    while (offset < n) {
        if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Timeout reading ${n} bytes (got ${offset})`)
        }

        const chunk = await port.read(n - offset)
        if (chunk.length > 0) {
            result.set(chunk, offset)
            offset += chunk.length
        } else {
            // Wait a bit before polling again
            await new Promise((resolve) => setTimeout(resolve, 10))
        }
    }

    return result
}

