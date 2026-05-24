import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10);

  const team = await prisma.team.create({
    data: {
      name: '开发团队',
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      teamId: team.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user@example.com',
      username: 'user',
      password: hashedPassword,
      teamId: team.id,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: '示例项目',
      description: '这是一个示例项目，用于演示系统功能',
      teamId: team.id,
      createdBy: user1.id,
    },
  });

  const lists = ['待处理', '进行中', '待审核', '已完成'];
  const taskLists = [];

  for (let i = 0; i < lists.length; i++) {
    const list = await prisma.taskList.create({
      data: {
        name: lists[i],
        order: i,
        projectId: project.id,
      },
    });
    taskLists.push(list);
  }

  const tasks = [
    { title: '设计数据库架构', priority: 'HIGH', assignee: user1.id },
    { title: '实现用户认证功能', priority: 'MEDIUM', assignee: user1.id },
    { title: '开发任务看板页面', priority: 'MEDIUM', assignee: user2.id },
    { title: '编写API文档', priority: 'LOW', assignee: user2.id },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const taskData = tasks[i];
    const listIndex = i < 2 ? 0 : i === 2 ? 1 : 2;
    const statusMap = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

    await prisma.task.create({
      data: {
        title: taskData.title,
        description: `这是任务 "${taskData.title}" 的详细描述。\n\n请按时完成。`,
        priority: taskData.priority,
        status: statusMap[listIndex],
        dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        taskListId: taskLists[listIndex].id,
        projectId: project.id,
        assigneeId: taskData.assignee,
        createdBy: user1.id,
        order: i,
        tags: {
          create: [
            { name: '开发', color: '#3b82f6' },
            { name: '重要', color: '#ef4444' },
          ],
        },
      },
    });
  }

  console.log('种子数据已创建');
  console.log('登录账号: admin@example.com / 123456');
  console.log('登录账号: user@example.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
