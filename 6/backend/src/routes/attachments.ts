import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { authMiddleware, teamMemberMiddleware } from '../middleware/auth';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware, teamMemberMiddleware);

router.post('/:taskId', upload.single('file'), async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const attachment = await prisma.attachment.create({
      data: {
        filename: req.file.originalname,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        taskId,
        uploadedBy: req.user!.id,
      },
      include: {
        uploadedByUser: { select: { id: true, username: true } },
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: '上传附件失败' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!attachment || attachment.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '附件不存在' });
    }

    res.download(attachment.path, attachment.filename);
  } catch (error) {
    res.status(500).json({ error: '下载附件失败' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } },
    });

    if (!attachment || attachment.task.project.teamId !== req.user!.teamId) {
      return res.status(404).json({ error: '附件不存在' });
    }

    if (attachment.uploadedBy !== req.user!.id) {
      return res.status(403).json({ error: '无权限删除此附件' });
    }

    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }

    await prisma.attachment.delete({ where: { id: req.params.id } });

    res.json({ message: '附件已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除附件失败' });
  }
});

export default router;
