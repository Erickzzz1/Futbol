import React, { useState } from 'react';
import { api } from '../../api';
import { Team, Match, Player } from '../../types';
import { BarChart3, Edit2, ArrowLeft, Goal, Square, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface AdminResultsProps {
    matches: Match[];
    teams: Team[];
    players: Player[];
    onUpdate: () => void;
}

export const AdminResults: React.FC<AdminResultsProps> = ({ matches, teams, players, onUpdate }) => {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isNewMatchMode, setIsNewMatchMode] = useState(false);
    const [resultFilterMatchday, setResultFilterMatchday] = useState<number>(0); // 0 = All

    const [entryHomeId, setEntryHomeId] = useState(0);
    const [entryAwayId, setEntryAwayId] = useState(0);
    const [entryMatchday, setEntryMatchday] = useState(1);

    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [scorers, setScorers] = useState<{ playerId: number, count: number }[]>([]);
    const [cards, setCards] = useState<{ playerId: number, type: 'yellow' | 'red', count: number }[]>([]);

    const availableMatchdays = Array.from(new Set(matches.filter(m => m.stage === 'regular').map(m => m.matchday))).sort((a, b) => a - b);
    const totalMatchdays = availableMatchdays.length > 0 ? Math.max(...availableMatchdays) : 0;

    // Auto-Select Current Matchday on init
    React.useEffect(() => {
        if (resultFilterMatchday === 0 && availableMatchdays.length > 0) {
            // Find the first matchday with pending matches
            const pendingMatchday = availableMatchdays.find(d => matches.some(m => m.matchday === d && m.stage === 'regular' && m.status === 'scheduled'));
            // If there's a pending matchday, select it. Otherwise select the last one.
            if (pendingMatchday) setResultFilterMatchday(pendingMatchday);
            else setResultFilterMatchday(availableMatchdays[availableMatchdays.length - 1]);
        }
    }, [matches, availableMatchdays]);

    const filteredMatches = matches.filter(m => {
        if (m.status !== 'scheduled') return false; // Only show pending/scheduled
        if (resultFilterMatchday > 0 && m.stage === 'regular' && m.matchday !== resultFilterMatchday) return false;
        return true;
    });

    const playedMatches = matches.filter(m => {
        if (m.status !== 'played') return false;
        if (resultFilterMatchday > 0 && m.stage === 'regular' && m.matchday !== resultFilterMatchday) return false;
        return true;
    });

    const handleSaveResult = async () => {
        if (isNewMatchMode) {
            if (!entryHomeId || !entryAwayId) { toast.error('Selecciona equipos'); return; }
            try {
                const d = new Date();
                const matchId = await api.addMatch({
                    home_team_id: entryHomeId,
                    away_team_id: entryAwayId,
                    matchday: entryMatchday,
                    date: d.toISOString(),
                    stage: 'regular'
                });
                await api.updateMatchScore(matchId, homeScore, awayScore, scorers, cards);
                toast.success('Partido Registrado y Calculado');
                resetMatchEntry();
                onUpdate();
            } catch (e) {
                console.error(e);
                toast.error('Error al registrar');
            }
        } else {
            if (!selectedMatch) return;
            await api.updateMatchScore(selectedMatch.id, homeScore, awayScore, scorers, cards);
            toast.success('Resultado Guardado');
            resetMatchEntry();
            onUpdate();
        }
    };

    const resetMatchEntry = () => {
        setSelectedMatch(null);
        setIsNewMatchMode(false);
        setScorers([]);
        setCards([]);
        setHomeScore(0);
        setAwayScore(0);
        setEntryHomeId(0);
        setEntryAwayId(0);
    };

    const addGoal = (teamId: number, playerId: number) => {
        const newEvent = { playerId, count: 1 };
        const existing = scorers.find(s => s.playerId === playerId);
        if (existing) {
            setScorers(scorers.map(s => s.playerId === playerId ? { ...s, count: s.count + 1 } : s));
        } else {
            setScorers([...scorers, newEvent]);
        }

        if (isNewMatchMode) {
            if (teamId === entryHomeId) setHomeScore(homeScore + 1);
            else if (teamId === entryAwayId) setAwayScore(awayScore + 1);
        } else if (selectedMatch) {
            if (teamId === selectedMatch.home_team_id) setHomeScore(homeScore + 1);
            else if (teamId === selectedMatch.away_team_id) setAwayScore(awayScore + 1);
        }
    };

    const removeGoal = (teamId: number, playerId: number) => {
        const existing = scorers.find(s => s.playerId === playerId);
        if (!existing) return;

        if (existing.count > 1) {
            setScorers(scorers.map(s => s.playerId === playerId ? { ...s, count: s.count - 1 } : s));
        } else {
            setScorers(scorers.filter(s => s.playerId !== playerId));
        }

        if (isNewMatchMode) {
            if (teamId === entryHomeId) setHomeScore(Math.max(0, homeScore - 1));
            else if (teamId === entryAwayId) setAwayScore(Math.max(0, awayScore - 1));
        } else if (selectedMatch) {
            if (teamId === selectedMatch.home_team_id) setHomeScore(Math.max(0, homeScore - 1));
            else if (teamId === selectedMatch.away_team_id) setAwayScore(Math.max(0, awayScore - 1));
        }
    };

    const addCard = (playerId: number, type: 'yellow' | 'red') => {
        const existing = cards.find(c => c.playerId === playerId && c.type === type);
        if (existing) {
            setCards(cards.map(c => (c.playerId === playerId && c.type === type) ? { ...c, count: c.count + 1 } : c));
        } else {
            setCards([...cards, { playerId, type, count: 1 }]);
        }
    }

    const removeCard = (playerId: number, type: 'yellow' | 'red') => {
        const existing = cards.find(c => c.playerId === playerId && c.type === type);
        if (!existing) return;

        if (existing.count > 1) {
            setCards(cards.map(c => (c.playerId === playerId && c.type === type) ? { ...c, count: c.count - 1 } : c));
        } else {
            setCards(cards.filter(c => !(c.playerId === playerId && c.type === type)));
        }
    }

    const currentHomeId = isNewMatchMode ? entryHomeId : selectedMatch?.home_team_id || 0;
    const currentAwayId = isNewMatchMode ? entryAwayId : selectedMatch?.away_team_id || 0;
    const currentHomeName = teams.find(t => t.id === currentHomeId)?.name || 'Local';
    const currentAwayName = teams.find(t => t.id === currentAwayId)?.name || 'Visitante';

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-rose-500"><BarChart3 className="w-8 h-8" /></span> Motor de Resultados
                </h2>
                {!selectedMatch && !isNewMatchMode && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400 uppercase">Jornadas: {totalMatchdays}</span>
                        <select
                            className="p-2 border border-slate-600 rounded-lg bg-slate-700 font-bold text-white shadow-sm focus:ring-rose-500 focus:border-rose-500"
                            value={resultFilterMatchday}
                            onChange={e => setResultFilterMatchday(Number(e.target.value))}
                        >
                            <option value={0}>Ver Todas</option>
                            {availableMatchdays.map(d => (
                                <option key={d} value={d}>Jornada {d}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {!selectedMatch && !isNewMatchMode ? (
                <div className="space-y-6">

                    <div>
                        <h3 className="text-slate-400 font-bold uppercase text-xs mb-4 mt-8 flex justify-between border-b border-slate-700 pb-2">
                            <span>Pendientes {resultFilterMatchday > 0 ? `(Jornada ${resultFilterMatchday})` : '(Todas)'}</span>
                            <span className="bg-slate-700 text-slate-300 px-2 rounded-full text-[10px] flex items-center border border-slate-600">{filteredMatches.length}</span>
                        </h3>
                        {filteredMatches.length === 0 && <p className="text-center text-slate-500 py-10 italic">No hay partidos pendientes para mostrar con este filtro.</p>}
                        {filteredMatches.map(m => (
                            <div key={m.id} onClick={() => setSelectedMatch(m)} className="p-4 border border-slate-700 bg-slate-800 rounded-xl hover:bg-slate-700 cursor-pointer flex justify-between items-center group transition mb-2 shadow-sm hover:shadow-md">
                                <div className="font-bold text-gray-200">
                                    <span className={`px-2 py-1 rounded text-xs mr-2 text-white ${m.stage === 'regular' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                                        {m.stage === 'regular' ? `J${m.matchday}` : m.stage.toUpperCase()}
                                    </span>
                                    {m.home_team} <span className="text-slate-500 mx-2">vs</span> {m.away_team}
                                </div>
                                <button className="text-blue-400 font-semibold text-sm group-hover:text-white transition">Capturar ›</button>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-700 pt-8 mt-4">
                        <h3 className="text-slate-400 font-bold uppercase text-xs mb-4 flex justify-between border-b border-slate-700 pb-2">
                            <span>Resultados Registrados {resultFilterMatchday > 0 ? `(Jornada ${resultFilterMatchday})` : '(Todas)'}</span>
                            <span className="bg-emerald-900/30 text-emerald-400 px-2 rounded-full text-[10px] flex items-center border border-emerald-900/50">{playedMatches.length}</span>
                        </h3>
                        {playedMatches.length === 0 && <p className="text-center text-slate-500 py-4 text-xs italic">No hay resultados registrados en este filtro.</p>}
                        {playedMatches.map(m => (
                            <div key={m.id} onClick={() => setSelectedMatch(m)} className="p-4 border border-emerald-900/30 bg-emerald-900/10 rounded-xl hover:bg-emerald-900/20 cursor-pointer flex justify-between items-center group transition mb-2">
                                <div className="font-bold text-gray-200 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs text-white w-fit ${m.stage === 'regular' ? 'bg-slate-600' : 'bg-rose-600'}`}>
                                        {m.stage === 'regular' ? `J${m.matchday}` : m.stage.toUpperCase()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span>{m.home_team}</span>
                                        <span className="px-2 py-1 bg-slate-900 border border-slate-600 rounded font-black text-lg shadow-inner text-emerald-400">{m.home_score} - {m.away_score}</span>
                                        <span>{m.away_team}</span>
                                    </div>
                                </div>
                                <button className="text-emerald-500 font-semibold text-sm group-hover:text-emerald-300 flex items-center gap-1 transition">
                                    <Edit2 className="w-4 h-4" /> Editar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <button onClick={resetMatchEntry} className="text-sm text-slate-400 mb-4 hover:text-white transition font-bold flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Cancelar / Volver</button>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6 shadow-2xl">
                        {isNewMatchMode ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div><label className="text-xs uppercase font-bold text-slate-500">Jornada</label><select className="w-full p-2 rounded border border-slate-600 bg-slate-700 text-white" value={entryMatchday} onChange={e => setEntryMatchday(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => <option key={d} value={d}>Jornada {d}</option>)}</select></div>
                                <div><label className="text-xs uppercase font-bold text-slate-500">Local</label><select className="w-full p-2 rounded border border-slate-600 bg-slate-700 text-white font-bold" value={entryHomeId} onChange={e => setEntryHomeId(Number(e.target.value))}><option value={0}>Seleccionar...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                                <div><label className="text-xs uppercase font-bold text-slate-500">Visitante</label><select className="w-full p-2 rounded border border-slate-600 bg-slate-700 text-white font-bold" value={entryAwayId} onChange={e => setEntryAwayId(Number(e.target.value))}><option value={0}>Seleccionar...</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                            </div>
                        ) : (
                            <div className="text-center"><span className="bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{selectedMatch?.stage === 'regular' ? `Jornada ${selectedMatch?.matchday}` : selectedMatch?.stage}</span></div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mb-8 px-4">
                        <div className="text-center w-1/3"><h3 className="text-2xl font-black text-gray-100">{currentHomeName}</h3><div className="text-6xl font-mono font-bold text-rose-500 my-2 drop-shadow-lg">{homeScore}</div></div>
                        <div className="text-center text-slate-600 font-bold text-2xl">VS</div>
                        <div className="text-center w-1/3"><h3 className="text-2xl font-black text-gray-100">{currentAwayName}</h3><div className="text-6xl font-mono font-bold text-rose-500 my-2 drop-shadow-lg">{awayScore}</div></div>
                    </div>
                    {(currentHomeId > 0 && currentAwayId > 0) && (
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="bg-slate-800 p-4 rounded-xl border border-blue-900/30 shadow-lg">
                                <h4 className="font-bold text-sm uppercase text-slate-500 mb-3 border-b border-slate-700 pb-2">{currentHomeName}</h4>
                                <div className="h-60 overflow-y-auto mb-3 custom-scrollbar pr-2">{players.filter(p => p.team_id === currentHomeId).map(p => (<div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-700 rounded text-sm mb-1 transition border border-transparent hover:border-slate-600">
                                    <span className="text-gray-300">{p.name} <span className="text-slate-500 text-xs">#{p.number}</span></span>
                                    <div className="flex gap-1">
                                        <div className="flex bg-emerald-900/40 rounded-full border border-emerald-900/50">
                                            <button onClick={() => removeGoal(currentHomeId, p.id)} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:text-emerald-400 font-bold border-r border-emerald-900/50 hover:bg-emerald-900/50 rounded-l-full transition"><Minus className="w-4 h-4" /></button>
                                            <button onClick={() => addGoal(currentHomeId, p.id)} className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:text-white font-bold hover:bg-emerald-600 rounded-r-full transition"><Goal className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex bg-yellow-900/40 rounded-full border border-yellow-900/50 mr-1">
                                            <button onClick={() => removeCard(p.id, 'yellow')} className="w-8 h-8 flex items-center justify-center text-yellow-600 hover:text-yellow-400 font-bold border-r border-yellow-900/50 hover:bg-yellow-900/50 rounded-l-full transition"><Minus className="w-3 h-3" /></button>
                                            <button onClick={() => addCard(p.id, 'yellow')} className="w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-white font-bold hover:bg-yellow-600 rounded-r-full transition"><Square className="w-3 h-3 fill-current" /></button>
                                        </div>
                                        <div className="flex bg-red-900/40 rounded-full border border-red-900/50">
                                            <button onClick={() => removeCard(p.id, 'red')} className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-400 font-bold border-r border-red-900/50 hover:bg-red-900/50 rounded-l-full transition"><Minus className="w-3 h-3" /></button>
                                            <button onClick={() => addCard(p.id, 'red')} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-white font-bold hover:bg-red-600 rounded-r-full transition"><Square className="w-3 h-3 fill-current" /></button>
                                        </div>
                                    </div>
                                </div>))}</div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-xl border border-red-900/30 shadow-lg">
                                <h4 className="font-bold text-sm uppercase text-slate-500 mb-3 border-b border-slate-700 pb-2">{currentAwayName}</h4>
                                <div className="h-60 overflow-y-auto mb-3 custom-scrollbar pr-2">{players.filter(p => p.team_id === currentAwayId).map(p => (<div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-700 rounded text-sm mb-1 transition border border-transparent hover:border-slate-600">
                                    <span className="text-gray-300">{p.name} <span className="text-slate-500 text-xs">#{p.number}</span></span>
                                    <div className="flex gap-1">
                                        <div className="flex bg-emerald-900/40 rounded-full border border-emerald-900/50">
                                            <button onClick={() => removeGoal(currentAwayId, p.id)} className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:text-emerald-400 font-bold border-r border-emerald-900/50 hover:bg-emerald-900/50 rounded-l-full transition"><Minus className="w-4 h-4" /></button>
                                            <button onClick={() => addGoal(currentAwayId, p.id)} className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:text-white font-bold hover:bg-emerald-600 rounded-r-full transition"><Goal className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex bg-yellow-900/40 rounded-full border border-yellow-900/50 mr-1">
                                            <button onClick={() => removeCard(p.id, 'yellow')} className="w-8 h-8 flex items-center justify-center text-yellow-600 hover:text-yellow-400 font-bold border-r border-yellow-900/50 hover:bg-yellow-900/50 rounded-l-full transition"><Minus className="w-3 h-3" /></button>
                                            <button onClick={() => addCard(p.id, 'yellow')} className="w-8 h-8 flex items-center justify-center text-yellow-400 hover:text-white font-bold hover:bg-yellow-600 rounded-r-full transition"><Square className="w-3 h-3 fill-current" /></button>
                                        </div>
                                        <div className="flex bg-red-900/40 rounded-full border border-red-900/50">
                                            <button onClick={() => removeCard(p.id, 'red')} className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-400 font-bold border-r border-red-900/50 hover:bg-red-900/50 rounded-l-full transition"><Minus className="w-3 h-3" /></button>
                                            <button onClick={() => addCard(p.id, 'red')} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-white font-bold hover:bg-red-600 rounded-r-full transition"><Square className="w-3 h-3 fill-current" /></button>
                                        </div>
                                    </div>
                                </div>))}</div>
                            </div>
                        </div>
                    )}
                    <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700 shadow-lg">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen:</h4>
                        <div className="flex flex-wrap gap-2">
                            {scorers.map((s, idx) => { const p = players.find(ply => ply.id === s.playerId); return <span key={`g-${idx}`} className="bg-slate-900 border border-emerald-900/50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 text-emerald-400"><Goal className="w-3 h-3" /> {p?.name} (x{s.count})</span> })}
                            {cards.map((s, idx) => { const p = players.find(ply => ply.id === s.playerId); return <span key={`c-${idx}`} className={`bg-slate-900 border px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${s.type === 'yellow' ? 'border-yellow-900/50 text-yellow-400' : 'border-red-900/50 text-red-400'}`}><Square className="w-3 h-3 fill-current" /> {p?.name} {s.count > 1 ? `(x${s.count})` : ''}</span> })}
                        </div>
                    </div>
                    <button onClick={handleSaveResult} className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl shadow-lg hover:from-rose-500 hover:to-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed border border-rose-500/50" disabled={isNewMatchMode && (!entryHomeId || !entryAwayId)}>{isNewMatchMode ? "Registrar Partido Nuevo" : "Guardar Resultado"}</button>
                </div>
            )}
        </div>
    );
};
