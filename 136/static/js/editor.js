document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const autoUpdate = document.getElementById('auto-update');

    if (editor) {
        editor.addEventListener('input', function() {
            triggerPreview();
        });

        editor.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
                triggerPreview();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                document.getElementById('edit-form').submit();
            }
        });

        if (autoUpdate) {
            autoUpdate.addEventListener('change', function() {
                if (this.checked) {
                    triggerPreview();
                }
            });
        }

        triggerPreview();
    }
});

document.getElementById('edit-form')?.addEventListener('submit', function(e) {
    const title = document.getElementById('title').value.trim();
    if (!title) {
        e.preventDefault();
        alert('请输入文档标题');
        return false;
    }
    return true;
});
