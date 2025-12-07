// Servicio de Usuarios
import bcrypt from 'bcryptjs';
import { usuarioRepository } from '../repositories/usuario.repository';

export const usuarioService = {
    async buscarPorEmailOUsuario(identificador: string) {
        // Buscar por email o nombre de usuario
        let usuario = await usuarioRepository.findByEmail(identificador);
        if (!usuario) {
            usuario = await usuarioRepository.findByNombreUsuario(identificador);
        }
        return usuario;
    },

    async verificarPassword(password: string, hash: string) {
        return bcrypt.compare(password, hash);
    },

    async crearUsuario(datos: { nombreUsuario: string; email: string; password: string; nombreCompleto: string; rol?: 'ADMIN' | 'AUDITOR' }) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(datos.password, salt);

        return usuarioRepository.create({
            nombreUsuario: datos.nombreUsuario,
            email: datos.email,
            passwordHash,
            nombreCompleto: datos.nombreCompleto,
            rol: datos.rol || 'ADMIN'
        });
    }
};
