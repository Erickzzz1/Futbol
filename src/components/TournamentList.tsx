import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Tournament } from '../types';
import Logo from '../assets/Icono.png';
import { Plus, Edit2, ArrowRight, Save, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';

interface TournamentListProps {
    onSelectTournament: (tournament: Tournament) => void;
}

const CATEGORIES = [
    { label: 'Prebenjamín: 5-7 años', value: 'Prebenjamín' },
    { label: 'Benjamín: 8-9 años', value: 'Benjamín' },
    { label: 'Alevín: 10-11 años', value: 'Alevín' },
    { label: 'Infantil: 12-13 años', value: 'Infantil' },
    { label: 'Cadete 14-15', value: 'Cadete' },
    { label: 'Juvenil 16-18', value: 'Juvenil' },
    { label: 'Libre 16 en Adelante', value: 'Libre' }
];

const TYPES = [
    'Dominical Matutino',
    'Dominical Nocturno',
    'Intersemanal Matutino',
    'Intersemanal Nocturno'
];

export const TournamentList: React.FC<TournamentListProps> = ({ onSelectTournament }) => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState<Tournament | null>(null);

    // Form State (Shared for Create/Edit)
    const [type, setType] = useState(TYPES[0]);
    const [category, setCategory] = useState(CATEGORIES[0].value);
    const [customName, setCustomName] = useState('');

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        message: string;
        action: () => void;
        isDestructive: boolean;
        confirmText?: string;
    }>({ title: '', message: '', action: () => { }, isDestructive: false });

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        const fetched = await api.getTournaments();
        setTournaments(fetched);
    };

    const startCreating = () => {
        setType(TYPES[0]);
        setCategory(CATEGORIES[0].value);
        setCustomName('');
        setIsCreating(true);
        setIsEditing(null);
    }

    const startEditing = (t: Tournament, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        setType(t.type || TYPES[0]);
        setCategory(t.category || CATEGORIES[0].value);
        setCustomName(t.name);
        setIsEditing(t);
        setIsCreating(true); // Reuse modal
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = customName || `${type} - ${category}`;

        if (isEditing) {
            await api.updateTournament({
                ...isEditing,
                name: finalName,
                type,
                category
            });
            setIsEditing(null);
        } else {
            await api.createTournament({
                name: finalName,
                type,
                category
            });
        }

        setIsCreating(false);
        loadTournaments();
        loadTournaments();
    };

    const handleBackup = async () => {
        const success = await api.backupDatabase();
        if (success) {
            toast.success('Copia de seguridad guardada correctamente');
        }
    };

    const handleRestore = async () => {
        setConfirmConfig({
            title: '¿Restaurar Base de Datos?',
            message: 'ADVERTENCIA: Esto SOBREESCRIBIRÁ todos los datos actuales por los del archivo de respaldo. Esta acción no se puede deshacer.',
            isDestructive: true,
            confirmText: 'Restaurar',
            action: async () => {
                const success = await api.restoreDatabase();
                if (success) {
                    toast.success('Base de datos restaurada. Reiniciando sistema...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    };

    const handleDelete = (t: Tournament, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmConfig({
            title: '¿Eliminar Torneo?',
            message: `Vas a eliminar "${t.name}". Se borrarán permanentemente sus equipos, jugadores y partidos.`,
            isDestructive: true,
            confirmText: 'Eliminar',
            action: async () => {
                const success = await api.deleteTournament(t.id);
                if (success) {
                    toast.success('Torneo eliminado correctamente');
                    loadTournaments();
                } else {
                    toast.error('Error al eliminar el torneo');
                }
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    }

    return (
        <div className="min-h-screen bg-slate-900 text-gray-100 p-8 font-sans">
            <header className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-slate-700 pb-6 gap-4 max-w-6xl mx-auto">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl text-gray-100 font-extrabold uppercase tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
                        Mis Torneos
                    </h1>
                    <p className="text-amber-400 font-bold text-xl uppercase tracking-[0.2em] mt-1">
                        Selecciona o Crea uno Nuevo
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackup}
                        className="bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition shadow-lg flex items-center gap-2 group font-bold text-sm"
                        title="Crear Respaldo Completo"
                    >
                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        RESPALDAR
                    </button>
                    <button
                        onClick={handleRestore}
                        className="bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition shadow-lg flex items-center gap-2 group font-bold text-sm"
                        title="Cargar Respaldo"
                    >
                        <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        IMPORTAR
                    </button>

                    <div className="h-10 w-px bg-slate-700 mx-2"></div>

                    <div className="bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full p-1 w-20 h-20 shadow-lg shadow-amber-500/20">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-900 overflow-hidden">
                            <img src={Logo} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Create New Card */}
                    <button
                        onClick={startCreating}
                        className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-amber-500 hover:bg-slate-800 transition-all group min-h-[220px] shadow-lg hover:shadow-amber-500/10"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black transition-all">
                            <Plus className="w-8 h-8 text-slate-500 group-hover:text-black" />
                        </div>
                        <span className="text-lg font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Crear Nuevo Torneo</span>
                    </button>

                    {/* Tournament List */}
                    {tournaments.map(t => (
                        <div
                            key={t.id}
                            onClick={() => onSelectTournament(t)}
                            className="bg-slate-800 rounded-2xl p-6 hover:bg-slate-750 cursor-pointer transition-all shadow-xl hover:shadow-2xl border border-slate-700 hover:border-amber-500/50 flex flex-col justify-between group relative min-h-[220px]"
                        >
                            <button
                                onClick={(e) => startEditing(t, e)}
                                className="absolute top-4 right-4 text-slate-600 hover:text-amber-400 p-2 rounded-full hover:bg-slate-900 transition-colors z-10"
                                title="Editar nombre/tipo"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleDelete(t, e)}
                                className="absolute top-4 right-14 text-slate-600 hover:text-red-500 p-2 rounded-full hover:bg-slate-900 transition-colors z-10"
                                title="Eliminar Torneo"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors pr-8">{t.name}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-900 text-slate-400 px-2 py-1 rounded text-xs font-bold uppercase border border-slate-700">Tipo</span>
                                        <span className="text-gray-300 font-semibold">{t.type || 'General'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-900 text-slate-400 px-2 py-1 rounded text-xs font-bold uppercase border border-slate-700">Cat</span>
                                        <span className="text-emerald-400 font-bold">{t.category || 'General'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-between items-end border-t border-slate-700 pt-4">
                                <span className="text-slate-500 text-xs font-bold uppercase">ID: #{t.id}</span>
                                <span className="text-amber-500 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">Entrar <ArrowRight className="w-4 h-4" /></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-600 shadow-2xl relative">
                        <h2 className="text-3xl font-black mb-8 text-white uppercase tracking-tight border-b border-slate-700 pb-4">
                            {isEditing ? <span className="text-amber-500">Editar Torneo</span> : <span className="text-emerald-500">Nuevo Torneo</span>}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre del Torneo (Opcional)</label>
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    placeholder="Ej. Torneo Verano 2024"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-bold"
                                />
                                <p className="text-xs text-slate-500 mt-2 italic">Si se deja vacío, se usará el Tipo y Categoría.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipo de Torneo</label>
                                <div className="relative">
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white appearance-none focus:outline-none focus:border-amber-500 font-semibold"
                                    >
                                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoría</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white appearance-none focus:outline-none focus:border-amber-500 font-semibold"
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreating(false); setIsEditing(null); }}
                                    className="px-6 py-3 text-slate-400 hover:text-white font-bold transition-colors uppercase text-sm tracking-wide"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`px-8 py-3 rounded-xl font-bold text-black shadow-lg hover:shadow-xl transition-all uppercase text-sm tracking-wide ${isEditing ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'}`}
                                >
                                    {isEditing ? 'Guardar Cambios' : 'Crear Torneo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.action}
                onCancel={() => setConfirmOpen(false)}
                isDestructive={confirmConfig.isDestructive}
                confirmText={confirmConfig.confirmText}
            />
        </div>
    );
};
