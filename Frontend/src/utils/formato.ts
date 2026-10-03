// Formateo consistente de montos, números y fechas (locale es-EC, dólares)

export const moneda = (valor: number | string | null | undefined, decimales = 2) =>
    new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    }).format(Number(valor || 0));

export const numero = (valor: number | string | null | undefined, decimales = 0) =>
    new Intl.NumberFormat('es-EC', { maximumFractionDigits: decimales, minimumFractionDigits: decimales }).format(Number(valor || 0));

export const porcentaje = (valor: number | null | undefined, decimales = 1) =>
    valor === null || valor === undefined ? '—' : `${numero(valor, decimales)} %`;

// Para indicadores que pueden no aplicar (CPK sin km, rendimiento sin galones)
export const opcional = (valor: number | null | undefined, formato: (v: number) => string) =>
    valor === null || valor === undefined ? '—' : formato(valor);

export const fecha = (valor: string | Date | null | undefined) =>
    valor ? new Date(valor).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Las fechas de vencimiento se guardan como día calendario (medianoche UTC): se muestran sin desfase horario
export const fechaCalendario = (valor: string | Date | null | undefined) =>
    valor ? new Date(valor).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export const fechaHora = (valor: string | Date | null | undefined) =>
    valor ? new Date(valor).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// 'YYYY-MM-DD' de hoy y de hace N meses (para filtros de período)
export const isoDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const haceMeses = (meses: number) => {
    const d = new Date();
    return isoDia(new Date(d.getFullYear(), d.getMonth() - meses + 1, 1));
};

// Convierte el valor de un <input type="datetime-local"> (hora local) a ISO con zona horaria
export const localAIso = (valor: string) => (valor ? new Date(valor).toISOString() : valor);

export const ETIQUETAS_TIPO_GASTO: Record<string, string> = {
    COMBUSTIBLE: 'Combustible',
    PEAJE: 'Peaje',
    ALIMENTACION: 'Alimentación',
    HOSPEDAJE: 'Hospedaje',
    MULTA: 'Multa',
    OTRO: 'Otro',
};

// Fecha a 'YYYY-MM-DDTHH:mm' en hora local (formato de <input type="datetime-local">)
export const isoLocal = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};
