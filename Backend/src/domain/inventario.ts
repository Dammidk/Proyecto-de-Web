// Reglas de negocio de inventario de repuestos (lógica pura, sin base de datos)

const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

// Costo promedio ponderado: se recalcula en cada entrada con costo distinto
export const costoPromedioPonderado = (
    stockActual: number,
    costoActual: number,
    cantidadEntrada: number,
    costoEntrada: number
): number => {
    const stockTotal = stockActual + cantidadEntrada;
    if (stockTotal <= 0) return redondear(costoEntrada);
    return redondear((stockActual * costoActual + cantidadEntrada * costoEntrada) / stockTotal);
};

export const valorInventario = (items: Array<{ stockActual: number; costoUnitario: number }>): number =>
    redondear(items.reduce((s, i) => s + i.stockActual * i.costoUnitario, 0));

export type NivelStock = 'AGOTADO' | 'BAJO' | 'NORMAL';

export const nivelDeStock = (stockActual: number, stockMinimo: number): NivelStock => {
    if (stockActual <= 0) return 'AGOTADO';
    if (stockActual <= stockMinimo) return 'BAJO';
    return 'NORMAL';
};

// Cantidad sugerida para reponer hasta el doble del mínimo
export const cantidadSugeridaReposicion = (stockActual: number, stockMinimo: number): number =>
    Math.max(0, stockMinimo * 2 - stockActual);
