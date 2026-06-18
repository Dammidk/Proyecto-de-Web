// Reglas de negocio de neumáticos (lógica pura, sin base de datos)
// Umbrales de labrado, estado de salud, alertas y costo por kilómetro

export const POSICIONES_NEUMATICO = [
    '1DI', '1DD',
    '2TI_EXT', '2TI_INT', '2TD_INT', '2TD_EXT',
    '3TI_EXT', '3TI_INT', '3TD_INT', '3TD_EXT',
    'REPUESTO',
] as const;

export type PosicionNeumatico = (typeof POSICIONES_NEUMATICO)[number];

export const ETIQUETAS_POSICION: Record<PosicionNeumatico, string> = {
    '1DI': 'Eje 1 - Direccional izquierda',
    '1DD': 'Eje 1 - Direccional derecha',
    '2TI_EXT': 'Eje 2 - Tracción izquierda exterior',
    '2TI_INT': 'Eje 2 - Tracción izquierda interior',
    '2TD_INT': 'Eje 2 - Tracción derecha interior',
    '2TD_EXT': 'Eje 2 - Tracción derecha exterior',
    '3TI_EXT': 'Eje 3 - Tracción izquierda exterior',
    '3TI_INT': 'Eje 3 - Tracción izquierda interior',
    '3TD_INT': 'Eje 3 - Tracción derecha interior',
    '3TD_EXT': 'Eje 3 - Tracción derecha exterior',
    REPUESTO: 'Neumático de repuesto',
};

// Umbrales operativos en milímetros de labrado y psi de presión
export const UMBRALES_NEUMATICO = {
    minimoLegalMm: 2,
    reencaucheMm: 4,
    advertenciaMm: 7,
    desvioPresionAdvertenciaPsi: 10,
    desvioPresionCriticoPsi: 20,
} as const;

export type SaludNeumatico = 'OPTIMO' | 'ADVERTENCIA' | 'CRITICO';

export interface MedicionNeumatico {
    profundidadMm: number;
    presionActualPsi?: number | null;
    presionRecomendadaPsi?: number;
    desgasteIrregular?: boolean;
}

const desvioPresion = (actual: number | null | undefined, recomendada: number) =>
    actual === null || actual === undefined ? 0 : Math.abs(actual - recomendada);

export const evaluarSaludNeumatico = (
    profundidadMm: number,
    presionActualPsi?: number | null,
    presionRecomendadaPsi = 110
): SaludNeumatico => {
    const desvio = desvioPresion(presionActualPsi, presionRecomendadaPsi);
    if (profundidadMm <= UMBRALES_NEUMATICO.reencaucheMm || desvio > UMBRALES_NEUMATICO.desvioPresionCriticoPsi) {
        return 'CRITICO';
    }
    if (profundidadMm <= UMBRALES_NEUMATICO.advertenciaMm || desvio > UMBRALES_NEUMATICO.desvioPresionAdvertenciaPsi) {
        return 'ADVERTENCIA';
    }
    return 'OPTIMO';
};

// Mensajes accionables para el taller
export const alertasNeumatico = (m: MedicionNeumatico): string[] => {
    const alertas: string[] = [];
    const recomendada = m.presionRecomendadaPsi ?? 110;
    const desvio = desvioPresion(m.presionActualPsi, recomendada);

    if (m.profundidadMm <= UMBRALES_NEUMATICO.minimoLegalMm) {
        alertas.push('Labrado en el límite legal: retirar de circulación');
    } else if (m.profundidadMm <= UMBRALES_NEUMATICO.reencaucheMm) {
        alertas.push('Labrado bajo el umbral de reencauche: programar cambio o reencauche');
    } else if (m.profundidadMm <= UMBRALES_NEUMATICO.advertenciaMm) {
        alertas.push('Desgaste medio: planificar rotación de ejes');
    }

    if (desvio > UMBRALES_NEUMATICO.desvioPresionCriticoPsi) {
        alertas.push(`Presión fuera de rango (${m.presionActualPsi} psi vs ${recomendada} psi recomendados)`);
    } else if (desvio > UMBRALES_NEUMATICO.desvioPresionAdvertenciaPsi) {
        alertas.push(`Presión con desviación moderada (${m.presionActualPsi} psi vs ${recomendada} psi)`);
    }

    if (m.desgasteIrregular) {
        alertas.push('Desgaste irregular reportado: revisar alineación y balanceo');
    }
    return alertas;
};

// Costo por kilómetro de la llanta: inversión total (compra + reencauches) sobre kilómetros recorridos
export const calcularCpkNeumatico = (costoTotal: number, kilometros: number): number | null => {
    if (!kilometros || kilometros <= 0) return null;
    return Number((costoTotal / kilometros).toFixed(4));
};

// Porcentaje de banda de rodamiento utilizable consumido hasta el umbral de reencauche
export const vidaUtilConsumida = (profundidadInicialMm: number, profundidadActualMm: number): number => {
    const utilizable = profundidadInicialMm - UMBRALES_NEUMATICO.reencaucheMm;
    if (utilizable <= 0) return 100;
    const consumido = ((profundidadInicialMm - profundidadActualMm) / utilizable) * 100;
    return Math.min(100, Math.max(0, Number(consumido.toFixed(1))));
};
