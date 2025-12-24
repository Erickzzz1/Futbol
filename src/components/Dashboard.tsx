import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { StandingsTable } from './StandingsTable';
import { ScorersTable } from './ScorersTable';
import { MatchResultsTable } from './MatchResultsTable';
import { UpcomingMatchesTable } from './UpcomingMatchesTable';
import { Standing, Scorer, Match } from '../types';

export const Dashboard: React.FC = () => {
    const [standings, setStandings] = useState<Standing[]>([]);
    const [scorers, setScorers] = useState<Scorer[]>([]);
    const [results, setResults] = useState<Match[]>([]);
    const [upcoming, setUpcoming] = useState<Match[]>([]);
    const [filterJornada, setFilterJornada] = useState<string | number>('all');
    const [availableFilters, setAvailableFilters] = useState<{ value: string | number, label: string }[]>([]);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Auto-refresh
        return () => clearInterval(interval);
    }, [filterJornada]);

    const loadData = async () => {
        try {
            // Parallel fetch for speed
            const [s, sc, allMatchesRaw] = await Promise.all([
                api.getStandings(),
                api.getTopScorers(),
                api.getMatches() // Get ALL matches to determine structure
            ]);

            setStandings(s);
            setScorers(sc);

            // 1. Calculate available filters (Regular matchdays + Playoff stages)
            const filters: { value: string | number, label: string }[] = [];

            // Regular Matchdays
            const regularDays = Array.from(new Set(allMatchesRaw.filter(m => m.stage === 'regular').map(m => m.matchday))).sort((a, b) => a - b);
            regularDays.forEach(d => filters.push({ value: d, label: `Jornada ${d}` }));

            // Playoff Stages (only if matches exist)
            if (allMatchesRaw.some(m => m.stage === 'quarter')) filters.push({ value: 'quarter', label: 'Cuartos de Final' });
            if (allMatchesRaw.some(m => m.stage === 'semi')) filters.push({ value: 'semi', label: 'Semifinales' });
            if (allMatchesRaw.some(m => m.stage === 'final')) filters.push({ value: 'final', label: 'Gran Final' });

            setAvailableFilters(filters);

            // 2. Filter for Results Table
            let displayMatches = allMatchesRaw;
            if (filterJornada !== 'all') {
                if (typeof filterJornada === 'number') {
                    displayMatches = allMatchesRaw.filter(m => m.matchday === filterJornada && m.stage === 'regular');
                } else {
                    displayMatches = allMatchesRaw.filter(m => m.stage === filterJornada);
                }
            }
            // Sort results: most recent played first
            const played = displayMatches.filter(m => m.status === 'played').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setResults(played);

            // 3. Upcoming Logic used for Auto-Select only (Table display logic is separate below)
            const scheduled = allMatchesRaw.filter(m => m.status === 'scheduled')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // 4. Update Upcoming Table Data
            let nextMatches: Match[] = [];
            if (scheduled.length > 0) {
                const nextMatch = scheduled[0];
                // If regular, filter by matchday. If playoff, filter by stage.
                if (nextMatch.stage === 'regular') {
                    nextMatches = scheduled.filter(m => m.matchday === nextMatch.matchday && m.stage === 'regular');
                } else {
                    nextMatches = scheduled.filter(m => m.stage === nextMatch.stage);
                }
            }
            setUpcoming(nextMatches);

        } catch (e) {
            console.error("Failed to load data", e);
        }

    };

    // Ref to track if we've initialized the filter
    const initializedRef = React.useRef(false);

    useEffect(() => {
        if (availableFilters.length > 0 && !initializedRef.current) {
            // Prioritize showing the LATEST RESULTS (Previous Matchday)
            // If there are results (matches with status 'played'), show that matchday/stage.
            // 'results' contains all played matches (since filter is 'all' initially) sorted by date DESC.
            if (results.length > 0) {
                const lastPlayed = results[0];
                if (lastPlayed.stage === 'regular') setFilterJornada(lastPlayed.matchday);
                else setFilterJornada(lastPlayed.stage);
            } else if (upcoming.length > 0) {
                // If no games played yet, show the upcoming one
                const next = upcoming[0];
                if (next.stage === 'regular') setFilterJornada(next.matchday);
                else setFilterJornada(next.stage);
            } else if (availableFilters.length > 0) {
                // Fallback
                setFilterJornada(availableFilters[availableFilters.length - 1].value);
            }
            initializedRef.current = true;
        }
    }, [availableFilters, upcoming, results]); // Dependencies updated

    const getFilterLabel = (val: string | number) => {
        if (val === 'all') return "Historial Completo";
        const found = availableFilters.find(f => f.value === val);
        return found ? `Resultados - ${found.label}` : "Resultados";
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6 font-sans text-gray-100">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-6 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl text-gray-100 font-extrabold uppercase tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>Liga Dominical Matutina</h1>
                    <p className="text-amber-400 font-bold text-2xl uppercase tracking-[0.2em] mt-1">Luis Nieto</p>
                </div>

                <div className="bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full p-1 w-24 h-24 shadow-lg shadow-amber-500/20">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-4 border-black">
                        <span className="text-amber-500 font-black text-xs text-center leading-tight">LDM<br />LN</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Standings (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <StandingsTable standings={standings} />
                    </div>

                    <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-100 uppercase tracking-wide">Resultados</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-bold uppercase hidden sm:inline">Filtrar:</span>
                                <div className="relative">
                                    <select
                                        className="bg-slate-700 text-white border border-slate-600 pl-3 pr-8 py-1 rounded text-sm appearance-none cursor-pointer focus:ring-1 focus:ring-amber-500 hover:border-amber-400 transition"
                                        value={filterJornada}
                                        onChange={e => {
                                            const val = e.target.value;
                                            // Determine if it's a number (jornada) or string (stage)
                                            // "all", "quarter", "semi", "final" are strings. Numbers are numbers.
                                            // e.target.value is always string.
                                            if (val === 'all' || val === 'quarter' || val === 'semi' || val === 'final') {
                                                setFilterJornada(val);
                                            } else {
                                                setFilterJornada(Number(val));
                                            }
                                        }}
                                    >
                                        <option value="all">Todas</option>
                                        {availableFilters.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <MatchResultsTable matches={results} title={getFilterLabel(filterJornada)} />
                    </div>
                </div>

                {/* Right Column: Scorers & Upcoming (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-8">
                    <div className="bg-slate-800 rounded-xl p-1 shadow-2xl border border-slate-700 overflow-hidden">
                        <ScorersTable scorers={scorers} />
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 shadow-2xl border border-slate-700">
                        <UpcomingMatchesTable matches={upcoming} title={upcoming.length > 0 ? (upcoming[0].stage === 'regular' ? `Próximamente: Jornada ${upcoming[0].matchday}` : `Próximamente: ${upcoming[0].stage === 'quarter' ? 'Cuartos de Final' : upcoming[0].stage === 'semi' ? 'Semifinales' : 'Gran Final'}`) : "Próximos Encuentros"} />
                    </div>
                </div>
            </div>
        </div>
    );
};
