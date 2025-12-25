import React, { useState } from 'react';
import { Match, Player } from '../types';
import { api } from '../api';
import { Printer } from 'lucide-react';
import { MatchSheet } from './print/MatchSheet';
import { toast } from 'sonner';

interface Props {
    matches: Match[];
    title?: string;
}

export const UpcomingMatchesTable: React.FC<Props> = ({ matches, title }) => {
    const [printingMatch, setPrintingMatch] = useState<Match | null>(null);
    const [homePlayers, setHomePlayers] = useState<Player[]>([]);
    const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handlePrint = async (match: Match) => {
        setIsLoading(true);
        try {
            const [home, away] = await Promise.all([
                api.getPlayers(match.home_team_id),
                api.getPlayers(match.away_team_id)
            ]);
            setHomePlayers(home);
            setAwayPlayers(away);
            setPrintingMatch(match);
        } catch (error) {
            toast.error('Error al cargar jugadores para la cédula');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border text-xs shadow-sm w-full">
            <h3 className="bg-transparent text-gray-800 font-bold p-1 text-center uppercase text-base mb-1">{title || "Próxima Jornada"}</h3>
            <table className="w-full border-collapse border border-gray-400">
                <tbody>
                    {matches.map((m) => (
                        <tr key={m.id} className="border-b border-gray-400 hover:bg-gray-50">
                            <td className="p-1 border-r border-gray-400 text-gray-600 font-bold uppercase w-1/4 text-center">
                                {new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </td>
                            <td className="p-1 border-r border-gray-400 text-gray-600 font-bold text-center w-20">
                                {new Date(m.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-1 text-center font-bold text-gray-800 w-1/3 border-r border-gray-400">{m.home_team}</td>
                            <td className="p-1 text-center font-bold text-gray-800 w-1/3 border-r border-gray-400">{m.away_team}</td>
                            <td className="p-1 text-center w-10">
                                <button
                                    onClick={() => handlePrint(m)}
                                    disabled={isLoading}
                                    className="text-slate-500 hover:text-black hover:bg-gray-200 p-1 rounded transition-colors"
                                    title="Imprimir Cédula"
                                >
                                    <Printer size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {printingMatch && (
                <MatchSheet
                    match={printingMatch}
                    homePlayers={homePlayers}
                    awayPlayers={awayPlayers}
                    onClose={() => setPrintingMatch(null)}
                />
            )}
        </div>
    );
};
