import { Standing, Scorer, Match, Team, Player } from './types';

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
    getStandings: (): Promise<Standing[]> => window.electron.ipcRenderer.invoke('get-standings'),
    getTopScorers: (): Promise<Scorer[]> => window.electron.ipcRenderer.invoke('get-top-scorers'),

    // Updated filters
    getMatches: (matchday?: number, stage?: string): Promise<Match[]> => window.electron.ipcRenderer.invoke('get-matches', { matchday, stage }),

    getTeams: (): Promise<Team[]> => window.electron.ipcRenderer.invoke('get-teams'),
    getPlayers: (teamId?: number): Promise<Player[]> => window.electron.ipcRenderer.invoke('get-players', teamId),

    addTeam: (team: Omit<Team, 'id'>) => window.electron.ipcRenderer.invoke('add-team', team),
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
    generateFixture: (options?: { startDate: string, startTime: string, matchDuration: number, matchInterval: number }) => window.electron.ipcRenderer.invoke('generate-fixture', options),
    generatePlayoffs: (stage: 'quarter' | 'semi' | 'final', startDate?: string, startTime?: string) => window.electron.ipcRenderer.invoke('generate-playoffs', { stage, startDate, startTime }),
    resetTournament: () => window.electron.ipcRenderer.invoke('reset-tournament'),
    swapMatches: (matchId1: number, matchId2: number) => window.electron.ipcRenderer.invoke('swap-matches', { matchId1, matchId2 }),
    seedPlayers: () => window.electron.ipcRenderer.invoke('seed-players'),
};
