import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CreateWeekSchema } from '@calist/shared';

export const weeksRouter = Router();

weeksRouter.use(requireAuth);

// Create week
weeksRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateWeekSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const week = await prisma.week.create({
      data: {
        planId: parsed.data.planId,
        weekNumber: parsed.data.weekNumber,
        startDate: new Date(parsed.data.startDate),
        notes: parsed.data.notes,
      },
      include: {
        sessions: {
          orderBy: { order: 'asc' },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: { rows: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    return res.status(201).json(week);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create week' });
  }
});

// Update week
weeksRouter.patch('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { startDate, notes, weekNumber } = req.body as {
      startDate?: string;
      notes?: string;
      weekNumber?: number;
    };

    const week = await prisma.week.update({
      where: { id: req.params['id'] },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(notes !== undefined && { notes }),
        ...(weekNumber !== undefined && { weekNumber }),
      },
    });

    return res.json(week);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update week' });
  }
});

// Delete week
weeksRouter.delete('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.week.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete week' });
  }
});
