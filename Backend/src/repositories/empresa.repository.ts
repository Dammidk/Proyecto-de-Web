// Repositorio de Empresas (perfil corporativo y plan de la organización)
import prisma, { Db } from '../config/database';
import { Prisma } from '@prisma/client';

export const empresaRepository = {
    async findAll(db: Db = prisma) {
        return db.empresa.findMany({
            include: { _count: { select: { vehiculos: true, usuarios: true, clientes: true } } },
            orderBy: { creadoEn: 'asc' },
        });
    },

    async findById(id: number, db: Db = prisma) {
        return db.empresa.findUnique({
            where: { id },
            include: { _count: { select: { vehiculos: true, usuarios: true, clientes: true } } },
        });
    },

    async findByRuc(ruc: string, db: Db = prisma) {
        return db.empresa.findUnique({ where: { ruc } });
    },

    // Organización activa de la instalación (la primera registrada)
    async findPrincipal(db: Db = prisma) {
        return db.empresa.findFirst({
            where: { activo: true },
            orderBy: { id: 'asc' },
            include: { _count: { select: { vehiculos: true, usuarios: true, clientes: true } } },
        });
    },

    async create(datos: Prisma.EmpresaUncheckedCreateInput, db: Db = prisma) {
        return db.empresa.create({ data: datos });
    },

    async update(id: number, datos: Prisma.EmpresaUncheckedUpdateInput, db: Db = prisma) {
        return db.empresa.update({ where: { id }, data: datos });
    },

    async contarVehiculos(db: Db = prisma) {
        return db.vehiculo.count();
    },
};
