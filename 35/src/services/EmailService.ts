import * as MailComposer from 'expo-mail-composer';
import { Task, FocusSession } from '../types/models';
import { formatDate, formatDurationInHours, getStartOfWeek, getEndOfWeek } from '../utils/helpers';

export const EmailService = {
  isAvailable: async (): Promise<boolean> => {
    return await MailComposer.isAvailableAsync();
  },

  sendWeeklyReport: async (
    email: string,
    tasks: Task[],
    focusSessions: FocusSession[]
  ): Promise<void> => {
    const startOfWeek = getStartOfWeek().getTime();
    const endOfWeek = getEndOfWeek().getTime();

    const weekTasks = tasks.filter(
      (t) => t.createdAt >= startOfWeek && t.createdAt <= endOfWeek
    );
    const completedTasks = weekTasks.filter((t) => t.completed);
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < Date.now() && !t.completed
    );

    const totalFocusTime = focusSessions
      .filter((s) => s.startTime >= startOfWeek && s.startTime <= endOfWeek && s.completed)
      .reduce((sum, s) => sum + s.duration, 0);

    const subject = `每周任务报告 - ${formatDate(startOfWeek, 'yyyy-MM-dd')} 至 ${formatDate(endOfWeek, 'yyyy-MM-dd')}`;

    const body = `
      <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #6200ee;">📊 每周任务报告</h2>
        <p style="color: #666;">报告周期: ${formatDate(startOfWeek, 'yyyy年MM月dd日')} - ${formatDate(endOfWeek, 'yyyy年MM月dd日')}</p>

        <div style="margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 10px;">
          <h3>📋 任务统计</h3>
          <p>✅ 已完成任务: <strong>${completedTasks.length}</strong></p>
          <p>⏰ 逾期任务: <strong>${overdueTasks.length}</strong></p>
          <p>📝 本周新增任务: <strong>${weekTasks.length}</strong></p>
        </div>

        <div style="margin: 20px 0; padding: 20px; background: #e8f5e9; border-radius: 10px;">
          <h3>🎯 专注统计</h3>
          <p>⏱️ 本周专注时长: <strong>${formatDurationInHours(Math.round(totalFocusTime / 60))}</strong></p>
          <p>📈 专注次数: <strong>${focusSessions.filter(s => s.startTime >= startOfWeek && s.startTime <= endOfWeek).length}</strong></p>
        </div>

        ${completedTasks.length > 0 ? `
        <div style="margin: 20px 0; padding: 20px; background: #e3f2fd; border-radius: 10px;">
          <h3>✅ 已完成任务</h3>
          <ul>
            ${completedTasks.map((t) => `<li>${t.title} (${formatDate(t.completedAt, 'MM-dd HH:mm')})</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        ${overdueTasks.length > 0 ? `
        <div style="margin: 20px 0; padding: 20px; background: #ffebee; border-radius: 10px;">
          <h3>⚠️ 逾期任务</h3>
          <ul>
            ${overdueTasks.map((t) => `<li>${t.title} (截止: ${formatDate(t.dueDate, 'MM-dd')})</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          此邮件由 TodoApp 自动发送
        </p>
      </body>
      </html>
    `;

    await MailComposer.composeAsync({
      recipients: [email],
      subject,
      body,
      isHtml: true,
    });
  },

  sendCustomEmail: async (
    email: string,
    subject: string,
    body: string,
    isHtml: boolean = true
  ): Promise<void> => {
    await MailComposer.composeAsync({
      recipients: [email],
      subject,
      body,
      isHtml,
    });
  },
};
