import { Request, Response, Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { NatsClient } from '../types/nats.js';

export function createAuthRoutes(nats: NatsClient) {
    const router = Router();

    const requestAuthService = async (topic: string, req: Request, res: Response) => {
        try {
            const data = req.body;
            const user: { userId: string, username: string } | undefined = req.user;
            const result = await nats.request(topic, { data, user }, 3000);
            if (result.error) return res.status(400).json({ error: result.error });
            res.status(201).json({ token: result.token });
        } catch (err) {
            res.status(500).json({ error: 'Auth service unavailable' });
        }
    }

    router.post('/register', async (req, res) => {
        requestAuthService('auth.register', req, res);
    });

    router.post('/login', async (req, res) => {
        requestAuthService('auth.login', req, res);
    });

    router.post('/me/change-email', authMiddleware, async (req, res) => {
        requestAuthService('auth.change.email', req, res);
    });

    router.post('/me/change-password', authMiddleware, async (req, res) => {
        requestAuthService('auth.change.password', req, res);
    });

    return router;
}
