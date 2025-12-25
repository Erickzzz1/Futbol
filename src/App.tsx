import React, { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Admin } from './components/Admin'
import { TournamentList } from './components/TournamentList'
import { Tournament } from './types'
import { ArrowLeft, Settings, BarChart3 } from 'lucide-react';
import { CaptureButton } from './components/CaptureButton';

function App(): JSX.Element {
    const [view, setView] = useState('dashboard');
    const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);

    if (!currentTournament) {
        return <TournamentList onSelectTournament={setCurrentTournament} />;
    }

    return (
        <div className="bg-slate-900 min-h-screen font-sans text-gray-100">
            {/* Header / Nav Scope */}
            <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 bg-slate-950 border-b border-slate-800 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setCurrentTournament(null)}
                        className="text-sm font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Cambiar Torneo
                    </button>
                    <div className="h-6 w-px bg-slate-800"></div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">{currentTournament.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{currentTournament.type} • {currentTournament.category}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
                    {view === 'dashboard' && (
                        <CaptureButton
                            targetId="dashboard-content"
                            fileName="Resultados"
                            className="bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                        />
                    )}
                    <button
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shadow-lg flex items-center gap-2 ${view === 'admin'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-amber-900/20'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                        onClick={() => setView('admin')}
                    >
                        <Settings className="w-4 h-4" /> Panel Admin
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shadow-lg flex items-center gap-2 ${view === 'dashboard'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500 hover:to-amber-400 shadow-amber-900/20'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                        onClick={() => setView('dashboard')}
                    >
                        <BarChart3 className="w-4 h-4" /> Dashboard
                    </button>
                </div>
            </div>

            <div className="pt-16">
                {view === 'dashboard' ? <Dashboard tournamentId={currentTournament.id} /> : <Admin tournamentId={currentTournament.id} />}
            </div>
        </div>
    )
}

export default App
