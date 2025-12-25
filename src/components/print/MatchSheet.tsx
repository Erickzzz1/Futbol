import React from 'react';
import { Match, Player } from '../../types';

interface MatchSheetProps {
    match: Match;
    homePlayers: Player[];
    awayPlayers: Player[];
    onClose: () => void;
}

export const MatchSheet: React.FC<MatchSheetProps> = ({ match, homePlayers, awayPlayers, onClose }) => {

    // Auto-trigger print when mounted
    React.useEffect(() => {
        setTimeout(() => {
            window.print();
        }, 500);
    }, []);

    const PlayerTable = ({ players, teamName }: { players: Player[], teamName: string }) => (
        <div className="w-full mb-4">
            <h3 className="font-bold text-lg uppercase border-b-2 border-black mb-1">{teamName}</h3>
            <table className="w-full text-xs border-collapse border border-black">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-1 w-8">#</th>
                        <th className="border border-black p-1">Nombre</th>
                        <th className="border border-black p-1 w-16">Goles</th>
                        <th className="border border-black p-1 w-16">TA</th>
                        <th className="border border-black p-1 w-16">TR</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.id}>
                            <td className="border border-black p-1 text-center font-bold">{p.number}</td>
                            <td className="border border-black p-1">{p.name}</td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    ))}
                    {/* Empty rows for extras */}
                    {[...Array(3)].map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td className="border border-black p-3"></td>
                            <td className="border border-black p-3"></td>
                            <td className="border border-black p-3"></td>
                            <td className="border border-black p-3"></td>
                            <td className="border border-black p-3"></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-[9999] overflow-auto p-0 m-0 text-black font-sans">
            {/* Action Bar - Hidden on Print */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-slate-800 p-4 flex justify-between items-center shadow-lg">
                <h2 className="text-white font-bold">Vista Previa de Cédula</h2>
                <button
                    onClick={onClose}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold"
                >
                    Cerrar
                </button>
            </div>

            {/* Printable Content */}
            <div className="max-w-[21cm] mx-auto bg-white p-8 pt-20 print:pt-0 min-h-screen">

                {/* Header */}
                <div className="text-center border-b-4 border-black pb-4 mb-6">
                    <h1 className="text-3xl font-black uppercase tracking-wider">Cédula de Partido</h1>
                    <div className="flex justify-between mt-4 text-sm font-bold uppercase">
                        <div>Fecha: {new Date(match.date).toLocaleDateString()}</div>
                        <div>Hora: {new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div>Jornada: {match.matchday}</div>
                    </div>
                </div>

                {/* Match Info */}
                <div className="flex justify-between items-center mb-8 border border-black p-4">
                    <div className="text-xl font-bold w-1/3 text-center">{match.home_team}</div>
                    <div className="text-xl font-bold w-1/3 text-center">VS</div>
                    <div className="text-xl font-bold w-1/3 text-center">{match.away_team}</div>
                </div>

                {/* Rosters Grid */}
                <div className="grid grid-cols-2 gap-8">
                    <PlayerTable players={homePlayers} teamName={match.home_team} />
                    <PlayerTable players={awayPlayers} teamName={match.away_team} />
                </div>

                {/* Footer / Signatures */}
                <div className="mt-12 pt-8 border-t-2 border-dashed border-black">
                    <div className="grid grid-cols-3 gap-8 text-center">
                        <div className="border-t border-black pt-2">Capitán Local</div>
                        <div className="border-t border-black pt-2">Árbitro</div>
                        <div className="border-t border-black pt-2">Capitán Visitante</div>
                    </div>
                </div>

                {/* Score Section */}
                <div className="mt-8 border border-black p-4 text-center">
                    <h3 className="font-bold uppercase mb-4">Marcador Final</h3>
                    <div className="flex justify-around items-end h-16">
                        <div className="border-b border-black w-20 text-2xl font-bold"></div>
                        <span className="font-bold">-</span>
                        <div className="border-b border-black w-20 text-2xl font-bold"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: auto; margin: 0mm; }
                    body { margin: 1cm; }
                }
            `}</style>
        </div>
    );
};
