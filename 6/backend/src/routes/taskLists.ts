import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, teamMemberMiddleware);

const taskListSchema = z.object({
  name: z.string().min(1).max(50),
  projectId: z.string(),
});

router.post('/', async (req, res) => {
  try {
    const { name, projectId } = taskListSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const maxOrder = await prisma.taskList.aggregate({
      where: { projectId },
      _max: { order: true },
    });

    const taskList = await prisma.taskList.create({
      data: {
        name,
        projectId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.status(201).json(taskList);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '创建任务列表失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const taskList = await prisma.taskList.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!taskList || taskList.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务列表不存在' });
    }

    const { name } = z.object({ name: z.string().min(1).max(50) }).parse(req.body);

    const updated = await prisma.taskList.update({
      where: { id: req.params.id },
      data: { name },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '更新任务列表失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const taskList = await prisma.taskList.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!taskList || taskList.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务列表不存在' });
    }

    await prisma.taskList.delete({
      where: { id: req.params.id },
    });

    res.json({ message: '任务列表已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除任务列表失败' });
  }
});

export default router;
