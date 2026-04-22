import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  CreateExerciseSchema,
  UpdateExerciseSchema,
  CreateVariantSchema,
  UpdateVariantSchema,
  ReorderVariantsSchema,
} from '@calist/shared';

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);

// Get all exercises for the current trainer
exercisesRouter.get('/', async (req, res) => {
  try {
    const trainerId = req.user!.impersonating || req.user!.userId;
    const exercises = await prisma.exercise.findMany({
      where: { trainerId },
      include: { variants: { orderBy: { difficultyOrder: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return res.json(exercises);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Get exercises for a specific trainer (admin use)
exercisesRouter.get('/trainer/:trainerId', async (req, res) => {
  try {
    const exercises = await prisma.exercise.findMany({
      where: { trainerId: req.params['trainerId'] },
      include: { variants: { orderBy: { difficultyOrder: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return res.json(exercises);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Create exercise
exercisesRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateExerciseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const trainerId = req.user!.impersonating || req.user!.userId;
    const count = await prisma.exercise.count({ where: { trainerId } });

    const exercise = await prisma.exercise.create({
      data: {
        trainerId,
        name: parsed.data.name,
        videoUrl: parsed.data.videoUrl || null,
        order: count,
      },
      include: { variants: true },
    });

    return res.status(201).json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// Update exercise
exercisesRouter.patch('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = UpdateExerciseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const exercise = await prisma.exercise.update({
      where: { id: req.params['id'] },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.videoUrl !== undefined && { videoUrl: parsed.data.videoUrl || null }),
      },
      include: { variants: { orderBy: { difficultyOrder: 'asc' } } },
    });

    return res.json(exercise);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// Delete exercise
exercisesRouter.delete('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.exercise.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

// Reorder exercises
exercisesRouter.post('/reorder', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    await Promise.all(
      orderedIds.map((id, index) =>
        prisma.exercise.update({ where: { id }, data: { order: index } }),
      ),
    );
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reorder exercises' });
  }
});

// -- Variants --

// Create variant
exercisesRouter.post('/:exerciseId/variants', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const count = await prisma.exerciseVariant.count({
      where: { exerciseId: req.params['exerciseId'] },
    });

    const variant = await prisma.exerciseVariant.create({
      data: {
        exerciseId: req.params['exerciseId'],
        name: parsed.data.name,
        videoUrl: parsed.data.videoUrl || null,
        difficultyOrder: count,
      },
    });

    return res.status(201).json(variant);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create variant' });
  }
});

// Update variant
exercisesRouter.patch(
  '/:exerciseId/variants/:variantId',
  requireRole('TRAINER', 'ADMIN'),
  async (req, res) => {
    try {
      const parsed = UpdateVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const variant = await prisma.exerciseVariant.update({
        where: { id: req.params['variantId'] },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.videoUrl !== undefined && { videoUrl: parsed.data.videoUrl || null }),
        },
      });

      return res.json(variant);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update variant' });
    }
  },
);

// Delete variant
exercisesRouter.delete(
  '/:exerciseId/variants/:variantId',
  requireRole('TRAINER', 'ADMIN'),
  async (req, res) => {
    try {
      await prisma.exerciseVariant.delete({ where: { id: req.params['variantId'] } });
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete variant' });
    }
  },
);

// Reorder variants
exercisesRouter.post(
  '/:exerciseId/variants/reorder',
  requireRole('TRAINER', 'ADMIN'),
  async (req, res) => {
    try {
      const parsed = ReorderVariantsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      await Promise.all(
        parsed.data.orderedIds.map((id, index) =>
          prisma.exerciseVariant.update({ where: { id }, data: { difficultyOrder: index } }),
        ),
      );

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to reorder variants' });
    }
  },
);
