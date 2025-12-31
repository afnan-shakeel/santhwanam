import express from 'express';
import cors from 'cors';
import errorHandler from '@/shared/utils/error-handling/errorHandler'
import responseHandler from '@/shared/middleware/responseHandler'
import iamRouter from '@/modules/iam/api/router'
import docsRouter from '@/docs/router'
import authRouter from '@/modules/auth/api/router'
import { approvalWorkflowRouter } from '@/modules/approval-workflow'
import { organizationBodiesRouter } from '@/modules/organization-bodies'
import { agentsRouter } from '@/modules/agents'
import { membersRouter } from '@/modules/members'
import { glRouter } from '@/modules/gl'
import { membershipRouter } from '@/modules/membership'
import { walletRouter } from '@/modules/wallet'
import { contextMiddleware } from '@/shared/infrastructure/context'
import { authenticate } from '@/shared/infrastructure/auth/middleware/authenticate'
import { registerEventHandlers } from '@/config/event-handlers.config'
import { logger } from '@/shared/utils/logger'
import requestLogger from '@/shared/middleware/requestLogger'

const app = express();

// Parse JSON first so auth/context can read body if needed
app.use(express.json());

// Enable CORS for all origins for now (adjust in production)
app.use(cors());
app.options('*', cors());

// Register event handlers BEFORE routes
registerEventHandlers();
logger.info('Event system initialized');

// Authentication middleware should run before contextMiddleware so
// the request user (if any) is captured into the ALS context.
app.use(authenticate);

app.use(contextMiddleware);

// Request logging: logs basic request/response info for each hit
app.use(requestLogger);

app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// Docs and OpenAPI
app.use('/api', docsRouter)

// IAM API
app.use('/api/iam', iamRouter)

// Auth API (password reset, login, etc.)
app.use('/api/auth', authRouter)

// Approval Workflow API
app.use('/api/approval-workflow', approvalWorkflowRouter)

// Organization Bodies API
app.use('/api/organization-bodies', organizationBodiesRouter)

// Agents API
app.use('/api/agents', agentsRouter)

// Members API
app.use('/api/members', membersRouter)

// Membership API
app.use('/api/membership', membershipRouter)

// Wallet API
app.use('/api/wallet', walletRouter)

// GL API
app.use('/api/gl', glRouter)

// Global response handler: support controllers calling `next({ SomeDto, payload, status })`
app.use(responseHandler)

// Global error handler (keep as last middleware)
app.use(errorHandler)

export default app;
