import * as XLSX from 'xlsx';

export const exportTournamentData = (
    tournamentName: string,
    standings: any[],
    scorers: any[],
    cards: any[],
    matches: any[],
    teams: any[]
) => {
    const wb = XLSX.utils.book_new();

    // 1. General (Standings)
    const standingsData = standings.map((s, i) => ({
        Pos: i + 1,
        Equipo: s.name,
        PJ: s.PJ,
        PG: s.PG,
        PE: s.PE,
        PP: s.PP,
        GF: s.GF,
        GC: s.GC,
        Diff: s.DG,
        Pts: s.PTS
    }));
    const wsStandings = XLSX.utils.json_to_sheet(standingsData);
    XLSX.utils.book_append_sheet(wb, wsStandings, "Tabla General");

    // 2. Goleo (Scorers)
    const scorersData = scorers.map((s, i) => ({
        Pos: i + 1,
        Jugador: s.name,
        Equipo: s.team,
        Goles: s.goals
    }));
    const wsScorers = XLSX.utils.json_to_sheet(scorersData);
    XLSX.utils.book_append_sheet(wb, wsScorers, "Goleo Individual");

    // 3. Sanciones (Cards)
    const cardsData = cards.map((c, i) => ({
        Pos: i + 1,
        Jugador: c.name,
        Equipo: c.team,
        Amarillas: c.yellow,
        Rojas: c.red
    }));
    const wsCards = XLSX.utils.json_to_sheet(cardsData);
    XLSX.utils.book_append_sheet(wb, wsCards, "Sanciones");

    // 4. Calendario (Matches)
    const matchesData = matches.map(m => ({
        Jornada: m.stage === 'regular' ? m.matchday : m.stage,
        Fecha: new Date(m.date).toLocaleDateString(),
        Hora: new Date(m.date).toLocaleTimeString(),
        Local: m.home_team,
        Marcador: m.status === 'played' ? `${m.home_score} - ${m.away_score}` : 'vs',
        Visitante: m.away_team,
        Estado: m.status === 'played' ? 'Jugado' : 'Pendiente'
    }));
    const wsMatches = XLSX.utils.json_to_sheet(matchesData);
    XLSX.utils.book_append_sheet(wb, wsMatches, "Calendario");

    // Save File
    XLSX.writeFile(wb, `${tournamentName}_Reporte.xlsx`);
};
