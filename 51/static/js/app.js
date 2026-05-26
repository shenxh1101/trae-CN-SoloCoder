var confirmCallback = null;

function showConfirm(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('show');
    confirmCallback = callback;
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('show');
    confirmCallback = null;
}

document.addEventListener('DOMContentLoaded', function() {
    var confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            if (confirmCallback) {
                confirmCallback();
            }
            closeModal();
        });
    }

    bindDeleteEvents();
});

function bindDeleteEvents() {
    document.querySelectorAll('.delete-form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var btn = form.querySelector('[data-confirm]');
            var message = btn ? btn.dataset.confirm : '确定要执行此操作吗？';
            showConfirm(message, function() {
                form.submit();
            });
        });
    });

    document.querySelectorAll('.restore-form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var btn = form.querySelector('[data-confirm]');
            var message = btn ? btn.dataset.confirm : '确定要执行此操作吗？';
            showConfirm(message, function() {
                form.submit();
            });
        });
    });
}

function showShareModal() {
    document.getElementById('shareModal').classList.add('show');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('show');
}

function copyShareLink() {
    var linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    
    var btn = document.querySelector('.btn-copy');
    var originalText = btn.textContent;
    btn.textContent = '✓ 已复制';
    btn.style.background = '#10b981';
    
    setTimeout(function() {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 2000);
}

document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            if (modal.id === 'confirmModal') {
                confirmCallback = null;
            }
        }
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(function(modal) {
            modal.classList.remove('show');
        });
        confirmCallback = null;
    }
});

setTimeout(function() {
    document.querySelectorAll('.flash').forEach(function(flash) {
        flash.style.opacity = '0';
        flash.style.transform = 'translateY(-10px)';
        setTimeout(function() {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 300);
    });
}, 5000);
