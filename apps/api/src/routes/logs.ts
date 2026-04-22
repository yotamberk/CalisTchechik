import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UpsertSessionLogSchema, UpsertRowLogSchema } from '@calist/shared';

export const logsRouter = Router();

logsRouter.use(requireAuth);

// Get session log for a session (trainee)
logsRouter.get('/session/:sessionId', async (req, res) => {
  try {
    const traineeId = req.user!.impersonating || req.user!.userId;

    const log = await prisma.sessionLog.findUnique({
      where: {
        sessionId_traineeId: {
          sessionId: req.params['sessionId'],
          traineeId,
        },
      },
      include: { rowLogs: true },
    });

    return res.json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch session log' });
  }
});

// Upsert session log
logsRouter.post('/session', requireRole('TRAINEE'), async (req, res) => {
  try {
    const parsed = UpsertSessionLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const traineeId = req.user!.impersonating || req.user!.userId;
    const { sessionId, performedOn, completedAt } = parsed.data;

    const log = await prisma.sessionLog.upsert({
      where: { sessionId_traineeId: { sessionId, traineeId } },
      update: {
        ...(performedOn !== undefined && {
          performedOn: performedOn ? new Date(performedOn) : null,
        }),
        ...(completedAt !== undefined && {
          completedAt: completedAt ? new Date(completedAt) : null,
        }),
      },
      create: {
        sessionId,
        traineeId,
        performedOn: performedOn ? new Date(performedOn) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
      },
      include: { rowLogs: true },
    });

    return res.json(log);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upsert session log' });
  }
});

// Upsert row log
logsRouter.post('/row/:sessionLogId', requireRole('TRAINEE'), async (req, res) => {
  try {
    const parsed = UpsertRowLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { rowId, rpe, notes } = parsed.data;
    const { sessionLogId } = req.params;

    const rowLog = await prisma.rowLog.upsert({
      where: { sessionLogId_rowId: { sessionLogId, rowId } },
      update: {
        ...(rpe !== undefined && { rpe }),
        ...(notes !== undefined && { notes }),
      },
      create: {
        sessionLogId,
        rowId,
        rpe: rpe ?? null,
        notes: notes ?? null,
      },
    });

    return res.json(rowLog);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upsert row log' });
  }
});

// Get all logs for a trainee (for dashboard)
logsRouter.get('/trainee/:traineeId', async (req, res) => {
  try {
    const logs = await prisma.sessionLog.findMany({
      where: { traineeId: req.params['traineeId'] },
      include: {
        session: {
          include: {
            week: { include: { plan: true } },
          },
        },
        rowLogs: true,
      },
      orderBy: { performedOn: 'desc' },
    });

    return res.json(logs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch trainee logs' });
  }
});
