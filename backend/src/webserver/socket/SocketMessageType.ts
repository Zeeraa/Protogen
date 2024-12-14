export enum SocketMessageType {
  // ===== S2C (Server to Client) =====
  S2C_RgbPreview = "S2C_RgbPreview",
  S2C_VisorPreview = "S2C_VisorPreview",
  S2C_Ping = "S2C_Ping",
  S2C_AudioData = "S2C_AudioData",
  S2C_LogMessage = "S2C_LogMessage",

  // ===== C2S (Client to Server) =====
  C2S_EnableRgbPreview = "C2S_EnableRgbPreview",
  C2S_EnableVisorPreview = "C2S_EnableVisorPreview",
  C2S_Ping = "C2S_Ping",
}