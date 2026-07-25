// Vercel serverless entry point
// Wraps the Express app for serverless execution.
//
// Vercel's rewrite (see vercel.json) forwards every `/api/*` request to this
// function *with the `/api` prefix intact*, but the Express routes are mounted
// at the root (`/health`, `/auth`, ...). In local dev the Vite proxy strips the
// prefix (vite.config.ts). We mirror that here so both environments match.

import type { IncomingMessage, ServerResponse } from 'http';
import app from '../apps/api/src/index.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (typeof req.url === 'string') {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
