import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';
import { processMentions } from '../utils/mention';

const router = Router();

router.use(authMiddleware, teamMemberMiddleware);

const commentSchema = z.object({
  content: z.string().min(1),
  taskId: z.string(),
});

router.post('/', async (req, res) => {
  try {
    const { content, taskId } = commentSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const mentionedUserIds = await processMentions(
      content,
      taskId,
      req.user!.id,
      req.user!.teamId
    );

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId: req.user!.id,
        mentions: mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null,
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
    });

    const watchers = await prisma.comment.findMany({
      where: { taskId },
      select: { authorId: true },
      distinct: ['authorId'],
    });

    for (const watcher of watchers) {
      if (watcher.authorId !== req.user!.id && !mentionedUserIds.includes(watcher.authorId)) {
        await prisma.notification.create({
          data: {
            userId: watcher.authorId,
            type: 'COMMENT',
            content: `有人评论了您关注的任务`,
            taskId,
          },
        });
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '创建评论失败' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!comment || comment.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.authorId !== req.user!.id) {
      return res.status(403).json({ error: '无权限编辑此评论' });
    }

    const updated = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '更新评论失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!comment || comment.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.authorId !== req.user!.id) {
      return res.status(403).json({ error: '无权限删除此评论' });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });

    res.json({ message: '评论已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除评论失败' });
  }
});

export default router;
