import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Team, Match, Player, Standing } from '../types';
import { Calendar, BarChart3, Users, Trophy, AlertTriangle, DollarSign, Settings, Download } from 'lucide-react';
import Logo from '../assets/Icono.png';
import { toast } from 'sonner';

// Subcomponents
import { AdminSchedule } from './admin/AdminSchedule';
import { AdminResults } from './admin/AdminResults';
import { AdminTeams } from './admin/AdminTeams';
import { AdminPlayoffs } from './admin/AdminPlayoffs';
import { AdminSanctions } from './admin/AdminSanctions';
import { AdminTreasury } from './admin/AdminTreasury';
import { AdminSettings } from './admin/AdminSettings';
// import { exportTournamentData } from '../utils/ExportService';

interface AdminProps {
    tournamentId: number;
}

export const Admin: React.FC<AdminProps> = ({ tournamentId }) => {
    const [tab, setTab] = useState<'schedule' | 'results' | 'teams' | 'playoffs' | 'sanctions' | 'treasury' | 'settings'>('schedule');
    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [standings, setStandings] = useState<Standing[]>([]);

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    const loadData = async () => {
        const t = await api.getTeams(tournamentId);
        setTeams(t);
        const allPlayers = await api.getPlayers();
        // Filter players that belong to teams in this tournament
        const teamIds = new Set(t.map(team => team.id));
        setPlayers(allPlayers.filter(pl => teamIds.has(pl.team_id)));

        const m = await api.getMatches(tournamentId);
        setMatches(m);
        const s = await api.getStandings(tournamentId);
        setStandings(s);
    };

    /* Export logic removed */



    return (
        <div className="min-h-screen bg-slate-900 p-6 font-sans text-gray-100">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-6 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl text-gray-100 font-extrabold uppercase tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>Liga Dominical Matutina</h1>
                    <p className="text-amber-400 font-bold text-2xl uppercase tracking-[0.2em] mt-1">Panel de Administración</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Export button removed */}
                    <div className="bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full p-1 w-24 h-24 shadow-lg shadow-amber-500/20">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-900 overflow-hidden">
                            <img src={Logo} alt="Logo" className="w-full h-full object-cover" />
                        </div>
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
                    <button
                        onClick={() => setTab('sanctions')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'sanctions' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <AlertTriangle className="w-5 h-5" /> Sanciones
                    </button>
                    <button
                        onClick={() => setTab('treasury')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'treasury' ? 'bg-amber-500 text-black shadow-amber-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <DollarSign className="w-5 h-5" /> Tesorería
                    </button>
                    <button
                        onClick={() => setTab('settings')}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-2 ${tab === 'settings' ? 'bg-indigo-500 text-white shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Settings className="w-5 h-5" /> Reglas
                    </button>
                </div>

                <div className="bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden relative min-h-[600px]">
                    {tab === 'schedule' && (
                        <AdminSchedule
                            tournamentId={tournamentId}
                            matches={matches}
                            teams={teams}
                            onUpdate={loadData}
                        />
                    )}

                    {tab === 'teams' && (
                        <AdminTeams
                            tournamentId={tournamentId}
                            teams={teams}
                            players={players}
                            standings={standings}
                            onUpdate={loadData}
                        />
                    )}

                    {tab === 'results' && (
                        <AdminResults
                            matches={matches}
                            teams={teams}
                            players={players}
                            onUpdate={loadData}
                        />
                    )}

                    {tab === 'playoffs' && (
                        <AdminPlayoffs
                            tournamentId={tournamentId}
                            onUpdate={loadData}
                        />
                    )}

                    {tab === 'sanctions' && (
                        <AdminSanctions tournamentId={tournamentId} />
                    )}

                    {tab === 'treasury' && (
                        <AdminTreasury tournamentId={tournamentId} />
                    )}

                    {tab === 'settings' && (
                        <AdminSettings tournamentId={tournamentId} />
                    )}
                </div>
            </div>
        </div>
    );
};
