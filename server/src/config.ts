import { IServerConfig } from "./utils/types";
import defaults from "./config.json";

export const config: IServerConfig = {
  port: parseInt(process.env.PORT || String(defaults.port), 10),
  debug: process.env.DEBUG === "true" || defaults.debug,
  gameRoom: defaults.gameRoom,
};
