// Generación de CSV compatible con Excel en español
// - Separador ";" (Excel en configuración regional es-EC/es-ES usa ";" como separador de listas)
// - BOM UTF-8 para que Excel muestre bien tildes y eñes
// - Protección contra inyección de fórmulas (=, +, -, @ al inicio de una celda)

export interface ColumnaCsv<T> {
    titulo: string;
    valor: (fila: T) => unknown;
}

const BOM = '﻿';
const SEPARADOR = ';';

const formatearValor = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : '';
    if (typeof v === 'object' && 'toString' in (v as object)) {
        // Decimal de Prisma: se exporta con coma decimal
        const texto = String(v);
        if (/^-?\d+(\.\d+)?$/.test(texto)) return texto.replace('.', ',');
        return texto;
    }
    return String(v);
};

export const escaparCelda = (v: unknown): string => {
    let texto = formatearValor(v);
    // Una celda que empieza con estos caracteres se interpretaría como fórmula en Excel
    if (/^[=+\-@\t\r]/.test(texto) && !/^-?\d+(,\d+)?$/.test(texto)) {
        texto = `'${texto}`;
    }
    if (/[";\n\r]/.test(texto)) {
        texto = `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
};

export const generarCsv = <T>(filas: T[], columnas: ColumnaCsv<T>[]): string => {
    const encabezado = columnas.map(c => escaparCelda(c.titulo)).join(SEPARADOR);
    const cuerpo = filas.map(f => columnas.map(c => escaparCelda(c.valor(f))).join(SEPARADOR));
    return BOM + [encabezado, ...cuerpo].join('\r\n');
};
