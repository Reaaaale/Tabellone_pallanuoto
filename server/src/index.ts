import { startWebsocketServer } from "./infrastructure/websocketServer";

const port = Number(process.env.PORT ?? 4000);
startWebsocketServer({ port });
