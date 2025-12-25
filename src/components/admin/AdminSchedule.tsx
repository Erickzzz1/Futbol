import React, { useState } from 'react';
import { api } from '../../api';
import { Team, Match } from '../../types';
import { Calendar, Zap, AlertTriangle, ArrowLeftRight, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AdminScheduleProps {
    tournamentId: number;
    matches: Match[];
    teams: Team[];
    onUpdate: () => void;
}

export const AdminSchedule: React.FC<AdminScheduleProps> = ({ tournamentId, matches, teams, onUpdate }) => {
    // Schedule State
    const [homeTeamId, setHomeTeamId] = useState<number>(0);
    const [awayTeamId, setAwayTeamId] = useState<number>(0);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [scheduleMatchday, setScheduleMatchday] = useState<number>(1);

    // Automation Options
    const [autoStartDate, setAutoStartDate] = useState('');
    const [autoStartTime, setAutoStartTime] = useState('08:00');
    const [autoMatchDuration, setAutoMatchDuration] = useState(40);
    const [autoMatchInterval, setAutoMatchInterval] = useState(7);

    const [swapSourceId, setSwapSourceId] = useState<number | null>(null);
    const [scheduleFilterMatchday, setScheduleFilterMatchday] = useState<number>(0); // 0 = All

    const handleGenerateFixture = async () => {
        if (matches.filter(m => m.stage === 'regular').length > 0) {
            if (!confirm("ADVERTENCIA: Ya existen partidos regulares creados. ¿Generar calendario igual? (Podrían duplicarse)")) {
                return;
            }
        }
        await api.generateFixture(tournamentId, {
            startDate: autoStartDate,
            startTime: autoStartTime,
            matchDuration: autoMatchDuration,
            matchInterval: autoMatchInterval
        });
        toast.success('Calendario Generado Exitosamente');
        onUpdate();
    };

    const handleResetTournament = async () => {
        if (confirm("¿ESTÁS SEGURO? Esto borrará TODOS los partidos, resultados y reiniciará las estadísticas de los jugadores. Los equipos y jugadores se mantendrán.")) {
            if (confirm("Confirmación final: ¿Realmente deseas borrar todo el torneo?")) {
                await api.resetTournament(tournamentId);
                toast.success("Torneo reiniciado correctamente.");
                onUpdate();
            }
        }
    };

    const handleSchedule = async () => {
        if (!homeTeamId || !awayTeamId || !date) return;
        try {
            const d = new Date(`${date}T${time || '00:00'}`);
            await api.addMatch({
                home_team_id: homeTeamId,
                away_team_id: awayTeamId,
                date: d.toISOString(),
                matchday: scheduleMatchday,
                stage: 'regular'
            });
            toast.success('Partido Programado Correctamente');
            setHomeTeamId(0); setAwayTeamId(0); setDate(''); setTime('');
            onUpdate();
        } catch (e) {
            console.error(e);
            toast.error('Error al programar');
        }
    };

    const handleSwapMatches = async (targetId: number) => {
        if (!swapSourceId) {
            setSwapSourceId(targetId);
            return;
        }
        if (swapSourceId === targetId) {
            setSwapSourceId(null);
            return; // Cancel
        }

        if (!confirm("¿Intercambiar horario entre estos dos partidos?")) {
            setSwapSourceId(null);
            return;
        }

        try {
            await api.swapMatches(swapSourceId, targetId);
            toast.success('Horarios intercambiados');
            setSwapSourceId(null);
            onUpdate();
        } catch (e) {
            console.error(e);
            toast.error('Error al intercambiar');
        }
    };

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="text-amber-500"><Calendar className="w-8 h-8" /></span> Generador de Calendario
            </h2>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 mb-8">
                <h3 className="text-slate-400 font-bold uppercase text-xs mb-4">Opciones de Generación</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Fecha Inicio</label>
                        <input type="date" className="w-full bg-slate-700 text-white border-slate-600 rounded-lg p-2 text-sm focus:ring-amber-500 focus:border-amber-500" value={autoStartDate} onChange={e => setAutoStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Hora Inicio 1er Partido</label>
                        <input type="time" className="w-full bg-slate-700 text-white border-slate-600 rounded-lg p-2 text-sm focus:ring-amber-500 focus:border-amber-500" value={autoStartTime} onChange={e => setAutoStartTime(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Duración (min)</label>
                        <input type="number" className="w-full bg-slate-700 text-white border-slate-600 rounded-lg p-2 text-sm focus:ring-amber-500 focus:border-amber-500" value={autoMatchDuration} onChange={e => setAutoMatchDuration(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Intervalo (días)</label>
                        <input type="number" className="w-full bg-slate-700 text-white border-slate-600 rounded-lg p-2 text-sm focus:ring-amber-500 focus:border-amber-500" value={autoMatchInterval} onChange={e => setAutoMatchInterval(Number(e.target.value))} />
                    </div>
                </div>
                <div className="flex gap-4 mt-6">
                    <button onClick={handleGenerateFixture} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black px-6 py-3 rounded-lg font-bold shadow-md transition flex items-center justify-center gap-2">
                        <Zap className="w-4 h-4" /> Generar Calendario Completo
                    </button>
                    <button onClick={handleResetTournament} className="flex-1 border-2 border-red-500 text-red-400 hover:bg-red-900 font-bold py-3 rounded-lg uppercase tracking-widest text-sm transition flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Borrar Torneo
                    </button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-4 font-bold">Cuidado: Generar un nuevo calendario borrará todos los partidos existentes. Borrar torneo es irreversible.</p>
            </div>


            {/* Scheduled Matches List for Swapping */}
            <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                        <span className="text-amber-500"><Calendar className="w-6 h-6" /></span> Calendario Programado
                    </h3>
                    <select
                        className="p-2 border border-slate-600 rounded-lg bg-slate-700 font-bold text-white shadow-sm focus:ring-amber-500 focus:border-amber-500"
                        value={scheduleFilterMatchday}
                        onChange={e => setScheduleFilterMatchday(Number(e.target.value))}
                    >
                        <option value={0}>Ver Todas</option>
                        {[...new Set(matches.filter(m => m.stage === 'regular').map(m => m.matchday))].sort((a, b) => a - b).map(d => (
                            <option key={d} value={d}>Jornada {d}</option>
                        ))}
                    </select>
                </div>

                {matches.filter(m => m.stage === 'regular' && m.status === 'scheduled' && (scheduleFilterMatchday === 0 || m.matchday === scheduleFilterMatchday)).length === 0 ? (
                    <p className="text-center text-slate-500 italic py-8">No hay partidos programados para mostrar.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {matches.filter(m => m.stage === 'regular' && m.status === 'scheduled' && (scheduleFilterMatchday === 0 || m.matchday === scheduleFilterMatchday)).map(m => (
                            <div key={m.id} className={`p-4 rounded-xl flex items-center justify-between border ${swapSourceId === m.id ? 'bg-amber-900/40 border-amber-500 shadow-lg scale-[1.02] ring-2 ring-amber-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'} transition-all duration-200`}>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Jornada {m.matchday}</div>
                                        <div className="font-mono text-lg font-bold text-amber-500 bg-slate-900/50 border border-slate-700 px-2 py-1 rounded">
                                            {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{new Date(m.date).toLocaleDateString()}</div>
                                    </div>
                                    <div className="h-12 w-px bg-slate-700"></div>
                                    <div className="space-y-1">
                                        <div className="font-bold text-gray-200 text-lg">{teams.find(t => t.id === m.home_team_id)?.name} <span className="text-slate-500 mx-1">vs</span> {teams.find(t => t.id === m.away_team_id)?.name}</div>
                                        {swapSourceId && swapSourceId !== m.id && (
                                            <div className="text-xs text-amber-400 font-bold animate-pulse">Click para intercambiar con este partido</div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleSwapMatches(m.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 transition-all ${swapSourceId === m.id ? 'bg-amber-500 text-black border-amber-500 shadow-md transform scale-105' : 'bg-slate-900 text-slate-400 border-slate-600 hover:border-amber-500 hover:text-amber-500'}`}
                                    >
                                        {swapSourceId === m.id ? <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Seleccionado</span> : <span className="flex items-center gap-1"><ArrowLeftRight className="w-4 h-4" /> Intercambiar</span>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};
