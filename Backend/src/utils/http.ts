// Utilidades HTTP compartidas por los controladores
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from './errors';

// Envuelve un controlador async para que cualquier error llegue al manejador central
export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

// Valida un objeto con Zod y lanza ValidationError con el detalle de los campos
export const validar = <T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> => {
    const resultado = schema.safeParse(data);
    if (!resultado.success) {
        const campos = resultado.error.flatten();
        const primerError =
            Object.entries(campos.fieldErrors)
                .map(([campo, msgs]) => `${campo}: ${(msgs as string[] | undefined)?.[0]}`)
                .at(0) || campos.formErrors.at(0) || 'Datos inválidos';
        throw new ValidationError(`Datos inválidos (${primerError})`, campos);
    }
    return resultado.data;
};

// Parsea un parámetro de ruta numérico (ej. /:id)
export const idParam = (valor: string | undefined, nombre = 'id'): number => {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError(`El parámetro ${nombre} debe ser un número entero positivo`);
    }
    return id;
};

// Usuario autenticado (las rutas protegidas garantizan su existencia)
export const usuarioActual = (req: Request) => {
    if (!req.usuario) {
        throw new ValidationError('Usuario no autenticado');
    }
    return req.usuario;
};

// IP real del cliente (detrás de Nginx llega en X-Forwarded-For; ver app.set('trust proxy'))
export const ipCliente = (req: Request): string | undefined => req.ip || undefined;

// Esquemas reutilizables
export const fechaOpcional = z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((v, ctx) => {
        if (v === undefined) return undefined;
        if (v === null || v === '') return null;
        const fecha = v instanceof Date ? v : new Date(v);
        if (isNaN(fecha.getTime())) {
            ctx.addIssue({ code: 'custom', message: 'Fecha inválida' });
            return z.NEVER;
        }
        return fecha;
    });

// Número opcional que acepta '' o null como "sin valor" (formularios HTML y multipart envían texto).
// '' y null van primero: z.coerce.number() convertiría ambos en 0.
export const numeroOpcional = <T extends z.ZodTypeAny>(schema: T) =>
    z.union([z.literal(''), z.null(), schema])
        .optional()
        .transform(v => (v === '' ? null : v) as z.infer<T> | null | undefined);

export const textoOpcional = z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform(v => (v === undefined ? undefined : v || null));
