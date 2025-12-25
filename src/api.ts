import { Standing, Scorer, Match, Team, Player, Tournament } from './types';

interface ElectronAPI {
    ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
    };
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

export const api = {
    // Tournaments
    getTournaments: (): Promise<Tournament[]> => window.electron.ipcRenderer.invoke('get-tournaments'),
    createTournament: (data: { name: string, type: string, category: string }): Promise<Tournament> => window.electron.ipcRenderer.invoke('create-tournament', data),
    updateTournament: (data: Tournament) => window.electron.ipcRenderer.invoke('update-tournament', data),
    deleteTournament: (id: number) => window.electron.ipcRenderer.invoke('delete-tournament', id),
    getTournamentDetails: (id: number): Promise<Tournament> => window.electron.ipcRenderer.invoke('get-tournament-details', id),

    getStandings: (tournamentId: number): Promise<Standing[]> => window.electron.ipcRenderer.invoke('get-standings', tournamentId),
    getTopScorers: (tournamentId: number): Promise<Scorer[]> => window.electron.ipcRenderer.invoke('get-top-scorers', tournamentId),
    getTopCards: (tournamentId: number): Promise<{ name: string, team: string, yellow: number, red: number }[]> => window.electron.ipcRenderer.invoke('get-top-cards', tournamentId),

    // Treasury
    getTreasurySummary: (tournamentId: number): Promise<any[]> => window.electron.ipcRenderer.invoke('get-treasury-summary', tournamentId),
    addPaymentObligation: (data: { tournamentId: number, teamId: number, concept: string, amount: number }) => window.electron.ipcRenderer.invoke('add-payment-obligation', data),
    updatePaymentStatus: (id: number, status: 'pending' | 'paid') => window.electron.ipcRenderer.invoke('update-payment-status', { id, status }),
    deletePayment: (id: number) => window.electron.ipcRenderer.invoke('delete-payment', id),
    generateBulkPayments: (data: { tournamentId: number, type: 'inscription' | 'matchday', amount: number, matchday?: number }) => window.electron.ipcRenderer.invoke('generate-bulk-payments', data),

    // Settings
    getSettings: (tournamentId: number): Promise<Record<string, string>> => window.electron.ipcRenderer.invoke('get-settings', tournamentId),
    updateSetting: (tournamentId: number, key: string, value: string | number) => window.electron.ipcRenderer.invoke('update-setting', { tournamentId, key, value }),
    searchGlobal: (tournamentId: number, query: string) => window.electron.ipcRenderer.invoke('search-global', tournamentId, query),

    // Updated filters
    getMatches: (tournamentId: number, matchday?: number, stage?: string): Promise<Match[]> => window.electron.ipcRenderer.invoke('get-matches', { tournamentId, matchday, stage }),

    getTeams: (tournamentId: number): Promise<Team[]> => window.electron.ipcRenderer.invoke('get-teams', tournamentId),
    getPlayers: (teamId?: number): Promise<Player[]> => window.electron.ipcRenderer.invoke('get-players', teamId),

    addTeam: (team: Omit<Team, 'id'>, tournamentId: number) => window.electron.ipcRenderer.invoke('add-team', { ...team, tournamentId }),
    updateTeam: (team: Team) => window.electron.ipcRenderer.invoke('update-team', team),
    deleteTeam: (id: number) => window.electron.ipcRenderer.invoke('delete-team', id),

    addPlayer: (player: Omit<Player, 'id'>) => window.electron.ipcRenderer.invoke('add-player', player),
    updatePlayer: (player: Player) => window.electron.ipcRenderer.invoke('update-player', player),
    deletePlayer: (id: number) => window.electron.ipcRenderer.invoke('delete-player', id),

    addMatch: (match: Partial<Match>) => window.electron.ipcRenderer.invoke('add-match', match),

    updateMatchScore: (
        id: number,
        homeScore: number,
        awayScore: number,
        scorers: { playerId: number, count: number }[],
        cards: { playerId: number, type: 'yellow' | 'red', count: number }[]
    ) => window.electron.ipcRenderer.invoke('update-match-score', { id, homeScore, awayScore, scorers, cards }),

    // Automation
    generateFixture: (tournamentId: number, options?: { startDate: string, startTime: string, matchDuration: number, matchInterval: number }) => window.electron.ipcRenderer.invoke('generate-fixture', { ...options, tournamentId }),
    generatePlayoffs: (tournamentId: number, stage: 'quarter' | 'semi' | 'final', startDate?: string, startTime?: string) => window.electron.ipcRenderer.invoke('generate-playoffs', { stage, startDate, startTime, tournamentId }),
    resetTournament: (tournamentId: number) => window.electron.ipcRenderer.invoke('reset-tournament', tournamentId),
    swapMatches: (matchId1: number, matchId2: number) => window.electron.ipcRenderer.invoke('swap-matches', { matchId1, matchId2 }),

    seedPlayers: (tournamentId: number) => window.electron.ipcRenderer.invoke('seed-players', tournamentId),
    backupDatabase: () => window.electron.ipcRenderer.invoke('backup-database'),
    restoreDatabase: () => window.electron.ipcRenderer.invoke('restore-database'),
};
