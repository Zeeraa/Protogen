export enum SocketMessageType {
  // ===== S2C (Server to Client) =====
  S2C_RgbPreview = "S2C_RgbPreview",
  S2C_VisorPreview = "S2C_VisorPreview",
  S2C_Ping = "S2C_Ping",
  S2C_AudioData = "S2C_AudioData",
  S2C_LogMessage = "S2C_LogMessage",
  S2C_AudioLevel = "S2C_AudioLevel",
  S2C_DevHardwareEmulationState = "S2C_DevHardwareEmulationState",
  S2C_Overview = "S2C_Overview",
  S2C_GamepadState = "S2C_GamepadState",

  // ===== C2S (Client to Server) =====
  C2S_EnableRgbPreview = "C2S_EnableRgbPreview",
  C2S_EnableVisorPreview = "C2S_EnableVisorPreview",
  C2S_EnableAudioPreview = "C2S_EnableAudioPreview",
  C2S_Ping = "C2S_Ping",
  C2S_AudioVisualiserSettings = "C2S_AudioVisualizerSettings",
  C2S_EnableDevData = "C2S_EnableDevData",
  C2S_EnableGamepadPreview = "C2S_EnableGamepadState",
}
