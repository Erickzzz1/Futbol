import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Save, AlertTriangle, Shield, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    tournamentId: number;
}

export const AdminSettings: React.FC<Props> = ({ tournamentId }) => {
    const [settings, setSettings] = useState({
        points_win: "3",
        points_draw: "1",
        points_loss: "0",
        cost_inscription: "0",
        cost_arbitration: "0"
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [tournamentId]);

    const loadSettings = async () => {
        try {
            const data = await api.getSettings(tournamentId);
            setSettings(prev => ({ ...prev, ...data }));
        } catch (e) {
            toast.error("Error al cargar reglas");
        }
    };

    const handleChange = (key: string, val: string) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await Promise.all([
                api.updateSetting(tournamentId, 'points_win', settings.points_win),
                api.updateSetting(tournamentId, 'points_draw', settings.points_draw),
                api.updateSetting(tournamentId, 'points_loss', settings.points_loss),
                api.updateSetting(tournamentId, 'cost_inscription', settings.cost_inscription),
                api.updateSetting(tournamentId, 'cost_arbitration', settings.cost_arbitration)
            ]);
            toast.success("Configuración guardada");
        } catch (e) {
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                    <Shield className="w-6 h-6 text-amber-500" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide">Reglas de Puntuación</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Puntos por Victoria</label>
                        <input
                            type="number"
                            value={settings.points_win}
                            onChange={(e) => handleChange('points_win', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg text-center"
                        />
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Puntos por Empate</label>
                        <input
                            type="number"
                            value={settings.points_draw}
                            onChange={(e) => handleChange('points_draw', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:ring-2 focus:ring-slate-500 outline-none font-mono text-lg text-center"
                        />
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Puntos por Derrota</label>
                        <input
                            type="number"
                            value={settings.points_loss}
                            onChange={(e) => handleChange('points_loss', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:ring-2 focus:ring-red-500 outline-none font-mono text-lg text-center"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
                    <DollarSign className="w-6 h-6 text-emerald-500" />
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide">Costos Automáticos</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Costo Inscripción ($)</label>
                        <input
                            type="number"
                            value={settings.cost_inscription}
                            onChange={(e) => handleChange('cost_inscription', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-lg text-center"
                        />
                        <p className="text-[10px] text-slate-500 mt-2">Costo base que se cobrará a todos los equipos.</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Costo Arbitraje ($)</label>
                        <input
                            type="number"
                            value={settings.cost_arbitration}
                            onChange={(e) => handleChange('cost_arbitration', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg text-center"
                        />
                        <p className="text-[10px] text-slate-500 mt-2">Se cobrará por partido jugado (Jornada).</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-amber-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                >
                    <Save className="w-5 h-5" />
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="flex gap-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-bold text-yellow-500 text-sm uppercase">Atención</h4>
                    <p className="text-xs text-yellow-200/80 mt-1">Los cambios en los puntos afectarán inmediatamente a la Tabla General recalculando todos los partidos jugados. Los cambios en costos se aplicarán únicamente a las nuevas generaciones de cobros.</p>
                </div>
            </div>
        </div>
    );
};
