import React, { useState } from 'react';
import { api } from '../../api';
import { Trophy, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPlayoffsProps {
    tournamentId: number;
    onUpdate: () => void;
}

export const AdminPlayoffs: React.FC<AdminPlayoffsProps> = ({ tournamentId, onUpdate }) => {
    const [quarterDate, setQuarterDate] = useState(new Date().toISOString().split('T')[0]);
    const [quarterTime, setQuarterTime] = useState('20:00');
    const [semiDate, setSemiDate] = useState(new Date().toISOString().split('T')[0]);
    const [semiTime, setSemiTime] = useState('20:00');
    const [finalDate, setFinalDate] = useState(new Date().toISOString().split('T')[0]);
    const [finalTime, setFinalTime] = useState('20:00');

    const handleGeneratePlayoff = async (stage: 'quarter' | 'semi' | 'final') => {
        try {
            let d = '', t = '';
            if (stage === 'quarter') { d = quarterDate; t = quarterTime; }
            if (stage === 'semi') { d = semiDate; t = semiTime; }
            if (stage === 'final') { d = finalDate; t = finalTime; }

            await api.generatePlayoffs(tournamentId, stage, d, t);
            toast.success(`Partidos de ${stage === 'quarter' ? 'Cuartos' : stage === 'semi' ? 'Semifinales' : 'Final'} generados.`);
            onUpdate();
        } catch (e) {
            console.error(e);
            toast.error("Error al generar (Verifica que la fase anterior esté terminada y tengas suficientes equipos)");
        }
    };

    return (
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
                                <input type="date" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={quarterDate} onChange={e => setQuarterDate(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Hora Inicio</label>
                                <input type="time" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={quarterTime} onChange={e => setQuarterTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEMIS */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
                    <div className="mb-6 relative z-10 border-b border-slate-700 pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-lg text-slate-400 uppercase tracking-widest">Semifinales (Top 4)</h3>
                            <button
                                onClick={() => handleGeneratePlayoff('semi')}
                                className="bg-indigo-600/80 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-600 transition shadow-lg shadow-indigo-900/40 backdrop-blur-sm border border-indigo-500/50"
                            >
                                Generar Semis
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Fecha</label>
                                <input type="date" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={semiDate} onChange={e => setSemiDate(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Hora Inicio</label>
                                <input type="time" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={semiTime} onChange={e => setSemiTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FINAL */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
                    <div className="mb-6 relative z-10 border-b border-slate-700 pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-lg text-yellow-500 uppercase tracking-widest flex items-center gap-2"><Trophy className="w-5 h-5" /> Gran Final</h3>
                            <button
                                onClick={() => handleGeneratePlayoff('final')}
                                className="bg-yellow-600/80 text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/40 backdrop-blur-sm border border-yellow-500/50"
                            >
                                Generar Final
                            </button>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Fecha</label>
                                <input type="date" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={finalDate} onChange={e => setFinalDate(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Hora Inicio</label>
                                <input type="time" className="w-full bg-slate-900 text-white border-slate-600 rounded-lg p-2 text-xs" value={finalTime} onChange={e => setFinalTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
