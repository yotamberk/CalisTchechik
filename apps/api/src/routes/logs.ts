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
    const { sessionId, startedAt, performedOn, completedAt } = parsed.data;

    const log = await prisma.sessionLog.upsert({
      where: { sessionId_traineeId: { sessionId, traineeId } },
      update: {
        ...(startedAt !== undefined && {
          startedAt: startedAt ? new Date(startedAt) : null,
        }),
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
        startedAt: startedAt ? new Date(startedAt) : null,
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
    const sessionLogId = req.params['sessionLogId']!;

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

// Paginated timeline of session logs for a trainee (History page)
logsRouter.get('/trainee/:traineeId/timeline', async (req, res) => {
  try {
    const { traineeId } = req.params;
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20')), 100);
    const offset = parseInt(String(req.query['offset'] ?? '0'));

    const [total, logs] = await Promise.all([
      prisma.sessionLog.count({ where: { traineeId } }),
      prisma.sessionLog.findMany({
        where: { traineeId },
        orderBy: [{ performedOn: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          session: {
            include: {
              week: { include: { plan: true } },
              _count: { select: { sections: true } },
            },
          },
        },
      }),
    ]);

    // Count exercises per session via sections->rows
    const sessionIds = logs.map((l) => l.sessionId);
    const rowCounts = await prisma.exerciseRow.groupBy({
      by: ['sectionId'],
      where: {
        section: { sessionId: { in: sessionIds } },
      },
      _count: { id: true },
    });
    // Map sectionId -> count, then sum per session
    const sectionToSession = await prisma.section.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true, sessionId: true },
    });
    const sectionSessionMap = new Map(sectionToSession.map((s) => [s.id, s.sessionId]));
    const exerciseCountMap = new Map<string, number>();
    for (const rc of rowCounts) {
      const sessionId = sectionSessionMap.get(rc.sectionId);
      if (sessionId) {
        exerciseCountMap.set(sessionId, (exerciseCountMap.get(sessionId) ?? 0) + rc._count.id);
      }
    }

    const items = logs.map((log) => {
      const durationMs =
        log.startedAt && log.completedAt
          ? log.completedAt.getTime() - log.startedAt.getTime()
          : null;
      return {
        logId: log.id,
        sessionId: log.sessionId,
        sessionName: log.session.name,
        planName: log.session.week.plan.name,
        weekNumber: log.session.week.weekNumber,
        performedOn: log.performedOn?.toISOString() ?? null,
        startedAt: log.startedAt?.toISOString() ?? null,
        completedAt: log.completedAt?.toISOString() ?? null,
        durationMs,
        exerciseCount: exerciseCountMap.get(log.sessionId) ?? 0,
        completed: !!log.completedAt,
      };
    });

    return res.json({ items, total, nextOffset: offset + limit < total ? offset + limit : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// Get full detail of a single session log (History detail modal)
logsRouter.get('/session-log/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const requestingUserId = req.user!.impersonating || req.user!.userId;
    const activeRole = req.user!.activeRole;

    const log = await prisma.sessionLog.findUnique({
      where: { id: logId },
      include: {
        session: {
          include: {
            week: { include: { plan: true } },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                rows: {
                  orderBy: { order: 'asc' },
                  include: { exercise: true, variant: true },
                },
              },
            },
          },
        },
        rowLogs: true,
      },
    });

    if (!log) return res.status(404).json({ error: 'Log not found' });

    // Authorization: owner trainee, or TRAINER/ADMIN
    if (activeRole === 'TRAINEE' && log.traineeId !== requestingUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const allRows = log.session.sections.flatMap((s) => s.rows);
    const durationMs =
      log.startedAt && log.completedAt
        ? log.completedAt.getTime() - log.startedAt.getTime()
        : null;

    const detail = {
      logId: log.id,
      sessionId: log.sessionId,
      sessionName: log.session.name,
      planName: log.session.week.plan.name,
      weekNumber: log.session.week.weekNumber,
      startedAt: log.startedAt?.toISOString() ?? null,
      performedOn: log.performedOn?.toISOString() ?? null,
      completedAt: log.completedAt?.toISOString() ?? null,
      durationMs,
      rows: allRows.map((row) => {
        const rowLog = log.rowLogs.find((l) => l.rowId === row.id);
        return {
          rowId: row.id,
          exerciseName: row.exercise.name,
          variantName: row.variant?.name ?? null,
          volumeType: row.volumeType,
          volumeValue: row.volumeValue,
          sets: row.sets,
          skipRating: row.skipRating,
          rpe: rowLog?.rpe ?? null,
          notes: rowLog?.notes ?? null,
        };
      }),
    };

    return res.json(detail);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch session log detail' });
  }
});

// Get all logs for a trainee (for dashboard / history — kept for trainer profile)
logsRouter.get('/trainee/:traineeId', async (req, res) => {
  try {
    const logs = await prisma.sessionLog.findMany({
      where: { traineeId: req.params['traineeId'] },
      include: {
        session: {
          include: {
            week: { include: { plan: true } },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                rows: {
                  orderBy: { order: 'asc' },
                  include: {
                    exercise: true,
                    variant: true,
                  },
                },
              },
            },
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
