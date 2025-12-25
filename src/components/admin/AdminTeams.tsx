import React, { useState } from 'react';
import { Team, Player, Standing } from '../../types';
import { Users, Bot, UserCheck } from 'lucide-react';
import { api } from '../../api';
import { toast } from 'sonner';

interface AdminTeamsProps {
    tournamentId: number;
    teams: Team[];
    players: Player[];
    standings: Standing[];
    onUpdate: () => void;
}

export const AdminTeams: React.FC<AdminTeamsProps> = ({ tournamentId, teams, players, standings, onUpdate }) => {
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [editingTeamName, setEditingTeamName] = useState('');

    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState<number>(0);

    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [editPlayerName, setEditPlayerName] = useState('');
    const [editPlayerNumber, setEditPlayerNumber] = useState(0);
    const [editPlayerCustomGoals, setEditPlayerCustomGoals] = useState(0);
    const [editPlayerCustomFouls, setEditPlayerCustomFouls] = useState(0);

    const handleAddTeam = async () => {
        if (!newTeamName) return;
        await api.addTeam({ name: newTeamName }, tournamentId);
        setNewTeamName('');
        onUpdate();
    };

    const handleUpdateTeam = async () => {
        if (!selectedTeam || !editingTeamName) return;
        await api.updateTeam({ ...selectedTeam, name: editingTeamName });
        toast.success('Equipo Actualizado');
        setSelectedTeam({ ...selectedTeam, name: editingTeamName });
        onUpdate();
    };

    const handleDeleteTeam = async () => {
        if (!selectedTeam) return;
        if (confirm(`¿ELIMINAR EQUIPO "${selectedTeam.name}"? Esto borrará también a sus jugadores.`)) {
            await api.deleteTeam(selectedTeam.id);
            setSelectedTeam(null);
            onUpdate();
        }
    };

    const handleSeedPlayers = async () => {
        if (!tournamentId) return;
        if (confirm('¿Estás seguro? Esto generará jugadores aleatorios para los equipos que tengan menos de 8 jugadores.')) {
            const success = await api.seedPlayers(tournamentId);
            if (success) {
                toast.success('Jugadores generados correctamente');
                onUpdate();
            } else {
                toast.error('No se pudieron generar jugadores. Asegúrate de tener equipos registrados en este torneo.');
            }
        }
    };

    const handleAddPlayer = async () => {
        if (!newPlayerName || !selectedTeam) return;
        await api.addPlayer({ name: newPlayerName, team_id: selectedTeam.id, number: newPlayerNumber });
        setNewPlayerName(''); setNewPlayerNumber(0);
        onUpdate();
    };

    const handleDeletePlayer = async (id: number) => {
        if (confirm('¿Seguro que quieres eliminar a este jugador?')) {
            await api.deletePlayer(id);
            onUpdate();
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
        onUpdate();
    };

    const getTeamStats = (id: number) => standings.find(s => s.id === id);

    if (!selectedTeam) {
        return (
            <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
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
            </div>
        );
    }

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
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
                            <input type="text" placeholder="Nombre Nuevo Jugador" className="flex-1 p-3 rounded-lg border border-purple-500/30 bg-slate-900/80 text-white placeholder-purple-300/50 focus:border-purple-500" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} />
                            <input type="number" placeholder="#" className="w-24 p-3 rounded-lg border border-purple-500/30 bg-slate-900/80 text-white placeholder-purple-300/50 text-center focus:border-purple-500" value={newPlayerNumber || ''} onChange={e => setNewPlayerNumber(Number(e.target.value))} />
                            <button onClick={handleAddPlayer} className="bg-purple-600 text-white px-6 rounded-lg font-bold hover:bg-purple-500 shadow-lg shadow-purple-600/20">Agregar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
