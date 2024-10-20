import { SocketMessageType } from "./SocketMessageType";

export interface SocketMessage {
  type: SocketMessageType;
  data: any;
}
