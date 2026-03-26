import { X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger'
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const buttonMap = {
        danger: 'btn-danger',
        warning: 'btn-primary',
        info: 'btn-primary'
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content max-w-md"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button onClick={onClose} className="action-btn" aria-label="Cerrar">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">{cancelText}</button>
                    <button onClick={handleConfirm} className={`btn ${buttonMap[type]}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
