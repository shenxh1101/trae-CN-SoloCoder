import prisma from '../lib/prisma';

export const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)];
};

export const processMentions = async (
  content: string,
  taskId: string,
  authorId: string,
  teamId: string | null
): Promise<string[]> => {
  const mentions = extractMentions(content);

  if (mentions.length === 0 || !teamId) return [];

  const mentionedUsers = await prisma.user.findMany({
    where: {
      username: { in: mentions },
      teamId,
    },
    select: { id: true, username: true },
  });

  const userIds: string[] = [];

  for (const user of mentionedUsers) {
    if (user.id !== authorId) {
      userIds.push(user.id);
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'MENTION',
          content: `有人在任务中@了您`,
          taskId,
        },
      });
    }
  }

  return mentionedUsers.map((u) => u.id);
};
