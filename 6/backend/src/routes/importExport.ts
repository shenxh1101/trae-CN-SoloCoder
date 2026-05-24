import { Router } from 'express';
import xlsx from 'xlsx';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware, teamMemberMiddleware);

router.get('/export/:projectId', async (req, res) => {
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
        assignee: { select: { username: true } },
        tags: { select: { name: true } },
        subtasks: { select: { title: true, completed: true } },
        taskList: { select: { name: true } },
      },
    });

    const exportData = tasks.map((task) => ({
      标题: task.title,
      描述: task.description || '',
      状态: task.taskList.name,
      优先级: task.priority === 'HIGH' ? '高' : task.priority === 'MEDIUM' ? '中' : '低',
      截止日期: task.dueDate ? task.dueDate.toLocaleDateString() : '',
      指派人: task.assignee?.username || '',
      标签: task.tags.map((t) => t.name).join(', '),
      子任务: task.subtasks.map((s) => `${s.completed ? '✓' : '○'} ${s.title}`).join('\n'),
      创建时间: task.createdAt.toLocaleString(),
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(exportData);
    xlsx.utils.book_append_sheet(wb, ws, '任务列表');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const filename = encodeURIComponent(`${project.name}-任务导出.xlsx`);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('导出错误:', error);
    res.status(500).json({ error: '导出失败' });
  }
});

router.post('/import/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tasks } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { taskLists: true },
    });

    if (!project || project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const todoList = project.taskLists.find((tl) => tl.name === '待处理') || project.taskLists[0];

    if (!todoList) {
      return res.status(400).json({ error: '项目没有任务列表' });
    }

    const priorityMap: Record<string, any> = {
      高: 'HIGH',
      中: 'MEDIUM',
      低: 'LOW',
    };

    const statusMap: Record<string, any> = {
      待处理: 'TODO',
      进行中: 'IN_PROGRESS',
      待审核: 'REVIEW',
      已完成: 'DONE',
    };

    const createdTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const taskData = tasks[i];

      const task = await prisma.task.create({
        data: {
          title: taskData.title || taskData.标题 || '未命名任务',
          description: taskData.description || taskData.描述 || '',
          priority: priorityMap[taskData.priority || taskData.优先级] || 'MEDIUM',
          status: statusMap[taskData.status || taskData.状态] || 'TODO',
          dueDate: taskData.dueDate || taskData.截止日期 ? new Date(taskData.dueDate || taskData.截止日期) : null,
          taskListId: todoList.id,
          projectId,
          createdBy: req.user!.id,
          order: i,
        },
      });

      createdTasks.push(task);
    }

    res.status(201).json({
      message: `成功导入 ${createdTasks.length} 个任务`,
      tasks: createdTasks,
    });
  } catch (error) {
    res.status(500).json({ error: '导入失败' });
  }
});

export default router;
