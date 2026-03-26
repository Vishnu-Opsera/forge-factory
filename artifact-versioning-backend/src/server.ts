import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`🔥 Artifact Versioning API → http://localhost:${env.PORT}`);
  console.log(`   /api/v1 base path`);
  console.log(`   NODE_ENV: ${env.NODE_ENV}`);
});

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received — shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received — shutting down');
  server.close(() => process.exit(0));
});
