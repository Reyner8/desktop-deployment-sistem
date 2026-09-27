/**
 * Interval setelah `lastSeen` device tidak diperbarui sehingga device
 * dianggap OFFLINE. Mengikuti definisi pada docs/database-schema.md.
 */
export const DEVICE_OFFLINE_AFTER_MS = 5 * 60 * 1000;
