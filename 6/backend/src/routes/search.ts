import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, teamMemberMiddleware);

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const teamId = req.user!.teamId!;
    const searchTerm = `%${q}%`;

    const tasks = await prisma.task.findMany({
      where: {
        project: { teamId },
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { comments: { some: { content: { contains: q } } } },
        ],
      },
      include: {
        project: { select: { name: true } },
        taskList: { select: { name: true } },
        assignee: { select: { username: true } },
        _count: { select: { comments: true, attachments: true, subtasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json(tasks);
  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

export default router;
