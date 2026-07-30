// Cumplimiento documental: semáforo de SOAT, seguro, matrícula, RTV y licencias
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FileWarning, Lock, ShieldCheck, Truck, Users } from 'lucide-react';
import { cumplimientoService, mensajeError } from '../services/api';
import Semaforo, { NivelAlerta } from '../components/Semaforo';
import { fechaCalendario } from '../utils/formato';

interface Documento {
    documento: string;
    fechaVencimiento: string | null;
    diasRestantes: number | null;
    nivel: NivelAlerta;
}

interface EntidadDocumentos {
    id: number;
    documentos: Documento[];
    nivel: NivelAlerta;
    bloqueado: boolean;
}

interface Estado {
    resumen: {
        vencidos: number;
        criticos: number;
        urgentes: number;
        proximos: number;
        vehiculosBloqueados: number;
        choferesBloqueados: number;
        sinRegistro: number;
    };
    vehiculos: Array<EntidadDocumentos & { placa: string; descripcion: string; estado: string }>;
    choferes: Array<EntidadDocumentos & { nombre: string; documentoId: string; licenciaTipo: string | null }>;
}

export default function Documentos() {
    const [estado, setEstado] = useState<Estado | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cumplimientoService.obtener()
            .then(r => setEstado(r.datos))
            .catch(e => toast.error(mensajeError(e, 'No se pudo cargar el estado documental')))
            .finally(() => setCargando(false));
    }, []);

    if (cargando) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="spinner h-10 w-10 border-4 border-t-indigo-600"></div>
            </div>
        );
    }
    if (!estado) return null;

    const r = estado.resumen;
    const columnasVehiculo = ['SOAT', 'Seguro', 'Matrícula', 'Revisión Técnica (RTV)'];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="page-title">Documentos y Cumplimiento</h2>
                <p className="page-subtitle">
                    Avisos a 30, 15 y 5 días. Un documento vencido bloquea la asignación del vehículo o chofer a nuevos viajes.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Resumen titulo="Vencidos" valor={r.vencidos} clase="text-rose-700" detalle="Requieren renovación inmediata" />
                <Resumen titulo="Vencen en ≤ 15 días" valor={r.criticos + r.urgentes} clase="text-amber-700" detalle="Programar renovación" />
                <Resumen titulo="Vencen en ≤ 30 días" valor={r.proximos} clase="text-yellow-700" detalle="Aviso preventivo" />
                <Resumen titulo="Bloqueados para viajar" valor={r.vehiculosBloqueados + r.choferesBloqueados} clase="text-slate-900"
                    detalle={`${r.vehiculosBloqueados} vehículo(s) · ${r.choferesBloqueados} chofer(es)`} />
            </div>

            {r.sinRegistro > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-600">
                    <FileWarning className="h-5 w-5 text-slate-400 shrink-0" />
                    <p>
                        Hay {r.sinRegistro} fecha(s) de vencimiento sin registrar. Complételas en{' '}
                        <Link to="/vehiculos" className="text-indigo-600 font-medium hover:underline">Vehículos</Link> y{' '}
                        <Link to="/choferes" className="text-indigo-600 font-medium hover:underline">Choferes</Link> para que el control sea completo.
                    </p>
                </div>
            )}

            <div className="card p-0 overflow-hidden">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 px-5 pt-5 pb-3">
                    <Truck className="h-4 w-4 text-indigo-500" /> Flota
                </h3>
                <div className="overflow-x-auto">
                    <table className="table text-sm">
                        <thead>
                            <tr>
                                <th>Vehículo</th>
                                {columnasVehiculo.map(c => <th key={c}>{c}</th>)}
                                <th>Asignable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estado.vehiculos.map(v => (
                                <tr key={v.id}>
                                    <td>
                                        <p className="font-semibold text-slate-800">{v.placa}</p>
                                        <p className="text-xs text-slate-500">{v.descripcion}</p>
                                    </td>
                                    {columnasVehiculo.map(c => {
                                        const d = v.documentos.find(x => x.documento === c);
                                        return (
                                            <td key={c}>
                                                {d && <CeldaDocumento d={d} />}
                                            </td>
                                        );
                                    })}
                                    <td><Asignable bloqueado={v.bloqueado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 px-5 pt-5 pb-3">
                    <Users className="h-4 w-4 text-indigo-500" /> Choferes activos
                </h3>
                <div className="overflow-x-auto">
                    <table className="table text-sm">
                        <thead>
                            <tr>
                                <th>Chofer</th>
                                <th>Tipo de licencia</th>
                                <th>Vencimiento de licencia</th>
                                <th>Asignable</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estado.choferes.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <p className="font-semibold text-slate-800">{c.nombre}</p>
                                        <p className="text-xs text-slate-500">C.I. {c.documentoId}</p>
                                    </td>
                                    <td>
                                        {c.licenciaTipo
                                            ? <span className="font-medium">Tipo {c.licenciaTipo}{c.licenciaTipo === 'E' ? ' · apto carga peligrosa' : ''}</span>
                                            : <span className="text-slate-400">Sin registrar</span>}
                                    </td>
                                    <td><CeldaDocumento d={c.documentos[0]} /></td>
                                    <td><Asignable bloqueado={c.bloqueado} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const CeldaDocumento = ({ d }: { d: Documento }) => (
    <div className="space-y-1">
        <Semaforo nivel={d.nivel} dias={d.diasRestantes} />
        {d.fechaVencimiento && <p className="text-xs text-slate-500">{fechaCalendario(d.fechaVencimiento)}</p>}
    </div>
);

const Asignable = ({ bloqueado }: { bloqueado: boolean }) =>
    bloqueado ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"><Lock className="h-3.5 w-3.5" /> Bloqueado</span>
    ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Sí</span>
    );

const Resumen = ({ titulo, valor, clase, detalle }: { titulo: string; valor: number; clase: string; detalle: string }) => (
    <div className="card">
        <p className="text-sm text-slate-500 font-medium">{titulo}</p>
        <p className={`text-3xl font-bold mt-1 ${clase}`}>{valor}</p>
        <p className="text-xs text-slate-500 mt-1">{detalle}</p>
    </div>
);
