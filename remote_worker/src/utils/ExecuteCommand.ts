import { exec } from "child_process";

export function executeCommand(command: string): Promise<number> {
  return new Promise((resolve, _) => {
    exec(command, (error, _, __) => {
      if (error) {
        resolve(error.code || 1);
      } else {
        resolve(0);
      }
    });
  });
}
