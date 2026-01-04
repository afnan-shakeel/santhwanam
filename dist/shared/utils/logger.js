/**
 * Simple logger utility for the application
 * Can be replaced with Winston, Pino, or other logging libraries
 */
class Logger {
    logLevel = process.env.LOG_LEVEL || 'info';
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }
    debug(message, meta) {
        if (this.shouldLog('debug')) {
            console.debug(`[DEBUG] ${message}`, meta || '');
        }
    }
    info(message, meta) {
        if (this.shouldLog('info')) {
            console.info(`[INFO] ${message}`, meta || '');
        }
    }
    warn(message, meta) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, meta || '');
        }
    }
    error(message, meta) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, meta || '');
        }
    }
}
export const logger = new Logger();
//# sourceMappingURL=logger.js.map