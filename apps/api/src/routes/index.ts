import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import tenantsRouter from './tenants.js';

const router = Router();

// Health & readiness probes (no auth)
router.use('/health', healthRouter);

// Auth routes
router.use('/auth', authRouter);

// Tenant management
router.use('/tenants', tenantsRouter);

export default router;
