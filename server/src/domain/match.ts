import { randomUUID } from "crypto";
import { CommandFailed } from "../application/errors";
import {
  ClockState,
  ExpulsionState,
  MatchSnapshot,
  Player,
  TeamInfo,
  TeamSide,
} from "@tabellone/shared";

interface ClockRuntimeState {
  remainingMs: number;
  running: boolean;
  startedAt?: number;
  periodDurationMs: number;
}

interface ExpulsionRuntimeState {
  id: string;
  teamId: TeamSide;
  playerNumber: number;
  referenceRemainingMs: number;
  startedAt?: number;
  running: boolean;
}

interface TeamRuntimeState {
  info: TeamInfo;
  score: number;
  timeoutsRemaining: number;
}

interface MatchRuntimeState {
  period: number;
  clock: ClockRuntimeState;
  teams: Record<TeamSide, TeamRuntimeState>;
  expulsions: ExpulsionRuntimeState[];
}

export class Match {
  private state: MatchRuntimeState;

  constructor(opts?: MatchRuntimeState) {
    this.state = opts ?? this.defaultState();
  }

  private defaultState(): MatchRuntimeState {
    const defaultInfo = (id: TeamSide): TeamRuntimeState => ({
      info: { id, name: id === "home" ? "Casa" : "Ospiti", players: [] },
      score: 0,
      timeoutsRemaining: 3,
    });

    return {
      period: 1,
      clock: {
        remainingMs: 8 * 60 * 1000,
        running: false,
        periodDurationMs: 8 * 60 * 1000,
      },
      teams: {
        home: defaultInfo("home"),
        away: defaultInfo("away"),
      },
      expulsions: [],
    };
  }

  startClock(now = Date.now()): void {
    if (this.state.clock.running) {
      return;
    }
    this.state.clock.running = true;
    this.state.clock.startedAt = now;
    this.resumeExpulsions(now);
  }

  pauseClock(now = Date.now()): void {
    if (!this.state.clock.running) {
      return;
    }
    const remaining = this.getClockRemaining(now);
    this.state.clock.remainingMs = remaining;
    this.state.clock.running = false;
    this.state.clock.startedAt = undefined;
    this.pauseExpulsions(now);
  }

  resetClock(): void {
    this.state.clock.remainingMs = this.state.clock.periodDurationMs;
    this.state.clock.running = false;
    this.state.clock.startedAt = undefined;
    this.state.expulsions = [];
  }

  setPeriod(period: number): void {
    if (period < 1 || period > 4) {
      throw new CommandFailed("Periodo non valido");
    }
    this.state.period = period;
    this.resetClock();
  }

  addGoal(teamId: TeamSide): void {
    const team = this.state.teams[teamId];
    if (!team) {
      throw new CommandFailed(`Squadra ${teamId} non trovata`);
    }
    team.score += 1;
  }

  registerTimeout(teamId: TeamSide): void {
    const team = this.state.teams[teamId];
    if (!team) {
      throw new CommandFailed(`Squadra ${teamId} non trovata`);
    }
    if (team.timeoutsRemaining <= 0) {
      throw new CommandFailed("Timeout non disponibili");
    }
    team.timeoutsRemaining -= 1;
    this.pauseClock();
  }

  updateTeamInfo(teamId: TeamSide, info: Partial<Omit<TeamInfo, "id">>): void {
    const team = this.state.teams[teamId];
    if (!team) {
      throw new CommandFailed(`Squadra ${teamId} non trovata`);
    }
    team.info = { ...team.info, ...info, id: teamId };
  }

setRoster(teamId: TeamSide, players: Player[]): void {
  if (players.length > 15) {
    throw new CommandFailed("Massimo 15 giocatori per squadra");
  }

  const team = this.state.teams[teamId];
  if (!team) {
    throw new CommandFailed(`Squadra ${teamId} non trovata`);
  }

  team.info.players = players;

  //  DEBUG
  console.log(
    "[DEBUG setRoster] STATE players",
    teamId,
    this.state.teams[teamId].info.players
  );
}


  startExpulsion(teamId: TeamSide, playerNumber: number, now = Date.now()): void {
    const team = this.state.teams[teamId];
    if (!team) {
      throw new CommandFailed(`Squadra ${teamId} non trovata`);
    }
    const alreadyActive = this.state.expulsions.find(
      (e) => e.teamId === teamId && e.playerNumber === playerNumber
    );
    if (alreadyActive) {
      throw new CommandFailed("Espulsione già attiva per il giocatore");
    }
    const expulsion: ExpulsionRuntimeState = {
      id: randomUUID(),
      teamId,
      playerNumber,
      referenceRemainingMs: 20_000,
      startedAt: this.state.clock.running ? now : undefined,
      running: this.state.clock.running,
    };
    this.state.expulsions.push(expulsion);
  }

  getSnapshot(now = Date.now()): MatchSnapshot {
    this.cleanupExpulsions(now);
    return {
      period: this.state.period,
      clock: this.buildClockState(now),
      teams: {
        home: this.buildTeamState("home"),
        away: this.buildTeamState("away"),
      },
      expulsions: this.state.expulsions.map((e) => this.buildExpulsionState(e, now)),
    };
  }

private buildTeamState(teamId: TeamSide) {
  const team = this.state.teams[teamId];

  return {
    info: {
      id: team.info.id,
      name: team.info.name,
      logoUrl: team.info.logoUrl,
      players: [...team.info.players], // ← QUESTO
    },
    score: team.score,
    timeoutsRemaining: team.timeoutsRemaining,
  };
}


  private buildClockState(now: number): ClockState {
    return {
      remainingMs: this.getClockRemaining(now),
      running: this.state.clock.running,
      periodDurationMs: this.state.clock.periodDurationMs,
    };
  }

  private buildExpulsionState(exp: ExpulsionRuntimeState, now: number): ExpulsionState {
    return {
      id: exp.id,
      teamId: exp.teamId,
      playerNumber: exp.playerNumber,
      remainingMs: this.getExpulsionRemaining(exp, now),
      running: exp.running && this.state.clock.running,
    };
  }

  private getClockRemaining(now: number): number {
    if (!this.state.clock.running || !this.state.clock.startedAt) {
      return this.state.clock.remainingMs;
    }
    const elapsed = now - this.state.clock.startedAt;
    const remaining = Math.max(0, this.state.clock.remainingMs - elapsed);
    return remaining;
  }

  private getExpulsionRemaining(exp: ExpulsionRuntimeState, now: number): number {
    if (!exp.running || !exp.startedAt || !this.state.clock.running || !this.state.clock.startedAt) {
      return exp.referenceRemainingMs;
    }
    const elapsed = now - exp.startedAt;
    return Math.max(0, exp.referenceRemainingMs - elapsed);
  }

  private cleanupExpulsions(now: number) {
    const updated: ExpulsionRuntimeState[] = [];
    for (const exp of this.state.expulsions) {
      const remaining = this.getExpulsionRemaining(exp, now);
      if (remaining <= 0) {
        continue;
      }
      if (exp.running && exp.startedAt) {
        updated.push({
          ...exp,
          referenceRemainingMs: remaining,
          startedAt: this.state.clock.running ? now : undefined,
          running: this.state.clock.running && exp.running,
        });
      } else {
        updated.push(exp);
      }
    }
    this.state.expulsions = updated;
  }

  private pauseExpulsions(now: number) {
    this.state.expulsions = this.state.expulsions.map((exp) => {
      if (!exp.running || !exp.startedAt) {
        return { ...exp, running: false, startedAt: undefined };
      }
      const remaining = this.getExpulsionRemaining(exp, now);
      return {
        ...exp,
        referenceRemainingMs: remaining,
        startedAt: undefined,
        running: false,
      };
    });
  }

  private resumeExpulsions(now: number) {
    this.state.expulsions = this.state.expulsions.map((exp) => {
      if (exp.referenceRemainingMs <= 0) {
        return { ...exp, running: false, startedAt: undefined };
      }
      return {
        ...exp,
        running: true,
        startedAt: now,
      };
    });
  }
}
