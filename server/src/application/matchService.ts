import { Match } from "../domain/match";
import { CommandFailed } from "./errors";
import { CommandMessage, MatchSnapshot, TeamSide } from "@tabellone/shared";

export class MatchService {
  private readonly match: Match;

  constructor(match = new Match()) {
    this.match = match;
  }

  dispatch(command: CommandMessage): MatchSnapshot {
    switch (command.type) {
      case "start_clock":
        this.match.startClock();
        break;
      case "pause_clock":
        this.match.pauseClock();
        break;
      case "reset_clock":
        this.match.resetClock();
        break;
      case "set_period":
        this.match.setPeriod(command.payload.period);
        break;
      case "goal":
        this.match.addGoal(command.payload.teamId, command.payload.playerNumber);
        break;
      case "undo_goal":
        this.match.undoGoal(command.payload.teamId);
        break;
        
      case "timeout":
        this.match.registerTimeout(command.payload.teamId);
        break;
      case "reset_timeouts":
        this.match.resetTimeouts();
        break;
      case "start_expulsion":
        this.match.startExpulsion(command.payload.teamId, command.payload.playerNumber);
        break;
      case "set_team_info":
        this.match.updateTeamInfo(command.payload.teamId, {
          name: command.payload.name,
          logoUrl: command.payload.logoUrl,
        });
        break;
      case "set_roster":
        this.match.setRoster(command.payload.teamId, command.payload.players);
        break;
      case "set_remaining_time":
        this.match.setRemainingTime(command.payload.remainingMs);
        break;
      case "set_player_ejections":
        this.match.setPlayerEjections(
          command.payload.teamId,
          command.payload.playerNumber,
          command.payload.ejections
        );
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

  teamIdFromString(value: string): TeamSide {
    if (value === "home" || value === "away") {
      return value;
    }
    throw new CommandFailed("Team non valido");
  }
}
