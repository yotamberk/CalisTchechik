import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { exercisesRouter } from './routes/exercises.js';
import { plansRouter } from './routes/plans.js';
import { weeksRouter } from './routes/weeks.js';
import { sessionsRouter } from './routes/sessions.js';
import { logsRouter } from './routes/logs.js';
import { feedbackRouter } from './routes/feedback.js';
import { traineesRouter } from './routes/trainees.js';
import { copyRouter } from './routes/copy.js';

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:4173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/exercises', exercisesRouter);
app.use('/plans', plansRouter);
app.use('/weeks', weeksRouter);
app.use('/sessions', sessionsRouter);
app.use('/logs', logsRouter);
app.use('/feedback', feedbackRouter);
app.use('/trainees', traineesRouter);
app.use('/copy', copyRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  },
);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
