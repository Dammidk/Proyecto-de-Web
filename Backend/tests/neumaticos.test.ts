import { describe, it, expect } from 'vitest';
import {
    evaluarSaludNeumatico, calcularCpkNeumatico, alertasNeumatico, vidaUtilConsumida, UMBRALES_NEUMATICO,
} from '../src/domain/neumaticos';

describe('Neumáticos - salud, alertas y costo por kilómetro', () => {
    it('clasifica como OPTIMO una llanta con labrado alto y buena presión', () => {
        expect(evaluarSaludNeumatico(12.5, 110, 110)).toBe('OPTIMO');
    });

    it('clasifica como ADVERTENCIA con labrado entre el umbral de reencauche y el de advertencia', () => {
        expect(evaluarSaludNeumatico(5.2, 108, 110)).toBe('ADVERTENCIA');
    });

    it('clasifica como CRITICO con labrado igual o menor al umbral de reencauche', () => {
        expect(evaluarSaludNeumatico(UMBRALES_NEUMATICO.reencaucheMm, 110, 110)).toBe('CRITICO');
        expect(evaluarSaludNeumatico(3.0, 110, 110)).toBe('CRITICO');
    });

    it('clasifica como CRITICO si la presión se desvía más de 20 PSI de la recomendada', () => {
        expect(evaluarSaludNeumatico(14.0, 80, 110)).toBe('CRITICO');
    });

    it('genera alertas por labrado, presión y desgaste irregular', () => {
        const alertas = alertasNeumatico({
            profundidadMm: 1.5, presionActualPsi: 80, presionRecomendadaPsi: 110, desgasteIrregular: true,
        });
        expect(alertas.length).toBeGreaterThanOrEqual(3);
    });

    it('no genera alertas para una llanta en buen estado', () => {
        expect(alertasNeumatico({ profundidadMm: 14, presionActualPsi: 110, presionRecomendadaPsi: 110 })).toEqual([]);
    });

    it('calcula el costo por kilómetro', () => {
        expect(calcularCpkNeumatico(450, 90000)).toBe(0.005);
    });

    it('devuelve null de CPK si no hay kilómetros acumulados', () => {
        expect(calcularCpkNeumatico(450, 0)).toBeNull();
    });

    it('calcula el porcentaje de vida útil consumida', () => {
        expect(vidaUtilConsumida(16, 10)).toBe(50);
        expect(vidaUtilConsumida(16, 16)).toBe(0);
    });
});
