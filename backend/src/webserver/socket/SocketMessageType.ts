export enum SocketMessageType {
  // ===== S2C (Server to Client) =====
  S2C_RgbPreview = "S2C_RgbPreview",
  S2C_VisorPreview = "S2C_VisorPreview",
  S2C_Ping = "S2C_Ping",
  S2C_AudioData = "S2C_AudioData",
  S2C_LogMessage = "S2C_LogMessage",
  S2C_JoystickRemoteState = "S2C_JoystickRemoteState",
  S2C_RemoteAudioLevel = "S2C_RemoteAudioLevel",

  // ===== C2S (Client to Server) =====
  C2S_EnableRgbPreview = "C2S_EnableRgbPreview",
  C2S_EnableVisorPreview = "C2S_EnableVisorPreview",
  C2S_EnableAudioPreview = "C2S_EnableAudioPreview",
  C2S_Ping = "C2S_Ping",
  C2S_EnableRemotePreview = "C2S_EnableRemotePreview",
  C2S_AudioVisualiserSettings = "C2S_AudioVisualizerSettings",

  // ===== E2S (External to Server) =====
  E2S_JoystickRemoteState = "E2S_JoystickRemoteState",
  E2S_AudioLevel = "E2S_AudioLevel",

  // ===== E2S (Server to External) =====
  S2E_JoystickRemoteConfigChange = "S2E_JoystickRemoteConfigChange",
  S2E_JoystickRemoteProfileChange = "S2E_JoystickRemoteProfileChange",
}
