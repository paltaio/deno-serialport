/**
 * Platform detection utilities for cross-platform serial port support.
 */

export type Platform = 'darwin' | 'linux';

/**
 * Get the current platform.
 */
export function getPlatform(): Platform {
  const os = Deno.build.os;

  if (os === 'darwin') {
    return 'darwin';
  } else if (os === 'linux') {
    return 'linux';
  } else {
    throw new Error(`Unsupported platform: ${os}. Only Darwin (macOS) and Linux are supported.`);
  }
}

/**
 * Check if the current platform is macOS/Darwin.
 */
export function isDarwin(): boolean {
  return Deno.build.os === 'darwin';
}

/**
 * Check if the current platform is Linux.
 */
export function isLinux(): boolean {
  return Deno.build.os === 'linux';
}

/**
 * Get the system library name for the current platform.
 */
export function getSystemLibrary(): string {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      return 'libSystem.dylib';
    case 'linux':
      return 'libc.so.6';
    default:
      throw new Error(`No system library defined for platform: ${platform}`);
  }
}

/**
 * Get the errno function name for the current platform.
 */
export function getErrnoFunctionName(): string {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      return '__error';
    case 'linux':
      return '__errno_location';
    default:
      throw new Error(`No errno function defined for platform: ${platform}`);
  }
}

/**
 * Get the device path prefix for serial ports on the current platform.
 */
export function getDevicePathPrefix(): string {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      // Use call-out devices for general use on macOS
      return '/dev/cu.';
    case 'linux':
      return '/dev/tty';
    default:
      throw new Error(`No device path prefix defined for platform: ${platform}`);
  }
}

/**
 * Check if a device path looks like a valid serial port for the current platform.
 */
export function isValidSerialPortPath(path: string): boolean {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      // macOS: /dev/cu.* devices (call-out devices)
      // Common patterns: /dev/cu.usbmodem*, /dev/cu.usbserial*, etc.
      return path.startsWith('/dev/cu.');
    case 'linux':
      // Linux: /dev/ttyS*, /dev/ttyUSB*, /dev/ttyACM*, etc.
      return /^\/dev\/tty(S|USB|ACM|AMA)\d+$/.test(path) ||
             path.startsWith('/dev/ttyS') ||
             path.startsWith('/dev/ttyUSB') ||
             path.startsWith('/dev/ttyACM');
    default:
      return false;
  }
}

/**
 * Platform-specific configuration.
 */
export interface PlatformConfig {
  platform: Platform;
  systemLibrary: string;
  errnoFunction: string;
  devicePathPrefix: string;
  termiosSize: number;
  ioctlConstants: {
    TIOCMGET: number;
    TIOCMSET: number;
    TIOCMBIS: number;
    TIOCMBIC: number;
    TIOCMIWAIT: number;
    TIOCGICOUNT: number;
    FIONREAD: number;
  };
  baudRateConstants: {
    B0: number;
    B50: number;
    B75: number;
    B110: number;
    B134: number;
    B150: number;
    B200: number;
    B300: number;
    B600: number;
    B1200: number;
    B1800: number;
    B2400: number;
    B4800: number;
    B9600: number;
    B19200: number;
    B38400: number;
    B57600: number;
    B115200: number;
    B230400: number;
  };
}

/**
 * Get platform-specific configuration.
 */
export function getPlatformConfig(): PlatformConfig {
  const platform = getPlatform();

  switch (platform) {
    case 'darwin':
      return {
        platform: 'darwin',
        systemLibrary: 'libSystem.dylib',
        errnoFunction: '__error',
        devicePathPrefix: '/dev/cu.',
        termiosSize: 72, // 64-bit mode: 4*8 + 20 + 4 (padding) + 2*8
        ioctlConstants: {
          TIOCMGET: 0x4004746a,
          TIOCMSET: 0x8004746d,
          TIOCMBIS: 0x8004746b, // Set bits
          TIOCMBIC: 0x8004746c, // Clear bits
          TIOCMIWAIT: 0x545c, // May need verification
          TIOCGICOUNT: 0x545d, // May need verification
          FIONREAD: 0x4004667f, // May need verification
        },
        baudRateConstants: {
          // On macOS, baud rates are actual values, not bit flags
          B0: 0,
          B50: 50,
          B75: 75,
          B110: 110,
          B134: 134,
          B150: 150,
          B200: 200,
          B300: 300,
          B600: 600,
          B1200: 1200,
          B1800: 1800,
          B2400: 2400,
          B4800: 4800,
          B9600: 9600,
          B19200: 19200,
          B38400: 38400,
          B57600: 57600,
          B115200: 115200,
          B230400: 230400,
        },
      };

    case 'linux':
      return {
        platform: 'linux',
        systemLibrary: 'libc.so.6',
        errnoFunction: '__errno_location',
        devicePathPrefix: '/dev/tty',
        termiosSize: 60, // Standard Linux termios size
        ioctlConstants: {
          TIOCMGET: 0x5415,
          TIOCMSET: 0x5418,
          TIOCMBIS: 0x5416, // Set bits
          TIOCMBIC: 0x5417, // Clear bits
          TIOCMIWAIT: 0x545c,
          TIOCGICOUNT: 0x545d,
          FIONREAD: 0x541b,
        },
        baudRateConstants: {
          // On Linux, baud rates are bit flags
          B0: 0x00000000,
          B50: 0x00000001,
          B75: 0x00000002,
          B110: 0x00000003,
          B134: 0x00000004,
          B150: 0x00000005,
          B200: 0x00000006,
          B300: 0x00000007,
          B600: 0x00000008,
          B1200: 0x00000009,
          B1800: 0x0000000a,
          B2400: 0x0000000b,
          B4800: 0x0000000c,
          B9600: 0x0000000d,
          B19200: 0x0000000e,
          B38400: 0x0000000f,
          B57600: 0x00010001,
          B115200: 0x00010002,
          B230400: 0x00010003,
        },
      };

    default:
      throw new Error(`No platform configuration defined for: ${platform}`);
  }
}