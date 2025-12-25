import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';

interface SearchResult {
    teams: any[];
    players: any[];
    matches: any[];
}

interface GlobalSearchProps {
    tournamentId: number;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ tournamentId }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 1) {
                try {
                    const res = await api.searchGlobal(tournamentId, query);
                    setResults(res);
                    setIsOpen(true);
                } catch (e) {
                    console.error(e);
                }
            } else {
                setResults(null);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, tournamentId]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-64 md:w-80">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar equipo, jugador o partido..."
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none shadow-inner"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>

            {isOpen && results && (
                <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
                    {/* Teams */}
                    {results.teams.length > 0 && (
                        <div className="border-b border-slate-700 last:border-0">
                            <h4 className="bg-slate-900 px-3 py-2 text-xs font-bold text-amber-500 uppercase tracking-widest">Equipos</h4>
                            {results.teams.map((t: any) => (
                                <div key={t.id} className="px-4 py-2 hover:bg-slate-700 transition cursor-default">
                                    <p className="text-sm font-bold text-white">{t.name}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Players */}
                    {results.players.length > 0 && (
                        <div className="border-b border-slate-700 last:border-0">
                            <h4 className="bg-slate-900 px-3 py-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">Jugadores</h4>
                            {results.players.map((p: any) => (
                                <div key={p.id} className="px-4 py-2 hover:bg-slate-700 transition cursor-default">
                                    <div className="flex justify-between">
                                        <p className="text-sm font-bold text-white">{p.name}</p>
                                        <p className="text-xs text-slate-400">{p.team_name}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase">Dorsal: {p.number || '-'}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Matches */}
                    {results.matches.length > 0 && (
                        <div className="border-b border-slate-700 last:border-0">
                            <h4 className="bg-slate-900 px-3 py-2 text-xs font-bold text-blue-500 uppercase tracking-widest">Partidos</h4>
                            {results.matches.map((m: any) => (
                                <div key={m.id} className="px-4 py-2 hover:bg-slate-700 transition cursor-default">
                                    <p className="text-xs font-bold text-white text-center mb-1">{m.home_team} vs {m.away_team}</p>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                        <span>J{m.matchday}</span>
                                        <span className={`px-2 py-0.5 rounded-full ${m.status === 'played' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700'}`}>
                                            {m.status === 'played' ? `${m.home_score} - ${m.away_score}` : new Date(m.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {results.teams.length === 0 && results.players.length === 0 && results.matches.length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-sm">No se encontraron resultados</div>
                    )}
                </div>
            )}
        </div>
    );
};
