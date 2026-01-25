import { Match } from "../domain/match";
import { CommandFailed } from "./errors";
import { CommandMessage, EventLogEntry, MatchSnapshot, TeamSide } from "@tabellone/shared";
import { randomUUID } from "crypto";

export class MatchService {
  private readonly match: Match;
  private readonly eventLog: EventLogEntry[] = [];

  constructor(match = new Match()) {
    this.match = match;
  }

  dispatch(command: CommandMessage): MatchSnapshot {
    const before = this.match.getSnapshot();
    const logEvent = (entry: Omit<EventLogEntry, "id" | "createdAt" | "period" | "clockRemainingMs">) => {
      this.eventLog.push({
        id: randomUUID(),
        createdAt: Date.now(),
        period: before.period,
        clockRemainingMs: before.clock.remainingMs,
        ...entry,
      });
    };

    switch (command.type) {
      case "start_clock":
        this.match.startClock();
        logEvent({ type: "start_clock" });
        break;
      case "pause_clock":
        this.match.pauseClock();
        logEvent({ type: "pause_clock" });
        break;
      case "reset_clock":
        this.match.resetClock();
        logEvent({ type: "reset_clock" });
        break;
      case "set_period":
        this.match.setPeriod(command.payload.period);
        logEvent({ type: "set_period", detail: `Periodo ${command.payload.period}` });
        break;
      case "goal":
        this.match.addGoal(command.payload.teamId, command.payload.playerNumber);
        logEvent({
          type: "goal",
          teamId: command.payload.teamId,
          playerNumber: command.payload.playerNumber,
          playerName: command.payload.playerNumber
            ? before.teams[command.payload.teamId].info.players.find((p) => p.number === command.payload.playerNumber)?.name
            : undefined,
        });
        break;
      case "undo_goal":
        this.match.undoGoal(command.payload.teamId);
        logEvent({ type: "undo_goal", teamId: command.payload.teamId });
        break;
      case "penalty": {
        const prevPlayer = before.teams[command.payload.teamId].info.players.find(
          (p) => p.number === command.payload.playerNumber
        );
        if (prevPlayer) {
          const nextEjections = Math.min(3, (prevPlayer.ejections ?? 0) + 1);
          this.match.setPlayerEjections(command.payload.teamId, command.payload.playerNumber, nextEjections);
        }
        this.match.startExpulsion(command.payload.teamId, command.payload.playerNumber);
        logEvent({
          type: "penalty",
          teamId: command.payload.teamId,
          playerNumber: command.payload.playerNumber,
          playerName: prevPlayer?.name,
        });
        break;
      }
        
      case "timeout":
        this.match.registerTimeout(command.payload.teamId);
        logEvent({ type: "timeout", teamId: command.payload.teamId });
        break;
      case "reset_timeouts":
        this.match.resetTimeouts();
        logEvent({ type: "reset_timeouts" });
        break;
      case "start_expulsion":
        this.match.startExpulsion(command.payload.teamId, command.payload.playerNumber);
        logEvent({
          type: "start_expulsion",
          teamId: command.payload.teamId,
          playerNumber: command.payload.playerNumber,
          playerName: before.teams[command.payload.teamId].info.players.find((p) => p.number === command.payload.playerNumber)?.name,
        });
        break;
      case "set_team_info":
        this.match.updateTeamInfo(command.payload.teamId, {
          name: command.payload.name,
          logoUrl: command.payload.logoUrl,
          coachName: command.payload.coachName,
        });
        break;
      case "set_roster":
        this.match.setRoster(command.payload.teamId, command.payload.players);
        break;
      case "set_remaining_time":
        this.match.setRemainingTime(command.payload.remainingMs);
        logEvent({ type: "set_remaining_time", detail: `Tempo ${command.payload.remainingMs}ms` });
        break;
      case "set_player_ejections":
        {
          const prevPlayer = before.teams[command.payload.teamId].info.players.find(
            (p) => p.number === command.payload.playerNumber
          );
          this.match.setPlayerEjections(
            command.payload.teamId,
            command.payload.playerNumber,
            command.payload.ejections
          );
          if (prevPlayer?.ejections !== command.payload.ejections) {
            if ((prevPlayer?.ejections ?? 0) > command.payload.ejections) {
              logEvent({
                type: "remove_expulsion",
                teamId: command.payload.teamId,
                playerNumber: command.payload.playerNumber,
                playerName: prevPlayer?.name,
                detail: `Espulsioni: ${command.payload.ejections}`,
              });
            }
            logEvent({
              type: "set_player_ejections",
              teamId: command.payload.teamId,
              playerNumber: command.payload.playerNumber,
              playerName: prevPlayer?.name,
              detail: `Espulsioni: ${command.payload.ejections}`,
            });
          }
        }
        break;
      case "set_player_goals": {
        const prevPlayer = before.teams[command.payload.teamId].info.players.find(
          (p) => p.number === command.payload.playerNumber
        );
        this.match.setPlayerGoals(command.payload.teamId, command.payload.playerNumber, command.payload.goals);
        if (prevPlayer?.goals !== command.payload.goals) {
          logEvent({
            type: "set_player_goals",
            teamId: command.payload.teamId,
            playerNumber: command.payload.playerNumber,
            playerName: prevPlayer?.name,
            detail: `Gol giocatore: ${command.payload.goals}`,
          });
        }
        break;
      }
      case "get_event_log":
        break;
      case "reset_event_log":
        this.eventLog.splice(0, this.eventLog.length);
        break;
      case "play_intro":
        break;
      default:
        // Exhaustive check to catch future missing handlers
        const _exhaustive: never = command;
        throw new CommandFailed(`Comando non supportato: ${JSON.stringify(_exhaustive)}`);
    }
    return this.match.getSnapshot();
  }

  snapshot(): MatchSnapshot {
    return this.match.getSnapshot();
  }

  getEventLog(): EventLogEntry[] {
    return [...this.eventLog];
  }

  teamIdFromString(value: string): TeamSide {
    if (value === "home" || value === "away") {
      return value;
    }
    throw new CommandFailed("Team non valido");
  }
}
