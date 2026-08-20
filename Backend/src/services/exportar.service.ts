// Servicio de Exportación - Reportes CSV para contabilidad (se abren directo en Excel)
import prisma from '../config/database';
import { calcularResumenViaje } from '../domain/finanzas';
import { generarCsv } from '../utils/csv';
import { Periodo } from '../domain/analitica';

const nombreCompleto = (c: { nombres: string; apellidos: string }) => `${c.nombres} ${c.apellidos}`;

export const TIPOS_EXPORTACION = ['viajes', 'gastos', 'mantenimientos', 'pagos'] as const;
export type TipoExportacion = (typeof TIPOS_EXPORTACION)[number];

export const exportarService = {
    async generar(tipo: TipoExportacion, periodo: Periodo): Promise<string> {
        const rango = { gte: periodo.desde, lte: periodo.hasta };

        switch (tipo) {
            case 'viajes': {
                const viajes = await prisma.viaje.findMany({
                    where: { fechaSalida: rango },
                    include: {
                        vehiculo: { select: { placa: true } },
                        chofer: { select: { nombres: true, apellidos: true } },
                        cliente: { select: { nombreRazonSocial: true, documentoId: true } },
                        material: { select: { nombre: true } },
                        gastos: { select: { tipoGasto: true, monto: true, metodoPago: true, galones: true } },
                        pagosChofer: { select: { tipoPago: true, monto: true } },
                    },
                    orderBy: { fechaSalida: 'asc' },
                });
                const filas = viajes.map(v => ({
                    v,
                    r: calcularResumenViaje(v.tarifa, v.gastos, v.pagosChofer, v.kilometrosReales, v.kilometrosEstimados),
                }));
                return generarCsv(filas, [
                    { titulo: 'N.º viaje', valor: f => f.v.id },
                    { titulo: 'Fecha salida', valor: f => f.v.fechaSalida },
                    { titulo: 'Fecha llegada', valor: f => f.v.fechaLlegadaReal },
                    { titulo: 'Estado', valor: f => f.v.estado },
                    { titulo: 'Cliente', valor: f => f.v.cliente.nombreRazonSocial },
                    { titulo: 'RUC/Cédula cliente', valor: f => f.v.cliente.documentoId },
                    { titulo: 'Origen', valor: f => f.v.origen },
                    { titulo: 'Destino', valor: f => f.v.destino },
                    { titulo: 'Material', valor: f => f.v.material.nombre },
                    { titulo: 'Placa', valor: f => f.v.vehiculo.placa },
                    { titulo: 'Chofer', valor: f => nombreCompleto(f.v.chofer) },
                    { titulo: 'Km estimados', valor: f => f.v.kilometrosEstimados },
                    { titulo: 'Km reales', valor: f => f.v.kilometrosReales },
                    { titulo: 'Tarifa (USD)', valor: f => f.r.ingreso },
                    { titulo: 'Gastos de ruta (USD)', valor: f => f.r.gastos },
                    { titulo: 'Pago chofer (USD)', valor: f => f.r.pagosChofer },
                    { titulo: 'Utilidad (USD)', valor: f => f.r.ganancia },
                    { titulo: 'Margen (%)', valor: f => f.r.margenPorcentaje },
                    { titulo: 'Costo por km (USD)', valor: f => f.r.costoPorKm },
                    { titulo: 'Galones', valor: f => f.r.galones },
                    { titulo: 'Rendimiento (km/gal)', valor: f => f.r.rendimientoKmGal },
                ]);
            }

            case 'gastos': {
                const gastos = await prisma.gastoViaje.findMany({
                    where: { fecha: rango },
                    include: {
                        comprobante: { select: { url: true } },
                        viaje: { select: { id: true, origen: true, destino: true, vehiculo: { select: { placa: true } }, chofer: { select: { nombres: true, apellidos: true } } } },
                    },
                    orderBy: { fecha: 'asc' },
                });
                return generarCsv(gastos, [
                    { titulo: 'Fecha', valor: g => g.fecha },
                    { titulo: 'N.º viaje', valor: g => g.viaje.id },
                    { titulo: 'Ruta', valor: g => `${g.viaje.origen} → ${g.viaje.destino}` },
                    { titulo: 'Placa', valor: g => g.viaje.vehiculo.placa },
                    { titulo: 'Chofer', valor: g => nombreCompleto(g.viaje.chofer) },
                    { titulo: 'Tipo', valor: g => g.tipoGasto },
                    { titulo: 'Método de pago', valor: g => g.metodoPago },
                    { titulo: 'Monto (USD)', valor: g => g.monto },
                    { titulo: 'Galones', valor: g => g.galones },
                    { titulo: 'Precio por galón (USD)', valor: g => g.precioPorGalon },
                    { titulo: 'Estación de servicio', valor: g => g.estacionServicio },
                    { titulo: 'Km al cargar', valor: g => g.kilometrajeAlCargar },
                    { titulo: 'Descripción', valor: g => g.descripcion },
                    { titulo: 'Comprobante', valor: g => (g.comprobante ? 'Sí' : 'No') },
                ]);
            }

            case 'mantenimientos': {
                const mantenimientos = await prisma.mantenimiento.findMany({
                    where: { fecha: rango },
                    include: { vehiculo: { select: { placa: true, marca: true, modelo: true } } },
                    orderBy: { fecha: 'asc' },
                });
                return generarCsv(mantenimientos, [
                    { titulo: 'Fecha', valor: m => m.fecha },
                    { titulo: 'Placa', valor: m => m.vehiculo.placa },
                    { titulo: 'Vehículo', valor: m => `${m.vehiculo.marca} ${m.vehiculo.modelo}` },
                    { titulo: 'Tipo', valor: m => m.tipo },
                    { titulo: 'Estado', valor: m => m.estado },
                    { titulo: 'Descripción', valor: m => m.descripcion },
                    { titulo: 'Taller', valor: m => m.taller },
                    { titulo: 'Externo', valor: m => (m.esExterno ? 'Sí' : 'No') },
                    { titulo: 'Mano de obra (USD)', valor: m => m.costoManoObra },
                    { titulo: 'Repuestos (USD)', valor: m => m.costoRepuestos },
                    { titulo: 'Total (USD)', valor: m => m.costoTotal },
                    { titulo: 'Km al momento', valor: m => m.kilometrajeAlMomento },
                    { titulo: 'Próxima fecha', valor: m => m.proximaFecha },
                    { titulo: 'Próximo km', valor: m => m.proximoKilometraje },
                ]);
            }

            case 'pagos': {
                const pagos = await prisma.pagoChofer.findMany({
                    where: { fecha: rango },
                    include: {
                        chofer: { select: { nombres: true, apellidos: true, documentoId: true } },
                        viaje: { select: { id: true, origen: true, destino: true } },
                    },
                    orderBy: { fecha: 'asc' },
                });
                return generarCsv(pagos, [
                    { titulo: 'Fecha', valor: p => p.fecha },
                    { titulo: 'Chofer', valor: p => nombreCompleto(p.chofer) },
                    { titulo: 'Cédula', valor: p => p.chofer.documentoId },
                    { titulo: 'Tipo', valor: p => p.tipoPago },
                    { titulo: 'Método', valor: p => p.metodoPago },
                    { titulo: 'Monto (USD)', valor: p => p.monto },
                    { titulo: 'N.º viaje', valor: p => p.viaje?.id },
                    { titulo: 'Ruta', valor: p => (p.viaje ? `${p.viaje.origen} → ${p.viaje.destino}` : '') },
                    { titulo: 'Descripción', valor: p => p.descripcion },
                ]);
            }
        }
    },
};
