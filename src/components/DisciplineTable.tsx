import React from 'react';

interface StatsProps {
    data: { name: string, team: string, yellow: number, red: number }[];
}

export const DisciplineTable: React.FC<StatsProps> = ({ data }) => {
    return (
        <div className="bg-[#D9D0C1] p-2 rounded-lg shadow-md mt-6">
            <h3 className="text-center font-bold text-gray-800 uppercase mb-2">Fair Play / Sanciones</h3>
            <table className="w-full text-xs">
                <thead className="bg-[#BFAEA0] text-white">
                    <tr>
                        <th className="py-1 px-2 text-left">Nombre</th>
                        <th className="py-1 px-2 text-center w-8 bg-yellow-600/50">TA</th>
                        <th className="py-1 px-2 text-center w-8 bg-red-600/50">TR</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((player, idx) => (
                        <tr key={idx} className="border-b border-gray-300 bg-[#E8E1D5] text-gray-800">
                            <td className="py-1 px-2 font-semibold">
                                <div className="flex flex-col leading-none">
                                    <span>{player.name}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">{player.team}</span>
                                </div>
                            </td>
                            <td className="py-1 px-2 text-center font-bold text-yellow-700 bg-yellow-100/30">{player.yellow}</td>
                            <td className="py-1 px-2 text-center font-bold text-red-700 bg-red-100/30">{player.red}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500 italic">Juego Limpio (Sin tarjetas)</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
