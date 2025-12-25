import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { DisciplineTable } from '../DisciplineTable';
import { AlertTriangle } from 'lucide-react';

interface AdminSanctionsProps {
    tournamentId: number;
}

export const AdminSanctions: React.FC<AdminSanctionsProps> = ({ tournamentId }) => {
    const [discipline, setDiscipline] = useState<{ name: string, team: string, yellow: number, red: number }[]>([]);
    const [minYellow, setMinYellow] = useState(0);
    const [minRed, setMinRed] = useState(0);

    useEffect(() => {
        loadData();
    }, [tournamentId]);

    const loadData = async () => {
        const cards = await api.getTopCards(tournamentId);
        setDiscipline(cards);
    };

    return (
        <div className="p-8 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <span className="text-amber-500"><AlertTriangle className="w-8 h-8" /></span> Sanciones y Disciplina
            </h2>
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
                <div className="flex gap-4 mb-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Min. Amarillas</label>
                        <input
                            type="number"
                            className="bg-slate-700 border border-slate-600 rounded p-2 w-32 text-white font-bold"
                            value={minYellow}
                            onChange={(e) => setMinYellow(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Min. Rojas</label>
                        <input
                            type="number"
                            className="bg-slate-700 border border-slate-600 rounded p-2 w-32 text-white font-bold"
                            value={minRed}
                            onChange={(e) => setMinRed(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                    <button onClick={() => { setMinYellow(0); setMinRed(0); }} className="text-xs text-blue-400 font-bold hover:text-white pb-3 transition">
                        Limpiar Filtros
                    </button>
                </div>
                <p className="text-slate-400 mb-4 text-sm">Mostrando jugadores con al menos <b>{minYellow}</b> amarillas o <b>{minRed}</b> rojas.</p>
                <DisciplineTable data={discipline.filter(p => p.yellow >= minYellow && p.red >= minRed)} />
            </div>
        </div>
    );
};
