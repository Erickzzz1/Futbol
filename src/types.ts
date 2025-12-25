
export interface Tournament {
    id: number;
    name: string;
    type: string;
    category: string;
}

export interface Team {
    id: number;
    name: string;
    logo?: string;
    PJ?: number;
    PG?: number;
    PE?: number;
    PP?: number;
    GF?: number;
    GC?: number;
    DG?: number;
    PTS?: number;
}

export interface Player {
    id: number;
    name: string;
    team_id: number;
    team_name?: string;
    number: number;
    goals?: number;
    yellow_cards?: number;
    red_cards?: number;
    custom_goals?: number;
    custom_yellow?: number;
    custom_red?: number;
}

export interface Match {
    id: number;
    home_team_id: number;
    away_team_id: number;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    matchday: number;
    date: string;
    status: 'scheduled' | 'played';
    stage: 'regular' | 'quarter' | 'semi' | 'final';
}

export interface Standing extends Team { }

export interface Scorer {
    name: string;
    team: string;
    goals: number;
}
