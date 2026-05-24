import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, teamMemberMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const teamId = req.user!.teamId!;
    const now = new Date();

    const totalTasks = await prisma.task.count({
      where: { project: { teamId } },
    });

    const completedTasks = await prisma.task.count({
      where: { project: { teamId }, status: 'DONE' },
    });

    const overdueTasks = await prisma.task.count({
      where: {
        project: { teamId },
        status: { not: 'DONE' },
        dueDate: { lt: now },
      },
    });

    const inProgressTasks = await prisma.task.count({
      where: { project: { teamId }, status: 'IN_PROGRESS' },
    });

    const todoTasks = await prisma.task.count({
      where: { project: { teamId }, status: 'TODO' },
    });

    const reviewTasks = await prisma.task.count({
      where: { project: { teamId }, status: 'REVIEW' },
    });

    res.json({
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      overdueTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
    });
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

router.get('/workload', async (req, res) => {
  try {
    const teamId = req.user!.teamId!;
    const members = await prisma.user.findMany({
      where: { teamId },
      select: {
        id: true,
        username: true,
        avatar: true,
        tasks: {
          where: {
            status: { not: 'DONE' },
          },
          select: {
            id: true,
            title: true,
            priority: true,
            dueDate: true,
          },
        },
      },
    });

    const workload = members.map((member) => {
      const taskCount = member.tasks.length;
      const highPriority = member.tasks.filter((t) => t.priority === 'HIGH').length;
      const overdue = member.tasks.filter((t) => t.dueDate && t.dueDate < new Date()).length;

      return {
        userId: member.id,
        username: member.username,
        avatar: member.avatar,
        taskCount,
        highPriority,
        overdue,
        tasks: member.tasks,
      };
    });

    res.json(workload);
  } catch (error) {
    res.status(500).json({ error: '获取工作负载失败' });
  }
});

router.get('/gantt/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, username: true, avatar: true } },
        taskList: { select: { id: true, name: true } },
        subtasks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const ganttData = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      startDate: task.createdAt,
      endDate: task.dueDate || null,
      progress: task.status === 'DONE' ? 100 : task.status === 'REVIEW' ? 80 : task.status === 'IN_PROGRESS' ? 50 : 0,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      taskList: task.taskList,
      subtasks: task.subtasks,
    }));

    res.json({
      project: {
        id: project.id,
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
      },
      tasks: ganttData,
    });
  } catch (error) {
    res.status(500).json({ error: '获取甘特图数据失败' });
  }
});

router.get('/completion-rate', async (req, res) => {
  try {
    const teamId = req.user!.teamId!;

    const members = await prisma.user.findMany({
      where: { teamId },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    const rates = [];
    for (const member of members) {
      const total = await prisma.task.count({
        where: { assigneeId: member.id, project: { teamId } },
      });
      const completed = await prisma.task.count({
        where: { assigneeId: member.id, project: { teamId }, status: 'DONE' },
      });

      rates.push({
        userId: member.id,
        username: member.username,
        avatar: member.avatar,
        totalTasks: total,
        completedTasks: completed,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    }

    res.json(rates);
  } catch (error) {
    res.status(500).json({ error: '获取完成率失败' });
  }
});

export default router;
