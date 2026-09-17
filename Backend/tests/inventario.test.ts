import { describe, it, expect } from 'vitest';
import {
    costoPromedioPonderado, valorInventario, nivelDeStock, cantidadSugeridaReposicion,
} from '../src/domain/inventario';

describe('Inventario de repuestos', () => {
    it('calcula el costo promedio ponderado en una entrada con costo distinto', () => {
        expect(costoPromedioPonderado(10, 20, 10, 30)).toBe(25);
        expect(costoPromedioPonderado(0, 0, 5, 12.5)).toBe(12.5);
    });

    it('valora el inventario', () => {
        expect(valorInventario([{ stockActual: 4, costoUnitario: 12.5 }, { stockActual: 2, costoUnitario: 100 }])).toBe(250);
    });

    it('determina el nivel de stock', () => {
        expect(nivelDeStock(0, 3)).toBe('AGOTADO');
        expect(nivelDeStock(3, 3)).toBe('BAJO');
        expect(nivelDeStock(10, 3)).toBe('NORMAL');
    });

    it('sugiere reponer hasta el doble del mínimo', () => {
        expect(cantidadSugeridaReposicion(1, 4)).toBe(7);
        expect(cantidadSugeridaReposicion(20, 4)).toBe(0);
    });
});
