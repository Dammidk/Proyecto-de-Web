// Reglas de cumplimiento documental y regulatorio (lógica pura, sin base de datos)
// Semáforo preventivo: avisos a 30, 15 y 5 días; bloqueo si el documento está vencido

import { EstadoChofer, EstadoVehiculo, TipoLicencia } from '@prisma/client';

export type NivelAlerta = 'VENCIDO' | 'CRITICO' | 'URGENTE' | 'PROXIMO' | 'VIGENTE' | 'SIN_REGISTRO';

export interface EstadoDocumento {
    documento: string;
    fechaVencimiento: Date | null;
    diasRestantes: number | null;
    nivel: NivelAlerta;
}

// Umbrales del semáforo (días antes del vencimiento)
export const UMBRALES = { CRITICO: 5, URGENTE: 15, PROXIMO: 30 } as const;

const MS_DIA = 24 * 60 * 60 * 1000;

// Días enteros entre hoy y el vencimiento (negativo si ya venció).
// Se comparan fechas calendario en UTC: las fechas de vencimiento se guardan como 'YYYY-MM-DD' (medianoche UTC).
export const diasHasta = (fecha: Date, referencia: Date = new Date()): number => {
    const inicio = Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth(), referencia.getUTCDate());
    const fin = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
    return Math.round((fin - inicio) / MS_DIA);
};

export const evaluarDocumento = (
    documento: string,
    fecha: Date | string | null | undefined,
    referencia: Date = new Date()
): EstadoDocumento => {
    if (!fecha) {
        return { documento, fechaVencimiento: null, diasRestantes: null, nivel: 'SIN_REGISTRO' };
    }
    const fechaVencimiento = new Date(fecha);
    const dias = diasHasta(fechaVencimiento, referencia);
    let nivel: NivelAlerta = 'VIGENTE';
    if (dias < 0) nivel = 'VENCIDO';
    else if (dias <= UMBRALES.CRITICO) nivel = 'CRITICO';
    else if (dias <= UMBRALES.URGENTE) nivel = 'URGENTE';
    else if (dias <= UMBRALES.PROXIMO) nivel = 'PROXIMO';
    return { documento, fechaVencimiento, diasRestantes: dias, nivel };
};

export interface DocumentosVehiculo {
    fechaVencimientoSoat?: Date | null;
    fechaVencimientoSeguro?: Date | null;
    fechaVencimientoMatricula?: Date | null;
    fechaVencimientoRevisionTecnica?: Date | null;
}

export const evaluarDocumentosVehiculo = (v: DocumentosVehiculo, referencia: Date = new Date()): EstadoDocumento[] => [
    evaluarDocumento('SOAT', v.fechaVencimientoSoat, referencia),
    evaluarDocumento('Seguro', v.fechaVencimientoSeguro, referencia),
    evaluarDocumento('Matrícula', v.fechaVencimientoMatricula, referencia),
    evaluarDocumento('Revisión Técnica (RTV)', v.fechaVencimientoRevisionTecnica, referencia),
];

export const evaluarLicenciaChofer = (
    c: { fechaVencimientoLicencia?: Date | null },
    referencia: Date = new Date()
): EstadoDocumento => evaluarDocumento('Licencia de conducir', c.fechaVencimientoLicencia, referencia);

// ===========================================
// Validación de asignación a un viaje
// ===========================================

export interface VehiculoAsignable extends DocumentosVehiculo {
    id: number;
    placa: string;
    estado: EstadoVehiculo;
}

export interface ChoferAsignable {
    id: number;
    nombres: string;
    apellidos: string;
    estado: EstadoChofer;
    licenciaTipo?: TipoLicencia | null;
    fechaVencimientoLicencia?: Date | null;
}

export interface MaterialAsignable {
    id: number;
    nombre: string;
    esPeligroso: boolean;
}

/**
 * Devuelve la lista de impedimentos para asignar vehículo + chofer + material a un viaje.
 * Lista vacía = asignación permitida.
 * - El vehículo no puede estar inactivo ni en taller.
 * - Ningún documento del vehículo puede estar vencido a la fecha de salida.
 * - El chofer debe estar activo y con la licencia vigente a la fecha de salida.
 * - Un material peligroso (HazMat) exige licencia profesional tipo E.
 */
export const validarAsignacion = (
    vehiculo: VehiculoAsignable,
    chofer: ChoferAsignable,
    material: MaterialAsignable,
    fechaSalida: Date
): string[] => {
    const errores: string[] = [];

    if (vehiculo.estado === EstadoVehiculo.INACTIVO) {
        errores.push(`El vehículo ${vehiculo.placa} está INACTIVO`);
    }
    if (vehiculo.estado === EstadoVehiculo.EN_MANTENIMIENTO) {
        errores.push(`El vehículo ${vehiculo.placa} está en mantenimiento`);
    }

    for (const doc of evaluarDocumentosVehiculo(vehiculo, fechaSalida)) {
        if (doc.nivel === 'VENCIDO') {
            errores.push(`${doc.documento} del vehículo ${vehiculo.placa} vencido el ${doc.fechaVencimiento!.toISOString().slice(0, 10)}`);
        }
    }

    const nombreChofer = `${chofer.nombres} ${chofer.apellidos}`;
    if (chofer.estado !== EstadoChofer.ACTIVO) {
        errores.push(`El chofer ${nombreChofer} está INACTIVO`);
    }

    const licencia = evaluarLicenciaChofer(chofer, fechaSalida);
    if (licencia.nivel === 'VENCIDO') {
        errores.push(`La licencia de ${nombreChofer} venció el ${licencia.fechaVencimiento!.toISOString().slice(0, 10)}`);
    }

    if (material.esPeligroso && chofer.licenciaTipo !== TipoLicencia.E) {
        errores.push(`${material.nombre} es material peligroso: requiere chofer con licencia tipo E (${nombreChofer} tiene ${chofer.licenciaTipo ?? 'licencia sin registrar'})`);
    }

    return errores;
};
