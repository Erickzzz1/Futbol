import React from 'react';
import { Match } from '../types';

interface Props {
    matches: Match[];
    title?: string;
}

export const UpcomingMatchesTable: React.FC<Props> = ({ matches, title }) => {
    return (
        <div className="bg-white border text-xs shadow-sm w-full">
            <h3 className="bg-transparent text-gray-800 font-bold p-1 text-center uppercase text-base mb-1">{title || "Próxima Jornada"}</h3>
            <table className="w-full border-collapse border border-gray-400">
                <tbody>
                    {matches.map((m) => (
                        <tr key={m.id} className="border-b border-gray-400">
                            <td className="p-1 border-r border-gray-400 text-gray-600 font-bold uppercase w-1/4 text-center">
                                {new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </td>
                            <td className="p-1 border-r border-gray-400 text-gray-600 font-bold text-center w-20">
                                {new Date(m.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-1 text-center font-bold text-gray-800 w-1/3 border-r border-gray-400">{m.home_team}</td>
                            <td className="p-1 text-center font-bold text-gray-800 w-1/3">{m.away_team}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
