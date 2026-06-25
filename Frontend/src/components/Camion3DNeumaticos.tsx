// Visor 3D (Three.js) de neumáticos por posición sobre un tractocamión.
// Estética técnica: fondo neutro, colores de estado sobrios y sin animaciones decorativas.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Maximize2 } from 'lucide-react';

export interface Neumatico3D {
    id: number;
    codigoSerie: string;
    marca: string;
    modelo: string;
    medida: string;
    posicionActual: string | null; // "1DI", "1DD", "2TI_EXT", etc.
    profundidadActualMm: number;
    presionActualPsi: number | null;
    presionRecomendadaPsi: number;
    costoPorKm: number | null;
    salud: 'OPTIMO' | 'ADVERTENCIA' | 'CRITICO';
}

interface Props {
    neumaticos: Neumatico3D[];
    neumaticoSeleccionadoId?: number | null;
    onSeleccionarNeumatico: (neumatico: Neumatico3D) => void;
}

// Configuración espacial de ejes del tractocamión (coordenadas X, Y, Z)
export const POSICIONES_EJES: Record<string, { x: number; y: number; z: number; etiqueta: string }> = {
    '1DI': { x: -1.45, y: 0.55, z: 2.8, etiqueta: 'Eje 1, delantera izquierda' },
    '1DD': { x: 1.45, y: 0.55, z: 2.8, etiqueta: 'Eje 1, delantera derecha' },
    '2TI_EXT': { x: -1.60, y: 0.55, z: -1.1, etiqueta: 'Eje 2, tracción izquierda exterior' },
    '2TI_INT': { x: -1.15, y: 0.55, z: -1.1, etiqueta: 'Eje 2, tracción izquierda interior' },
    '2TD_INT': { x: 1.15, y: 0.55, z: -1.1, etiqueta: 'Eje 2, tracción derecha interior' },
    '2TD_EXT': { x: 1.60, y: 0.55, z: -1.1, etiqueta: 'Eje 2, tracción derecha exterior' },
    '3TI_EXT': { x: -1.60, y: 0.55, z: -2.4, etiqueta: 'Eje 3, tracción izquierda exterior' },
    '3TI_INT': { x: -1.15, y: 0.55, z: -2.4, etiqueta: 'Eje 3, tracción izquierda interior' },
    '3TD_INT': { x: 1.15, y: 0.55, z: -2.4, etiqueta: 'Eje 3, tracción derecha interior' },
    '3TD_EXT': { x: 1.60, y: 0.55, z: -2.4, etiqueta: 'Eje 3, tracción derecha exterior' },
};

const COLOR_SALUD = {
    OPTIMO: 0x2f8660,
    ADVERTENCIA: 0xb8851d,
    CRITICO: 0xb44040,
    VACIO: 0x8e99ab,
};

const ETIQUETA_SALUD = { OPTIMO: 'Óptimo', ADVERTENCIA: 'Advertencia', CRITICO: 'Crítico' };

export default function Camion3DNeumaticos({ neumaticos, neumaticoSeleccionadoId, onSeleccionarNeumatico }: Props) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const ruedasGroupRef = useRef<THREE.Group | null>(null);
    const rotacionRef = useRef({ y: 0.6, x: 0.15, distancia: 0 });
    const autoRotarRef = useRef(true);
    const seleccionRef = useRef<number | null | undefined>(neumaticoSeleccionadoId);
    const onSeleccionarRef = useRef(onSeleccionarNeumatico);

    const [autoRotar, setAutoRotar] = useState(true);
    const [hoverInfo, setHoverInfo] = useState<string | null>(null);

    useEffect(() => { autoRotarRef.current = autoRotar; }, [autoRotar]);
    useEffect(() => { onSeleccionarRef.current = onSeleccionarNeumatico; }, [onSeleccionarNeumatico]);

    // Marca la rueda seleccionada sin reconstruir la escena
    useEffect(() => {
        seleccionRef.current = neumaticoSeleccionadoId;
        ruedasGroupRef.current?.children.forEach((rueda: any) => {
            const marca = rueda.getObjectByName('seleccion');
            if (marca) marca.visible = !!rueda.userData?.neumatico && rueda.userData.neumatico.id === neumaticoSeleccionadoId;
        });
    }, [neumaticoSeleccionadoId, neumaticos]);

    useEffect(() => {
        const contenedor = contenedorRef.current;
        if (!contenedor) return;

        const ancho = contenedor.clientWidth || 800;
        const alto = contenedor.clientHeight || 460;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeef1f6);

        const camera = new THREE.PerspectiveCamera(40, ancho / alto, 0.1, 100);
        if (!rotacionRef.current.distancia) rotacionRef.current.distancia = 13;
        camera.position.set(0, 4.5, rotacionRef.current.distancia);
        camera.lookAt(0, 1.1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(ancho, alto);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        contenedor.replaceChildren(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d0dc, 0.95));
        const luz = new THREE.DirectionalLight(0xffffff, 1.0);
        luz.position.set(7, 12, 8);
        luz.castShadow = true;
        luz.shadow.mapSize.set(1024, 1024);
        luz.shadow.camera.left = -8; luz.shadow.camera.right = 8;
        luz.shadow.camera.top = 8; luz.shadow.camera.bottom = -8;
        scene.add(luz);

        const piso = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ color: 0xe3e7ee, roughness: 1, metalness: 0 })
        );
        piso.rotation.x = -Math.PI / 2;
        piso.receiveShadow = true;
        scene.add(piso);

        const grid = new THREE.GridHelper(30, 30, 0xc2cad7, 0xd3d9e3);
        grid.position.y = 0.01;
        scene.add(grid);

        const camion = new THREE.Group();
        scene.add(camion);

        const mat = (color: number, rough = 0.6, metal = 0.2) =>
            new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
        const chasisMat = mat(0x4a5468, 0.6, 0.4);
        const cabinaMat = mat(0x2b4a73, 0.55, 0.25);
        const cristalMat = mat(0x1c2535, 0.25, 0.1);
        const aluminioMat = mat(0xaab3c2, 0.45, 0.5);

        const addBox = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, sombra = true) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            mesh.castShadow = sombra;
            camion.add(mesh);
            return mesh;
        };

        // Largueros del chasis
        addBox(0.18, 0.25, 7.5, chasisMat, -0.6, 0.9, 0.2);
        addBox(0.18, 0.25, 7.5, chasisMat, 0.6, 0.9, 0.2);
        // Travesaños
        [-2.6, -1.2, 0.4, 2.0].forEach(z => addBox(1.2, 0.12, 0.14, chasisMat, 0, 0.9, z, false));
        // Cabina y deflector
        addBox(2.3, 2.2, 2.5, cabinaMat, 0, 2.1, 2.3);
        addBox(2.2, 0.7, 1.8, cabinaMat, 0, 3.4, 2.1);
        // Parabrisas y parrilla
        const parabrisas = addBox(2.1, 1.0, 0.1, cristalMat, 0, 2.4, 3.56, false);
        parabrisas.rotation.x = -0.12;
        addBox(1.6, 0.8, 0.15, aluminioMat, 0, 1.3, 3.56, false);
        // Quinta rueda
        const quinta = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 24), chasisMat);
        quinta.position.set(0, 1.1, -1.7);
        quinta.castShadow = true;
        camion.add(quinta);
        // Tanques de combustible
        [-1.0, 1.0].forEach(x => {
            const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 2.2, 16), aluminioMat);
            tanque.rotation.x = Math.PI / 2;
            tanque.position.set(x, 0.65, 0.8);
            tanque.castShadow = true;
            camion.add(tanque);
        });
        // Ejes
        [2.8, -1.1, -2.4].forEach(z => {
            const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.0, 12), chasisMat);
            eje.rotation.z = Math.PI / 2;
            eje.position.set(0, 0.55, z);
            camion.add(eje);
        });

        // Ruedas
        const ruedasGroup = new THREE.Group();
        camion.add(ruedasGroup);
        ruedasGroupRef.current = ruedasGroup;

        const gomaMat = mat(0x262c3a, 0.9, 0.05);
        const rinMat = mat(0xb9c1cf, 0.35, 0.6);

        Object.entries(POSICIONES_EJES).forEach(([posicion, c]) => {
            const neum = neumaticos.find(n => n.posicionActual === posicion);
            const lado = c.x > 0 ? 1 : -1;

            const rueda = new THREE.Group();
            rueda.position.set(c.x, c.y, c.z);
            rueda.userData = { posicion, neumatico: neum };

            if (neum) {
                const goma = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 32), gomaMat);
                goma.rotation.z = Math.PI / 2;
                goma.castShadow = true;
                rueda.add(goma);

                const rin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.36, 24), rinMat);
                rin.rotation.z = Math.PI / 2;
                rueda.add(rin);

                // Disco de estado sobre la cara exterior de la rueda
                const estado = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24),
                    new THREE.MeshBasicMaterial({ color: COLOR_SALUD[neum.salud] })
                );
                estado.rotation.z = Math.PI / 2;
                estado.position.x = lado * 0.19;
                rueda.add(estado);
            } else {
                // Posición libre: perfil tenue
                const fantasma = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.52, 0.52, 0.34, 32),
                    new THREE.MeshStandardMaterial({ color: COLOR_SALUD.VACIO, transparent: true, opacity: 0.22, roughness: 1 })
                );
                fantasma.rotation.z = Math.PI / 2;
                rueda.add(fantasma);
            }

            // Marca de selección (aro fino, oculto por defecto)
            const aro = new THREE.Mesh(
                new THREE.TorusGeometry(0.6, 0.03, 8, 40),
                new THREE.MeshBasicMaterial({ color: 0x0e1b30 })
            );
            aro.rotation.y = Math.PI / 2;
            aro.position.x = lado * 0.19;
            aro.name = 'seleccion';
            aro.visible = !!neum && neum.id === seleccionRef.current;
            rueda.add(aro);

            ruedasGroup.add(rueda);
        });

        // Interacción
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let arrastrando = false;
        let previo = { x: 0, y: 0 };
        let desplazado = false;

        const posicionPuntero = (e: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const ruedaBajoPuntero = () => {
            raycaster.setFromCamera(mouse, camera);
            const impactos = raycaster.intersectObjects(ruedasGroup.children, true);
            if (impactos.length === 0) return null;
            let obj: any = impactos[0].object;
            while (obj.parent && !obj.userData?.posicion) obj = obj.parent;
            return obj.userData?.posicion ? obj : null;
        };

        const onDown = (e: MouseEvent) => { arrastrando = true; desplazado = false; previo = { x: e.clientX, y: e.clientY }; };
        const onMove = (e: MouseEvent) => {
            if (arrastrando) {
                const dx = e.clientX - previo.x;
                const dy = e.clientY - previo.y;
                if (Math.abs(dx) + Math.abs(dy) > 2) desplazado = true;
                rotacionRef.current.y += dx * 0.008;
                rotacionRef.current.x = Math.max(-0.1, Math.min(0.9, rotacionRef.current.x + dy * 0.006));
                previo = { x: e.clientX, y: e.clientY };
                return;
            }
            const rect = renderer.domElement.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
            posicionPuntero(e);
            const rueda = ruedaBajoPuntero();
            if (rueda) {
                const etiqueta = POSICIONES_EJES[rueda.userData.posicion]?.etiqueta ?? rueda.userData.posicion;
                const n = rueda.userData.neumatico as Neumatico3D | undefined;
                setHoverInfo(n
                    ? `${etiqueta}  |  ${n.marca} ${n.modelo}  |  ${n.profundidadActualMm.toFixed(1)} mm  |  ${ETIQUETA_SALUD[n.salud]}`
                    : `${etiqueta}  |  Sin neumático asignado`);
                renderer.domElement.style.cursor = n ? 'pointer' : 'default';
            } else {
                setHoverInfo(null);
                renderer.domElement.style.cursor = 'grab';
            }
        };
        const onUp = () => { arrastrando = false; };
        const onClick = (e: MouseEvent) => {
            if (desplazado) return;
            posicionPuntero(e);
            const rueda = ruedaBajoPuntero();
            if (rueda?.userData?.neumatico) onSeleccionarRef.current(rueda.userData.neumatico);
        };
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const d = rotacionRef.current.distancia * (e.deltaY > 0 ? 1.07 : 0.93);
            rotacionRef.current.distancia = Math.max(7, Math.min(20, d));
        };

        const canvas = renderer.domElement;
        canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        const observador = new ResizeObserver(() => {
            const w = contenedor.clientWidth;
            const h = contenedor.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });
        observador.observe(contenedor);

        let frame = 0;
        const animar = () => {
            frame = requestAnimationFrame(animar);
            const r = rotacionRef.current;
            if (autoRotarRef.current && !arrastrando) r.y += 0.0025;
            camion.rotation.y = r.y;
            camera.position.set(0, 2 + r.x * 6, r.distancia);
            camera.lookAt(0, 1.1, 0);
            renderer.render(scene, camera);
        };
        animar();

        return () => {
            cancelAnimationFrame(frame);
            observador.disconnect();
            canvas.removeEventListener('mousedown', onDown);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('wheel', onWheel);
            scene.traverse((obj: any) => {
                obj.geometry?.dispose?.();
                const m = obj.material;
                if (Array.isArray(m)) m.forEach(x => x.dispose()); else m?.dispose?.();
            });
            renderer.dispose();
        };
    }, [neumaticos]);

    const restablecer = () => {
        rotacionRef.current = { y: 0.6, x: 0.15, distancia: 13 };
    };

    return (
        <div className="relative rounded-md overflow-hidden border border-slate-300 bg-slate-100">
            <div ref={contenedorRef} className="w-full h-[460px] cursor-grab active:cursor-grabbing" />

            <div className="absolute top-3 left-3 flex items-center gap-2">
                <button
                    onClick={() => setAutoRotar(prev => !prev)}
                    className="btn btn-secondary btn-sm"
                    title="Alternar rotación automática"
                >
                    <RotateCw className="h-3.5 w-3.5" />
                    {autoRotar ? 'Detener giro' : 'Girar'}
                </button>
                <button onClick={restablecer} className="btn btn-secondary btn-sm" title="Restablecer vista">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Restablecer vista
                </button>
            </div>

            {hoverInfo && (
                <div className="absolute top-3 right-3 max-w-[60%] px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-mono">
                    {hoverInfo}
                </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-md bg-white border border-slate-300 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span className="font-semibold uppercase text-slate-500" style={{ letterSpacing: '0.06em' }}>Estado del neumático</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Óptimo (más de 7 mm)</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Advertencia (4 a 7 mm)</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />Crítico (4 mm o menos, o presión fuera de rango)</span>
                </div>
                <span className="hidden sm:block text-slate-500">Seleccione una rueda para ver su ficha</span>
            </div>
        </div>
    );
}
