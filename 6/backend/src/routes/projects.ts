import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.use(authMiddleware, teamMemberMiddleware);

router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { teamId: req.user!.teamId! },
      include: {
        _count: {
          select: { taskLists: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        taskLists: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: {
                  select: { id: true, username: true, avatar: true },
                },
                tags: true,
                _count: {
                  select: { comments: true, attachments: true },
                },
              },
            },
          },
        },
      },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        teamId: req.user!.teamId!,
        createdBy: req.user!.id,
      },
    });

    const defaultLists = ['待处理', '进行中', '待审核', '已完成'];
    for (let i = 0; i < defaultLists.length; i++) {
      await prisma.taskList.create({
        data: {
          name: defaultLists[i],
          order: i,
          projectId: project.id,
        },
      });
    }

    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '创建项目失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const data = projectSchema.parse(req.body);

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '更新项目失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const taskLists = await prisma.taskList.findMany({
      where: { projectId: req.params.id },
      select: { id: true },
    });
    const taskListIds = taskLists.map(tl => tl.id);

    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.id },
      select: { id: true },
    });
    const taskIds = tasks.map(t => t.id);

    await prisma.activityLog.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    await prisma.comment.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    await prisma.attachment.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    await prisma.subtask.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    await prisma.taskTag.deleteMany({
      where: { taskId: { in: taskIds } },
    });

    await prisma.task.deleteMany({
      where: { projectId: req.params.id },
    });

    await prisma.taskList.deleteMany({
      where: { projectId: req.params.id },
    });

    await prisma.project.delete({
      where: { id: req.params.id },
    });

    res.json({ message: '项目已删除' });
  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

export default router;
