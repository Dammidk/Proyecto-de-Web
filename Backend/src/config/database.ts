// Configuración del cliente Prisma
// Singleton para evitar múltiples conexiones en desarrollo

import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
    log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// Verificar conexión
prisma.$connect()
    .then(() => {
        console.log('✅ Conexión a base de datos establecida');
    })
    .catch((error) => {
        console.error('❌ Error al conectar con la base de datos:', error.message);
    });

export default prisma;
