import React from 'react';
import { Scorer } from '../types';

interface Props {
    scorers: Scorer[];
}

export const ScorersTable: React.FC<Props> = ({ scorers }) => {
    return (
        <div className="bg-[#D9D0C1] p-2 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-center font-bold text-gray-800 uppercase">Tabla de Goleo</h3>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-[#BFAEA0] text-white">
                    <tr>
                        <th className="py-1 px-2 text-left">Nombre</th>
                        <th className="py-1 px-2 text-left">Equipo</th>
                        <th className="py-1 px-2 text-right">Goles</th>
                    </tr>
                </thead>
                <tbody>
                    {scorers.map((player, idx) => (
                        <tr key={idx} className="border-b border-gray-300 bg-[#E8E1D5] text-gray-800">
                            <td className="py-1 px-2 font-semibold">{player.name}</td>
                            <td className="py-1 px-2 text-gray-600">{player.team}</td>
                            <td className="py-1 px-2 text-right font-bold">{player.goals}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
