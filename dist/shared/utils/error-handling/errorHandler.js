function isOperationalError(err) {
    return err && typeof err.statusCode === 'number';
}
export function errorHandler(err, req, res, _next) {
    // Log full error for server-side inspection
    // (Replace with structured logger if available)
    console.log('XXX>', err);
    if (isOperationalError(err)) {
        const status = err.statusCode || 500;
        return res.status(status).json({
            error: {
                message: err.message,
                statusCode: status,
                details: err.details ?? null,
            },
        });
    }
    // Unknown or programming errors should not leak details
    return res.status(500).json({
        error: {
            message: 'Internal Server Error',
            statusCode: 500,
        },
    });
}
export default errorHandler;
//# sourceMappingURL=errorHandler.js.map