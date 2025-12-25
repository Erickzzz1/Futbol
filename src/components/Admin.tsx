import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Team, Match, Player, Standing } from '../types';
import { Calendar, BarChart3, Users, Trophy, Bot, UserCheck, Edit2, Zap, AlertTriangle, ArrowLeftRight, Check, RefreshCw, Trash2, Plus, Minus, Square, ArrowLeft, Goal } from 'lucide-react';

interface AdminProps {
    tournamentId: number;
}

export const Admin: React.FC<AdminProps> = ({ tournamentId }) => {
    // Added 'playoffs' tab
    const [tab, setTab] = useState<'schedule' | 'results' | 'teams' | 'playoffs'>('schedule');
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [standings, setStandings] = useState<Standing[]>([]);

    // Schedule State
    const [homeTeamId, setHomeTeamId] = useState<number>(0);
    const [awayTeamId, setAwayTeamId] = useState<number>(0);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [scheduleMatchday, setScheduleMatchday] = useState<number>(1);

    // Team/Player Form State
    const [newTeamName, setNewTeamName] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerTeamId, setNewPlayerTeamId] = useState<number>(0);
    const [newPlayerNumber, setNewPlayerNumber] = useState<number>(0);

    // Selected Team Detail State
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');

    // Player Edit State
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [editPlayerName, setEditPlayerName] = useState('');
    const [editPlayerNumber, setEditPlayerNumber] = useState(0);
    const [editPlayerCustomGoals, setEditPlayerCustomGoals] = useState(0);
    const [editPlayerCustomFouls, setEditPlayerCustomFouls] = useState(0);

    // Results / Quick Match State
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isNewMatchMode, setIsNewMatchMode] = useState(false);
    const [resultFilterMatchday, setResultFilterMatchday] = useState<number>(0); // 0 = All

    const [entryHomeId, setEntryHomeId] = useState(0);
    const [entryAwayId, setEntryAwayId] = useState(0);
    const [entryMatchday, setEntryMatchday] = useState(1);

    // Automation Options
    const [autoStartDate, setAutoStartDate] = useState('');
    const [autoStartTime, setAutoStartTime] = useState('08:00');
    const [autoMatchDuration, setAutoMatchDuration] = useState(40);
    const [autoMatchInterval, setAutoMatchInterval] = useState(7);

    const [quarterDate, setQuarterDate] = useState(new Date().toISOString().split('T')[0]);
    const [quarterTime, setQuarterTime] = useState('20:00');
    const [semiDate, setSemiDate] = useState(new Date().toISOString().split('T')[0]);
    const [semiTime, setSemiTime] = useState('20:00');
    const [finalDate, setFinalDate] = useState(new Date().toISOString().split('T')[0]);
    const [finalTime, setFinalTime] = useState('20:00');

    const [swapSourceId, setSwapSourceId] = useState<number | null>(null);
    const [scheduleFilterMatchday, setScheduleFilterMatchday] = useState<number>(0); // 0 = All

    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [scorers, setScorers] = useState<{ playerId: number, count: number }[]>([]);
    const [foulers, setFoulers] = useState<{ playerId: number, count: number }[]>([]);

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    const loadData = async () => {
        const t = await api.getTeams(tournamentId);
        setTeams(t);
        const p = await api.getPlayers(); // Does not need tournamentId directly if filtered by team later, but ideally API filters by tournament or returns all. Current API: getPlayers(teamId?). Return ALL players if no teamId. 
        // We probably only want players for the current tournament teams.
        // But getPlayers without teamId returns ALL.
        // Let's rely on filtering or update getPlayers? 
        // Frontend filtering is safer for now if we don't want to change API signature too much.
        const allPlayers = await api.getPlayers();
        // Filter players that belong to teams in this tournament
        const teamIds = new Set(t.map(team => team.id));
        setPlayers(allPlayers.filter(pl => teamIds.has(pl.team_id)));

        const m = await api.getMatches(tournamentId);
        setMatches(m);
        const s = await api.getStandings(tournamentId);
        setStandings(s);

        // Auto-select current matchday for schedule filter
        const now = new Date();
        const upcoming = m
            .filter((match: any) => match.stage === 'regular' && match.status === 'scheduled')
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const next = upcoming.find((match: any) => new Date(match.date) >= now);

        let targetMatchday = 0;
        if (next) {
            targetMatchday = next.matchday;
        } else if (upcoming.length > 0) {
            targetMatchday = upcoming[upcoming.length - 1].matchday;
        }

        setScheduleFilterMatchday(targetMatchday);
        setResultFilterMatchday(targetMatchday);
    };

    // Derived state for filters
    const availableMatchdays = Array.from(new Set(matches.filter(m => m.stage === 'regular').map(m => m.matchday))).sort((a, b) => a - b);
    const totalMatchdays = availableMatchdays.length > 0 ? Math.max(...availableMatchdays) : 0;

    // Filter matches for the list
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

    // --- Actions ---

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
        alert('Calendario Generado Exitosamente');
        loadData();
    };

    const handleSeedPlayers = async () => {
        if (!tournamentId) return;
        if (confirm('¿Estás seguro? Esto generará jugadores aleatorios para los equipos que tengan menos de 8 jugadores.')) {
            const success = await api.seedPlayers(tournamentId);
            if (success) {
                alert('Jugadores generados correctamente');
                loadData();
            } else {
                alert('No se pudieron generar jugadores. Asegúrate de tener equipos registrados en este torneo.');
            }
        }
    };


    const handleResetTournament = async () => {
        if (confirm("¿ESTÁS SEGURO? Esto borrará TODOS los partidos, resultados y reiniciará las estadísticas de los jugadores. Los equipos y jugadores se mantendrán.")) {
            if (confirm("Confirmación final: ¿Realmente deseas borrar todo el torneo?")) {
                await api.resetTournament(tournamentId);
                alert("Torneo reiniciado correctamente.");
                loadData();
            }
        }
    };

    const handleGeneratePlayoff = async (stage: 'quarter' | 'semi' | 'final') => {
        try {
            let d = '', t = '';
            if (stage === 'quarter') { d = quarterDate; t = quarterTime; }
            if (stage === 'semi') { d = semiDate; t = semiTime; }
            if (stage === 'final') { d = finalDate; t = finalTime; }

            await api.generatePlayoffs(tournamentId, stage, d, t);
            alert(`Partidos de ${stage === 'quarter' ? 'Cuartos' : stage === 'semi' ? 'Semifinales' : 'Final'} generados.`);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error al generar (Verifica que la fase anterior esté terminada y tengas suficientes equipos)");
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
            alert('Partido Programado Correctamente');
            setHomeTeamId(0); setAwayTeamId(0); setDate(''); setTime('');
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al programar');
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
            alert('Horarios intercambiados');
            setSwapSourceId(null);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al intercambiar');
        }
    };

    const handleAddTeam = async () => {
        if (!newTeamName) return;
        await api.addTeam({ name: newTeamName }, tournamentId);
        setNewTeamName('');
        loadData();
    };

    const handleAddPlayer = async () => {
        if (!newPlayerName || !newPlayerTeamId) return;
        await api.addPlayer({ name: newPlayerName, team_id: newPlayerTeamId, number: newPlayerNumber });
        setNewPlayerName(''); setNewPlayerNumber(0);
        loadData();
    };

    const handleDeletePlayer = async (id: number) => {
        if (confirm('¿Seguro que quieres eliminar a este jugador?')) {
            await api.deletePlayer(id);
            loadData();
        }
    };

    const startEditingPlayer = (p: Player) => {
        setEditingPlayerId(p.id);
        setEditPlayerName(p.name);
        setEditPlayerNumber(p.number);
        setEditPlayerCustomGoals(p.custom_goals || 0);
        setEditPlayerCustomFouls(p.custom_fouls || 0);
    };

    const saveEditingPlayer = async () => {
        if (!editingPlayerId || !selectedTeam) return;
        await api.updatePlayer({
            id: editingPlayerId,
            team_id: selectedTeam.id,
            name: editPlayerName,
            number: editPlayerNumber,
            custom_goals: editPlayerCustomGoals,
            custom_fouls: editPlayerCustomFouls
        });
        setEditingPlayerId(null);
        loadData();
    };

    const handleUpdateTeam = async () => {
        if (!selectedTeam || !editingTeamName) return;
        await api.updateTeam({ ...selectedTeam, name: editingTeamName });
        alert('Equipo Actualizado');
        setSelectedTeam({ ...selectedTeam, name: editingTeamName });
        loadData();
    };

    const handleDeleteTeam = async () => {
        if (!selectedTeam) return;
        if (confirm(`¿ELIMINAR EQUIPO "${selectedTeam.name}"? Esto borrará también a sus jugadores.`)) {
            await api.deleteTeam(selectedTeam.id);
            setSelectedTeam(null);
            loadData();
        }
    };

    const handleSaveResult = async () => {
        if (isNewMatchMode) {
            if (!entryHomeId || !entryAwayId) { alert('Selecciona equipos'); return; }
            try {
                const d = new Date();
                const matchId = await api.addMatch({
                    home_team_id: entryHomeId,
                    away_team_id: entryAwayId,
                    matchday: entryMatchday,
                    date: d.toISOString(),
                    stage: 'regular'
                });
                await api.updateMatchScore(matchId, homeScore, awayScore, scorers, foulers);
                alert('Partido Registrado y Calculado');
                resetMatchEntry();
                loadData();
            } catch (e) {
                console.error(e);
                alert('Error al registrar');
            }
        } else {
            if (!selectedMatch) return;
            await api.updateMatchScore(selectedMatch.id, homeScore, awayScore, scorers, foulers);
            alert('Resultado Guardado');
            resetMatchEntry();
            loadData();
        }
    };

    const resetMatchEntry = () => {
        setSelectedMatch(null);
        setIsNewMatchMode(false);
        setScorers([]);
        setFoulers([]);
        setHomeScore(0);
        setAwayScore(0);
        setEntryHomeId(0);
        setEntryAwayId(0);
        // Dont reset filters usually
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

    const addFoul = (playerId: number) => {
        const existing = foulers.find(s => s.playerId === playerId);
        if (existing) {
            setFoulers(foulers.map(s => s.playerId === playerId ? { ...s, count: s.count + 1 } : s));
        } else {
            setFoulers([...foulers, { playerId, count: 1 }]);
        }
    }

    const removeFoul = (playerId: number) => {
        const existing = foulers.find(s => s.playerId === playerId);
        if (!existing) return;

        if (existing.count > 1) {
            setFoulers(foulers.map(s => s.playerId === playerId ? { ...s, count: s.count - 1 } : s));
        } else {
            setFoulers(foulers.filter(s => s.playerId !== playerId));
        }
    }

    const getTeamStats = (id: number) => standings.find(s => s.id === id);

    const currentHomeId = isNewMatchMode ? entryHomeId : selectedMatch?.home_team_id || 0;
    const currentAwayId = isNewMatchMode ? entryAwayId : selectedMatch?.away_team_id || 0;
    const currentHomeName = teams.find(t => t.id === currentHomeId)?.name || 'Local';
    const currentAwayName = teams.find(t => t.id === currentAwayId)?.name || 'Visitante';

    return (
        <div className="min-h-screen bg-slate-900 p-6 font-sans text-gray-100">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-6 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl text-gray-100 font-extrabold uppercase tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>Liga Dominical Matutina</h1>
                    <p className="text-amber-400 font-bold text-2xl uppercase tracking-[0.2em] mt-1">Panel de Administración</p>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full p-1 w-24 h-24 shadow-lg shadow-amber-500/20">
                    <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-4 border-black">
                        <span className="text-amber-500 font-black text-xs text-center leading-tight">LDM<br />Admin</span>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto">
                {/* TABS Navigation */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <button
                        onClick={() => setTab('schedule')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'schedule' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Calendar className="w-5 h-5" /> Programar
                    </button>
                    <button
                        onClick={() => setTab('results')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'results' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <BarChart3 className="w-5 h-5" /> Registrar
                    </button>
                    <button
                        onClick={() => setTab('teams')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'teams' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Users className="w-5 h-5" /> Equipos
                    </button>
                    <button
                        onClick={() => setTab('playoffs')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'playoffs' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Trophy className="w-5 h-5" /> Liguilla
                    </button>
                </div>

                <div className="bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-[600px]">
                    {/* SCHEDULE TAB */}
                    {tab === 'schedule' && (
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
                    )}

                    {/* TEAMS TAB */}
                    {tab === 'teams' && (
                        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
                            {!selectedTeam ? (
                                <>
                                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                        <span className="text-emerald-500"><Users className="w-8 h-8" /></span> Gestión de Equipos
                                    </h2>
                                    <div className="flex gap-4 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                        <input type="text" placeholder="Nombre del Equipo..." className="flex-1 p-3 border border-slate-600 rounded-lg bg-slate-800 text-white focus:ring-emerald-500 focus:border-emerald-500" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                                        <button onClick={handleAddTeam} className="bg-emerald-500 text-black px-6 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition shadow-lg shadow-emerald-500/20">Agregar Equipo</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {teams.map(t => (
                                            <div key={t.id} onClick={() => { setSelectedTeam(t); setEditingTeamName(t.name); }} className="p-4 border border-slate-700 bg-slate-800 rounded-xl hover:bg-slate-700 hover:border-emerald-500/50 flex items-center gap-3 cursor-pointer transition hover:shadow-lg hover:shadow-emerald-900/20 group">
                                                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center font-bold text-slate-500 group-hover:bg-emerald-900 group-hover:text-emerald-400 transition border border-slate-700">{t.name[0]}</div>
                                                <span className="font-semibold text-lg text-gray-200 group-hover:text-white">{t.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-slate-700">
                                        <button onClick={handleSeedPlayers} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2">
                                            <Bot className="w-5 h-5" /> Rellenar Equipos (Hasta 8 Jugadores)
                                        </button>
                                        <p className="text-xs text-slate-500 mt-2 text-center">Genera automáticamente jugadores aleatorios para completar plantillas de 8.</p>
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                                    <button onClick={() => setSelectedTeam(null)} className="mb-6 text-slate-400 hover:text-white font-bold flex items-center gap-2 transition">← Volver a Lista</button>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Editar Equipo</h3>
                                                <input type="text" className="w-full text-2xl font-bold bg-slate-900 text-white border border-slate-600 p-3 rounded-lg mb-4 focus:ring-blue-500 focus:border-blue-500" value={editingTeamName} onChange={e => setEditingTeamName(e.target.value)} />
                                                <div className="flex gap-2">
                                                    <button onClick={handleUpdateTeam} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/20">Guardar</button>
                                                    <button onClick={handleDeleteTeam} className="flex-1 bg-red-900/30 text-red-500 border border-red-900/50 py-2 rounded-lg font-bold hover:bg-red-900/50 hover:text-red-400">Eliminar</button>
                                                </div>
                                            </div>
                                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                                                <h3 className="text-lg font-bold mb-4 text-gray-200">Estadísticas</h3>
                                                {getTeamStats(selectedTeam.id) ? (
                                                    <div className="grid grid-cols-2 gap-4 text-center">
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold">Pts</div><div className="text-2xl font-black text-white">{getTeamStats(selectedTeam.id)?.PTS}</div></div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold">PJ</div><div className="text-2xl font-black text-white">{getTeamStats(selectedTeam.id)?.PJ}</div></div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold">GF</div><div className="text-2xl font-black text-white">{getTeamStats(selectedTeam.id)?.GF}</div></div>
                                                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-500 uppercase font-bold">DG</div><div className="text-2xl font-black text-white">{getTeamStats(selectedTeam.id)?.DG}</div></div>
                                                    </div>
                                                ) : <p className="text-slate-500 italic">Sin estadísticas aún</p>}
                                            </div>
                                        </div>
                                        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                                            <h3 className="text-xl font-bold text-purple-400 mb-6 flex items-center gap-3"><span className="text-purple-500"><UserCheck className="w-6 h-6" /></span> Plantilla de Jugadores</h3>
                                            <div className="bg-slate-900 rounded-xl shadow-inner border border-slate-700 overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs tracking-wider"><tr><th className="p-4">#</th><th className="p-4">Nombre</th><th className="p-4 text-center">Goles</th><th className="p-4 text-center">Faltas</th><th className="p-4 text-right">Acciones</th></tr></thead>
                                                    <tbody className="divide-y divide-slate-800">
                                                        {players.filter(p => p.team_id === selectedTeam.id).map(p => (
                                                            <tr key={p.id} className="hover:bg-slate-800/50 transition">
                                                                {editingPlayerId === p.id ? (
                                                                    <>
                                                                        <td className="p-2"><input className="w-12 bg-slate-700 text-white border border-slate-600 p-1 rounded text-center" type="number" value={editPlayerNumber} onChange={e => setEditPlayerNumber(Number(e.target.value))} /></td>
                                                                        <td className="p-2"><input className="w-full bg-slate-700 text-white border border-slate-600 p-1 rounded" type="text" value={editPlayerName} onChange={e => setEditPlayerName(e.target.value)} /></td>
                                                                        <td className="p-2 text-center"><input className="w-12 bg-slate-700 text-white border border-slate-600 p-1 rounded text-center" type="number" value={editPlayerCustomGoals} onChange={e => setEditPlayerCustomGoals(Number(e.target.value))} /></td>
                                                                        <td className="p-2 text-center"><input className="w-12 bg-slate-700 text-white border border-slate-600 p-1 rounded text-center" type="number" value={editPlayerCustomFouls} onChange={e => setEditPlayerCustomFouls(Number(e.target.value))} /></td>
                                                                        <td className="p-2 text-right space-x-2"><button onClick={saveEditingPlayer} className="text-green-400 font-bold text-sm bg-green-900/30 px-2 py-1 rounded border border-green-800 hover:bg-green-800">OK</button></td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="p-4 font-mono font-bold w-16 text-slate-500">{p.number || '-'}</td>
                                                                        <td className="p-4 font-medium text-gray-300">{p.name}</td>
                                                                        <td className="p-4 text-center font-bold text-blue-400">{p.goals}</td>
                                                                        <td className="p-4 text-center font-bold text-orange-400">{p.fouls}</td>
                                                                        <td className="p-4 text-right space-x-2">
                                                                            <button onClick={() => startEditingPlayer(p)} className="text-blue-400 font-bold text-xs uppercase hover:text-blue-300">Edit</button>
                                                                            <button onClick={() => handleDeletePlayer(p.id)} className="text-red-400 font-bold text-xs uppercase hover:text-red-300">Del</button>
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-6 p-4 bg-purple-900/20 rounded-xl border border-purple-500/20 flex gap-2">
                                                <input type="text" placeholder="Nombre Nuevo Jugador" className="flex-1 p-3 rounded-lg border border-purple-500/30 bg-slate-900/80 text-white placeholder-purple-300/50 focus:border-purple-500" value={newPlayerName} onChange={e => { setNewPlayerName(e.target.value); setNewPlayerTeamId(selectedTeam.id); }} />
                                                <input type="number" placeholder="#" className="w-24 p-3 rounded-lg border border-purple-500/30 bg-slate-900/80 text-white placeholder-purple-300/50 text-center focus:border-purple-500" value={newPlayerNumber || ''} onChange={e => setNewPlayerNumber(Number(e.target.value))} />
                                                <button onClick={handleAddPlayer} className="bg-purple-600 text-white px-6 rounded-lg font-bold hover:bg-purple-500 shadow-lg shadow-purple-600/20">Agregar</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RESULTS / QUICK MATCH TAB */}
                    {tab === 'results' && (
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
                                        {/* Filter matches: show all Scheduled matches for Regular or Playoffs */}
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
                                                        <div className="flex bg-orange-900/40 rounded-full border border-orange-900/50">
                                                            <button onClick={() => removeFoul(p.id)} className="w-8 h-8 flex items-center justify-center text-orange-600 hover:text-orange-400 font-bold border-r border-orange-900/50 hover:bg-orange-900/50 rounded-l-full transition"><Minus className="w-4 h-4" /></button>
                                                            <button onClick={() => addFoul(p.id)} className="w-8 h-8 flex items-center justify-center text-orange-400 hover:text-white font-bold hover:bg-orange-600 rounded-r-full transition"><Square className="w-4 h-4 fill-current" /></button>
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
                                                        <div className="flex bg-orange-900/40 rounded-full border border-orange-900/50">
                                                            <button onClick={() => removeFoul(p.id)} className="w-8 h-8 flex items-center justify-center text-orange-600 hover:text-orange-400 font-bold border-r border-orange-900/50 hover:bg-orange-900/50 rounded-l-full transition">-</button>
                                                            <button onClick={() => addFoul(p.id)} className="w-8 h-8 flex items-center justify-center text-orange-400 hover:text-white font-bold hover:bg-orange-600 rounded-r-full transition">🟧</button>
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
                                            {foulers.map((s, idx) => { const p = players.find(ply => ply.id === s.playerId); return <span key={`f-${idx}`} className="bg-slate-900 border border-orange-900/50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 text-orange-400"><Square className="w-3 h-3 fill-current" /> {p?.name} (x{s.count})</span> })}
                                        </div>
                                    </div>
                                    <button onClick={handleSaveResult} className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl shadow-lg hover:from-rose-500 hover:to-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed border border-rose-500/50" disabled={isNewMatchMode && (!entryHomeId || !entryAwayId)}>{isNewMatchMode ? "Registrar Partido Nuevo" : "Guardar Resultado"}</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LIGUILLA / PLAYOFFS TAB */}
                    {/* LIGUILLA / PLAYOFFS TAB */}
                    {tab === 'playoffs' && (
                        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <span className="text-amber-500"><Trophy className="w-8 h-8" /></span> Liguilla
                            </h2>

                            <div className="space-y-8">
                                {/* QUARTERS */}
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">

                                    <div className="mb-6 relative z-10 border-b border-slate-700 pb-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-black text-lg text-slate-400 uppercase tracking-widest">Cuartos de Final (Top 8)</h3>
                                            <button
                                                onClick={() => handleGeneratePlayoff('quarter')}
                                                className="bg-amber-600/80 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition shadow-lg shadow-amber-900/40 backdrop-blur-sm border border-amber-500/50"
                                            >
                                                Generar Cuartos
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Fecha</label>
                                                <input type="date" className="w-full bg-slate-900/50 text-white border-slate-600 rounded p-1 text-xs" value={quarterDate} onChange={e => setQuarterDate(e.target.value)} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Hora</label>
                                                <input type="time" className="w-full bg-slate-900/50 text-white border-slate-600 rounded p-1 text-xs" value={quarterTime} onChange={e => setQuarterTime(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        {matches.filter(m => m.stage === 'quarter').length === 0 && <p className="text-slate-500 text-sm italic">Aún no se han generado enfrentamientos.</p>}
                                        {matches.filter(m => m.stage === 'quarter').map(m => (
                                            <div key={m.id} className={`p-4 rounded-xl flex items-center justify-between border ${swapSourceId === m.id ? 'bg-amber-900/40 border-amber-500 shadow-lg scale-[1.02] ring-2 ring-amber-500' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 backdrop-blur-md`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <div className="text-xs text-slate-500 font-bold uppercase mb-1">Jornada {m.matchday}</div>
                                                        <div className="font-mono text-lg font-bold text-amber-500 bg-slate-900 border border-slate-700 px-2 py-1 rounded">
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
                                                    <button onClick={() => alert('Edición no implementada en este demo')} className="text-xs font-bold text-slate-500 hover:text-white px-3 py-1 hover:bg-slate-700/50 rounded transition">Editar</button>
                                                    <button
                                                        onClick={() => handleSwapMatches(m.id)}
                                                        className={`px-3 py-1 rounded text-xs font-bold border transition ${swapSourceId === m.id ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-amber-500 hover:text-amber-500'}`}
                                                    >
                                                        {swapSourceId === m.id ? '⚡ Seleccionado' : '🔄 Intercambiar'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* SEMIS */}
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-6xl">4️⃣</div>

                                    <div className="mb-6 relative z-10 border-b border-slate-700 pb-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-black text-lg text-slate-400 uppercase tracking-widest">Semifinales</h3>
                                            <button
                                                onClick={() => handleGeneratePlayoff('semi')}
                                                className="bg-amber-600/80 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-600 transition shadow-lg shadow-amber-900/40 backdrop-blur-sm border border-amber-500/50"
                                            >
                                                Generar Semis
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Fecha</label>
                                                <input type="date" className="w-full bg-slate-900/50 text-white border-slate-600 rounded p-1 text-xs" value={semiDate} onChange={e => setSemiDate(e.target.value)} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Hora</label>
                                                <input type="time" className="w-full bg-slate-900/50 text-white border-slate-600 rounded p-1 text-xs" value={semiTime} onChange={e => setSemiTime(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        {matches.filter(m => m.stage === 'semi').length === 0 && <p className="text-slate-500 text-sm italic">Pendiente de resultados de Cuartos.</p>}
                                        {matches.filter(m => m.stage === 'semi').map(m => (
                                            <div key={m.id} className={`p-4 rounded-xl flex items-center justify-between border ${swapSourceId === m.id ? 'bg-amber-900/40 border-amber-500 shadow-lg scale-[1.02] ring-2 ring-amber-500' : 'bg-slate-900/50 border-slate-700 hover:bg-slate-700/50'} transition-all duration-200 backdrop-blur-md`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <div className="font-mono text-lg font-bold text-amber-500 bg-slate-900 border border-slate-700 px-2 py-1 rounded">
                                                            {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">{new Date(m.date).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className="h-12 w-px bg-slate-700"></div>
                                                    <div>
                                                        <div className="font-bold text-gray-200 text-lg">{m.home_team} <span className="text-slate-500 px-2">vs</span> {m.away_team}</div>
                                                        <div className="font-mono text-sm text-amber-500 mt-1 font-bold">{m.status === 'played' ? `${m.home_score} - ${m.away_score}` : 'Por jugarse'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => handleSwapMatches(m.id)}
                                                        className={`px-3 py-1 rounded text-xs font-bold border transition ${swapSourceId === m.id ? 'bg-amber-500 text-black border-amber-500' : 'bg-transparent text-slate-400 border-slate-600 hover:border-amber-500 hover:text-amber-500'}`}
                                                    >
                                                        {swapSourceId === m.id ? '⚡ Seleccionado' : '🔄 Intercambiar'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* FINAL */}
                                <div className="bg-gradient-to-br from-amber-900/20 to-yellow-900/20 p-6 rounded-2xl border border-amber-500/30 relative overflow-hidden shadow-2xl">
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"></div>

                                    <div className="mb-6 relative z-10 border-b border-amber-500/30 pb-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-black text-2xl text-amber-400 uppercase tracking-widest drop-shadow-sm flex items-center gap-2">
                                                <span>🏆</span> Gran Final
                                            </h3>
                                            <button
                                                onClick={() => handleGeneratePlayoff('final')}
                                                className="bg-amber-500 text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 border border-amber-400 hover:scale-105"
                                            >
                                                Generar Final
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-amber-500/60 uppercase font-bold mb-1">Fecha</label>
                                                <input type="date" className="w-full bg-black/40 text-amber-400 border-amber-500/30 border rounded p-1 text-xs" value={finalDate} onChange={e => setFinalDate(e.target.value)} />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] text-amber-500/60 uppercase font-bold mb-1">Hora</label>
                                                <input type="time" className="w-full bg-black/40 text-amber-400 border-amber-500/30 border rounded p-1 text-xs" value={finalTime} onChange={e => setFinalTime(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative z-10">
                                        {matches.filter(m => m.stage === 'final').length === 0 && <p className="text-amber-500/60 text-sm italic font-medium">Pendiente de resultados de Semis.</p>}
                                        {matches.filter(m => m.stage === 'final').map(m => (
                                            <div key={m.id} className={`p-6 rounded-2xl shadow-xl flex justify-between items-center border transition-all duration-300 ${swapSourceId === m.id ? 'bg-amber-900/60 border-amber-400 border-2' : 'bg-slate-900/80 border-amber-500/30 backdrop-blur-md'}`}>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-center">
                                                        <div className="font-mono text-xl font-bold text-amber-400 bg-black/40 border border-amber-500/30 px-3 py-2 rounded-lg">
                                                            {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-xs text-amber-500/60 mt-2 font-bold uppercase">{new Date(m.date).toLocaleDateString()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-3xl text-white drop-shadow-md">{m.home_team} <span className="text-amber-600/50 mx-2 italic text-2xl">vs</span> {m.away_team}</div>
                                                        <div className="font-mono text-xl md:text-2xl font-bold text-amber-400 mt-2 flex items-center gap-2">
                                                            <span className="bg-amber-500/10 px-3 py-1 rounded border border-amber-500/20">{m.status === 'played' ? `${m.home_score} - ${m.away_score}` : 'VS'}</span>
                                                            {m.status === 'played' && <span className="text-xs uppercase bg-amber-500 text-black px-2 py-1 rounded font-bold">Finalizado</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSwapMatches(m.id)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition hover:scale-105 active:scale-95 ${swapSourceId === m.id ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/50' : 'bg-black/40 text-amber-500 border-amber-500/50 hover:bg-amber-500 hover:text-black'}`}
                                                >
                                                    {swapSourceId === m.id ? '⚡ SELECCIONADO' : '🔄 CAMBIAR FECHA'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
};
