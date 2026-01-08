// Manejador central de errores
// Traduce errores de dominio, de validación, de Multer y de Prisma a respuestas HTTP coherentes

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { storageService } from '../services/storage.service';
import env from '../config/env';

interface RespuestaError {
    status: number;
    mensaje: string;
    detalles?: unknown;
}

const traducirError = (err: unknown): RespuestaError => {
    if (err instanceof AppError) {
        return { status: err.statusCode, mensaje: err.message, detalles: err.detalles };
    }

    if (err instanceof ZodError) {
        return { status: 400, mensaje: 'Datos inválidos', detalles: err.flatten() };
    }

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return { status: 413, mensaje: 'El archivo supera el tamaño máximo permitido (15 MB)' };
        }
        return { status: 400, mensaje: `Error al subir el archivo: ${err.message}` };
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002':
                return { status: 409, mensaje: 'Ya existe un registro con esos datos únicos', detalles: err.meta };
            case 'P2003':
                return {
                    status: 409,
                    mensaje: 'No se puede completar la operación porque el registro tiene información relacionada (viajes, gastos, pagos o mantenimientos). Considere marcarlo como INACTIVO.',
                };
            case 'P2025':
                return { status: 404, mensaje: 'Registro no encontrado' };
        }
    }

    // Errores de JSON mal formado enviados por express.json()
    if (err instanceof SyntaxError && 'body' in (err as object)) {
        return { status: 400, mensaje: 'El cuerpo de la petición no es un JSON válido' };
    }

    // Errores lanzados por el filtro de archivos de Multer
    if (err instanceof Error && err.message.startsWith('Tipo de archivo no permitido')) {
        return { status: 415, mensaje: err.message };
    }

    return { status: 500, mensaje: 'Error interno del servidor' };
};

export const manejadorErrores = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const { status, mensaje, detalles } = traducirError(err);

    if (status >= 500) {
        console.error(`[ERROR ${req.method} ${req.originalUrl}]`, err);
    }

    // Si la petición subió un archivo y falló, se elimina para no dejar huérfanos en disco
    if (req.file) {
        storageService.eliminarArchivoSubido(req.file).catch(() => undefined);
    }

    res.status(status).json({
        exito: false,
        // Se envían ambas claves para compatibilidad con el frontend existente
        error: mensaje,
        mensaje,
        ...(detalles !== undefined ? { detalles } : {}),
        ...(status >= 500 && !env.esProduccion && err instanceof Error ? { debug: err.message } : {}),
    });
};

export const rutaNoEncontrada = (req: Request, res: Response): void => {
    res.status(404).json({ exito: false, error: 'Ruta no encontrada', mensaje: 'Ruta no encontrada', ruta: req.path });
};
