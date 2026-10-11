// Seed de la base de datos
// - Siempre: usuarios iniciales (Admin y Auditor) y materiales base
// - Con --demo (npm run seed:demo): flota completa, choferes, clientes, 12 meses de
//   operación y bitácora de auditoría de ejemplo. Es seguro volver a ejecutarlo: antes
//   de poblar, reinicia (borra) los datos de demostración previos para no duplicarlos.
//   No ejecutar sobre una base con operación real: borraría esos registros también.

import {
    PrismaClient, RolUsuario, EstadoViaje, TipoGasto, MetodoPago, TipoPagoChofer,
    TipoMantenimiento, EstadoMantenimiento, EstadoVehiculo, EstadoChofer, TipoLicencia,
    ModalidadPago, AccionAuditoria,
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
const elegir = <T,>(arr: T[]): T => arr[Math.floor(azar() * arr.length)];

const DIA = 24 * 60 * 60 * 1000;
const hoy = new Date();
const enDias = (dias: number) => new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() + dias));

const IPS = ['192.168.1.45', '192.168.1.52', '186.101.45.12', '190.57.23.88', '181.199.40.11', '200.107.16.9'];
let ipIdx = 0;
const siguienteIp = () => IPS[ipIdx++ % IPS.length];

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

    return { admin, auditor };
}

// Borra en orden seguro (hijos antes que padres) todo lo creado por crearDemo(), incluyendo
// lo que pueble el seed empresarial, para poder re-ejecutar el seed sin duplicar ni violar FKs.
async function reiniciarDemo() {
    await prisma.inspeccionNeumatico.deleteMany({});
    await prisma.neumatico.deleteMany({});
    await prisma.cobroFactura.deleteMany({});
    await prisma.facturaCliente.deleteMany({});
    await prisma.movimientoRepuesto.deleteMany({});
    await prisma.repuesto.deleteMany({});
    await prisma.registroAuditoria.deleteMany({});
    await prisma.gastoViaje.deleteMany({});
    await prisma.pagoChofer.deleteMany({});
    await prisma.mantenimiento.deleteMany({});
    await prisma.viaje.deleteMany({});
    await prisma.chofer.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.vehiculo.deleteMany({});
    console.log('Datos de demostración anteriores eliminados (reinicio limpio).');
}

async function crearDemo(adminId: number) {
    await reiniciarDemo();

    const registrar = (entidad: string, entidadId: number, accion: AccionAuditoria, antes: unknown, despues: unknown, fecha: Date) =>
        prisma.registroAuditoria.create({
            data: { usuarioId: adminId, accion, entidad, entidadId, datosAnteriores: antes as any, datosNuevos: despues as any, fechaHora: fecha, ipAddress: siguienteIp() },
        });

    // ---------- Flota: 10 unidades operativas + 2 en estados especiales ----------
    // "problematico": su documentación está vencida o por vencer, así que solo se le asignan
    // viajes antiguos (hace > 20 días); los viajes recientes evitan la unidad, tal como haría
    // un despachador real al ver el semáforo de cumplimiento.
    const flotaDef = [
        { placa: 'GBA-1234', marca: 'Kenworth', modelo: 'T800', anio: 2019, tipo: 'Tráiler', capacidad: '30 toneladas', km: 412000, rend: 8.0, soat: 120, seguro: 200, matricula: 90, rtv: 150, problematico: false },
        { placa: 'PCX-5678', marca: 'Hino', modelo: 'Serie 700', anio: 2021, tipo: 'Cisterna', capacidad: '10000 galones', km: 236000, rend: 7.5, soat: 3, seguro: 60, matricula: 180, rtv: 45, problematico: true },
        { placa: 'GSD-9012', marca: 'Mercedes-Benz', modelo: 'Actros 2645', anio: 2018, tipo: 'Volqueta', capacidad: '25 toneladas', km: 508000, rend: 7.0, soat: 200, seguro: 25, matricula: 300, rtv: -12, problematico: true, fuga: true },
        { placa: 'MBC-3456', marca: 'Volvo', modelo: 'FH 460', anio: 2022, tipo: 'Plataforma', capacidad: '32 toneladas', km: 154000, rend: 8.5, soat: 240, seguro: 310, matricula: 4, rtv: 220, problematico: true },
        { placa: 'FRT-7890', marca: 'Freightliner', modelo: 'Cascadia', anio: 2020, tipo: 'Tráiler', capacidad: '34 toneladas', km: 298000, rend: 7.8, soat: 180, seguro: 150, matricula: 200, rtv: 300, problematico: false },
        { placa: 'INT-2345', marca: 'International', modelo: 'HX520', anio: 2017, tipo: 'Volqueta', capacidad: '20 toneladas', km: 445000, rend: 6.8, soat: -8, seguro: 90, matricula: 60, rtv: 100, problematico: true },
        { placa: 'SCN-6677', marca: 'Scania', modelo: 'R450', anio: 2023, tipo: 'Cisterna', capacidad: '9000 galones', km: 48000, rend: 9.0, soat: 300, seguro: 280, matricula: 250, rtv: 340, problematico: false },
        { placa: 'IVC-4321', marca: 'Iveco', modelo: 'Trakker', anio: 2016, tipo: 'Volqueta', capacidad: '22 toneladas', km: 520000, rend: 6.5, soat: 80, seguro: 110, matricula: 95, rtv: 10, problematico: true },
        { placa: 'MAN-8899', marca: 'MAN', modelo: 'TGX', anio: 2021, tipo: 'Plataforma', capacidad: '28 toneladas', km: 187000, rend: 8.2, soat: 210, seguro: 195, matricula: 160, rtv: 270, problematico: false },
        { placa: 'MCK-1122', marca: 'Mack', modelo: 'Granite', anio: 2019, tipo: 'Volqueta', capacidad: '24 toneladas', km: 356000, rend: 7.2, soat: 150, seguro: 130, matricula: 25, rtv: 190, problematico: false },
    ];

    const flota = [];
    for (const v of flotaDef) {
        const creado = await prisma.vehiculo.create({
            data: {
                placa: v.placa, marca: v.marca, modelo: v.modelo, anio: v.anio, tipo: v.tipo, capacidad: v.capacidad,
                kilometrajeActual: v.km, rendimientoEsperadoKmGal: v.rend,
                fechaVencimientoSoat: enDias(v.soat), fechaVencimientoSeguro: enDias(v.seguro),
                fechaVencimientoMatricula: enDias(v.matricula), fechaVencimientoRevisionTecnica: enDias(v.rtv),
            },
        });
        await registrar('Vehiculo', creado.id, AccionAuditoria.CREAR, null, { placa: v.placa, marca: v.marca, modelo: v.modelo, estado: 'ACTIVO' }, enDias(-400 + flota.length * 7));
        flota.push({ ...creado, problematico: v.problematico, fuga: !!v.fuga });
    }

    // Dos unidades fuera de operación: no reciben viajes nuevos ni antiguos
    const retirada = await prisma.vehiculo.create({
        data: {
            placa: 'VLV-5544', marca: 'Volvo', modelo: 'VNL', anio: 2015, tipo: 'Tráiler', capacidad: '30 toneladas',
            kilometrajeActual: 612000, rendimientoEsperadoKmGal: 6.0, estado: EstadoVehiculo.INACTIVO,
            fechaVencimientoSoat: enDias(-400), fechaVencimientoSeguro: enDias(-380), fechaVencimientoMatricula: enDias(-200), fechaVencimientoRevisionTecnica: enDias(-300),
            observaciones: 'Dada de baja operativa: exceso de kilometraje y costo de mantenimiento no rentable.',
        },
    });
    await registrar('Vehiculo', retirada.id, AccionAuditoria.CREAR, null, { placa: retirada.placa, estado: 'ACTIVO' }, enDias(-500));
    await registrar('Vehiculo', retirada.id, AccionAuditoria.EDITAR, { estado: 'ACTIVO' }, { estado: 'INACTIVO' }, enDias(-45));

    const enTaller = await prisma.vehiculo.create({
        data: {
            placa: 'HNO-3399', marca: 'Hino', modelo: '500', anio: 2022, tipo: 'Furgón', capacidad: '8 toneladas',
            kilometrajeActual: 62000, rendimientoEsperadoKmGal: 10.0, estado: EstadoVehiculo.EN_MANTENIMIENTO,
            fechaVencimientoSoat: enDias(60), fechaVencimientoSeguro: enDias(2), fechaVencimientoMatricula: enDias(120), fechaVencimientoRevisionTecnica: enDias(200),
        },
    });
    await registrar('Vehiculo', enTaller.id, AccionAuditoria.CREAR, null, { placa: enTaller.placa, estado: 'ACTIVO' }, enDias(-180));
    await registrar('Vehiculo', enTaller.id, AccionAuditoria.EDITAR, { estado: 'ACTIVO' }, { estado: 'EN_MANTENIMIENTO' }, enDias(-2));

    // ---------- Choferes: 10 operativos + 1 inactivo ----------
    const choferesDef = [
        { nombres: 'Carlos', apellidos: 'Mendoza Ríos', doc: '0912345678', lic: TipoLicencia.E, venc: 400, mod: ModalidadPago.POR_VIAJE, problematico: false },
        { nombres: 'Luis', apellidos: 'Paredes Vera', doc: '1712345678', lic: TipoLicencia.E, venc: 10, mod: ModalidadPago.MENSUAL, problematico: true },
        { nombres: 'Jorge', apellidos: 'Castillo Mora', doc: '1312345678', lic: TipoLicencia.E, venc: 700, mod: ModalidadPago.POR_VIAJE, problematico: false },
        { nombres: 'Andrés', apellidos: 'Villacís León', doc: '0102345678', lic: TipoLicencia.C, venc: 300, mod: ModalidadPago.MENSUAL, problematico: false },
        { nombres: 'Fernando', apellidos: 'Quiñonez Ortiz', doc: '0812345678', lic: TipoLicencia.E, venc: -15, mod: ModalidadPago.POR_VIAJE, problematico: true },
        { nombres: 'Patricia', apellidos: 'Salazar Nieves', doc: '1112345678', lic: TipoLicencia.D, venc: 200, mod: ModalidadPago.MENSUAL, problematico: false },
        { nombres: 'Miguel', apellidos: 'Zambrano Intriago', doc: '1312399999', lic: TipoLicencia.E, venc: 600, mod: ModalidadPago.POR_VIAJE, problematico: false },
        { nombres: 'Daniela', apellidos: 'Chávez Rosero', doc: '1712399999', lic: TipoLicencia.C, venc: 500, mod: ModalidadPago.POR_VIAJE, problematico: false },
        { nombres: 'Ramiro', apellidos: 'Espinoza Tapia', doc: '0912399999', lic: TipoLicencia.E, venc: 28, mod: ModalidadPago.MENSUAL, problematico: false },
        { nombres: 'Byron', apellidos: 'Quintero Macías', doc: '1312388888', lic: TipoLicencia.E, venc: 600, mod: ModalidadPago.POR_VIAJE, problematico: false },
    ];
    const choferes = [];
    for (const c of choferesDef) {
        const creado = await prisma.chofer.create({
            data: {
                nombres: c.nombres, apellidos: c.apellidos, documentoId: c.doc, telefono: '09' + c.doc.slice(2, 10),
                licenciaTipo: c.lic, fechaVencimientoLicencia: enDias(c.venc), modalidadPago: c.mod,
                metodoPago: MetodoPago.TRANSFERENCIA, banco: 'Banco Pichincha', numeroCuenta: '22' + c.doc.slice(0, 8),
                sueldoMensual: c.mod === ModalidadPago.MENSUAL ? 900 : null,
            },
        });
        await registrar('Chofer', creado.id, AccionAuditoria.CREAR, null, { nombres: c.nombres, apellidos: c.apellidos, licenciaTipo: c.lic }, enDias(-400 + choferes.length * 9));
        choferes.push({ ...creado, problematico: c.problematico });
    }

    const choferInactivo = await prisma.chofer.create({
        data: {
            nombres: 'Patricio', apellidos: 'Benítez Soria', documentoId: '0998765432', telefono: '0998765432',
            licenciaTipo: TipoLicencia.D, fechaVencimientoLicencia: enDias(150), modalidadPago: ModalidadPago.MENSUAL,
            metodoPago: MetodoPago.TRANSFERENCIA, banco: 'Banco Pichincha', numeroCuenta: '2298765432',
            sueldoMensual: 850, estado: EstadoChofer.INACTIVO,
        },
    });
    await registrar('Chofer', choferInactivo.id, AccionAuditoria.CREAR, null, { nombres: 'Patricio', apellidos: 'Benítez Soria', estado: 'ACTIVO' }, enDias(-300));
    await registrar('Chofer', choferInactivo.id, AccionAuditoria.EDITAR, { estado: 'ACTIVO' }, { estado: 'INACTIVO' }, enDias(-60));

    // ---------- Clientes ----------
    const clientesDef = [
        { nombre: 'Holcim Ecuador S.A.', ruc: '0990011419001', sector: 'Construcción' },
        { nombre: 'Petrocomercial Distribuidora', ruc: '1768153530001', sector: 'Combustibles' },
        { nombre: 'Constructora Andina Cía. Ltda.', ruc: '1791234567001', sector: 'Obras viales' },
        { nombre: 'Agregados del Pacífico S.A.', ruc: '1391234567001', sector: 'Áridos' },
        { nombre: 'Cementos Chimborazo C.A.', ruc: '0691234567001', sector: 'Construcción' },
        { nombre: 'Minera San Carlos S.A.', ruc: '1792345671001', sector: 'Minería' },
        { nombre: 'Distribuidora EP Petroecuador', ruc: '1760001550001', sector: 'Combustibles' },
        { nombre: 'Hormigones del Norte Cía. Ltda.', ruc: '1792233445001', sector: 'Construcción' },
        { nombre: 'Transportes Graneleros del Austro', ruc: '0190011223001', sector: 'Agroindustria' },
        { nombre: 'Industrias Guapán S.A.', ruc: '0390012233001', sector: 'Cemento' },
    ];
    const clientes = [];
    for (const c of clientesDef) {
        const creado = await prisma.cliente.create({
            data: { nombreRazonSocial: c.nombre, documentoId: c.ruc, sector: c.sector, telefono: '042000000', correo: `logistica@${c.ruc}.ec` },
        });
        await registrar('Cliente', creado.id, AccionAuditoria.CREAR, null, { nombreRazonSocial: c.nombre, ruc: c.ruc }, enDias(-400 + clientes.length * 11));
        clientes.push(creado);
    }

    const materiales = Object.fromEntries((await prisma.material.findMany()).map(m => [m.nombre, m]));

    // ---------- Rutas frecuentes: [origen, destino, km, tarifa base, cliente, material] ----------
    const rutas: Array<[string, string, number, number, number, string]> = [
        ['Guayaquil, Guayas', 'Quito, Pichincha', 420, 1150, 0, 'Cemento'],
        ['Quito, Pichincha', 'Guayaquil, Guayas', 420, 980, 2, 'Asfalto'],
        ['Esmeraldas, Esmeraldas', 'Quito, Pichincha', 320, 1050, 1, 'Diésel'],
        ['Guayaquil, Guayas', 'Cuenca, Azuay', 195, 640, 0, 'Cemento'],
        ['Manta, Manabí', 'Guayaquil, Guayas', 190, 560, 3, 'Arena'],
        ['Esmeraldas, Esmeraldas', 'Ambato, Tungurahua', 360, 1120, 1, 'Gasolina'],
        ['Riobamba, Chimborazo', 'Guayaquil, Guayas', 240, 780, 4, 'Cemento'],
        ['Quito, Pichincha', 'Loja, Loja', 420, 1300, 5, 'Arena'],
        ['Esmeraldas, Esmeraldas', 'Portoviejo, Manabí', 210, 690, 6, 'Gasolina'],
        ['Guayaquil, Guayas', 'Machala, El Oro', 195, 610, 7, 'Cemento'],
        ['Ambato, Tungurahua', 'Esmeraldas, Esmeraldas', 360, 1130, 8, 'Asfalto'],
        ['Azogues, Cañar', 'Guayaquil, Guayas', 170, 540, 9, 'Cemento'],
    ];

    const PRECIO_DIESEL = 2.80; // USD por galón (referencial)

    // 12 meses de operación: viajes completados, algunos cancelados, en curso y planificados
    let creados = 0, cancelados = 0;
    for (let d = 365; d >= -10; d -= 2) {
        const ruta = elegir(rutas);
        const [origen, destino, kmBase, tarifaBase, idxCliente, nombreMaterial] = ruta;
        const material = materiales[nombreMaterial];

        const vehiculosDisponibles = flota.filter(v => !v.problematico || d > 20);
        const vehiculo = elegir(vehiculosDisponibles);
        const choferesDisponibles = material.esPeligroso
            ? choferes.filter(c => c.licenciaTipo === TipoLicencia.E && (!c.problematico || d > 20))
            : choferes.filter(c => !c.problematico || d > 20);
        const chofer = elegir(choferesDisponibles);

        const salida = new Date(hoy.getTime() - d * DIA);
        const horas = kmBase / 55;
        let estado: EstadoViaje;
        if (d > 2) {
            estado = azar() < 0.06 ? EstadoViaje.CANCELADO : EstadoViaje.COMPLETADO;
        } else if (d > -1) {
            estado = EstadoViaje.EN_CURSO;
        } else {
            estado = EstadoViaje.PLANIFICADO;
        }
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
        await registrar('Viaje', viaje.id, AccionAuditoria.CREAR, null, { origen, destino, tarifa, estado: 'PLANIFICADO' }, salida);

        if (estado === EstadoViaje.PLANIFICADO) continue;

        if (estado === EstadoViaje.CANCELADO) {
            const fechaCancelacion = new Date(salida.getTime() + entre(1, 36) * 60 * 60 * 1000);
            await registrar('Viaje', viaje.id, AccionAuditoria.EDITAR, { estado: 'PLANIFICADO' }, { estado: 'CANCELADO' }, fechaCancelacion);
            cancelados++;
            continue;
        }

        const fechaInicio = new Date(salida.getTime() + entre(0.5, 3) * 60 * 60 * 1000);
        await registrar('Viaje', viaje.id, AccionAuditoria.EDITAR, { estado: 'PLANIFICADO' }, { estado: 'EN_CURSO' }, fechaInicio);

        // Anticipo para viáticos y gastos de ruta
        const anticipo = 250;
        await prisma.pagoChofer.create({
            data: { choferId: chofer.id, viajeId: viaje.id, tipoPago: TipoPagoChofer.ANTICIPO, monto: anticipo, fecha: salida, metodoPago: MetodoPago.EFECTIVO, descripcion: 'Anticipo de viáticos' },
        });

        // Combustible: las unidades marcadas "fuga" rinden ~30% menos que su referencia (posible desvío o falla)
        const rendimientoReal = vehiculo.fuga ? entre(4.6, 5.2) : vehiculo.rendimientoEsperadoKmGal!.toNumber() * entre(0.92, 1.05);
        const galones = redondear(kmReales / rendimientoReal, 3);
        const gastos: Array<{ tipoGasto: TipoGasto; monto: number; metodoPago: MetodoPago; galones?: number; precioPorGalon?: number; estacionServicio?: string; kilometrajeAlCargar?: number; descripcion?: string }> = [
            { tipoGasto: TipoGasto.COMBUSTIBLE, monto: redondear(galones * PRECIO_DIESEL), galones, precioPorGalon: PRECIO_DIESEL, estacionServicio: 'Primax ' + origen.split(',')[0], kilometrajeAlCargar: vehiculo.kilometrajeActual, metodoPago: MetodoPago.TARJETA },
            { tipoGasto: TipoGasto.PEAJE, monto: redondear(entre(8, 22)), metodoPago: MetodoPago.EFECTIVO },
            { tipoGasto: TipoGasto.ALIMENTACION, monto: redondear(entre(15, 35)), metodoPago: MetodoPago.EFECTIVO },
        ];
        if (kmBase > 300) gastos.push({ tipoGasto: TipoGasto.HOSPEDAJE, monto: redondear(entre(20, 35)), metodoPago: MetodoPago.EFECTIVO });
        if (azar() < 0.1) gastos.push({ tipoGasto: TipoGasto.MULTA, monto: redondear(entre(25, 120)), metodoPago: MetodoPago.EFECTIVO, descripcion: 'Infracción de tránsito en ruta' });
        if (azar() < 0.08) gastos.push({ tipoGasto: TipoGasto.OTRO, monto: redondear(entre(5, 40)), metodoPago: MetodoPago.EFECTIVO, descripcion: 'Lavado y varios' });
        for (const g of gastos) {
            await prisma.gastoViaje.create({ data: { viajeId: viaje.id, fecha: salida, ...g } });
        }

        if (estado === EstadoViaje.COMPLETADO) {
            const fechaLlegada = new Date(salida.getTime() + horas * 1.15 * 60 * 60 * 1000);
            await registrar('Viaje', viaje.id, AccionAuditoria.EDITAR, { estado: 'EN_CURSO' }, { estado: 'COMPLETADO', kilometrosReales: kmReales }, fechaLlegada);

            await prisma.vehiculo.update({ where: { id: vehiculo.id }, data: { kilometrajeActual: { increment: kmReales } } });
            vehiculo.kilometrajeActual += kmReales;
            if (chofer.modalidadPago === ModalidadPago.POR_VIAJE) {
                await prisma.pagoChofer.create({
                    data: { choferId: chofer.id, viajeId: viaje.id, tipoPago: TipoPagoChofer.POR_VIAJE, monto: redondear(tarifa * 0.12), fecha: new Date(salida.getTime() + 3 * DIA), metodoPago: MetodoPago.TRANSFERENCIA, descripcion: `Flete viaje #${viaje.id}` },
                });
            }
            // Liquidación del anticipo frente a los gastos pagados en efectivo
            const gastosEfectivo = gastos.filter(g => g.metodoPago === MetodoPago.EFECTIVO).reduce((s, g) => s + g.monto, 0);
            const saldo = redondear(anticipo - gastosEfectivo);
            if (Math.abs(saldo) > 1) {
                await prisma.pagoChofer.create({
                    data: {
                        choferId: chofer.id, viajeId: viaje.id, tipoPago: TipoPagoChofer.LIQUIDACION, monto: Math.abs(saldo),
                        fecha: new Date(fechaLlegada.getTime() + DIA), metodoPago: MetodoPago.EFECTIVO,
                        descripcion: saldo > 0 ? 'Chofer devuelve saldo de anticipo no gastado' : 'Empresa reembolsa gastos adicionales del chofer',
                    },
                });
            }
        } else {
            await prisma.vehiculo.update({ where: { id: vehiculo.id }, data: { estado: EstadoVehiculo.EN_RUTA } });
        }
    }

    // Sueldos mensuales de los choferes con modalidad MENSUAL (12 meses)
    for (let m = 11; m >= 0; m--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - m, 28);
        if (fecha > hoy) continue;
        for (const c of choferes.filter(c => c.modalidadPago === ModalidadPago.MENSUAL)) {
            await prisma.pagoChofer.create({
                data: { choferId: c.id, tipoPago: TipoPagoChofer.SUELDO_MENSUAL, monto: 900, fecha, metodoPago: MetodoPago.TRANSFERENCIA, descripcion: 'Sueldo mensual' },
            });
        }
    }

    // Mantenimientos preventivos y correctivos: historial sobre la flota operativa,
    // más los dos que explican por qué HNO-3399 está hoy en el taller.
    const mantenimientos = [
        { v: 0, dias: 150, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de aceite 15W40 y filtros', taller: 'Kenworth Ecuador', mo: 120, rep: 380 },
        { v: 1, dias: 120, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de aceite y filtros de diésel', taller: 'Hino Teojama', mo: 110, rep: 340 },
        { v: 2, dias: 95, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Reparación de inyectores', taller: 'Diesel Service Quito', mo: 450, rep: 1650 },
        { v: 2, dias: 40, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Cambio de zapatas y tambores de freno', taller: 'Taller propio', mo: 180, rep: 620 },
        { v: 3, dias: 60, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Servicio de 150.000 km', taller: 'Volvo Ecuador', mo: 260, rep: 710 },
        { v: 0, dias: 20, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Cambio de 4 neumáticos de tracción', taller: 'Vulcanizadora Norte', mo: 60, rep: 1880 },
        { v: 4, dias: 200, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Servicio de 300.000 km', taller: 'Freightliner Ecuador', mo: 230, rep: 640 },
        { v: 5, dias: 75, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Reparación de sistema de frenos neumáticos', taller: 'Taller propio', mo: 210, rep: 540 },
        { v: 6, dias: 30, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Primer servicio de 50.000 km (garantía)', taller: 'Scania Ecuador', mo: 90, rep: 210 },
        { v: 7, dias: 140, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Cambio de embrague', taller: 'Diesel Service Quito', mo: 380, rep: 920 },
        { v: 8, dias: 50, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de aceite y revisión general', taller: 'MAN Ecuador', mo: 130, rep: 310 },
        { v: 9, dias: 110, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Reparación de sistema eléctrico', taller: 'Taller propio', mo: 150, rep: 280 },
        { v: 3, dias: 10, tipo: TipoMantenimiento.PREVENTIVO, desc: 'Cambio de filtros de aire y combustible', taller: 'Volvo Ecuador', mo: 100, rep: 220 },
        { v: 6, dias: 5, tipo: TipoMantenimiento.CORRECTIVO, desc: 'Ajuste de alineación y balanceo', taller: 'Vulcanizadora Norte', mo: 70, rep: 90 },
    ];
    for (const m of mantenimientos) {
        const vehiculo = flota[m.v];
        const creado = await prisma.mantenimiento.create({
            data: {
                vehiculoId: vehiculo.id, tipo: m.tipo, estado: EstadoMantenimiento.COMPLETADO, descripcion: m.desc, taller: m.taller,
                esExterno: m.taller !== 'Taller propio', costoManoObra: m.mo, costoRepuestos: m.rep, costoTotal: m.mo + m.rep,
                fecha: enDias(-m.dias), kilometrajeAlMomento: vehiculo.kilometrajeActual - Math.round(m.dias * 140),
                proximaFecha: m.tipo === TipoMantenimiento.PREVENTIVO ? enDias(-m.dias + 120) : null,
            },
        });
        await registrar('Mantenimiento', creado.id, AccionAuditoria.CREAR, null, { vehiculoId: vehiculo.id, tipo: m.tipo, costoTotal: m.mo + m.rep }, enDias(-m.dias));
    }
    // El próximo preventivo del GBA-1234 ya está vencido → aparece en las alertas
    await prisma.vehiculo.update({ where: { id: flota[0].id }, data: { fechaProximoMantenimiento: enDias(-5), fechaUltimoMantenimiento: enDias(-150) } });

    // Las dos intervenciones que explican por qué HNO-3399 está en el taller ahora mismo:
    // una ya completada hace 2 días y la causa raíz, aún en proceso.
    const mantCompletado = await prisma.mantenimiento.create({
        data: {
            vehiculoId: enTaller.id, tipo: TipoMantenimiento.CORRECTIVO, estado: EstadoMantenimiento.COMPLETADO,
            descripcion: 'Diagnóstico de falla de transmisión', taller: 'Hino Teojama', esExterno: true,
            costoManoObra: 80, costoRepuestos: 0, costoTotal: 80, fecha: enDias(-2), kilometrajeAlMomento: enTaller.kilometrajeActual,
        },
    });
    await registrar('Mantenimiento', mantCompletado.id, AccionAuditoria.CREAR, null, { vehiculoId: enTaller.id, tipo: 'CORRECTIVO' }, enDias(-2));

    const mantEnProceso = await prisma.mantenimiento.create({
        data: {
            vehiculoId: enTaller.id, tipo: TipoMantenimiento.CORRECTIVO, estado: EstadoMantenimiento.EN_PROCESO,
            descripcion: 'Reparación de caja de transmisión', taller: 'Hino Teojama', esExterno: true,
            costoManoObra: 420, costoRepuestos: 980, costoTotal: 1400, fecha: enDias(-1), kilometrajeAlMomento: enTaller.kilometrajeActual,
        },
    });
    await registrar('Mantenimiento', mantEnProceso.id, AccionAuditoria.CREAR, null, { vehiculoId: enTaller.id, tipo: 'CORRECTIVO', estado: 'EN_PROCESO' }, enDias(-1));

    // Un mantenimiento preventivo programado a futuro, para mostrar ese estado también
    const vehiculoProgramado = flota[8];
    const mantProgramado = await prisma.mantenimiento.create({
        data: {
            vehiculoId: vehiculoProgramado.id, tipo: TipoMantenimiento.PREVENTIVO, estado: EstadoMantenimiento.PROGRAMADO,
            descripcion: 'Servicio de 200.000 km (programado)', taller: 'MAN Ecuador', esExterno: true,
            costoManoObra: 0, costoRepuestos: 0, costoTotal: 0, fecha: enDias(15), kilometrajeAlMomento: vehiculoProgramado.kilometrajeActual,
        },
    });
    await registrar('Mantenimiento', mantProgramado.id, AccionAuditoria.CREAR, null, { vehiculoId: vehiculoProgramado.id, tipo: 'PREVENTIVO', estado: 'PROGRAMADO' }, enDias(-1));

    console.log(`Datos de demostración: ${flota.length + 2} vehículos, ${choferes.length + 1} choferes, ${clientes.length} clientes, ${creados} viajes (${cancelados} cancelados), ${mantenimientos.length + 3} mantenimientos`);
}

async function main() {
    console.log('Iniciando seed de la base de datos...');
    const { admin } = await crearBase();
    if (process.argv.includes('--demo')) {
        await crearDemo(admin.id);
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
