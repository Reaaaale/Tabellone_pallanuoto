export type TeamSide = "home" | "away";

export interface Player {
  number: number;
  name: string;
  goals: number;
  ejections: number;
}

export interface TeamInfo {
  id: TeamSide;
  name: string;
  logoUrl?: string;
  players: Player[];
}

export interface ExpulsionState {
  id: string;
  teamId: TeamSide;
  playerNumber: number;
  remainingMs: number;
  running: boolean;
}

export interface ClockState {
  remainingMs: number;
  running: boolean;
  periodDurationMs: number;
}

export interface MatchSnapshot {
  period: number;
  clock: ClockState;
  teams: Record<
    TeamSide,
    {
      info: TeamInfo;
      score: number;
      timeoutsRemaining: number;
    }
  >;
  expulsions: ExpulsionState[];
}

export type CommandMessage =
  | { type: "start_clock" }
  | { type: "pause_clock" }
  | { type: "reset_clock" }
  | { type: "set_remaining_time"; payload: { remainingMs: number } }
  | { type: "set_period"; payload: { period: number } }
  | { type: "goal"; payload: { teamId: TeamSide; playerNumber?: number } }
  | { type: "undo_goal"; payload: { teamId: TeamSide } }
  | { type: "timeout"; payload: { teamId: TeamSide } }
  | { type: "reset_timeouts" }
  | { type: "set_player_ejections"; payload: { teamId: TeamSide; playerNumber: number; ejections: number } }
  | { type: "start_expulsion"; payload: { teamId: TeamSide; playerNumber: number } }
  | { type: "set_team_info"; payload: { teamId: TeamSide; name?: string; logoUrl?: string } }
  | { type: "set_roster"; payload: { teamId: TeamSide; players: Player[] } };
  

export type ServerEvent =
  | { type: "snapshot"; payload: MatchSnapshot }
  | { type: "ack"; payload: { ok: true } }
  | { type: "error"; payload: { message: string } };
