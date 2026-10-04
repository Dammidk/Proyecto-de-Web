// Seed de la base de datos
// - Siempre: usuarios iniciales (Admin y Auditor) y materiales base
// - Con --demo (npm run seed:demo): flota, choferes, clientes y 6 meses de operación de ejemplo

import {
    PrismaClient, RolUsuario, EstadoViaje, TipoGasto, MetodoPago, TipoPagoChofer,
    TipoMantenimiento, EstadoMantenimiento, EstadoVehiculo, TipoLicencia, ModalidadPago,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Generador pseudoaleatorio determinista: el seed produce siempre los mismos datos
let semilla = 42;
const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
};
const entre = (min: number, max: number) => min + azar() * (max - min);
const redondear = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

const DIA = 24 * 60 * 60 * 1000;
const hoy = new Date();
const enDias = (dias: number) => new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias));

async function crearBase() {
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
    console.log(`Usuario Admin creado: ${admin.nombreUsuario}`);

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
    console.log(`Usuario Auditor creado: ${auditor.nombreUsuario}`);

    const materiales = [
        { nombre: 'Gasolina', unidadMedida: 'galones', esPeligroso: true },
        { nombre: 'Diésel', unidadMedida: 'galones', esPeligroso: true },
        { nombre: 'Asfalto', unidadMedida: 'toneladas', esPeligroso: false },
        { nombre: 'Arena', unidadMedida: 'toneladas', esPeligroso: false },
        { nombre: 'Cemento', unidadMedida: 'toneladas', esPeligroso: false },
    ];
    for (const material of materiales) {
        await prisma.material.upsert({ where: { nombre: material.nombre }, update: {}, create: material });
    }
    console.log(`Materiales base: ${materiales.length}`);
}

async function crearDemo() {
    if (await prisma.vehiculo.count() > 0) {
        console.log(' Ya existen vehículos: se omiten los datos de demostración para no duplicarlos.');
        return;
    }

    // ---------- Flota ----------
    // GSD-9012 consume más de lo esperado (alerta de combustible) y tiene la RTV vencida;
    // PCX-5678 tiene el SOAT por vencer y MBC-3456 la matrícula a 4 días
    const flota = await Promise.all([
        { placa: 'GBA-1234', marca: 'Kenworth', modelo: 'T800', anio: 2019, tipo: 'Tráiler', capacidad: '30 toneladas', km: 412000, rend: 8, soat: 120, seguro: 200, matricula: 90, rtv: 150 },
        { placa: 'PCX-5678', marca: 'Hino', modelo: 'Serie 700', anio: 2021, tipo: 'Cisterna', capacidad: '10000 galones', km: 236000, rend: 7.5, soat: 10, seguro: 60, matricula: 180, rtv: 45 },
        { placa: 'GSD-9012', marca: 'Mercedes-Benz', modelo: 'Actros 2645', anio: 2018, tipo: 'Volqueta', capacidad: '25 toneladas', km: 508000, rend: 7, soat: 200, seguro: 25, matricula: 300, rtv: -12 },
        { placa: 'MBC-3456', marca: 'Volvo', modelo: 'FH 460', anio: 2022, tipo: 'Plataforma', capacidad: '32 toneladas', km: 154000, rend: 8.5, soat: 240, seguro: 310, matricula: 4, rtv: 220 },
    ].map(v => prisma.vehiculo.create({
        data: {
            placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio, tipo: v.tipo, capacidad: v.capacidad,
            kilometrajeActual: v.km, rendimientoEsperadoKmGal: v.rend,
            fechaVencimientoSoat: enDias(v.soat), fechaVencimientoSeguro: enDias(v.seguro),
            fechaVencimientoMatricula: enDias(v.matricula), fechaVencimientoRevisionTecnica: enDias(v.rtv),
        },
    })));

    // ---------- Choferes ----------
    const choferes = await Promise.all([
        { nombres: 'Carlos', apellidos: 'Mendoza Ríos', doc: '0912345678', lic: TipoLicencia.E, venc: 400, mod: ModalidadPago.POR_VIAJE },
        { nombres: 'Luis', apellidos: 'Paredes Vera', doc: '1712345678', lic: TipoLicencia.E, venc: 12, mod: ModalidadPago.MENSUAL },
        { nombres: 'Jorge', apellidos: 'Castillo Mora', doc: '1312345678', lic: TipoLicencia.E, venc: 700, mod: ModalidadPago.POR_VIAJE },
        { nombres: 'Andrés', apellidos: 'Villacís León', doc: '0102345678', lic: TipoLicencia.C, venc: 300, mod: ModalidadPago.MENSUAL },
    ].map(c => prisma.chofer.create({
        data: {
            nombres: c.nombres, apellidos: c.apellidos, documentoId: c.doc, telefono: '09' + c.doc.slice(2, 10),
            licenciaTipo: c.lic, fechaVencimientoLicencia: enDias(c.venc), modalidadPago: c.mod,
            metodoPago: MetodoPago.TRANSFERENCIA, banco: 'Banco Pichincha', numeroCuenta: '22' + c.doc.slice(0, 8),
            sueldoMensual: c.mod === ModalidadPago.MENSUAL ? 900 : null,
        },
    })));

    // ---------- Clientes ----------
    const clientes = await Promise.all([
        { nombre: 'Holcim Ecuador S.A.', ruc: '0990011419001', sector: 'Construcción' },
        { nombre: 'Petrocomercial Distribuidora', ruc: '1768153530001', sector: 'Combustibles' },
        { nombre: 'Constructora Andina Cía. Ltda.', ruc: '1791234567001', sector: 'Obras viales' },
        { nombre: 'Agregados del Pacífico S.A.', ruc: '1391234567001', sector: 'Áridos' },
    ].map(c => prisma.cliente.create({
        data: { nombreRazonSocial: c.nombre, documentoId: c.ruc, sector: c.sector, telefono: '042000000', correo: `logistica@${c.ruc}.ec` },
    })));

    const materiales = Object.fromEntries((await prisma.material.findMany()).map(m => [m.nombre, m]));

    // ---------- Rutas frecuentes: [origen, destino, km, tarifa base, cliente, material] ----------
    const rutas: Array<[string, string, number, number, number, string]> = [
        ['Guayaquil, Guayas', 'Quito, Pichincha', 420, 1150, 0, 'Cemento'],
        ['Quito, Pichincha', 'Guayaquil, Guayas', 420, 980, 2, 'Asfalto'],
        ['Esmeraldas, Esmeraldas', 'Quito, Pichincha', 320, 1050, 1, 'Diésel'],
        ['Guayaquil, Guayas', 'Cuenca, Azuay', 195, 640, 0, 'Cemento'],
        ['Manta, Manabí', 'Guayaquil, Guayas', 190, 560, 3, 'Arena'],
        ['Esmeraldas, Esmeraldas', 'Ambato, Tungurahua', 360, 1120, 1, 'Gasolina'],
    ];

    const PRECIO_DIESEL = 2.80; // USD por galón (referencial)

    // 6 meses de viajes completados, más algunos en curso y planificados
    let creados = 0;
    for (let d = 180; d >= -10; d -= 3) {
        const ruta = rutas[Math.floor(azar() * rutas.length)];
        const [origen, destino, kmBase, tarifaBase, idxCliente, nombreMaterial] = ruta;
        const material = materiales[nombreMaterial];
        // Los viajes actuales y futuros no usan el GSD-9012 (RTV vencida: el sistema lo bloquearía)
        const idxVehiculo = d > 2 ? Math.floor(azar() * flota.length) : [0, 1, 3][Math.floor(azar() * 3)];
        const vehiculo = flota[idxVehiculo];
        // Material peligroso: solo choferes con licencia E (índices 0 a 2)
        const idxChofer = material.esPeligroso ? Math.floor(azar() * 3) : Math.floor(azar() * choferes.length);
        const chofer = choferes[idxChofer];

        const salida = new Date(hoy.getTime() - d * DIA);
        const horas = kmBase / 55;
        const estado = d > 2 ? EstadoViaje.COMPLETADO : d > -1 ? EstadoViaje.EN_CURSO : EstadoViaje.PLANIFICADO;
        const kmReales = Math.round(kmBase * entre(0.98, 1.08));
        const tarifa = redondear(tarifaBase * entre(0.95, 1.12));

        const viaje = await prisma.viaje.create({
            data: {
                vehiculoId: vehiculo.id, choferId: chofer.id, clienteId: clientes[idxCliente].id, materialId: material.id,
                origen, destino, fechaSalida: salida,
                fechaLlegadaEstimada: new Date(salida.getTime() + horas * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
                fechaLlegadaReal: estado === EstadoViaje.COMPLETADO ? new Date(salida.getTime() + horas * 1.15 * 60 * 60 * 1000) : null,
                kilometrosEstimados: kmBase,
                kilometrosReales: estado === EstadoViaje.COMPLETADO ? kmReales : null,
                tarifa, estado,
            },
        });
        creados++;
        if (estado === EstadoViaje.PLANIFICADO) continue;

        // Anticipo para viáticos y gastos de ruta
        const anticipo = 250;
        await prisma.pagoChofer.create({
            data: { choferId: chofer.id, viajeId: viaje.id, tipoPago: TipoPagoChofer.ANTICIPO, monto: anticipo, fecha: salida, metodoPago: MetodoPago.EFECTIVO, descripcion: 'Anticipo de viáticos' },
        });

        // Combustible: el GSD-9012 rinde ~30 % menos que su referencia (posible desvío o falla)
        const rendimientoReal = idxVehiculo === 2 ? entre(4.6, 5.2) : vehiculo.rendimientoEsperadoKmGal!.toNumber() * entre(0.92, 1.05);
        const galones = redondear(kmReales / rendimientoReal, 3);
        const gastos: Array<{ tipoGasto: TipoGasto; monto: number; metodoPago: MetodoPago; galones?: number; precioPorGalon?: number; estacionServicio?: string; kilometrajeAlCargar?: number }> = [
            { tipoGasto: TipoGasto.COMBUSTIBLE, monto: redondear(galones * PRECIO_DIESEL), galones, precioPorGalon: PRECIO_DIESEL, estacionServicio: 'Primax ' + origen.split(',')[0], kilometrajeAlCargar: vehiculo.kilometrajeActual, metodoPago: MetodoPago.TARJETA },
            { tipoGasto: TipoGasto.PEAJE, monto: redondear(entre(8, 22)), metodoPago: MetodoPago.EFECTIVO },
            { tipoGasto: TipoGasto.ALIMENTACION, monto: redondear(entre(15, 35)), metodoPago: MetodoPago.EFECTIVO },
        ];
        if (kmBase > 300) gastos.push({ tipoGasto: TipoGasto.HOSPEDAJE, monto: redondear(entre(20, 35)), metodoPago: MetodoPago.EFECTIVO });
        for (const g of gastos) {
            await prisma.gastoViaje.create({ data: { viajeId: viaje.id, fecha: salida, ...g } });
        }

        if (estado === EstadoViaje.COMPLETADO) {
            await prisma.vehiculo.update({ where: { id: vehiculo.id }, data: { kilometrajeActual: { increment: kmReales } } });
            vehiculo.kilometrajeActual += kmReales;
            if (chofer.modalidadPago === ModalidadPago.POR_VIAJE) {
                await prisma.pagoChofer.create({
                    data: { choferId: chofer.id, viajeId: viaje.id, tipoPago: TipoPagoChofer.POR_VIAJE, monto: redondear(tarifa * 0.12), fecha: new Date(salida.getTime() + 3 * DIA), metodoPago: MetodoPago.TRANSFERENCIA, descripcion: `Flete viaje #${viaje.id}` },
                });
            }
        } else {
            await prisma.vehiculo.update({ where: { id: vehiculo.id }, data: { estado: EstadoVehiculo.EN_RUTA } });
        }
    }

    // Sueldos mensuales de los choferes con modalidad MENSUAL
    for (let m = 5; m >= 0; m--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - m, 28);
        if (fecha > hoy) continue;
        for (const c of choferes.filter(c => c.modalidadPago === ModalidadPago.MENSUAL)) {
            await prisma.pagoChofer.create({
                data: { choferId: c.id, tipoPago: TipoPagoChofer.SUELDO_MENSUAL, monto: 900, fecha, metodoPago: MetodoPago.TRANSFERENCIA, descripcion: 'Sueldo mensual' },
            });
        }
    }

    // Mantenimientos preventivos y correctivos
    const mantenimientos = [
        { v: 0, dias: 150, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de aceite 15W40 y filtros', taller: 'Kenworth Ecuador', mo: 120, rep: 380 },
        { v: 1, dias: 120, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de aceite y filtros de diésel', taller: 'Hino Teojama', mo: 110, rep: 340 },
        { v: 2, dias: 95, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Reparación de inyectores', taller: 'Diesel Service Quito', mo: 450, rep: 1650 },
        { v: 2, dias: 40, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Cambio de zapatas y tambores de freno', taller: 'Taller propio', mo: 180, rep: 620 },
        { v: 3, dias: 60, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Servicio de 150.000 km', taller: 'Volvo Ecuador', mo: 260, rep: 710 },
        { v: 0, dias: 20, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Cambio de 4 neumáticos de tracción', taller: 'Vulcanizadora Norte', mo: 60, rep: 1880 },
    ];
    for (const m of mantenimientos) {
        const vehiculo = flota[m.v];
        await prisma.mantenimiento.create({
            data: {
                vehiculoId: vehiculo.id, tipo: m.tipo, estado: EstadoMantenimiento.COMPLETADO, descripcion: m.desc, taller: m.taller,
                esExterno: m.taller !== 'Taller propio', costoManoObra: m.mo, costoRepuestos: m.rep, costoTotal: m.mo + m.rep,
                fecha: enDias(-m.dias), kilometrajeAlMomento: vehiculo.kilometrajeActual - Math.round(m.dias * 140),
                proximaFecha: m.tipo === TipoMantenimiento.PREVENTIVO ? enDias(-m.dias + 120) : null,
            },
        });
    }
    // El próximo preventivo del GBA-1234 ya está vencido → aparece en las alertas
    await prisma.vehiculo.update({ where: { id: flota[0].id }, data: { fechaProximoMantenimiento: enDias(-5), fechaUltimoMantenimiento: enDias(-150) } });

    console.log(`Datos de demostración: ${flota.length} vehículos, ${choferes.length} choferes, ${clientes.length} clientes, ${creados} viajes, ${mantenimientos.length} mantenimientos`);
}

async function main() {
    console.log('Iniciando seed de la base de datos...');
    await crearBase();
    if (process.argv.includes('--demo')) {
        await crearDemo();
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('Seed completado exitosamente');
    console.log('='.repeat(50));
    console.log('');
    console.log('Usuarios creados:');
    console.log('  Admin:   usuario: admin    | contraseña: admin123');
    console.log('  Auditor: usuario: auditor  | contraseña: auditor123');
    console.log('   Cambie estas contraseñas antes de usar el sistema en producción.');
    console.log('');
}

main()
    .catch((e) => {
        console.error('Error en seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
