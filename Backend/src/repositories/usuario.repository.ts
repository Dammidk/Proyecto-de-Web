// Repositorio de Usuarios - Acceso a BD
import prisma from '../config/database';

export const usuarioRepository = {
    async findByEmail(email: string) {
        return prisma.usuario.findUnique({ where: { email } });
    },

    async findByNombreUsuario(nombreUsuario: string) {
        return prisma.usuario.findUnique({ where: { nombreUsuario } });
    },

    async findById(id: number) {
        return prisma.usuario.findUnique({ where: { id } });
    },

    async create(data: any) {
        return prisma.usuario.create({ data });
    }
};
