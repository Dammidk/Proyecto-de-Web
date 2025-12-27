import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface LocationResult {
    display_name: string;
    lat: string;
    lon: string;
}

interface LocationInputProps {
    label: string;
    value: string;
    onChange: (value: string, coords?: { lat: number; lon: number }) => void;
    placeholder?: string;
    required?: boolean;
}

// Cache para evitar búsquedas repetidas
const searchCache = new Map<string, LocationResult[]>();

// Geocodificación con Nominatim (OpenStreetMap - gratis)
const searchLocation = async (query: string): Promise<LocationResult[]> => {
    if (query.length < 2) return [];

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey)!;
    }

    try {
        const searchQuery = `${query}, Ecuador`;
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
            { headers: { 'Accept-Language': 'es' } }
        );
        const data = await response.json();
        searchCache.set(cacheKey, data);
        return data;
    } catch {
        return [];
    }
};

// Formatear nombre corto
const formatName = (name: string): string => {
    const parts = name.split(',').map(p => p.trim());
    return parts.length > 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
};

export default function LocationInput({ label, value, onChange, placeholder, required }: LocationInputProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [hasCoords, setHasCoords] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Sync from parent
    useEffect(() => { if (value !== query && !open) setQuery(value); }, [value, open]);

    // Search with debounce
    useEffect(() => {
        if (query.length < 2 || hasCoords) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            const data = await searchLocation(query);
            setResults(data);
            setOpen(data.length > 0);
            setLoading(false);
        }, 350); // Fast debounce

        return () => clearTimeout(timer);
    }, [query, hasCoords]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = useCallback((r: LocationResult) => {
        const coords = { lat: parseFloat(r.lat), lon: parseFloat(r.lon) };
        const name = formatName(r.display_name);
        setQuery(name);
        setHasCoords(true);
        setOpen(false);
        setResults([]);
        onChange(name, coords);
    }, [onChange]);

    return (
        <div className="relative" ref={containerRef}>
            <label className="form-label">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    className="form-input pr-10"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setHasCoords(false);
                        onChange(e.target.value);
                    }}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder || 'Buscar ciudad...'}
                    required={required}
                    autoComplete="off"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 animate-spin" />}
                {hasCoords && !loading && <Navigation className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />}
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {results.map((r, i) => (
                        <button
                            key={i}
                            type="button"
                            className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 flex items-center gap-2 text-sm text-slate-700 border-b border-slate-50 last:border-0"
                            onClick={() => handleSelect(r)}
                        >
                            <MapPin className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                            {formatName(r.display_name)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Calcular ruta con OSRM (gratis)
export async function calculateRoute(
    origin: { lat: number; lon: number },
    destination: { lat: number; lon: number }
): Promise<{ distance: number; duration: number } | null> {
    try {
        const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`
        );
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.[0]) {
            return {
                distance: Math.round(data.routes[0].distance / 1000),
                duration: Math.round(data.routes[0].duration / 60),
            };
        }
        return null;
    } catch {
        return null;
    }
}

