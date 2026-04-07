import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import env from './config/env.js';
import adminRoutes from './modules/admin/routes.js';
import authRoutes from './modules/auth/routes.js';
import catalogRoutes from './modules/catalog/routes.js';
import orderRoutes from './modules/orders/routes.js';
import paymentRoutes from './modules/payments/routes.js';
import sellerRoutes from './modules/seller/routes.js';
import storageRoutes from './modules/storage/routes.js';
import riderRoutes from './modules/rider/routes.js';
import {
  getMetricsSnapshot,
  getMonitoringSnapshot,
  observabilityMiddleware,
} from './monitoring/observability.js';
import { util } from './store.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(observabilityMiddleware);

app.get(`${env.apiPrefix}/health`, (_req, res) => {
  res.json({ ok: true, service: 'foodiego-backend', timestamp: util.nowIso() });
});

app.get(`${env.apiPrefix}/metrics`, (_req, res) => {
  res.json({ ok: true, metrics: getMetricsSnapshot() });
});

app.get(`${env.apiPrefix}/monitoring`, (_req, res) => {
  res.json({ ok: true, monitoring: getMonitoringSnapshot() });
});

app.use(env.apiPrefix, authRoutes);
app.use(env.apiPrefix, catalogRoutes);
app.use(env.apiPrefix, orderRoutes);
app.use(env.apiPrefix, paymentRoutes);
app.use(env.apiPrefix, sellerRoutes);
app.use(env.apiPrefix, adminRoutes);
app.use(env.apiPrefix, storageRoutes);
app.use(env.apiPrefix, riderRoutes);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: String((req as any).requestId || ''),
    },
  });
});

export default app;
