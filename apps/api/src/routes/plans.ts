import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CreatePlanSchema } from '@calist/shared';

export const plansRouter = Router();

plansRouter.use(requireAuth);

// Get all plans for the current trainer
plansRouter.get('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const trainerId = req.user!.impersonating || req.user!.userId;

    const plans = await prisma.plan.findMany({
      where: { trainerId },
      include: {
        trainee: { include: { roles: true } },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { order: 'asc' },
              include: {
                sections: {
                  orderBy: { order: 'asc' },
                  include: {
                    rows: {
                      orderBy: { order: 'asc' },
                      include: { exercise: { include: { variants: true } }, variant: true },
                    },
                  },
                },
                logs: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return res.json(plans);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get plans for a trainee
plansRouter.get('/trainee', requireRole('TRAINEE'), async (req, res) => {
  try {
    const traineeId = req.user!.impersonating || req.user!.userId;

    const plans = await prisma.plan.findMany({
      where: { traineeId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { order: 'asc' },
              include: {
                sections: {
                  orderBy: { order: 'asc' },
                  include: {
                    rows: {
                      orderBy: { order: 'asc' },
                      include: { exercise: { include: { variants: true } }, variant: true },
                    },
                  },
                },
                logs: {
                  where: { traineeId },
                },
              },
            },
            feedback: {
              include: { author: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return res.json(plans);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Get a single plan
plansRouter.get('/:id', async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: req.params['id'] },
      include: {
        trainee: { include: { roles: true } },
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            sessions: {
              orderBy: { order: 'asc' },
              include: {
                sections: {
                  orderBy: { order: 'asc' },
                  include: {
                    rows: {
                      orderBy: { order: 'asc' },
                      include: {
                        exercise: { include: { variants: { orderBy: { difficultyOrder: 'asc' } } } },
                        variant: true,
                        feedback: { include: { author: true } },
                      },
                    },
                  },
                },
                logs: true,
              },
            },
            feedback: { include: { author: true }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    return res.json(plan);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Create plan
plansRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const trainerId = req.user!.impersonating || req.user!.userId;

    const plan = await prisma.plan.create({
      data: {
        trainerId,
        traineeId: parsed.data.traineeId,
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
      },
      include: {
        trainee: { include: { roles: true } },
        weeks: true,
      },
    });

    return res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Update plan
plansRouter.patch('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { name, startDate } = req.body as { name?: string; startDate?: string };

    const plan = await prisma.plan.update({
      where: { id: req.params['id'] },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
      },
      include: {
        trainee: { include: { roles: true } },
        weeks: true,
      },
    });

    return res.json(plan);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Delete plan
plansRouter.delete('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.plan.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete plan' });
  }
});
