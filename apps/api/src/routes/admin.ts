import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AddTrainerSchema } from '@calist/shared';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

// List all trainers
adminRouter.get('/trainers', async (_req, res) => {
  try {
    const trainers = await prisma.user.findMany({
      where: { roles: { some: { role: 'TRAINER' } } },
      include: { roles: true },
      orderBy: { name: 'asc' },
    });

    return res.json(
      trainers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        roles: u.roles.map((r) => r.role),
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch trainers' });
  }
});

// Add trainer by email
adminRouter.post('/trainers', async (req, res) => {
  try {
    const parsed = AddTrainerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { email } = parsed.data;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0] ?? email,
          roles: { create: [{ role: 'TRAINER' }, { role: 'TRAINEE' }] },
        },
        include: { roles: true },
      });
    } else {
      // Add TRAINER role if not already present
      const hasTrainer = user.roles.some((r) => r.role === 'TRAINER');
      if (!hasTrainer) {
        await prisma.userRole.create({ data: { userId: user.id, role: 'TRAINER' } });
      }
      const hasTrainee = user.roles.some((r) => r.role === 'TRAINEE');
      if (!hasTrainee) {
        await prisma.userRole.create({ data: { userId: user.id, role: 'TRAINEE' } });
      }
      user = await prisma.user.findUnique({
        where: { email },
        include: { roles: true },
      });
    }

    return res.json({
      id: user!.id,
      email: user!.email,
      name: user!.name,
      avatar: user!.avatar,
      roles: user!.roles.map((r) => r.role),
      createdAt: user!.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add trainer' });
  }
});

// Remove trainer role
adminRouter.delete('/trainers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await prisma.userRole.deleteMany({
      where: { userId, role: 'TRAINER' },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove trainer' });
  }
});

// Get pending access requests
adminRouter.get('/pending-requests', async (_req, res) => {
  try {
    const requests = await prisma.pendingAccessRequest.findMany({
      orderBy: { attemptedAt: 'desc' },
    });

    return res.json(
      requests.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        avatar: r.avatar,
        attemptedAt: r.attemptedAt.toISOString(),
        notifiedAt: r.notifiedAt?.toISOString() ?? null,
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Dismiss a pending request
adminRouter.delete('/pending-requests/:id', async (req, res) => {
  try {
    await prisma.pendingAccessRequest.delete({ where: { id: req.params['id'] } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to dismiss request' });
  }
});

// List all users
adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { roles: true },
      orderBy: { name: 'asc' },
    });
    return res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        avatar: u.avatar,
        roles: u.roles.map((r) => r.role),
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});
