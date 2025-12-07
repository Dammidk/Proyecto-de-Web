// Controlador de Autenticación
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { usuarioService } from '../services/usuario.service';
import { usuarioRepository } from '../repositories/usuario.repository';

// Schema de validación para login
const loginSchema = z.object({
    usuario: z.string().min(1, 'Usuario requerido'),
    password: z.string().min(1, 'Contraseña requerida')
});

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const resultado = loginSchema.safeParse(req.body);
        if (!resultado.success) {
            res.status(400).json({ error: 'Datos inválidos', detalles: resultado.error.flatten() });
            return;
        }

        const { usuario: identificador, password } = resultado.data;

        const usuario = await usuarioService.buscarPorEmailOUsuario(identificador);
        if (!usuario) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        if (!usuario.activo) {
            res.status(401).json({ error: 'Usuario desactivado' });
            return;
        }

        const passwordValido = await usuarioService.verificarPassword(password, usuario.passwordHash);
        if (!passwordValido) {
            res.status(401).json({ error: 'Credenciales inválidas' });
            return;
        }

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        console.log(`✅ Login exitoso: ${usuario.nombreUsuario} (${usuario.rol})`);

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: usuario.id,
                nombreUsuario: usuario.nombreUsuario,
                email: usuario.email,
                nombreCompleto: usuario.nombreCompleto,
                rol: usuario.rol
            }
        });
    } catch (error: any) {
        console.error('[ERROR LOGIN]', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

// GET /api/auth/perfil
export const obtenerPerfil = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.usuario) {
            res.status(401).json({ error: 'No autenticado' });
            return;
        }

        const usuario = await usuarioRepository.findById(req.usuario.id);
        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        res.json({
            usuario: {
                id: usuario.id,
                nombreUsuario: usuario.nombreUsuario,
                email: usuario.email,
                nombreCompleto: usuario.nombreCompleto,
                rol: usuario.rol
            }
        });
    } catch (error: any) {
        console.error('[ERROR PERFIL]', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};
