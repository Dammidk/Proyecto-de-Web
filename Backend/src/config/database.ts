// Configuración del cliente Prisma
// Singleton para evitar múltiples conexiones en desarrollo

import { Prisma, PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
    log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// Cliente de base de datos: el global o el de una transacción en curso
export type Db = Prisma.TransactionClient;

/**
 * Ejecuta varias operaciones de forma atómica: o se guardan todas o ninguna.
 * Ej.: crear un mantenimiento + actualizar el vehículo + registrar la auditoría.
 */
export const enTransaccion = <T>(fn: (tx: Db) => Promise<T>): Promise<T> => prisma.$transaction(fn);

// Verificar conexión (no en pruebas)
if (process.env.NODE_ENV !== 'test') {
    prisma.$connect()
        .then(() => {
            console.log('Conexión a base de datos establecida');
        })
        .catch((error) => {
            console.error('Error al conectar con la base de datos:', error.message);
        });
}

export default prisma;
