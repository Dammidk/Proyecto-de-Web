// Servicio de Cumplimiento documental: semáforo de vencimientos de vehículos y choferes
import { vehiculoRepository } from '../repositories/vehiculo.repository';
import { choferRepository } from '../repositories/chofer.repository';
import { EstadoDocumento, NivelAlerta, evaluarDocumentosVehiculo, evaluarLicenciaChofer } from '../domain/cumplimiento';

// Orden de gravedad para mostrar primero lo más urgente
const GRAVEDAD: Record<NivelAlerta, number> = {
    VENCIDO: 0, CRITICO: 1, URGENTE: 2, PROXIMO: 3, SIN_REGISTRO: 4, VIGENTE: 5,
};

const peorNivel = (docs: EstadoDocumento[]): NivelAlerta =>
    docs.reduce<NivelAlerta>((peor, d) => (GRAVEDAD[d.nivel] < GRAVEDAD[peor] ? d.nivel : peor), 'VIGENTE');

export interface AlertaDocumento extends EstadoDocumento {
    tipoEntidad: 'VEHICULO' | 'CHOFER';
    entidadId: number;
    nombre: string;
}

export const cumplimientoService = {
    async obtenerEstado(referencia: Date = new Date()) {
        const [vehiculos, choferes] = await Promise.all([
            vehiculoRepository.findParaCumplimiento(),
            choferRepository.findParaCumplimiento(),
        ]);

        const estadoVehiculos = vehiculos.map(v => {
            const documentos = evaluarDocumentosVehiculo(v, referencia);
            return {
                id: v.id,
                placa: v.placa,
                descripcion: `${v.marca} ${v.modelo}`,
                estado: v.estado,
                documentos,
                nivel: peorNivel(documentos),
                // Un documento vencido impide asignar el vehículo a nuevos viajes
                bloqueado: documentos.some(d => d.nivel === 'VENCIDO'),
            };
        });

        const estadoChoferes = choferes.map(c => {
            const licencia = evaluarLicenciaChofer(c, referencia);
            return {
                id: c.id,
                nombre: `${c.nombres} ${c.apellidos}`,
                documentoId: c.documentoId,
                licenciaTipo: c.licenciaTipo,
                documentos: [licencia],
                nivel: licencia.nivel,
                bloqueado: licencia.nivel === 'VENCIDO',
            };
        });

        // Lista plana de alertas accionables (vencidos y por vencer en 30 días), la más urgente primero
        const alertas: AlertaDocumento[] = [
            ...estadoVehiculos.flatMap(v => v.documentos.map(d => ({ ...d, tipoEntidad: 'VEHICULO' as const, entidadId: v.id, nombre: v.placa }))),
            ...estadoChoferes.flatMap(c => c.documentos.map(d => ({ ...d, tipoEntidad: 'CHOFER' as const, entidadId: c.id, nombre: c.nombre }))),
        ]
            .filter(a => a.nivel !== 'VIGENTE' && a.nivel !== 'SIN_REGISTRO')
            .sort((a, b) => GRAVEDAD[a.nivel] - GRAVEDAD[b.nivel] || (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));

        const contar = (nivel: NivelAlerta) => alertas.filter(a => a.nivel === nivel).length;

        return {
            resumen: {
                vencidos: contar('VENCIDO'),
                criticos: contar('CRITICO'),
                urgentes: contar('URGENTE'),
                proximos: contar('PROXIMO'),
                vehiculosBloqueados: estadoVehiculos.filter(v => v.bloqueado).length,
                choferesBloqueados: estadoChoferes.filter(c => c.bloqueado).length,
                sinRegistro: [...estadoVehiculos, ...estadoChoferes]
                    .flatMap(e => e.documentos).filter(d => d.nivel === 'SIN_REGISTRO').length,
            },
            alertas,
            vehiculos: estadoVehiculos,
            choferes: estadoChoferes,
        };
    },
};
