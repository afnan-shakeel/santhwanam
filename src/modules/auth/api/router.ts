import { Router } from 'express'
import * as ctrl from './controller'
import { validateBody } from '@/shared/middleware/validateZod'
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema } from './validators'

const router = Router()

// Public endpoints (no auth required - handled by authenticate middleware skip list)
router.post('/reset-password/request', validateBody(requestPasswordResetSchema), ctrl.requestPasswordResetController)
router.post('/reset-password', validateBody(resetPasswordSchema), ctrl.resetPasswordController)
router.post('/login', validateBody(loginSchema), ctrl.loginController)

// Protected endpoints (auth required)
router.get('/me', ctrl.meController)
router.get('/check-access', ctrl.checkAccessController)

export default router
