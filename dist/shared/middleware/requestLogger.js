import { logger } from '@/shared/utils/logger';
/**
 * Logs basic information for every incoming HTTP request and response.
 * - method, url, ip
 * - statusCode and duration (ms) when response finishes
 */
export function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, originalUrl } = req;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info('Incoming request', {
        method,
        path: originalUrl,
        ip,
    });
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method,
            path: originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip,
        });
    });
    next();
}
export default requestLogger;
//# sourceMappingURL=requestLogger.js.map