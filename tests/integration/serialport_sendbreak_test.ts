import { assertEquals } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import { SerialPort } from '../../src/core/serialport.ts'
import { createVirtualSerialPorts } from '../helpers/socat.ts'

describe('SerialPort - sendBreak()', {
    sanitizeResources: false,
}, () => {
    it('should invoke native tcsendbreak when sendBreak is called', async () => {
        const virtualPorts = await createVirtualSerialPorts()

        let callCount = 0

        // Preserve original dlopen
        const originalDlopen = Deno.dlopen

        const dlopenStub = stub(
            Deno,
            'dlopen',
            (
                filename: string | URL,
                symbols: Deno.ForeignLibraryInterface,
            ): Deno.DynamicLibrary<Deno.ForeignLibraryInterface> => {
                const realLib = originalDlopen(
                    filename,
                    symbols,
                ) as Deno.DynamicLibrary<Deno.ForeignLibraryInterface>

                // Wrap only the tcsendbreak symbol; delegate everything else
                const proxyLib: Deno.DynamicLibrary<Deno.ForeignLibraryInterface> = {
                    symbols: new Proxy(realLib.symbols as unknown as Record<string, unknown>, {
                        get(target, prop, receiver) {
                            const value = Reflect.get(target, prop, receiver)
                            if (prop === 'tcsendbreak') {
                                return (...args: unknown[]) => {
                                    callCount++
                                    return value(...args)
                                }
                            }
                            return value
                        },
                    }) as unknown as Deno.StaticForeignLibraryInterface<Deno.ForeignLibraryInterface>,
                    close: () => realLib.close(),
                }

                return proxyLib
            },
        )

        try {
            const port = new SerialPort({ path: virtualPorts.port1, baudRate: 115200 })

            // Call with duration 0 (standard POSIX semantics)
            port.sendBreak(0)

            // Ensure exactly one native call occurred
            assertEquals(callCount, 1)

            port.close()
        } finally {
            dlopenStub.restore()
            await virtualPorts.cleanup()
        }
    })
})
