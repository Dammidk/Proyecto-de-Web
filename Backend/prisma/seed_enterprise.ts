import prisma from '../src/config/database';
import { EstadoNeumatico, EstadoFactura, PlanEmpresa, CategoriaRepuesto, MetodoPago } from '@prisma/client';
import { esNumeroFacturaValido, siguienteNumeroFactura } from '../src/domain/cartera';

async function seedEnterprise() {
    console.log('Seeding Enterprise Modules (Llantas, CxC, Empresa, Repuestos)...');

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

    // Asociar usuarios y vehiculos a la empresa si no tienen
    await prisma.usuario.updateMany({
        where: { empresaId: null },
        data: { empresaId: empresa.id },
    });
    await prisma.vehiculo.updateMany({
        where: { empresaId: null },
        data: { empresaId: empresa.id },
    });
    await prisma.cliente.updateMany({
        where: { empresaId: null },
        data: { empresaId: empresa.id },
    });

    // 2. Repuestos de Bodega
    if (await prisma.repuesto.count() === 0) {
        await prisma.repuesto.createMany({
            data: [
                { codigo: 'FIL-OIL-01', nombre: 'Filtro de Aceite Kenworth P550388', categoria: CategoriaRepuesto.FILTROS, stockActual: 12, stockMinimo: 4, costoUnitario: 28.50, ubicacion: 'Estante A-1', empresaId: empresa.id },
                { codigo: 'FIL-DSL-02', nombre: 'Filtro de Combustible Racor R90P', categoria: CategoriaRepuesto.FILTROS, stockActual: 2, stockMinimo: 5, costoUnitario: 34.00, ubicacion: 'Estante A-2', empresaId: empresa.id },
                { codigo: 'LUB-15W40', nombre: 'Aceite Motor Mobil Delvac 15W40 Galón', categoria: CategoriaRepuesto.LUBRICANTES, stockActual: 24, stockMinimo: 10, costoUnitario: 26.00, ubicacion: 'Bodega Líquidos', empresaId: empresa.id },
                { codigo: 'FRE-ZAP-01', nombre: 'Juego Zapatas de Freno 16.5x7 Meritor', categoria: CategoriaRepuesto.FRENOS, stockActual: 6, stockMinimo: 4, costoUnitario: 78.00, ubicacion: 'Estante C-3', empresaId: empresa.id },
                { codigo: 'SUS-PUL-01', nombre: 'Pulmón de Suspensión Neumática Firestone', categoria: CategoriaRepuesto.SUSPENSION, stockActual: 1, stockMinimo: 2, costoUnitario: 145.00, ubicacion: 'Estante B-2', empresaId: empresa.id },
            ],
        });
        console.log('Repuestos de inventario creados');
    }

    // 3. Neumáticos para el primer tractocamión
    const vehiculo = await prisma.vehiculo.findFirst({
        where: { tipo: { contains: 'Tráiler', mode: 'insensitive' } },
    }) || await prisma.vehiculo.findFirst();

    if (vehiculo && await prisma.neumatico.count({ where: { vehiculoId: vehiculo.id } }) === 0) {
        console.log(`Montando 10 neumáticos en vehículo ${vehiculo.placa}...`);

        const configuracionLlantas = [
            // Eje 1: Direccionales (2 ruedas) - Nuevas
            { pos: '1DI', marca: 'Michelin', modelo: 'X Multi Energy Z', med: '295/80R22.5', profIni: 16.0, profAct: 14.2, psi: 115, costo: 520, km: 32000, estado: EstadoNeumatico.EN_USO },
            { pos: '1DD', marca: 'Michelin', modelo: 'X Multi Energy Z', med: '295/80R22.5', profIni: 16.0, profAct: 13.8, psi: 112, costo: 520, km: 32000, estado: EstadoNeumatico.EN_USO },
            // Eje 2: Tracción 1 (4 ruedas) - Desgaste medio
            { pos: '2TI_EXT', marca: 'Bridgestone', modelo: 'M729', med: '295/80R22.5', profIni: 20.0, profAct: 7.2, psi: 105, costo: 480, km: 85000, estado: EstadoNeumatico.EN_USO },
            { pos: '2TI_INT', marca: 'Bridgestone', modelo: 'M729', med: '295/80R22.5', profIni: 20.0, profAct: 6.8, psi: 104, costo: 480, km: 85000, estado: EstadoNeumatico.EN_USO },
            { pos: '2TD_INT', marca: 'Bridgestone', modelo: 'M729', med: '295/80R22.5', profIni: 20.0, profAct: 7.0, psi: 105, costo: 480, km: 85000, estado: EstadoNeumatico.EN_USO },
            { pos: '2TD_EXT', marca: 'Bridgestone', modelo: 'M729', med: '295/80R22.5', profIni: 20.0, profAct: 6.5, psi: 102, costo: 480, km: 85000, estado: EstadoNeumatico.EN_USO },
            // Eje 3: Tracción 2 (4 ruedas) - Críticas / Requieren Reencauche
            { pos: '3TI_EXT', marca: 'Goodyear', modelo: 'KMax D', med: '295/80R22.5', profIni: 19.0, profAct: 3.2, psi: 88, costo: 440, km: 124000, estado: EstadoNeumatico.EN_USO },
            { pos: '3TI_INT', marca: 'Goodyear', modelo: 'KMax D', med: '295/80R22.5', profIni: 19.0, profAct: 2.8, psi: 82, costo: 440, km: 124000, estado: EstadoNeumatico.EN_USO },
            { pos: '3TD_INT', marca: 'Goodyear', modelo: 'KMax D', med: '295/80R22.5', profIni: 19.0, profAct: 3.0, psi: 85, costo: 440, km: 124000, estado: EstadoNeumatico.EN_USO },
            { pos: '3TD_EXT', marca: 'Goodyear', modelo: 'KMax D', med: '295/80R22.5', profIni: 19.0, profAct: 2.9, psi: 90, costo: 440, km: 124000, estado: EstadoNeumatico.EN_USO },
        ];

        for (let i = 0; i < configuracionLlantas.length; i++) {
            const ll = configuracionLlantas[i];
            const codigoSerie = `DOT-MICH-${vehiculo.placa}-${ll.pos}`;
            const neum = await prisma.neumatico.create({
                data: {
                    codigoSerie,
                    marca: ll.marca,
                    modelo: ll.modelo,
                    medida: ll.med,
                    estado: ll.estado,
                    posicionActual: ll.pos,
                    profundidadInicialMm: ll.profIni,
                    profundidadActualMm: ll.profAct,
                    presionRecomendadaPsi: 110,
                    presionActualPsi: ll.psi,
                    costoCompra: ll.costo,
                    kilometrosRecorridos: ll.km,
                    numeroReencauches: ll.profAct < 4 ? 1 : 0,
                    fechaInstalacion: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
                    vehiculoId: vehiculo.id,
                },
            });

            // Agregar inspección previa
            await prisma.inspeccionNeumatico.create({
                data: {
                    neumaticoId: neum.id,
                    fecha: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    profundidadMm: ll.profAct + 0.8,
                    presionPsi: ll.psi,
                    kilometrajeVehiculo: vehiculo.kilometrajeActual - 8000,
                    desgasteIrregular: ll.profAct < 4,
                    observaciones: ll.profAct < 4 ? 'Alerta de labrado mínimo. Programar reencauche.' : 'Desgaste parejo.',
                },
            });
        }
        console.log(`10 neumáticos montados en ${vehiculo.placa}`);
    }

    // 4. Facturación y Cuentas por Cobrar (CxC)
    const clientes = await prisma.cliente.findMany({ take: 3 });
    if (clientes.length > 0 && await prisma.facturaCliente.count() === 0) {
        const ahora = Date.now();
        const DIA_MS = 24 * 60 * 60 * 1000;

        // Factura 1: Corriente (vence en 15 días)
        await prisma.facturaCliente.create({
            data: {
                numeroFactura: '001-001-000000001',
                clienteId: clientes[0].id,
                fechaEmision: new Date(ahora - 15 * DIA_MS),
                fechaVencimiento: new Date(ahora + 15 * DIA_MS),
                diasCredito: 30,
                subtotal: 3200.00,
                iva: 480.00,
                total: 3680.00,
                saldoPendiente: 3680.00,
                estado: EstadoFactura.PENDIENTE,
                empresaId: empresa.id,
                observaciones: 'Flete de cemento a granel Quito - Ambato',
            },
        });

        // Factura 2: Vencida en rango 1-30 días (venció hace 12 días)
        const fac2 = await prisma.facturaCliente.create({
            data: {
                numeroFactura: '001-001-000000002',
                clienteId: clientes[1] ? clientes[1].id : clientes[0].id,
                fechaEmision: new Date(ahora - 42 * DIA_MS),
                fechaVencimiento: new Date(ahora - 12 * DIA_MS),
                diasCredito: 30,
                subtotal: 4500.00,
                iva: 675.00,
                total: 5175.00,
                saldoPendiente: 2175.00,
                estado: EstadoFactura.PAGADA_PARCIAL,
                empresaId: empresa.id,
                observaciones: 'Transporte de derivados de petróleo',
            },
        });
        // Abono parcial registrado
        await prisma.cobroFactura.create({
            data: {
                facturaId: fac2.id,
                monto: 3000.00,
                metodoPago: MetodoPago.TRANSFERENCIA,
                referencia: 'TRANSF-BANCO-PICHINCHA-9821',
                observaciones: 'Abono 60% por transferencia',
            },
        });

        // Factura 3: Vencida crítica > 60 días (venció hace 65 días - Mora crítica)
        if (clientes[2]) {
            await prisma.facturaCliente.create({
                data: {
                    numeroFactura: '001-001-000000003',
                    clienteId: clientes[2].id,
                    fechaEmision: new Date(ahora - 95 * DIA_MS),
                    fechaVencimiento: new Date(ahora - 65 * DIA_MS),
                    diasCredito: 30,
                    subtotal: 6800.00,
                    iva: 1020.00,
                    total: 7820.00,
                    saldoPendiente: 7820.00,
                    estado: EstadoFactura.PENDIENTE,
                    empresaId: empresa.id,
                    observaciones: 'Mora crítica: Notificación jurídica enviada',
                },
            });
        }
        console.log('Facturas y cobros de demostración creados');
    }

    // 5. Normalizar numeración antigua y registrar el inventario inicial en el kardex
    const facturas = await prisma.facturaCliente.findMany({ orderBy: { id: 'asc' } });
    for (const f of facturas.filter(x => !esNumeroFacturaValido(x.numeroFactura))) {
        const ultima = await prisma.facturaCliente.findFirst({
            where: { numeroFactura: { startsWith: '001-' } }, orderBy: { numeroFactura: 'desc' }, select: { numeroFactura: true },
        });
        await prisma.facturaCliente.update({
            where: { id: f.id }, data: { numeroFactura: siguienteNumeroFactura(ultima?.numeroFactura) },
        });
    }

    const admin = await prisma.usuario.findFirst({ where: { rol: 'ADMIN' }, orderBy: { id: 'asc' } });
    if (admin) {
        const sinKardex = await prisma.repuesto.findMany({ where: { movimientos: { none: {} }, stockActual: { gt: 0 } } });
        for (const r of sinKardex) {
            await prisma.movimientoRepuesto.create({
                data: {
                    repuestoId: r.id, tipo: 'ENTRADA', cantidad: r.stockActual, costoUnitario: r.costoUnitario,
                    stockResultante: r.stockActual, motivo: 'Inventario inicial', usuarioId: admin.id,
                },
            });
        }
    }

    console.log('Enterprise Seed completado');
}

seedEnterprise()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
