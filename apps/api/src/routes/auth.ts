import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { setCookie, clearCookie, verifyToken, COOKIE_NAME, signToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import type { Role } from '@calist/shared';
import { SwitchRoleSchema } from '@calist/shared';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authRouter = Router();

authRouter.post('/google', async (req, res) => {
  try {
    const { credential } = req.body as { credential: string };
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const { email, name = email, picture } = payload;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user) {
      // Log pending access request and notify
      await prisma.pendingAccessRequest.create({
        data: {
          email,
          name,
          avatar: picture,
        },
      });
      return res.status(403).json({
        error: 'Access denied. Your request has been logged and an admin will review it.',
      });
    }

    // Update name/avatar if changed
    if (user.name !== name || user.avatar !== picture) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name, avatar: picture },
      });
    }

    const roles = user.roles.map((r) => r.role as Role);
    // Default active role: prefer ADMIN > TRAINER > TRAINEE
    const activeRole: Role =
      roles.includes('ADMIN') ? 'ADMIN' : roles.includes('TRAINER') ? 'TRAINER' : 'TRAINEE';

    setCookie(res, { userId: user.id, roles, activeRole });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roles,
        createdAt: user.createdAt.toISOString(),
      },
      activeRole,
      availableRoles: roles,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const { userId, roles, activeRole, impersonating } = req.user!;
    const effectiveUserId = impersonating || userId;

    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      include: { roles: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRoles = user.roles.map((r) => r.role as Role);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roles: userRoles,
        createdAt: user.createdAt.toISOString(),
      },
      activeRole,
      availableRoles: roles,
      impersonating: !!impersonating,
      realUserId: impersonating ? userId : undefined,
    });
  } catch (err) {
    console.error('Auth me error:', err);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

authRouter.post('/switch-role', requireAuth, async (req, res) => {
  try {
    const parsed = SwitchRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { role, targetUserId } = parsed.data;
    const { userId, roles } = req.user!;

    // Admin can switch to any role, optionally impersonating another user
    if (roles.includes('ADMIN')) {
      if (targetUserId && targetUserId !== userId) {
        // Impersonating another user
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          include: { roles: true },
        });
        if (!targetUser) {
          return res.status(404).json({ error: 'Target user not found' });
        }
        const targetRoles = targetUser.roles.map((r) => r.role as Role);
        if (!targetRoles.includes(role)) {
          return res.status(400).json({ error: `Target user does not have role ${role}` });
        }
        setCookie(res, { userId, roles, activeRole: role, impersonating: targetUserId });
        return res.json({ success: true, activeRole: role, impersonating: targetUserId });
      }
      if (!roles.includes(role)) {
        return res.status(400).json({ error: 'You do not have this role' });
      }
      setCookie(res, { userId, roles, activeRole: role });
      return res.json({ success: true, activeRole: role });
    }

    // Trainer can switch to TRAINEE for themselves
    if (roles.includes('TRAINER')) {
      if (role === 'ADMIN') {
        return res.status(403).json({ error: 'Trainers cannot switch to ADMIN' });
      }
      if (!roles.includes(role)) {
        return res.status(400).json({ error: 'You do not have this role' });
      }
      setCookie(res, { userId, roles, activeRole: role });
      return res.json({ success: true, activeRole: role });
    }

    return res.status(403).json({ error: 'Role switch not permitted' });
  } catch (err) {
    console.error('Switch role error:', err);
    return res.status(500).json({ error: 'Failed to switch role' });
  }
});

authRouter.post('/logout', (_req, res) => {
  clearCookie(res);
  return res.json({ success: true });
});

authRouter.post('/stop-impersonating', requireAuth, async (req, res) => {
  try {
    const { userId, roles } = req.user!;
    const activeRole: Role =
      roles.includes('ADMIN') ? 'ADMIN' : roles.includes('TRAINER') ? 'TRAINER' : 'TRAINEE';
    setCookie(res, { userId, roles, activeRole });
    return res.json({ success: true, activeRole });
  } catch (err) {
    console.error('Stop impersonating error:', err);
    return res.status(500).json({ error: 'Failed to stop impersonating' });
  }
});
