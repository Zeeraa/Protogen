export enum SocketMessageType {
  // ===== S2C (Server to Client) =====
  S2C_RgbPreview = "S2C_RgbPreview",
  S2C_VisorPreview = "S2C_VisorPreview",
  S2C_Ping = "S2C_Ping",
  S2C_AudioData = "S2C_AudioData",
  S2C_LogMessage = "S2C_LogMessage",
  S2C_RemoteState = "S2CRemoteState",

  // ===== C2S (Client to Server) =====
  C2S_EnableRgbPreview = "C2S_EnableRgbPreview",
  C2S_EnableVisorPreview = "C2S_EnableVisorPreview",
  C2S_Ping = "C2S_Ping",
  C2S_EnableRemotePreview = "C2S_EnableRemotePreview",

  // ===== E2S (External to Server) =====
  E2S_RemoteState = "E2S_RemoteState",
}
