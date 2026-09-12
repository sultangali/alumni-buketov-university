import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { env } from './env';
import { connectDb } from './db';
import contentRoutes from './routes/content';
import authRoutes from './routes/auth';
import submissionRoutes from './routes/submissions';
import moderatorRoutes from './routes/moderators';
import mediaRoutes, { uploadsDir } from './routes/media';
import kioskRoutes from './routes/kiosk';
import mongoose from 'mongoose';

// Socket identity only: arbitrary X-Forwarded-For values never bypass limits.
// Bounded per-process storage. A multi-instance deployment needs a shared limiter.
function rateLimit(max: number) {
  const entries = new Map<string,{count:number;until:number}>();
  return (req: express.Request,res: express.Response,next: express.NextFunction) => {
    const now = Date.now();
    for (const [key,value] of entries) if (value.until <= now) entries.delete(key);
    const key = req.socket.remoteAddress || 'unknown';
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= 10000) return res.status(429).json({error:'try again later'});
      entry = {count:0,until:now+60000}; entries.set(key,entry);
    }
    if (++entry.count > max) { res.set('Retry-After',String(Math.ceil((entry.until-now)/1000)));return res.status(429).json({error:'try again later'}); }
    next();
  };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy',false);
  const origins = new Set((process.env.CORS_ORIGINS || '').split(',').map(v=>v.trim()).filter(Boolean));
  app.use(cors({origin:(origin,callback)=>callback(null,!origin || origins.has(origin))}));
  app.use('/api/auth',rateLimit(30));
  app.use('/api/submissions',rateLimit(120));
  app.use('/api/kiosk/handoffs',rateLimit(120));
  app.use('/api/kiosk/snapshot',rateLimit(60));
  app.use('/api/media',rateLimit(30));
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ok:ready,database:ready?'ready':'unavailable'});
  });

  app.use('/api', contentRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/moderators', moderatorRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/kiosk',kioskRoutes);

  // Serve uploads inline so profile photos / media render in <img>/<video>.
  // Safe because the upload route whitelists only inert raster image and
  // video MIME types (no SVG/HTML, which could carry scripts), and we send
  // X-Content-Type-Options: nosniff so the browser honours that type.
  app.use(
    '/media',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
      : ['ValidationError', 'CastError'].includes(err.name) ? 400
      : (err as Error & { code?: number }).code === 11000 ? 409
      : (err as Error & { status?: number }).status || 500;
    if (status >= 500) console.error('[error]', 'request failed', status);
    const message = ['ValidationError','CastError'].includes(err.name) ? 'invalid request' : status === 409 ? 'conflicting request' : status === 413 ? 'request too large' : err instanceof SyntaxError ? 'invalid JSON' : err.message;
    res.status(status).json({ error: status >= 500 ? 'internal server error' : message });
  });

  return app;
}

async function main() {
  await connectDb();
  const app = createApp();
  const host = process.env.HOST || '127.0.0.1';
  const server = app.listen(env.PORT, host, () => {
    console.log(`[server] listening on http://${host}:${env.PORT}`);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
}

if (require.main === module) main().catch(() => {
  console.error('[fatal]', 'server startup failed');
  process.exit(1);
});
