import express from 'express';
import errorHandler from '@/shared/utils/error-handling/errorHandler'
import responseHandler from '@/shared/middleware/responseHandler'
import iamRouter from '@/modules/iam/api/router'
import docsRouter from '@/docs/router'
import authRouter from '@/modules/auth/api/router'
import { contextMiddleware } from '@/shared/infrastructure/context'
import { authenticate } from '@/shared/infrastructure/auth/middleware/authenticate'

const app = express();

// Parse JSON first so auth/context can read body if needed
app.use(express.json());

// Authentication middleware should run before contextMiddleware so
// the request user (if any) is captured into the ALS context.
app.use(authenticate);

app.use(contextMiddleware);

app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// Docs and OpenAPI
app.use('/api', docsRouter)

// IAM API
app.use('/api/iam', iamRouter)

// Auth API (password reset, login, etc.)
app.use('/api/auth', authRouter)

// Global response handler: support controllers calling `next({ SomeDto, payload, status })`
app.use(responseHandler)

// Global error handler (keep as last middleware)
app.use(errorHandler)

export default app;
