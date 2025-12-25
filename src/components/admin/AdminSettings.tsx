import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AdminSettingsProps {
    tournamentId: number;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ tournamentId }) => {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, [tournamentId]);

    const loadSettings = async () => {
        setLoading(true);
        const data = await api.getSettings(tournamentId);
        setSettings(data);
        setLoading(false);
    };

    const handleChange = (key: string, value: string) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSave = async () => {
        try {
            await api.updateSetting(tournamentId, 'points_win', settings.points_win);
            await api.updateSetting(tournamentId, 'points_draw', settings.points_draw);
            await api.updateSetting(tournamentId, 'points_loss', settings.points_loss);
            toast.success("Configuración guardada correctamente");
        } catch (e) {
            toast.error("Error al guardar configuración");
        }
    };

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <span className="text-indigo-400"><Settings className="w-8 h-8" /></span> Configuración del Torneo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                    <h3 className="text-lg font-bold text-slate-200 mb-6 border-b border-slate-700 pb-2">Sistema de Puntuación</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2">Puntos por Victoria</label>
                            <input
                                type="number"
                                className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white font-bold text-lg focus:border-indigo-500 transition"
                                value={settings.points_win || ''}
                                onChange={e => handleChange('points_win', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2">Puntos por Empate</label>
                            <input
                                type="number"
                                className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white font-bold text-lg focus:border-indigo-500 transition"
                                value={settings.points_draw || ''}
                                onChange={e => handleChange('points_draw', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm font-bold mb-2">Puntos por Derrota</label>
                            <input
                                type="number"
                                className="w-full bg-slate-700 border border-slate-600 rounded p-3 text-white font-bold text-lg focus:border-indigo-500 transition"
                                value={settings.points_loss || ''}
                                onChange={e => handleChange('points_loss', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg transition flex justify-center items-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Guardar Cambios
                        </button>
                        <p className="text-xs text-slate-500 mt-3 text-center">
                            Los cambios afectarán inmediatamente a la tabla general.
                        </p>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 dashed">
                    <h3 className="text-lg font-bold text-slate-500 mb-4">Próximamente</h3>
                    <ul className="list-disc list-inside text-slate-500 space-y-2 text-sm">
                        <li>Criterios de desempate personalizados</li>
                        <li>Duración de partidos</li>
                        <li>Límite de cambios</li>
                        <li>Costo de inscripción por defecto</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
