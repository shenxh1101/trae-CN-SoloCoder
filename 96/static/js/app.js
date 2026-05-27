function pauseTask(taskId) {
    if (!confirm('确定要暂停此任务吗？')) return;
    fetch(`/task/${taskId}/pause`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('暂停失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function resumeTask(taskId) {
    fetch(`/task/${taskId}/resume`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('恢复失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function cancelTask(taskId) {
    if (!confirm('确定要取消此任务吗？此操作不可撤销。')) return;
    fetch(`/task/${taskId}/cancel`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('取消失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function deleteTask(taskId) {
    if (!confirm('确定要删除此任务吗？此操作不可撤销。')) return;
    fetch(`/task/${taskId}/delete`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const row = document.getElementById(`task-row-${taskId}`);
                if (row) {
                    row.style.transition = 'opacity 0.3s';
                    row.style.opacity = '0';
                    setTimeout(() => {
                        row.remove();
                        const table = document.querySelector('.data-table tbody');
                        if (table && table.children.length === 0) {
                            location.reload();
                        }
                    }, 300);
                } else {
                    location.reload();
                }
            } else {
                alert('删除失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function toggleSchedule(scheduleId, enabled) {
    fetch(`/schedule/${scheduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('操作失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function deleteSchedule(scheduleId) {
    if (!confirm('确定要删除此定时任务吗？此操作不可撤销。')) return;
    fetch(`/schedule/${scheduleId}/delete`, { method: 'POST' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                alert('删除失败');
            }
        })
        .catch(err => alert('操作失败: ' + err));
}

function autoRefreshTasks() {
    const runningTasks = document.querySelectorAll('.status-running, .status-paused, .status-pending');
    if (runningTasks.length > 0) {
        fetch('/api/tasks')
            .then(r => r.json())
            .then(tasks => {
                tasks.forEach(task => {
                    const row = document.getElementById(`task-row-${task.task_id}`);
                    if (row) {
                        const statusCell = row.querySelector('.status-badge');
                        const progressBar = row.querySelector('.progress-bar');
                        const progressText = row.querySelector('.progress-text');
                        if (statusCell) {
                            statusCell.className = `status-badge status-${task.status}`;
                            const statusText = {
                                'running': '运行中',
                                'pending': '等待中',
                                'paused': '已暂停',
                                'completed': '已完成',
                                'failed': '失败',
                                'cancelled': '已取消'
                            }[task.status] || task.status;
                            statusCell.textContent = statusText;
                        }
                        if (progressBar && progressText) {
                            progressBar.style.width = task.progress + '%';
                            progressText.textContent = task.progress + '%';
                        }
                        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
                            setTimeout(() => location.reload(), 1000);
                        }
                    }
                });
            })
            .catch(err => console.error('Auto refresh failed:', err));
    }
}

setInterval(autoRefreshTasks, 3000);
