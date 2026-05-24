import prisma from '../lib/prisma';

export const createActivityLog = async (
  taskId: string,
  userId: string,
  field: string,
  oldValue: string | null | undefined,
  newValue: string | null | undefined
) => {
  await prisma.activityLog.create({
    data: {
      taskId,
      userId,
      field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
};

export const trackTaskChanges = async (
  taskId: string,
  userId: string,
  oldTask: any,
  newData: any
) => {
  const fieldsToTrack = [
    'title',
    'description',
    'status',
    'priority',
    'dueDate',
    'assigneeId',
    'taskListId',
  ];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && newData[field] !== oldTask[field]) {
      let oldVal = oldTask[field];
      let newVal = newData[field];

      if (field === 'dueDate') {
        oldVal = oldVal?.toISOString() || null;
        newVal = newVal ? new Date(newVal).toISOString() : null;
      }

      await createActivityLog(
        taskId,
        userId,
        field,
        String(oldVal ?? ''),
        String(newVal ?? '')
      );
    }
  }
};
