function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('i');
    
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.style.background = 'var(--success-color)';
        toastIcon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.style.background = 'var(--danger-color)';
        toastIcon.className = 'fas fa-exclamation-circle';
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('CodeShare initialized');
});
