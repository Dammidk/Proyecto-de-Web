// Seed de la base de datos
// Crea usuarios iniciales (Admin y Auditor)

import { PrismaClient, RolUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Crear usuario administrador
    const passwordAdmin = await bcrypt.hash('admin123', 10);

    const admin = await prisma.usuario.upsert({
        where: { nombreUsuario: 'admin' },
        update: {},
        create: {
            nombreUsuario: 'admin',
            email: 'admin@transporte.com',
            passwordHash: passwordAdmin,
            nombreCompleto: 'Administrador del Sistema',
            rol: RolUsuario.ADMIN,
            activo: true
        }
    });

    console.log(`✅ Usuario Admin creado: ${admin.nombreUsuario}`);

    // Crear usuario auditor
    const passwordAuditor = await bcrypt.hash('auditor123', 10);

    const auditor = await prisma.usuario.upsert({
        where: { nombreUsuario: 'auditor' },
        update: {},
        create: {
            nombreUsuario: 'auditor',
            email: 'auditor@transporte.com',
            passwordHash: passwordAuditor,
            nombreCompleto: 'Auditor del Sistema',
            rol: RolUsuario.AUDITOR,
            activo: true
        }
    });

    console.log(`✅ Usuario Auditor creado: ${auditor.nombreUsuario}`);

    // Crear algunos materiales de ejemplo
    const materiales = [
        { nombre: 'Gasolina', unidadMedida: 'litros', esPeligroso: true },
        { nombre: 'Diésel', unidadMedida: 'litros', esPeligroso: true },
        { nombre: 'Asfalto', unidadMedida: 'toneladas', esPeligroso: false },
        { nombre: 'Arena', unidadMedida: 'toneladas', esPeligroso: false },
        { nombre: 'Cemento', unidadMedida: 'toneladas', esPeligroso: false },
    ];

    for (const material of materiales) {
        await prisma.material.upsert({
            where: { nombre: material.nombre },
            update: {},
            create: material
        });
    }

    console.log(`✅ Materiales de ejemplo creados: ${materiales.length}`);

    console.log('');
    console.log('='.repeat(50));
    console.log('🎉 Seed completado exitosamente');
    console.log('='.repeat(50));
    console.log('');
    console.log('Usuarios creados:');
    console.log('  Admin:   usuario: admin    | contraseña: admin123');
    console.log('  Auditor: usuario: auditor  | contraseña: auditor123');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
