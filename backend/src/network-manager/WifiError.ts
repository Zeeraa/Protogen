export class WifiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "WifiError";
    this.statusCode = statusCode;
  }
}
