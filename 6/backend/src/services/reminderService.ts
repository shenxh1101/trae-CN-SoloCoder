import prisma from '../lib/prisma';
import { sendTaskReminder } from '../lib/email';

export const checkAndSendReminders = async () => {
  try {
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

    const reminders = await prisma.reminder.findMany({
      where: {
        sent: false,
        remindAt: {
          gte: now,
          lte: tenMinutesLater,
        },
      },
      include: {
        task: {
          include: {
            assignee: {
              select: { email: true },
            },
          },
        },
      },
    });

    for (const reminder of reminders) {
      if (reminder.task.assignee?.email) {
        await sendTaskReminder(
          reminder.task.assignee.email,
          reminder.task.title,
          reminder.remindAt,
          reminder.taskId
        );

        await prisma.notification.create({
          data: {
            userId: reminder.task.assigneeId!,
            type: 'DUE_REMINDER',
            content: `任务 "${reminder.task.title}" 将于24小时内到期`,
            taskId: reminder.taskId,
          },
        });

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { sent: true },
        });
      }
    }

    console.log(`已检查 ${reminders.length} 个提醒`);
  } catch (error) {
    console.error('检查提醒失败:', error);
  }
};

export const startReminderService = () => {
  setInterval(checkAndSendReminders, 5 * 60 * 1000);
  console.log('提醒服务已启动，每5分钟检查一次');
};
