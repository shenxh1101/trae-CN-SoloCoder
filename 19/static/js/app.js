function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.value || element.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.nextElementSibling.textContent;
        element.nextElementSibling.textContent = '已复制!';
        element.nextElementSibling.style.background = '#2ecc71';
        setTimeout(() => {
            element.nextElementSibling.textContent = originalText;
            element.nextElementSibling.style.background = '';
        }, 2000);
    }).catch(() => {
        element.select();
        document.execCommand('copy');
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tab + '-tab').classList.add('active');
            
            const folderNameInput = document.getElementById('folder-name-input');
            if (folderNameInput) {
                folderNameInput.style.display = tab === 'folder' ? 'block' : 'none';
            }
        });
    });
});
