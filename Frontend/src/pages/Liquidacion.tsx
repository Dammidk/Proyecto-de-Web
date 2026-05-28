// Hoja de liquidación de viaje: anticipos entregados al chofer vs. gastos comprobados.
// Se imprime o se guarda como PDF desde el navegador (Ctrl+P), con espacio para firmas.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Printer } from 'lucide-react';
import { viajeService, mensajeError } from '../services/api';
import { ETIQUETAS_TIPO_GASTO, fecha, fechaHora, moneda, numero, opcional, porcentaje } from '../utils/formato';

interface Gasto {
    id: number;
    fecha: string;
    tipoGasto: string;
    monto: string;
    metodoPago: string;
    descripcion: string | null;
    galones: string | null;
    comprobante: { url: string } | null;
}

interface Pago {
    id: number;
    fecha: string;
    tipoPago: string;
    monto: string;
    metodoPago: string;
    descripcion: string | null;
}

interface Viaje {
    id: number;
    estado: string;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaReal: string | null;
    chofer: { nombres: string; apellidos: string; documentoId: string };
    vehiculo: { placa: string; marca: string; modelo: string };
    cliente: { nombreRazonSocial: string };
    material: { nombre: string; esPeligroso: boolean };
    gastos: Gasto[];
    pagosChofer: Pago[];
}

interface Datos {
    viaje: Viaje;
    liquidacion: {
        anticipos: number;
        gastosEfectivo: number;
        gastosEmpresa: number;
        totalGastos: number;
        saldo: number;
        resultado: 'CHOFER_DEVUELVE' | 'EMPRESA_REEMBOLSA' | 'CUADRADO';
    };
    resumenEconomico: {
        ingreso: number;
        gastos: number;
        pagosChofer: number;
        ganancia: number;
        margenPorcentaje: number;
        kilometros: number | null;
        costoPorKm: number | null;
        galones: number;
        rendimientoKmGal: number | null;
    };
    generadoEn: string;
}

const TEXTO_RESULTADO = {
    CHOFER_DEVUELVE: 'El chofer devuelve a la empresa',
    EMPRESA_REEMBOLSA: 'La empresa reembolsa al chofer',
    CUADRADO: 'Cuenta cuadrada: no hay saldo pendiente',
};

export default function Liquidacion() {
    const { id } = useParams();
    const [datos, setDatos] = useState<Datos | null>(null);

    useEffect(() => {
        viajeService.obtenerLiquidacion(Number(id))
            .then(r => setDatos(r.datos))
            .catch(e => toast.error(mensajeError(e, 'No se pudo generar la liquidación')));
    }, [id]);

    if (!datos) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="spinner h-10 w-10 border-4 border-t-indigo-600"></div>
            </div>
        );
    }

    const { viaje, liquidacion: l, resumenEconomico: r } = datos;
    const anticipos = viaje.pagosChofer.filter(p => p.tipoPago === 'ANTICIPO');

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <Link to="/viajes" className="btn btn-secondary text-sm"><ArrowLeft className="h-4 w-4" /> Volver a viajes</Link>
                <button onClick={() => window.print()} className="btn btn-primary text-sm"><Printer className="h-4 w-4" /> Imprimir / Guardar PDF</button>
            </div>

            <article className="bg-white rounded-md border border-slate-200 p-8 print:border-0 print:p-0 print:rounded-none text-slate-800">
                <header className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">Hoja de liquidación de viaje</p>
                        <h1 className="text-2xl font-bold mt-1">Viaje N.º {viaje.id}</h1>
                        <p className="text-sm text-slate-600 mt-1">{viaje.origen} → {viaje.destino}</p>
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-semibold">Estado: {viaje.estado}</p>
                        <p className="text-slate-500">Emitida: {fechaHora(datos.generadoEn)}</p>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm py-4 border-b border-slate-200">
                    <Dato etiqueta="Chofer" valor={`${viaje.chofer.nombres} ${viaje.chofer.apellidos} · C.I. ${viaje.chofer.documentoId}`} />
                    <Dato etiqueta="Vehículo" valor={`${viaje.vehiculo.placa} · ${viaje.vehiculo.marca} ${viaje.vehiculo.modelo}`} />
                    <Dato etiqueta="Cliente" valor={viaje.cliente.nombreRazonSocial} />
                    <Dato etiqueta="Carga" valor={viaje.material.nombre + (viaje.material.esPeligroso ? ' (peligrosa)' : '')} />
                    <Dato etiqueta="Salida" valor={fechaHora(viaje.fechaSalida)} />
                    <Dato etiqueta="Llegada" valor={fechaHora(viaje.fechaLlegadaReal)} />
                </section>

                <section className="py-4 border-b border-slate-200">
                    <h2 className="text-sm font-bold uppercase text-slate-600 mb-2">Anticipos entregados</h2>
                    {anticipos.length === 0 ? (
                        <p className="text-sm text-slate-500">No se registraron anticipos para este viaje.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <tbody>
                                {anticipos.map(p => (
                                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1.5">{fecha(p.fecha)}</td>
                                        <td className="py-1.5">{p.descripcion || 'Anticipo'} · {p.metodoPago}</td>
                                        <td className="py-1.5 text-right font-medium">{moneda(p.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <section className="py-4 border-b border-slate-200">
                    <h2 className="text-sm font-bold uppercase text-slate-600 mb-2">Gastos comprobados</h2>
                    {viaje.gastos.length === 0 ? (
                        <p className="text-sm text-slate-500">No se registraron gastos.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-slate-500 text-left border-b border-slate-200">
                                    <th className="py-1.5 font-semibold">Fecha</th>
                                    <th className="py-1.5 font-semibold">Concepto</th>
                                    <th className="py-1.5 font-semibold">Pagado con</th>
                                    <th className="py-1.5 font-semibold text-center">Comprobante</th>
                                    <th className="py-1.5 font-semibold text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viaje.gastos.map(g => (
                                    <tr key={g.id} className="border-b border-slate-100 last:border-0">
                                        <td className="py-1.5">{fecha(g.fecha)}</td>
                                        <td className="py-1.5">
                                            {ETIQUETAS_TIPO_GASTO[g.tipoGasto] ?? g.tipoGasto}
                                            {g.galones ? ` · ${numero(g.galones, 2)} gal` : ''}
                                            {g.descripcion ? ` · ${g.descripcion}` : ''}
                                        </td>
                                        <td className="py-1.5">{g.metodoPago === 'EFECTIVO' ? 'Efectivo del chofer' : `${g.metodoPago.toLowerCase()} de la empresa`}</td>
                                        <td className="py-1.5 text-center">{g.comprobante ? 'Sí' : 'No'}</td>
                                        <td className="py-1.5 text-right font-medium">{moneda(g.monto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                <section className="grid sm:grid-cols-2 gap-6 py-4 border-b border-slate-200">
                    <div className="text-sm space-y-1.5">
                        <h2 className="text-sm font-bold uppercase text-slate-600 mb-2">Liquidación del chofer</h2>
                        <Linea texto="Anticipos recibidos" valor={moneda(l.anticipos)} />
                        <Linea texto="(−) Gastos pagados en efectivo" valor={moneda(l.gastosEfectivo)} />
                        <div className="border-t border-slate-300 pt-2 mt-2">
                            <Linea texto="Saldo" valor={moneda(Math.abs(l.saldo))} fuerte />
                            <p className={`text-sm font-semibold mt-1 ${l.resultado === 'EMPRESA_REEMBOLSA' ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {TEXTO_RESULTADO[l.resultado]}
                            </p>
                        </div>
                        <p className="text-xs text-slate-500 pt-1">Gastos pagados por la empresa (tarjeta o transferencia): {moneda(l.gastosEmpresa)}. No afectan el saldo del chofer.</p>
                    </div>
                    <div className="text-sm space-y-1.5">
                        <h2 className="text-sm font-bold uppercase text-slate-600 mb-2">Resultado del viaje</h2>
                        <Linea texto="Tarifa cobrada" valor={moneda(r.ingreso)} />
                        <Linea texto="(−) Gastos de ruta" valor={moneda(r.gastos)} />
                        <Linea texto="(−) Pago al chofer" valor={moneda(r.pagosChofer)} />
                        <div className="border-t border-slate-300 pt-2 mt-2">
                            <Linea texto={`Utilidad (${porcentaje(r.margenPorcentaje)})`} valor={moneda(r.ganancia)} fuerte />
                        </div>
                        <p className="text-xs text-slate-500 pt-1">
                            {opcional(r.kilometros, v => `${numero(v)} km`)} · CPK {opcional(r.costoPorKm, v => moneda(v))} · Rendimiento {opcional(r.rendimientoKmGal, v => `${numero(v, 1)} km/gal`)}
                        </p>
                    </div>
                </section>

                <footer className="grid grid-cols-2 gap-12 pt-16 text-sm text-center">
                    <div className="border-t border-slate-400 pt-2">
                        <p className="font-medium">{viaje.chofer.nombres} {viaje.chofer.apellidos}</p>
                        <p className="text-xs text-slate-500">Chofer · C.I. {viaje.chofer.documentoId}</p>
                    </div>
                    <div className="border-t border-slate-400 pt-2">
                        <p className="font-medium">Despachador / Contabilidad</p>
                        <p className="text-xs text-slate-500">Nombre y firma</p>
                    </div>
                </footer>
            </article>
        </div>
    );
}

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
    <p><span className="text-slate-500">{etiqueta}: </span><span className="font-medium">{valor}</span></p>
);

const Linea = ({ texto, valor, fuerte }: { texto: string; valor: string; fuerte?: boolean }) => (
    <div className={`flex justify-between ${fuerte ? 'font-bold text-base' : ''}`}>
        <span>{texto}</span><span>{valor}</span>
    </div>
);
