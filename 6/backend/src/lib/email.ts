import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(`邮件已发送到 ${to}`);
  } catch (error) {
    console.error('发送邮件失败:', error);
  }
};

export const sendTaskReminder = async (
  userEmail: string,
  taskTitle: string,
  dueDate: Date,
  taskId: string
) => {
  const subject = `任务即将到期: ${taskTitle}`;
  const text = `您的任务 "${taskTitle}" 将于 ${dueDate.toLocaleString()} 到期。请及时处理。\n\n查看任务: ${process.env.CLIENT_URL}/tasks/${taskId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>任务即将到期提醒</h2>
      <p>您的任务 <strong>"${taskTitle}"</strong> 将于 <strong>${dueDate.toLocaleString()}</strong> 到期。</p>
      <p>请及时处理，避免逾期。</p>
      <a href="${process.env.CLIENT_URL}/tasks/${taskId}" 
         style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
        查看任务
      </a>
    </div>
  `;
  await sendEmail(userEmail, subject, text, html);
};
