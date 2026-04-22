import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { CreateFeedbackSchema } from '@calist/shared';

export const feedbackRouter = Router();

feedbackRouter.use(requireAuth);

// Create feedback (trainer/admin only)
feedbackRouter.post('/', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const parsed = CreateFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const authorId = req.user!.impersonating || req.user!.userId;

    const feedback = await prisma.trainerFeedback.create({
      data: {
        authorId,
        weekId: parsed.data.weekId ?? null,
        rowId: parsed.data.rowId ?? null,
        content: parsed.data.content,
      },
      include: { author: true },
    });

    return res.status(201).json({
      ...feedback,
      author: {
        id: feedback.author.id,
        email: feedback.author.email,
        name: feedback.author.name,
        avatar: feedback.author.avatar,
      },
      createdAt: feedback.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// Update feedback
feedbackRouter.patch('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    const feedback = await prisma.trainerFeedback.update({
      where: { id: req.params['id'] },
      data: { content },
      include: { author: true },
    });

    return res.json({
      ...feedback,
      createdAt: feedback.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Delete feedback
feedbackRouter.delete('/:id', requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.trainerFeedback.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Get feedback for a week
feedbackRouter.get('/week/:weekId', async (req, res) => {
  try {
    const feedback = await prisma.trainerFeedback.findMany({
      where: { weekId: req.params['weekId'] },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      feedback.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get feedback for a row
feedbackRouter.get('/row/:rowId', async (req, res) => {
  try {
    const feedback = await prisma.trainerFeedback.findMany({
      where: { rowId: req.params['rowId'] },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(
      feedback.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});
