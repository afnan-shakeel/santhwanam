import { Router } from 'express'
import * as ctrl from './controller'
import { validateBody } from '@/shared/middleware/validateZod'
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema } from './validators'

const router = Router()

router.post('/reset-password/request', validateBody(requestPasswordResetSchema), ctrl.requestPasswordResetController)
router.post('/reset-password', validateBody(resetPasswordSchema), ctrl.resetPasswordController)
router.post('/login', validateBody(loginSchema), ctrl.loginController)

export default router
