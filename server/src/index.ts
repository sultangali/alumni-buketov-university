import express from 'express';
import cors from 'cors';
import { env } from './env';
import { connectDb } from './db';
import contentRoutes from './routes/content';
import authRoutes from './routes/auth';
import submissionRoutes from './routes/submissions';
import mediaRoutes, { uploadsDir } from './routes/media';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api', contentRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/media', mediaRoutes);

  // Serve uploads as inert downloads: never sniff the type, never render
  // inline, and sandbox via CSP — defence-in-depth against stored XSS.
  app.use(
    '/media',
    express.static(uploadsDir, {
      setHeaders: (res) => {
        res.setHeader('Content-Disposition', 'attachment');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      },
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err.message);
    res.status(400).json({ error: err.message });
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
