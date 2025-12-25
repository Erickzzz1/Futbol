import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Team } from '../../types';
import { DollarSign, PlusCircle, CheckCircle, XCircle, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface TreasurySummary {
    id: number;
    name: string;
    totalDebt: number;
    payments: Payment[];
}

interface Payment {
    id: number;
    tournament_id: number;
    team_id: number;
    concept: string;
    amount: number;
    status: 'pending' | 'paid';
    date_paid?: string;
}

interface AdminTreasuryProps {
    tournamentId: number;
}

export const AdminTreasury: React.FC<AdminTreasuryProps> = ({ tournamentId }) => {
    const [summary, setSummary] = useState<TreasurySummary[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<TreasurySummary | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [settings, setSettings] = useState({ cost_inscription: "0", cost_arbitration: "0" });

    // Form State
    const [formTeamId, setFormTeamId] = useState<number>(0);
    const [concept, setConcept] = useState('');
    const [amount, setAmount] = useState(0);

    // Bulk State
    const [bulkMatchday, setBulkMatchday] = useState(1);

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    const loadData = async () => {
        const [s, t, config] = await Promise.all([
            api.getTreasurySummary(tournamentId),
            api.getTeams(tournamentId),
            api.getSettings(tournamentId)
        ]);
        setSummary(s);
        setTeams(t);
        setSettings({
            cost_inscription: config.cost_inscription || "0",
            cost_arbitration: config.cost_arbitration || "0"
        });

        // Refresh selected team if open
        if (selectedTeam) {
            const updated = s.find((x: any) => x.id === selectedTeam.id);
            if (updated) setSelectedTeam(updated);
        }
    };

    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        message: string;
        action: () => void;
        isDestructive?: boolean;
    }>({ title: '', message: '', action: () => { } });

    const openConfirm = (title: string, message: string, action: () => void, isDestructive = false) => {
        setConfirmConfig({ title, message, action, isDestructive });
        setConfirmOpen(true);
    };

    const handleConfirm = () => {
        confirmConfig.action();
        setConfirmOpen(false);
    };

    const handleBulkInscription = async () => {
        const cost = Number(settings.cost_inscription);
        if (cost <= 0) return toast.error("Configura el costo de inscripción en Reglas primero.");

        openConfirm(
            "Generación Masiva",
            `¿Estás seguro de generar el cobro de inscripción ($${cost}) a TODOS los equipos? Esto no duplicará cobros existentes.`,
            async () => {
                const success = await api.generateBulkPayments({ tournamentId, type: 'inscription', amount: cost });
                if (success) {
                    toast.success("Cobros de inscripción generados");
                    loadData();
                } else {
                    toast.error("Error al generar cobros");
                }
            }
        );
    };

    const handleBulkArbitration = async () => {
        const cost = Number(settings.cost_arbitration);
        if (cost <= 0) return toast.error("Configura el costo de arbitraje en Reglas primero.");

        openConfirm(
            "Generación Masiva",
            `¿Generar cobro de arbitraje ($${cost}) para la Jornada ${bulkMatchday}? Se aplicará a los equipos que tengan partido programado.`,
            async () => {
                const success = await api.generateBulkPayments({ tournamentId, type: 'matchday', amount: cost, matchday: bulkMatchday });
                if (success) {
                    toast.success("Cobros de arbitraje generados.");
                    loadData();
                } else {
                    toast.error("Error al generar cobros");
                }
            }
        );
    };

    const handleAddPayment = async () => {
        if (!formTeamId || !concept || amount <= 0) return toast.error("Datos incompletos");
        await api.addPaymentObligation({ tournamentId, teamId: formTeamId, concept, amount });
        toast.success("Cargo agregado correctamente");
        setConcept('');
        setAmount(0);
        loadData();
    };

    const toggleStatus = async (payment: Payment) => {
        const newStatus = payment.status === 'pending' ? 'paid' : 'pending';
        // Toggle is usually safe/quick, maybe confirm only for un-paying? Nah, toggle is fine.
        await api.updatePaymentStatus(payment.id, newStatus);
        toast.success(`Marcado como ${newStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}`);
        loadData();
    };

    const handleDelete = async (id: number) => {
        openConfirm(
            "Eliminar Cargo",
            "¿Estás seguro de eliminar este registro financiero? Esta acción no se puede deshacer.",
            async () => {
                await api.deletePayment(id);
                toast.success("Cargo eliminado");
                loadData();
            },
            true
        );
    };

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
            <ConfirmDialog
                isOpen={confirmOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
                isDestructive={confirmConfig.isDestructive}
            />
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <span className="text-amber-500"><DollarSign className="w-8 h-8" /></span> Control Económico
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Summary List */}
                <div className="lg:col-span-1 bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700 h-fit">
                    <h3 className="text-lg font-bold text-slate-200 mb-4 uppercase">Estado de Equipos</h3>
                    <div className="space-y-2">
                        {summary.map(team => (
                            <div
                                key={team.id}
                                onClick={() => setSelectedTeam(team)}
                                className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition border ${selectedTeam?.id === team.id ? 'bg-slate-700 border-amber-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                            >
                                <span className="font-semibold text-gray-200">{team.name}</span>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${team.totalDebt > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {team.totalDebt > 0 ? `-$${team.totalDebt}` : 'AL DÍA'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Details & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Bulk Actions */}
                    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-emerald-400 uppercase mb-4 flex items-center gap-2"><Zap className="w-4 h-4" /> Generación Masiva</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900/50 p-4 rounded border border-emerald-500/20">
                                <h4 className="font-bold text-white text-sm mb-1">Inscripción</h4>
                                <p className="text-xs text-slate-400 mb-3">Costo actual: ${settings.cost_inscription}</p>
                                <button
                                    onClick={handleBulkInscription}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded transition"
                                >
                                    Generar a Todos
                                </button>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded border border-blue-500/20">
                                <h4 className="font-bold text-white text-sm mb-1">Arbitraje por Jornada</h4>
                                <p className="text-xs text-slate-400 mb-3">Costo actual: ${settings.cost_arbitration}</p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={bulkMatchday}
                                        onChange={(e) => setBulkMatchday(Number(e.target.value))}
                                        className="w-16 bg-slate-800 border border-slate-600 rounded text-center text-sm text-white"
                                    />
                                    <button
                                        onClick={handleBulkArbitration}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded transition"
                                    >
                                        Generar Jornada
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add Charge Form */}
                    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Agregar Cargo</h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-xs text-slate-500 mb-1 block">Equipo</label>
                                <select
                                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                                    value={formTeamId}
                                    onChange={e => setFormTeamId(Number(e.target.value))}
                                >
                                    <option value={0}>Seleccionar Equipo...</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs text-slate-500 mb-1 block">Concepto</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                                    placeholder="Ej. Arbitraje J1"
                                    value={concept}
                                    onChange={e => setConcept(e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <label className="text-xs text-slate-500 mb-1 block">Monto ($)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                                    value={amount}
                                    onChange={e => setAmount(Number(e.target.value))}
                                />
                            </div>
                            <button
                                onClick={handleAddPayment}
                                className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 px-6 rounded transition"
                            >
                                Agregar
                            </button>
                        </div>
                    </div>

                    {selectedTeam ? (
                        <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white">{selectedTeam.name}</h3>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 uppercase">Deuda Total</p>
                                    <p className={`text-3xl font-bold ${selectedTeam.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        ${selectedTeam.totalDebt}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-500 uppercase bg-slate-700/50">
                                        <tr>
                                            <th className="px-4 py-3">Concepto</th>
                                            <th className="px-4 py-3">Monto</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTeam.payments.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center italic">No hay registros financieros.</td>
                                            </tr>
                                        )}
                                        {selectedTeam.payments.map(p => (
                                            <tr key={p.id} className="border-b border-slate-700 hover:bg-slate-700/20">
                                                <td className="px-4 py-3 font-medium text-white">{p.concept}</td>
                                                <td className="px-4 py-3 font-mono">${p.amount}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleStatus(p)}
                                                        title={p.status === 'pending' ? "Marcar Pagado" : "Marcar Pendiente"}
                                                        className={`p-1 rounded hover:bg-slate-600 transition ${p.status === 'pending' ? 'text-green-400' : 'text-amber-400'}`}
                                                    >
                                                        {p.status === 'pending' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        title="Eliminar"
                                                        className="p-1 rounded hover:bg-slate-600 text-red-400 transition"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700 border-dashed">
                            <p className="text-slate-500">Selecciona un equipo para ver su historial financiero.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
