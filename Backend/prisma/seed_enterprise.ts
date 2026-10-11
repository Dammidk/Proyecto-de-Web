// Seed de los módulos empresariales (Neumáticos, Cuentas por Cobrar, Repuestos, Empresa).
// Se ejecuta después de `seed:demo` (necesita vehículos y clientes ya creados).
// Es seguro volver a ejecutarlo: borra sus propios datos (repuestos, kardex, neumáticos,
// inspecciones, facturas y cobros) antes de repoblar.

import prisma from '../src/config/database';
import { EstadoNeumatico, EstadoFactura, PlanEmpresa, CategoriaRepuesto, MetodoPago, TipoMovimientoRepuesto } from '@prisma/client';

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias: number) => new Date(Date.now() + dias * DIA_MS);

async function reiniciarEnterprise() {
    await prisma.inspeccionNeumatico.deleteMany({});
    await prisma.neumatico.deleteMany({});
    await prisma.cobroFactura.deleteMany({});
    await prisma.facturaCliente.deleteMany({});
    await prisma.movimientoRepuesto.deleteMany({});
    await prisma.repuesto.deleteMany({});
    console.log('Datos empresariales anteriores eliminados (reinicio limpio).');
}

async function seedEnterprise() {
    console.log('Seeding Enterprise Modules (Llantas, CxC, Empresa, Repuestos)...');
    await reiniciarEnterprise();

    // 1. Empresa Demo
    let empresa = await prisma.empresa.findFirst();
    if (!empresa) {
        empresa = await prisma.empresa.create({
            data: {
                nombre: 'TransAndina Carga Pesada S.A.',
                ruc: '1792345678001',
                email: 'operaciones@transandina.com.ec',
                telefono: '+593 2 298 7654',
                direccion: 'Av. Panamericana Norte Km 14.5, Quito, Ecuador',
                logoUrl: null,
                plan: PlanEmpresa.ENTERPRISE,
                limiteVehiculos: 50,
                activo: true,
            },
        });
        console.log(`Empresa creada: ${empresa.nombre}`);
    }

    // Asociar usuarios, vehículos y clientes a la empresa si no la tienen
    await prisma.usuario.updateMany({ where: { empresaId: null }, data: { empresaId: empresa.id } });
    await prisma.vehiculo.updateMany({ where: { empresaId: null }, data: { empresaId: empresa.id } });
    await prisma.cliente.updateMany({ where: { empresaId: null }, data: { empresaId: empresa.id } });

    const admin = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' }, orderBy: { id: 'asc' } });
    if (!admin) throw new Error('No existe un usuario ADMIN: ejecute primero npm run seed');

    const flota = await prisma.vehiculo.findMany({ orderBy: { id: 'asc' } });
    const clientes = await prisma.cliente.findMany({ orderBy: { id: 'asc' } });
    if (flota.length === 0 || clientes.length === 0) {
        throw new Error('No hay vehículos o clientes: ejecute primero npm run seed:demo');
    }

    // 2. Repuestos de bodega + kardex (entradas y salidas reales, con historial)
    interface SalidaDef { cantidad: number; vehiculoIdx: number; motivo: string; diasAtras: number }
    interface RepuestoDef {
        codigo: string; nombre: string; categoria: CategoriaRepuesto; unidadMedida?: string;
        stockActual: number; stockMinimo: number; costoUnitario: number; ubicacion: string;
        salidas: SalidaDef[];
    }
    const repuestosDef: RepuestoDef[] = [
        { codigo: 'FIL-OIL-01', nombre: 'Filtro de Aceite Kenworth P550388', categoria: CategoriaRepuesto.FILTROS, stockActual: 12, stockMinimo: 4, costoUnitario: 28.50, ubicacion: 'Estante A-1', salidas: [{ cantidad: 2, vehiculoIdx: 0, motivo: 'Cambio de aceite preventivo', diasAtras: 150 }, { cantidad: 1, vehiculoIdx: 0, motivo: 'Cambio de aceite preventivo', diasAtras: 20 }] },
        { codigo: 'FIL-DSL-02', nombre: 'Filtro de Combustible Racor R90P', categoria: CategoriaRepuesto.FILTROS, stockActual: 2, stockMinimo: 5, costoUnitario: 34.00, ubicacion: 'Estante A-2', salidas: [{ cantidad: 3, vehiculoIdx: 1, motivo: 'Cambio de filtros de diésel', diasAtras: 120 }, { cantidad: 2, vehiculoIdx: 3, motivo: 'Mantenimiento preventivo', diasAtras: 10 }] },
        { codigo: 'LUB-15W40', nombre: 'Aceite Motor Mobil Delvac 15W40 Galón', categoria: CategoriaRepuesto.LUBRICANTES, stockActual: 24, stockMinimo: 10, costoUnitario: 26.00, ubicacion: 'Bodega Líquidos', salidas: [{ cantidad: 8, vehiculoIdx: 0, motivo: 'Cambio de aceite', diasAtras: 150 }, { cantidad: 8, vehiculoIdx: 4, motivo: 'Cambio de aceite', diasAtras: 200 }] },
        { codigo: 'FRE-ZAP-01', nombre: 'Juego Zapatas de Freno 16.5x7 Meritor', categoria: CategoriaRepuesto.FRENOS, stockActual: 6, stockMinimo: 4, costoUnitario: 78.00, ubicacion: 'Estante C-3', salidas: [{ cantidad: 2, vehiculoIdx: 2, motivo: 'Cambio de zapatas y tambores', diasAtras: 40 }] },
        { codigo: 'SUS-PUL-01', nombre: 'Pulmón de Suspensión Neumática Firestone', categoria: CategoriaRepuesto.SUSPENSION, stockActual: 1, stockMinimo: 2, costoUnitario: 145.00, ubicacion: 'Estante B-2', salidas: [{ cantidad: 1, vehiculoIdx: 5, motivo: 'Reparación de suspensión', diasAtras: 75 }] },
        { codigo: 'NEU-REC-01', nombre: 'Reencauche Banda de Rodamiento 295/80R22.5', categoria: CategoriaRepuesto.NEUMATICOS, stockActual: 8, stockMinimo: 3, costoUnitario: 185.00, ubicacion: 'Bodega Neumáticos', salidas: [{ cantidad: 2, vehiculoIdx: 0, motivo: 'Reencauche de neumáticos de tracción', diasAtras: 20 }] },
        { codigo: 'ELE-BAT-01', nombre: 'Batería 12V 150Ah Heavy Duty', categoria: CategoriaRepuesto.ELECTRICO, stockActual: 4, stockMinimo: 2, costoUnitario: 165.00, ubicacion: 'Estante D-1', salidas: [{ cantidad: 2, vehiculoIdx: 9, motivo: 'Reparación de sistema eléctrico', diasAtras: 110 }] },
        { codigo: 'ELE-ALT-01', nombre: 'Alternador 24V 140A', categoria: CategoriaRepuesto.ELECTRICO, stockActual: 0, stockMinimo: 2, costoUnitario: 310.00, ubicacion: 'Estante D-2', salidas: [{ cantidad: 2, vehiculoIdx: 9, motivo: 'Reparación de sistema eléctrico', diasAtras: 110 }] },
        { codigo: 'LUB-GRA-01', nombre: 'Grasa Multiuso EP2 (balde 5kg)', categoria: CategoriaRepuesto.LUBRICANTES, stockActual: 15, stockMinimo: 5, costoUnitario: 8.50, ubicacion: 'Bodega Líquidos', salidas: [{ cantidad: 3, vehiculoIdx: 7, motivo: 'Engrase general', diasAtras: 140 }] },
        { codigo: 'FRE-DIS-01', nombre: 'Disco de Freno Ventilado 410mm', categoria: CategoriaRepuesto.FRENOS, stockActual: 3, stockMinimo: 4, costoUnitario: 210.00, ubicacion: 'Estante C-4', salidas: [{ cantidad: 2, vehiculoIdx: 5, motivo: 'Reparación de sistema de frenos', diasAtras: 75 }] },
        { codigo: 'FIL-AIR-01', nombre: 'Filtro de Aire Donaldson P777868', categoria: CategoriaRepuesto.FILTROS, stockActual: 18, stockMinimo: 6, costoUnitario: 42.00, ubicacion: 'Estante A-3', salidas: [{ cantidad: 2, vehiculoIdx: 3, motivo: 'Mantenimiento preventivo', diasAtras: 10 }] },
        { codigo: 'OTR-LLA-01', nombre: 'Llave de Ruedas Neumática', categoria: CategoriaRepuesto.OTRO, stockActual: 2, stockMinimo: 1, costoUnitario: 95.00, ubicacion: 'Taller - Herramientas', salidas: [] },
    ];

    for (const r of repuestosDef) {
        const totalSalidas = r.salidas.reduce((s, x) => s + x.cantidad, 0);
        const stockInicial = r.stockActual + totalSalidas;

        const repuesto = await prisma.repuesto.create({
            data: {
                codigo: r.codigo, nombre: r.nombre, categoria: r.categoria, unidadMedida: r.unidadMedida ?? 'UNIDAD',
                stockActual: r.stockActual, stockMinimo: r.stockMinimo, costoUnitario: r.costoUnitario, ubicacion: r.ubicacion,
                empresaId: empresa.id,
            },
        });

        await prisma.movimientoRepuesto.create({
            data: {
                repuestoId: repuesto.id, tipo: TipoMovimientoRepuesto.ENTRADA, cantidad: stockInicial, costoUnitario: r.costoUnitario,
                stockResultante: stockInicial, motivo: 'Inventario inicial (compra a proveedor)', usuarioId: admin.id,
                fecha: enDias(-220),
            },
        });

        let corriente = stockInicial;
        const salidasOrdenadas = [...r.salidas].sort((a, b) => b.diasAtras - a.diasAtras);
        for (const s of salidasOrdenadas) {
            corriente -= s.cantidad;
            await prisma.movimientoRepuesto.create({
                data: {
                    repuestoId: repuesto.id, tipo: TipoMovimientoRepuesto.SALIDA, cantidad: s.cantidad, costoUnitario: r.costoUnitario,
                    stockResultante: corriente, motivo: s.motivo, vehiculoId: flota[s.vehiculoIdx]?.id, usuarioId: admin.id,
                    fecha: enDias(-s.diasAtras),
                },
            });
        }
    }
    console.log(`Repuestos de inventario creados: ${repuestosDef.length} (con historial de kardex)`);

    // 3. Neumáticos montados en 4 unidades representativas (tráiler, cisterna, volqueta, plataforma)
    const marcasPorEje = [
        { marca: 'Michelin', modelo: 'X Multi Energy Z' },
        { marca: 'Bridgestone', modelo: 'M729' },
        { marca: 'Goodyear', modelo: 'KMax D' },
    ];
    const vehiculosConLlantas = [flota[0], flota[4], flota[6], flota[8]].filter(Boolean);

    for (const vehiculo of vehiculosConLlantas) {
        const configuracionLlantas = [
            { pos: '1DI', eje: marcasPorEje[0], profIni: 16.0, profAct: 14.2, psi: 115, costo: 520, km: 32000 },
            { pos: '1DD', eje: marcasPorEje[0], profIni: 16.0, profAct: 13.8, psi: 112, costo: 520, km: 32000 },
            { pos: '2TI_EXT', eje: marcasPorEje[1], profIni: 20.0, profAct: 7.2, psi: 105, costo: 480, km: 85000 },
            { pos: '2TI_INT', eje: marcasPorEje[1], profIni: 20.0, profAct: 6.8, psi: 104, costo: 480, km: 85000 },
            { pos: '2TD_INT', eje: marcasPorEje[1], profIni: 20.0, profAct: 7.0, psi: 105, costo: 480, km: 85000 },
            { pos: '2TD_EXT', eje: marcasPorEje[1], profIni: 20.0, profAct: 6.5, psi: 102, costo: 480, km: 85000 },
            { pos: '3TI_EXT', eje: marcasPorEje[2], profIni: 19.0, profAct: 3.2, psi: 88, costo: 440, km: 124000 },
            { pos: '3TI_INT', eje: marcasPorEje[2], profIni: 19.0, profAct: 2.8, psi: 82, costo: 440, km: 124000 },
            { pos: '3TD_INT', eje: marcasPorEje[2], profIni: 19.0, profAct: 3.0, psi: 85, costo: 440, km: 124000 },
            { pos: '3TD_EXT', eje: marcasPorEje[2], profIni: 19.0, profAct: 2.9, psi: 90, costo: 440, km: 124000 },
        ];

        for (const ll of configuracionLlantas) {
            const codigoSerie = `DOT-${ll.eje.marca.slice(0, 4).toUpperCase()}-${vehiculo.placa}-${ll.pos}`;
            const neum = await prisma.neumatico.create({
                data: {
                    codigoSerie, marca: ll.eje.marca, modelo: ll.eje.modelo, medida: '295/80R22.5',
                    estado: EstadoNeumatico.EN_USO, posicionActual: ll.pos,
                    profundidadInicialMm: ll.profIni, profundidadActualMm: ll.profAct,
                    presionRecomendadaPsi: 110, presionActualPsi: ll.psi,
                    costoCompra: ll.costo, kilometrosRecorridos: ll.km,
                    numeroReencauches: ll.profAct < 4 ? 1 : 0,
                    fechaInstalacion: enDias(-180),
                    vehiculoId: vehiculo.id,
                },
            });

            await prisma.inspeccionNeumatico.create({
                data: {
                    neumaticoId: neum.id, fecha: enDias(-30),
                    profundidadMm: ll.profAct + 0.8, presionPsi: ll.psi,
                    kilometrajeVehiculo: vehiculo.kilometrajeActual - 8000,
                    desgasteIrregular: ll.profAct < 4,
                    observaciones: ll.profAct < 4 ? 'Alerta de labrado mínimo. Programar reencauche.' : 'Desgaste parejo.',
                },
            });
        }
        console.log(`10 neumáticos montados en ${vehiculo.placa}`);
    }

    // 4. Facturación y Cuentas por Cobrar: distribuidas en todos los rangos de antigüedad
    interface FacturaDef {
        numero: string; clienteIdx: number; diasEmision: number; diasVencimiento: number;
        subtotal: number; estado: EstadoFactura; observaciones: string; cobros: { monto: number; diasAtras: number; metodo: MetodoPago; referencia: string }[];
    }
    const facturasDef: FacturaDef[] = [
        { numero: '001-001-000000001', clienteIdx: 0, diasEmision: -10, diasVencimiento: 20, subtotal: 3200.00, estado: EstadoFactura.PENDIENTE, observaciones: 'Flete de cemento a granel Quito - Ambato', cobros: [] },
        { numero: '001-001-000000002', clienteIdx: 4, diasEmision: -5, diasVencimiento: 25, subtotal: 2130.43, estado: EstadoFactura.PENDIENTE, observaciones: 'Transporte de asfalto para obra vial', cobros: [] },
        { numero: '001-001-000000003', clienteIdx: 1, diasEmision: -42, diasVencimiento: -12, subtotal: 4500.00, estado: EstadoFactura.PAGADA_PARCIAL, observaciones: 'Transporte de derivados de petróleo', cobros: [{ monto: 3000.00, diasAtras: 10, metodo: MetodoPago.TRANSFERENCIA, referencia: 'TRANSF-BANCO-PICHINCHA-9821' }] },
        { numero: '001-001-000000004', clienteIdx: 5, diasEmision: -55, diasVencimiento: -25, subtotal: 1643.48, estado: EstadoFactura.PENDIENTE, observaciones: 'Transporte de material de mina a planta', cobros: [] },
        { numero: '001-001-000000005', clienteIdx: 6, diasEmision: -75, diasVencimiento: -45, subtotal: 2782.61, estado: EstadoFactura.PENDIENTE, observaciones: 'Distribución de combustible zona norte', cobros: [] },
        { numero: '001-001-000000006', clienteIdx: 2, diasEmision: -95, diasVencimiento: -65, subtotal: 6800.00, estado: EstadoFactura.PENDIENTE, observaciones: 'Mora crítica: notificación jurídica enviada', cobros: [] },
        { numero: '001-001-000000007', clienteIdx: 7, diasEmision: -120, diasVencimiento: -90, subtotal: 3565.22, estado: EstadoFactura.PAGADA_PARCIAL, observaciones: 'Mora crítica: en proceso de cobranza', cobros: [{ monto: 1500.00, diasAtras: 30, metodo: MetodoPago.EFECTIVO, referencia: 'RECIBO-00231' }] },
        { numero: '001-001-000000008', clienteIdx: 3, diasEmision: -35, diasVencimiento: -5, subtotal: 2521.74, estado: EstadoFactura.PAGADA, observaciones: 'Transporte de áridos a planta de hormigón', cobros: [{ monto: 2900.00, diasAtras: 8, metodo: MetodoPago.TRANSFERENCIA, referencia: 'TRANSF-BANCO-GUAYAQUIL-5512' }] },
        { numero: '001-001-000000009', clienteIdx: 8, diasEmision: -48, diasVencimiento: -18, subtotal: 1434.78, estado: EstadoFactura.PAGADA, observaciones: 'Transporte de granos a bodega central', cobros: [{ monto: 1650.00, diasAtras: 15, metodo: MetodoPago.TRANSFERENCIA, referencia: 'TRANSF-BANCO-PACIFICO-7733' }] },
        { numero: '001-001-000000010', clienteIdx: 9, diasEmision: -60, diasVencimiento: -30, subtotal: 852.17, estado: EstadoFactura.ANULADA, observaciones: 'Anulada: error en datos del cliente, reemplazada por factura 001-001-000000011', cobros: [] },
    ];

    for (const f of facturasDef) {
        const iva = Math.round(f.subtotal * 0.15 * 100) / 100;
        const total = Math.round((f.subtotal + iva) * 100) / 100;
        const pagado = f.cobros.reduce((s, c) => s + c.monto, 0);
        const saldoPendiente = f.estado === EstadoFactura.ANULADA ? 0 : Math.max(0, Math.round((total - pagado) * 100) / 100);

        const factura = await prisma.facturaCliente.create({
            data: {
                numeroFactura: f.numero, clienteId: clientes[f.clienteIdx].id,
                fechaEmision: enDias(f.diasEmision), fechaVencimiento: enDias(f.diasVencimiento), diasCredito: 30,
                subtotal: f.subtotal, iva, total, saldoPendiente, estado: f.estado, observaciones: f.observaciones,
                empresaId: empresa.id,
            },
        });

        for (const c of f.cobros) {
            await prisma.cobroFactura.create({
                data: {
                    facturaId: factura.id, monto: c.monto, fecha: enDias(-c.diasAtras),
                    metodoPago: c.metodo, referencia: c.referencia, observaciones: 'Abono registrado por tesorería',
                },
            });
        }
    }
    console.log(`Facturas creadas: ${facturasDef.length} (distribuidas en corriente, 1-30, 31-60 y +60 días de mora)`);

    console.log('Enterprise Seed completado');
}

seedEnterprise()
    .catch((e) => { console.error('Error en seed empresarial:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
