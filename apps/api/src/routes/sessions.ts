import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  CreateSessionSchema,
  CreateSectionSchema,
  CreateExerciseRowSchema,
  UpdateExerciseRowSchema,
} from '@calist/shared';

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

// Create session
sessionsRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const session = await prisma.session.create({
      data: {
        weekId: parsed.data.weekId,
        name: parsed.data.name,
        order: parsed.data.order,
      },
      include: {
        sections: {
          include: { rows: { include: { exercise: true, variant: true } } },
        },
      },
    });

    return res.status(201).json(session);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session
sessionsRouter.patch('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { name, order } = req.body as { name?: string; order?: number };

    const session = await prisma.session.update({
      where: { id: req.params['id'] },
      data: {
        ...(name && { name }),
        ...(order !== undefined && { order }),
      },
    });

    return res.json(session);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
sessionsRouter.delete('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.session.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// -- Sections --

// Create section
sessionsRouter.post('/sections', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const section = await prisma.section.create({
      data: {
        sessionId: parsed.data.sessionId,
        name: parsed.data.name,
        order: parsed.data.order,
      },
      include: { rows: { include: { exercise: true, variant: true } } },
    });

    return res.status(201).json(section);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create section' });
  }
});

// Update section
sessionsRouter.patch('/sections/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { name, order } = req.body as { name?: string; order?: number };

    const section = await prisma.section.update({
      where: { id: req.params['id'] },
      data: {
        ...(name && { name }),
        ...(order !== undefined && { order }),
      },
    });

    return res.json(section);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update section' });
  }
});

// Delete section
sessionsRouter.delete('/sections/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.section.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete section' });
  }
});

// -- Exercise Rows --

// Create row
sessionsRouter.post('/rows', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateExerciseRowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const row = await prisma.exerciseRow.create({
      data: {
        sectionId: parsed.data.sectionId,
        order: parsed.data.order,
        groupKey: parsed.data.groupKey ?? null,
        exerciseId: parsed.data.exerciseId,
        variantId: parsed.data.variantId ?? null,
        restMinutes: parsed.data.restMinutes,
        volumeType: parsed.data.volumeType,
        volumeValue: parsed.data.volumeValue,
        breakMinutes: parsed.data.breakMinutes,
        sets: parsed.data.sets,
      },
      include: { exercise: { include: { variants: true } }, variant: true },
    });

    return res.status(201).json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create exercise row' });
  }
});

// Update row
sessionsRouter.patch('/rows/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = UpdateExerciseRowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const row = await prisma.exerciseRow.update({
      where: { id: req.params['id'] },
      data: {
        ...(parsed.data.order !== undefined && { order: parsed.data.order }),
        ...(parsed.data.groupKey !== undefined && { groupKey: parsed.data.groupKey }),
        ...(parsed.data.exerciseId && { exerciseId: parsed.data.exerciseId }),
        ...(parsed.data.variantId !== undefined && { variantId: parsed.data.variantId }),
        ...(parsed.data.restMinutes !== undefined && { restMinutes: parsed.data.restMinutes }),
        ...(parsed.data.volumeType && { volumeType: parsed.data.volumeType }),
        ...(parsed.data.volumeValue !== undefined && { volumeValue: parsed.data.volumeValue }),
        ...(parsed.data.breakMinutes !== undefined && { breakMinutes: parsed.data.breakMinutes }),
        ...(parsed.data.sets !== undefined && { sets: parsed.data.sets }),
      },
      include: { exercise: { include: { variants: true } }, variant: true },
    });

    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update exercise row' });
  }
});

// Delete row
sessionsRouter.delete('/rows/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.exerciseRow.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete exercise row' });
  }
});

// Reorder rows within a section
sessionsRouter.post('/rows/reorder', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.exerciseRow.update({ where: { id }, data: { order: index } }),
      ),
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reorder rows' });
  }
});
