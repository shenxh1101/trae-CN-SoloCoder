import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { read } = req.query;

    const where: any = { userId: req.user!.id };
    if (read !== undefined) {
      where.read = read === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.id,
        read: false,
      },
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: '获取未读通知数量失败' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: '通知不存在' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '标记通知已读失败' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        read: false,
      },
      data: { read: true },
    });

    res.json({ message: '所有通知已标记为已读' });
  } catch (error) {
    res.status(500).json({ error: '标记所有通知已读失败' });
  }
});

export default router;
