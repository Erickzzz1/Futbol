import React from 'react';
import { Standing } from '../types';

interface Props {
    standings: Standing[];
}

export const StandingsTable: React.FC<Props> = ({ standings }) => {
    return (
        <div className="overflow-x-auto shadow-lg rounded-lg">
            <h2 className="text-[#D87C7C] text-2xl font-bold uppercase tracking-widest mb-2 vertical-text-sidebar absolute -left-10 top-20 hidden">Tabla General</h2>
            <table className="min-w-full bg-white text-center text-sm">
                <thead className="bg-[#F5E6CA] text-gray-800 font-bold uppercase border-b-2 border-gray-300">
                    <tr>
                        <th className="py-2 px-1 w-10">Pos</th>
                        <th className="py-2 px-4 text-left">Equipo</th>
                        <th className="py-2 px-1">PJ</th>
                        <th className="py-2 px-1">PG</th>
                        <th className="py-2 px-1">PE</th>
                        <th className="py-2 px-1">PP</th>
                        <th className="py-2 px-1">GF</th>
                        <th className="py-2 px-1">GC</th>
                        <th className="py-2 px-1">DG</th>
                        <th className="py-2 px-2 bg-[#EAD8B1]">PTS</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {standings.map((team, index) => (
                        <tr key={team.id} className={`${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} border-b hover:bg-[#F5E6CA]`}>
                            <td className="py-1 font-bold">{index + 1}</td>
                            <td className="py-1 px-4 text-left font-bold">{team.name}</td>
                            <td className="py-1">{team.PJ}</td>
                            <td className="py-1">{team.PG}</td>
                            <td className="py-1">{team.PE}</td>
                            <td className="py-1">{team.PP}</td>
                            <td className="py-1">{team.GF}</td>
                            <td className="py-1">{team.GC}</td>
                            <td className="py-1 font-bold">{team.DG}</td>
                            <td className="py-1 font-bold bg-[#F3E5AB]">{team.PTS}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
