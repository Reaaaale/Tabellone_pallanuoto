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
  coachName?: string;
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

export interface EventLogEntry {
  id: string;
  createdAt: number;
  period: number;
  clockRemainingMs: number;
  type:
    | "goal"
    | "undo_goal"
    | "penalty"
    | "timeout"
    | "reset_timeouts"
    | "start_expulsion"
    | "remove_expulsion"
    | "set_player_ejections"
    | "set_player_goals"
    | "start_clock"
    | "pause_clock"
    | "reset_clock"
    | "set_period"
    | "set_remaining_time";
  teamId?: TeamSide;
  playerNumber?: number;
  playerName?: string;
  detail?: string;
}

export type CommandMessage =
  | { type: "start_clock" }
  | { type: "pause_clock" }
  | { type: "reset_clock" }
  | { type: "set_remaining_time"; payload: { remainingMs: number } }
  | { type: "set_period"; payload: { period: number } }
  | { type: "goal"; payload: { teamId: TeamSide; playerNumber?: number } }
  | { type: "undo_goal"; payload: { teamId: TeamSide } }
  | { type: "penalty"; payload: { teamId: TeamSide; playerNumber: number } }
  | { type: "timeout"; payload: { teamId: TeamSide } }
  | { type: "reset_timeouts" }
  | { type: "set_player_ejections"; payload: { teamId: TeamSide; playerNumber: number; ejections: number } }
  | { type: "set_player_goals"; payload: { teamId: TeamSide; playerNumber: number; goals: number } }
  | { type: "start_expulsion"; payload: { teamId: TeamSide; playerNumber: number } }
  | { type: "set_team_info"; payload: { teamId: TeamSide; name?: string; logoUrl?: string; coachName?: string } }
  | { type: "set_roster"; payload: { teamId: TeamSide; players: Player[] } }
  | { type: "get_event_log" }
  | { type: "reset_event_log" }
  | { type: "play_intro" };
  

export type ServerEvent =
  | { type: "snapshot"; payload: MatchSnapshot }
  | { type: "ack"; payload: { ok: true } }
  | { type: "event_log"; payload: { entries: EventLogEntry[] } }
  | { type: "intro_video"; payload: { key: string } }
  | { type: "error"; payload: { message: string } };
