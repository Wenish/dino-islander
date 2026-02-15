import { IServerConfig } from "./utils/types";

export const config: IServerConfig = {
  port: parseInt(process.env.PORT || "3011", 10),
  debug: process.env.DEBUG === "true",
  gameRoom: {
    maxPlayers: 2,
  },
};
