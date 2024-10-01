import { cyan } from "colors";

export class Logger {
  public info(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.log(msg);
  }

  public warn(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.warn(msg);
  }

  public error(system: string | null, message: string) {
    let msg = "";
    if (system != null) {
      msg = "[" + cyan(system) + "] ";
    }
    msg += message;

    console.error(msg);
  }
}