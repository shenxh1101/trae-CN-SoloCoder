import { useState } from 'react';

export default function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = '确认', cancelText = '取消', confirmDanger = false }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) return null;

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  }

  function handleConfirm() {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  }

  return (
    <div className={`modal-overlay ${isClosing ? 'fade-out' : ''}`} onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {title && <div className="modal-header"><h3>{title}</h3></div>}
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>{cancelText}</button>
          {onConfirm && (
            <button className={`btn ${confirmDanger ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
