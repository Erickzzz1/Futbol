import React from 'react';
import { Match } from '../types';

interface Props {
    matches: Match[];
    title: string;
}

export const MatchResultsTable: React.FC<Props> = ({ matches, title }) => {
    return (
        <div className="bg-white border text-sm shadow-sm">
            <h3 className="bg-gray-200 text-gray-700 font-bold p-1 text-center uppercase border-b">{title}</h3>
            <table className="w-full">
                <tbody>
                    {matches.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50 bg-white">
                            <td className="p-3 w-[40%] text-right font-black text-slate-700 uppercase text-xs sm:text-sm tracking-tight leading-none">
                                {m.home_team}
                            </td>
                            <td className="p-2 w-[20%] text-center">
                                <span className="inline-block bg-slate-900 text-amber-400 font-mono font-bold px-3 py-1 rounded text-lg shadow-sm border border-slate-700">
                                    {m.home_score} - {m.away_score}
                                </span>
                            </td>
                            <td className="p-3 w-[40%] text-left font-black text-slate-700 uppercase text-xs sm:text-sm tracking-tight leading-none">
                                {m.away_team}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
