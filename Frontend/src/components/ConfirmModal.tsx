import { X, AlertTriangle, LogOut, Trash2 } from 'lucide-react';

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

    const iconMap = {
        danger: Trash2,
        warning: AlertTriangle,
        info: LogOut
    };

    const colorMap = {
        danger: 'text-rose-600 bg-rose-50 border-rose-200',
        warning: 'text-amber-600 bg-amber-50 border-amber-200',
        info: 'text-blue-600 bg-blue-50 border-blue-200'
    };

    const buttonMap = {
        danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600',
        warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600',
        info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'
    };

    const Icon = iconMap[type];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header border-b-0 pb-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full border ${colorMap[type]}`}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="modal-title">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="modal-footer bg-slate-50">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`btn text-white shadow-lg active:scale-95 ${buttonMap[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
