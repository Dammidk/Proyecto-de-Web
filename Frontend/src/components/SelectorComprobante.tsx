// Selector de archivo para comprobantes (foto de factura o PDF), con enlace al comprobante actual
import { FileText, Paperclip } from 'lucide-react';
import { TIPOS_COMPROBANTE } from '../utils/comprobante';

interface Props {
    archivo: File | null;
    onChange: (archivo: File | null) => void;
    urlActual?: string | null;
}

export default function SelectorComprobante({ archivo, onChange, urlActual }: Props) {
    return (
        <div>
            <label className="form-label flex items-center gap-1.5"><Paperclip size={14} /> Comprobante (imagen o PDF, máx. 15 MB)</label>
            <div className="border border-slate-200 rounded-md p-3 bg-slate-50 space-y-2">
                <input
                    type="file"
                    accept={TIPOS_COMPROBANTE}
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {urlActual && !archivo && (
                    <a href={urlActual} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                        <FileText size={12} /> Ver comprobante actual (se reemplaza si adjunta otro)
                    </a>
                )}
            </div>
        </div>
    );
}
