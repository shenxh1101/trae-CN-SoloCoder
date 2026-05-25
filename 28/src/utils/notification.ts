const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function showSongNotification(songName: string, artistName: string, albumPic: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(songName, {
    body: artistName,
    icon: albumPic,
    tag: 'current-song',
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastContainer: HTMLDivElement | null = null;
let toasts: Toast[] = [];
let toastId = 0;

function getToastContainer(): HTMLDivElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function renderToasts() {
  const container = getToastContainer();
  container.innerHTML = '';

  toasts.forEach((toast) => {
    const toastEl = document.createElement('div');
    const bgColor =
      toast.type === 'success'
        ? 'bg-emerald-500/90'
        : toast.type === 'error'
        ? 'bg-red-500/90'
        : 'bg-accent-purple/90';

    toastEl.className = `px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg backdrop-blur-sm ${bgColor} animate-fade-in-up flex items-center gap-2`;
    toastEl.textContent = toast.message;

    if (toast.type === 'success') {
      const icon = document.createElement('span');
      icon.textContent = '✓';
      icon.className = 'text-base';
      toastEl.insertBefore(icon, toastEl.firstChild);
    } else if (toast.type === 'error') {
      const icon = document.createElement('span');
      icon.textContent = '✕';
      icon.className = 'text-base';
      toastEl.insertBefore(icon, toastEl.firstChild);
    }

    container.appendChild(toastEl);
  });
}

export function showToast(options: ToastOptions): void {
  const { message, type = 'success', duration = 3000 } = options;

  const id = ++toastId;
  toasts.push({ id, message, type });
  renderToasts();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    renderToasts();

    if (toasts.length === 0 && toastContainer) {
      toastContainer.remove();
      toastContainer = null;
    }
  }, duration);
}
