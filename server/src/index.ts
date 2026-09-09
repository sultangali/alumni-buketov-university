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

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', contentRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/moderators', moderatorRoutes);
  app.use('/api/media', mediaRoutes);

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
    console.error('[error]', err.message);
    const status = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
      : ['ValidationError', 'CastError'].includes(err.name) ? 400
      : (err as Error & { code?: number }).code === 11000 ? 409
      : (err as Error & { status?: number }).status || 500;
    res.status(status).json({ error: status >= 500 ? 'internal server error' : err.message });
  });

  return app;
}

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://127.0.0.1:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
