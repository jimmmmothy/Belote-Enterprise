import * as bcrypt from 'bcrypt';
import { signToken } from './jwt.js';
import { initNats } from './nats-client.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function start() {
  const nats = await initNats();

  // Handle registration
  nats.subscribe('auth.register', async (msg, reply) => {
    if (!reply) throw new Error('auth.register topic must be opened as two-directional request');
    try {
      const { data } = JSON.parse(msg);
      const { email, username, password, confirmPass } = data;

      if (!email || !username || !password || password !== confirmPass) {
        nats.sendMessage(reply, { error: 'Invalid registration data' });
        return;
      }

      const existing = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (existing) {
        nats.sendMessage(reply, { error: 'Email already in use' });
        return;
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hash
        }
      });
      const token = signToken(user.id, user.email, user.username);

      nats.sendMessage(reply, { token });
    } catch (err) {
      nats.sendMessage(reply, { error: `Internal error: ${err}` });
    }
  });

  // Handle login
  nats.subscribe('auth.login', async (msg, reply) => {
    if (!reply) throw Error('auth.login topic must be opened as two-directional request');

    try {
      const { data } = JSON.parse(msg);
      const { email, password } = data;
      if (!email || !password) {
        nats.sendMessage(reply, { error: 'Missing credentials' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (!user) {
        nats.sendMessage(reply, { error: 'Invalid credentials' });
        return;
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        nats.sendMessage(reply, { error: 'Invalid credentials' });
        return;
      }

      const token = signToken(user.id, user.email, user.username);
      nats.sendMessage(reply, { token });
    } catch (err) {
      nats.sendMessage(reply, { error: `Internal error: ${err}` });
    }
  });

  nats.subscribe('auth.change.email', async (msg, reply) => {
    if (!reply) return;
    try {
      const { data, user } = JSON.parse(msg) as { data?: { newEmail?: string }; user?: { userId?: string } };
      const userId = user?.userId;
      const newEmail = data?.newEmail;

      if (!userId || !newEmail) {
        nats.sendMessage(reply, { error: 'INVALID_REQUEST' });
        return;
      }

      const existingEmail = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existingEmail && existingEmail.id !== userId) {
        nats.sendMessage(reply, { error: 'Email already in use' });
        return;
      }

      await prisma.user.update({
        data: { email: newEmail },
        where: { id: userId },
      });

      nats.sendMessage(reply, { success: true });
    } catch (err) {
      console.error('auth.change.email failed', err);
      nats.sendMessage(reply, { error: 'FAILED' });
    }
  });

  nats.subscribe('auth.change.password', async (msg, reply) => {
    if (!reply) return;
    try {
      const { data, user } = JSON.parse(msg) as {
        data?: { currentPassword?: string; newPassword?: string };
        user?: { userId?: string };
      };
      const userId = user?.userId;
      const currentPassword = data?.currentPassword;
      const newPassword = data?.newPassword;

      if (!userId || !currentPassword || !newPassword) {
        nats.sendMessage(reply, { error: 'INVALID_REQUEST' });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        nats.sendMessage(reply, { error: 'USER_NOT_FOUND' });
        return;
      }

      const valid = await bcrypt.compare(currentPassword, existing.password);
      if (!valid) {
        nats.sendMessage(reply, { error: "Current password doesn't match" });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        data: { password: newHash },
        where: { id: userId }
      });

      nats.sendMessage(reply, { success: true });
    } catch (err) {
      console.error('auth.change.password failed', err);
      nats.sendMessage(reply, { error: 'FAILED' });
    }
  });

  nats.subscribe('auth.user.getPublicInfo', async (msg, reply) => {
    if (!reply) return;
    try {
      const { userId } = JSON.parse(msg) as { userId?: string };
      if (!userId) {
        nats.sendMessage(reply, { error: 'INVALID_REQUEST' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        nats.sendMessage(reply, { error: 'USER_NOT_FOUND' });
        return;
      }

      nats.sendMessage(reply, {
        id: user.id,
        email: user.email
      });
    } catch (err) {
      console.error('auth.user.getPublicInfo failed', err);
      nats.sendMessage(reply, { error: 'FAILED' });
    }
  });

  nats.subscribe('auth.user.delete', async (msg, reply) => {
    if (!reply) return;
    try {
      const { userId } = JSON.parse(msg) as { userId?: string };
      if (!userId) {
        nats.sendMessage(reply, { success: false, error: 'INVALID_REQUEST' });
        return;
      }

      try {
        await prisma.user.delete({ where: { id: userId } });
      } catch (err) {
        console.error('[ERROR] Failed to delete user', err);
        nats.sendMessage(reply, { success: false, error: 'FAILED' });
        return;
      }

      nats.sendMessage(reply, { success: true });
    } catch (err) {
      console.error('auth.user.delete failed', err);
      nats.sendMessage(reply, { success: false, error: 'FAILED' });
    }
  });
}

start().catch((err) => console.error('[FATAL]', err));
