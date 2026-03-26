// Componentes de interfaz compartidos del sistema de diseño institucional
import { ReactNode } from 'react';
import { X } from 'lucide-react';

export function PageHeader({ kicker, titulo, descripcion, acciones }: {
    kicker?: string;
    titulo: string;
    descripcion?: string;
    acciones?: ReactNode;
}) {
    return (
        <header className="page-header">
            <div>
                {kicker && <p className="page-kicker">{kicker}</p>}
                <h1 className="page-title">{titulo}</h1>
                {descripcion && <p className="page-subtitle">{descripcion}</p>}
            </div>
            {acciones && <div className="flex items-center gap-2 flex-wrap">{acciones}</div>}
        </header>
    );
}

type TonoKpi = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export function Kpi({ etiqueta, valor, nota, tono = 'neutral' }: {
    etiqueta: string;
    valor: ReactNode;
    nota?: ReactNode;
    tono?: TonoKpi;
}) {
    const clase = tono === 'neutral' ? '' : `kpi-${tono}`;
    return (
        <div className={`kpi ${clase}`}>
            <p className="kpi-label">{etiqueta}</p>
            <p className="kpi-value">{valor}</p>
            {nota && <p className="kpi-note">{nota}</p>}
        </div>
    );
}

export function Panel({ titulo, acciones, children, sinRelleno }: {
    titulo?: string;
    acciones?: ReactNode;
    children: ReactNode;
    sinRelleno?: boolean;
}) {
    return (
        <section className="panel">
            {titulo && (
                <div className="panel-header">
                    <h3 className="panel-title">{titulo}</h3>
                    {acciones}
                </div>
            )}
            <div className={sinRelleno ? '' : 'panel-body'}>{children}</div>
        </section>
    );
}

export function Modal({ titulo, onCerrar, children, pie, ancho = 'md' }: {
    titulo: string;
    onCerrar: () => void;
    children: ReactNode;
    pie?: ReactNode;
    ancho?: 'md' | 'lg';
}) {
    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div
                className={ancho === 'lg' ? 'modal-content-lg' : 'modal-content'}
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className="modal-title">{titulo}</h3>
                    <button type="button" onClick={onCerrar} className="action-btn" aria-label="Cerrar">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {pie && <div className="modal-footer">{pie}</div>}
            </div>
        </div>
    );
}

export function EstadoVacio({ titulo, texto }: { titulo: string; texto?: string }) {
    return (
        <div className="empty-state">
            <p className="empty-state-title">{titulo}</p>
            {texto && <p className="empty-state-text">{texto}</p>}
        </div>
    );
}

export function Cargando({ texto = 'Cargando información' }: { texto?: string }) {
    return (
        <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <div className="spinner" />
            {texto}
        </div>
    );
}

// Campo de definición (etiqueta y valor) para fichas técnicas
export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return (
        <>
            <dt>{etiqueta}</dt>
            <dd>{children}</dd>
        </>
    );
}
