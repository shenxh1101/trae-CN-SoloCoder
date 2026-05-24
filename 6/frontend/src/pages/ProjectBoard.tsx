import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import TaskColumn from '../components/TaskColumn';
import Modal from '../components/Modal';
import TaskForm from '../components/TaskForm';
import type { Project, Task } from '../types';

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (error) {
      console.error('获取项目失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (listId: string) => {
    setSelectedListId(listId);
    setShowTaskModal(true);
  };

  const handleTaskCreated = () => {
    setShowTaskModal(false);
    fetchProject();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = project?.taskLists
      .flatMap((list) => list.tasks)
      .find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !project) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    let sourceList = project.taskLists.find((list) =>
      list.tasks.some((t) => t.id === activeId)
    );
    let targetList = project.taskLists.find((list) => list.id === overId);

    if (!targetList) {
      targetList = project.taskLists.find((list) =>
        list.tasks.some((t) => t.id === overId)
      );
    }

    if (!sourceList || !targetList) return;

    const sourceTasks = [...sourceList.tasks];
    const oldIndex = sourceTasks.findIndex((t) => t.id === activeId);

    if (sourceList.id === targetList.id) {
      const targetIndex = sourceTasks.findIndex((t) => t.id === overId);
      if (oldIndex !== targetIndex) {
        const newTasks = arrayMove(sourceTasks, oldIndex, targetIndex);
        setProject({
          ...project,
          taskLists: project.taskLists.map((list) =>
            list.id === sourceList.id ? { ...list, tasks: newTasks } : list
          ),
        });

        try {
          await api.post('/tasks/move', {
            taskId: activeId,
            taskListId: targetList.id,
            newOrder: targetIndex,
          });
        } catch (error) {
          fetchProject();
        }
      }
    } else {
      const targetTasks = [...targetList.tasks];
      const [movedTask] = sourceTasks.splice(oldIndex, 1);
      const insertIndex = targetTasks.findIndex((t) => t.id === overId);
      const newOrder = insertIndex === -1 ? targetTasks.length : insertIndex;

      movedTask.taskListId = targetList.id;
      movedTask.order = newOrder;
      targetTasks.splice(newOrder, 0, movedTask);

      setProject({
        ...project,
        taskLists: project.taskLists.map((list) => {
          if (list.id === sourceList.id) return { ...list, tasks: sourceTasks };
          if (list.id === targetList.id) return { ...list, tasks: targetTasks };
          return list;
        }),
      });

      try {
        await api.post('/tasks/move', {
          taskId: activeId,
          taskListId: targetList.id,
          newOrder,
        });
      } catch (error) {
        fetchProject();
      }
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/import-export/export/${id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${project?.name || '项目'}-任务导出.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('导出失败');
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);
      setImportPreview(jsonData.slice(0, 5));
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const tasks = XLSX.utils.sheet_to_json(sheet);

        await api.post(`/import-export/import/${id}`, { tasks });
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        fetchProject();
      };
      reader.readAsBinaryString(importFile);
    } catch (error) {
      console.error('导入失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-500">项目不存在</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/projects/${id}/gantt`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            📅 甘特图
          </Link>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            📥 导入
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            📤 导出Excel
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {project.taskLists.map((list) => (
            <TaskColumn key={list.id} list={list} onAddTask={handleAddTask} />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white rounded-lg border-2 border-blue-500 p-3 shadow-xl opacity-90">
              <h4 className="font-medium text-gray-900">{activeTask.title}</h4>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="新建任务"
        size="lg"
      >
        <TaskForm
          taskListId={selectedListId}
          projectId={id!}
          onSuccess={handleTaskCreated}
          onCancel={() => setShowTaskModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
        }}
        title="导入任务"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择Excel文件
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {importPreview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">预览（前5条）</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(importPreview[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-gray-600">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importPreview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-3 py-2 text-gray-900 truncate max-w-xs">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
                setImportPreview([]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!importFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              导入
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
