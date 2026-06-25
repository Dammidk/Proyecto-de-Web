// Indicador de vencimiento documental: el color siempre va acompañado de ícono y texto
import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

export type NivelAlerta = 'VENCIDO' | 'CRITICO' | 'URGENTE' | 'PROXIMO' | 'VIGENTE' | 'SIN_REGISTRO';

const NIVELES: Record<NivelAlerta, { etiqueta: string; clase: string; Icono: typeof Clock }> = {
    VENCIDO: { etiqueta: 'Vencido', clase: 'bg-rose-50 text-rose-700 border-rose-200', Icono: AlertOctagon },
    CRITICO: { etiqueta: '≤ 5 días', clase: 'bg-rose-50 text-rose-700 border-rose-200', Icono: AlertTriangle },
    URGENTE: { etiqueta: '≤ 15 días', clase: 'bg-amber-50 text-amber-800 border-amber-200', Icono: AlertTriangle },
    PROXIMO: { etiqueta: '≤ 30 días', clase: 'bg-yellow-50 text-yellow-800 border-yellow-200', Icono: Clock },
    VIGENTE: { etiqueta: 'Vigente', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icono: CheckCircle2 },
    SIN_REGISTRO: { etiqueta: 'Sin registrar', clase: 'bg-slate-50 text-slate-500 border-slate-200', Icono: HelpCircle },
};

interface Props {
    nivel: NivelAlerta;
    dias?: number | null;
    compacto?: boolean;
}

export default function Semaforo({ nivel, dias, compacto }: Props) {
    const { etiqueta, clase, Icono } = NIVELES[nivel] ?? NIVELES.SIN_REGISTRO;
    let texto = etiqueta;
    if (dias !== null && dias !== undefined && !compacto) {
        if (dias < 0) texto = `Vencido hace ${Math.abs(dias)} d`;
        else if (nivel !== 'VIGENTE') texto = dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`;
    }
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap ${clase}`}>
            <Icono className="h-3 w-3 shrink-0" aria-hidden="true" />
            {texto}
        </span>
    );
}
