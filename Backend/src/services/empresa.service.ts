// Servicio de Empresas - perfil de la organización y límites de su plan
import { z } from 'zod';
import { AccionAuditoria, PlanEmpresa } from '@prisma/client';
import { enTransaccion } from '../config/database';
import { empresaRepository } from '../repositories/empresa.repository';
import { auditoriaRepository } from '../repositories/auditoria.repository';
import { BusinessRuleError, ConflictError, NotFoundError } from '../utils/errors';
import { textoOpcional } from '../utils/http';

export const empresaSchema = z.object({
    nombre: z.string().trim().min(2, 'Nombre requerido'),
    ruc: z.string().trim().regex(/^\d{13}$/, 'El RUC debe tener 13 dígitos'),
    email: z.union([z.literal(''), z.string().trim().email('Correo inválido')]).nullable().optional()
        .transform(v => v || null),
    telefono: textoOpcional,
    direccion: textoOpcional,
    plan: z.nativeEnum(PlanEmpresa).optional(),
    limiteVehiculos: z.coerce.number().int().min(1).max(10000).optional(),
});

export const empresaUpdateSchema = empresaSchema.partial();

const presentar = <T extends { _count: { vehiculos: number } ; limiteVehiculos: number }>(e: T) => ({
    ...e,
    uso: {
        vehiculos: e._count.vehiculos,
        limiteVehiculos: e.limiteVehiculos,
        porcentaje: Math.min(100, Math.round((e._count.vehiculos / e.limiteVehiculos) * 100)),
    },
});

export const empresaService = {
    async listar() {
        return (await empresaRepository.findAll()).map(presentar);
    },

    async obtenerActual() {
        const empresa = await empresaRepository.findPrincipal();
        if (!empresa) throw new NotFoundError('No hay una organización configurada');
        return presentar(empresa);
    },

    async crear(datos: z.infer<typeof empresaSchema>, usuarioId: number, ip?: string) {
        if (await empresaRepository.findByRuc(datos.ruc)) {
            throw new ConflictError(`Ya existe una organización con el RUC ${datos.ruc}`);
        }
        return enTransaccion(async tx => {
            const nueva = await empresaRepository.create({
                nombre: datos.nombre,
                ruc: datos.ruc,
                email: datos.email ?? null,
                telefono: datos.telefono ?? null,
                direccion: datos.direccion ?? null,
                plan: datos.plan,
                limiteVehiculos: datos.limiteVehiculos,
            }, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.CREAR, entidad: 'Empresa', entidadId: nueva.id, datosNuevos: nueva, ipAddress: ip,
            }, tx);
            return nueva;
        });
    },

    async actualizarActual(datos: z.infer<typeof empresaUpdateSchema>, usuarioId: number, ip?: string) {
        const actual = await empresaRepository.findPrincipal();
        if (!actual) throw new NotFoundError('No hay una organización configurada');

        if (datos.ruc && datos.ruc !== actual.ruc && await empresaRepository.findByRuc(datos.ruc)) {
            throw new ConflictError(`Ya existe una organización con el RUC ${datos.ruc}`);
        }
        if (datos.limiteVehiculos !== undefined && datos.limiteVehiculos < actual._count.vehiculos) {
            throw new BusinessRuleError(
                `El límite no puede ser menor a la flota registrada (${actual._count.vehiculos} vehículos)`
            );
        }

        return enTransaccion(async tx => {
            const actualizada = await empresaRepository.update(actual.id, datos, tx);
            await auditoriaRepository.create(usuarioId, {
                accion: AccionAuditoria.EDITAR, entidad: 'Empresa', entidadId: actual.id,
                datosAnteriores: { ...actual, _count: undefined }, datosNuevos: actualizada, ipAddress: ip,
            }, tx);
            return actualizada;
        });
    },

    // Se invoca antes de registrar un vehículo: respeta el límite del plan si hay organización configurada
    async verificarCupoVehiculos() {
        const empresa = await empresaRepository.findPrincipal();
        if (!empresa) return;
        const registrados = await empresaRepository.contarVehiculos();
        if (registrados >= empresa.limiteVehiculos) {
            throw new BusinessRuleError(
                `Se alcanzó el límite de ${empresa.limiteVehiculos} vehículos del plan ${empresa.plan}`
            );
        }
    },
};
