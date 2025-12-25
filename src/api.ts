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
    getTournamentDetails: (id: number): Promise<Tournament> => window.electron.ipcRenderer.invoke('get-tournament-details', id),

    getStandings: (tournamentId: number): Promise<Standing[]> => window.electron.ipcRenderer.invoke('get-standings', tournamentId),
    getTopScorers: (tournamentId: number): Promise<Scorer[]> => window.electron.ipcRenderer.invoke('get-top-scorers', tournamentId),

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
        foulers: { playerId: number, count: number }[]
    ) => window.electron.ipcRenderer.invoke('update-match-score', { id, homeScore, awayScore, scorers, foulers }),

    // Automation
    generateFixture: (tournamentId: number, options?: { startDate: string, startTime: string, matchDuration: number, matchInterval: number }) => window.electron.ipcRenderer.invoke('generate-fixture', { ...options, tournamentId }),
    generatePlayoffs: (tournamentId: number, stage: 'quarter' | 'semi' | 'final', startDate?: string, startTime?: string) => window.electron.ipcRenderer.invoke('generate-playoffs', { stage, startDate, startTime, tournamentId }),
    resetTournament: (tournamentId: number) => window.electron.ipcRenderer.invoke('reset-tournament', tournamentId),
    swapMatches: (matchId1: number, matchId2: number) => window.electron.ipcRenderer.invoke('swap-matches', { matchId1, matchId2 }),
    seedPlayers: (tournamentId: number) => window.electron.ipcRenderer.invoke('seed-players', tournamentId),
};
