import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';
import { trackTaskChanges } from '../utils/activityLog';
import { processMentions } from '../utils/mention';

const router = Router();

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  dueDate: z.string().optional(),
  taskListId: z.string(),
  projectId: z.string(),
  assigneeId: z.string().optional(),
  tags: z.array(z.object({ name: z.string(), color: z.string() })).optional(),
});

router.use(authMiddleware, teamMemberMiddleware);

router.get('/', async (req, res) => {
  try {
    const { projectId, status, assigneeId } = req.query;

    const where: any = {
      project: { teamId: req.user!.teamId! },
    };

    if (projectId) where.projectId = projectId as string;
    if (status) where.status = status as string;
    if (assigneeId) where.assigneeId = assigneeId as string;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, username: true, avatar: true } },
        tags: true,
        taskList: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true, subtasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        assignee: { select: { id: true, username: true, avatar: true, email: true } },
        creator: { select: { id: true, username: true, avatar: true } },
        tags: true,
        attachments: {
          include: {
            uploadedByUser: { select: { id: true, username: true } },
          },
        },
        subtasks: { orderBy: { order: 'asc' } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, username: true, avatar: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
        taskList: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, teamId: true } },
      },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = taskSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const taskList = await prisma.taskList.findUnique({
      where: { id: data.taskListId },
    });

    if (!taskList || taskList.projectId !== data.projectId) {
      return res.status(404).json({ error: '任务列表不存在' });
    }

    const maxOrder = await prisma.task.aggregate({
      where: { taskListId: data.taskListId },
      _max: { order: true },
    });

    const statusMap: Record<string, string> = {
      '待处理': 'TODO',
      '进行中': 'IN_PROGRESS',
      '待审核': 'REVIEW',
      '已完成': 'DONE',
    };

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        status: (data.status as any) || (statusMap[taskList.name] as any) || 'TODO',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        taskListId: data.taskListId,
        projectId: data.projectId,
        assigneeId: data.assigneeId,
        createdBy: req.user!.id,
        order: (maxOrder._max.order ?? -1) + 1,
        tags: data.tags
          ? {
              create: data.tags.map((tag) => ({
                name: tag.name,
                color: tag.color,
              })),
            }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, username: true, avatar: true } },
        tags: true,
      },
    });

    if (data.dueDate) {
      const remindAt = new Date(new Date(data.dueDate).getTime() - 24 * 60 * 60 * 1000);
      if (remindAt > new Date()) {
        await prisma.reminder.create({
          data: {
            taskId: task.id,
            remindAt,
          },
        });
      }
    }

    if (data.description) {
      await processMentions(data.description, task.id, req.user!.id, req.user!.teamId);
    }

    if (data.assigneeId && data.assigneeId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'ASSIGNMENT',
          content: `您被分配了新任务: ${data.title}`,
          taskId: task.id,
        },
      });
    }

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '创建任务失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const oldTask = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!oldTask || oldTask.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const data = taskSchema.partial().parse(req.body);

    await trackTaskChanges(req.params.id, req.user!.id, oldTask, data);

    const updateData: any = { ...data };

    if (data.tags) {
      await prisma.taskTag.deleteMany({ where: { taskId: req.params.id } });
      updateData.tags = {
        create: data.tags.map((tag: any) => ({
          name: tag.name,
          color: tag.color,
        })),
      };
    }

    if (data.dueDate) {
      const remindAt = new Date(new Date(data.dueDate).getTime() - 24 * 60 * 60 * 1000);
      if (remindAt > new Date()) {
        await prisma.reminder.upsert({
          where: { taskId: req.params.id },
          create: { taskId: req.params.id, remindAt },
          update: { remindAt, sent: false },
        });
      }
    }

    if (data.description) {
      await processMentions(data.description, req.params.id, req.user!.id, req.user!.teamId);
    }

    if (data.assigneeId && data.assigneeId !== oldTask.assigneeId && data.assigneeId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'ASSIGNMENT',
          content: `您被分配了新任务: ${oldTask.title}`,
          taskId: req.params.id,
        },
      });
    }

    delete updateData.tags;

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        dueDate: data.dueDate ? new Date(data.dueDate) : oldTask.dueDate,
      },
      include: {
        assignee: { select: { id: true, username: true, avatar: true } },
        tags: true,
      },
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '更新任务失败' });
  }
});

router.post('/move', async (req, res) => {
  try {
    const { taskId, taskListId, newOrder } = req.body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const taskList = await prisma.taskList.findUnique({
      where: { id: taskListId },
    });

    if (!taskList || taskList.projectId !== task.projectId) {
      return res.status(404).json({ error: '任务列表不存在' });
    }

    const statusMap: Record<string, string> = {
      '待处理': 'TODO',
      '进行中': 'IN_PROGRESS',
      '待审核': 'REVIEW',
      '已完成': 'DONE',
    };

    await trackTaskChanges(taskId, req.user!.id, task, {
      taskListId,
      status: statusMap[taskList.name] || task.status,
    });

    await prisma.task.update({
      where: { id: taskId },
      data: {
        taskListId,
        status: (statusMap[taskList.name] as any) || task.status,
        order: newOrder,
      },
    });

    const tasks = await prisma.task.findMany({
      where: { taskListId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id !== taskId) {
        const currentOrder = tasks[i].order;
        const targetOrder = i >= newOrder ? i + 1 : i;
        if (currentOrder !== targetOrder) {
          await prisma.task.update({
            where: { id: tasks[i].id },
            data: { order: targetOrder },
          });
        }
      }
    }

    res.json({ message: '任务移动成功' });
  } catch (error) {
    res.status(500).json({ error: '移动任务失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ message: '任务已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除任务失败' });
  }
});

router.post('/:id/subtasks', async (req, res) => {
  try {
    const { title } = req.body;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const maxOrder = await prisma.subtask.aggregate({
      where: { taskId: req.params.id },
      _max: { order: true },
    });

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId: req.params.id,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    res.status(201).json(subtask);
  } catch (error) {
    res.status(500).json({ error: '创建子任务失败' });
  }
});

router.put('/subtasks/:id', async (req, res) => {
  try {
    const { title, completed } = req.body;
    const subtask = await prisma.subtask.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!subtask || subtask.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '子任务不存在' });
    }

    const updated = await prisma.subtask.update({
      where: { id: req.params.id },
      data: { title, completed },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新子任务失败' });
  }
});

router.delete('/subtasks/:id', async (req, res) => {
  try {
    const subtask = await prisma.subtask.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!subtask || subtask.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '子任务不存在' });
    }

    await prisma.subtask.delete({ where: { id: req.params.id } });

    res.json({ message: '子任务已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除子任务失败' });
  }
});

export default router;
