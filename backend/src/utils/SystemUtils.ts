import * as os from 'os';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec to use it with async/await
export const execAsync = promisify(exec);

export async function shutdown() {
  await execAsync("sudo systemctl poweroff");
}

export async function killPID(pid: string) {
  await execAsync("kill -9 " + pid);
}

export async function restartFlaschenTaschen() {
  await execAsync("sudo service flaschen-taschen restart");
}

// Function to get temperature (requires `vcgencmd` to be installed on your Pi)
export const getTemperature = async (): Promise<number> => {
  try {
    const { stdout } = await execAsync('vcgencmd measure_temp');
    const temp = parseFloat(stdout.replace('temp=', '').replace("'C\n", ''));
    return temp;
  } catch (error) {
    console.error('Error getting temperature:', error);
    return -1;
  }
};

// Function to get OS version and extract release information
export const getOSVersion = async (): Promise<string> => {
  try {
    const { stdout } = await execAsync('cat /etc/os-release');
    const releaseMatch = stdout.match(/PRETTY_NAME="([^"]+)"/);
    return releaseMatch ? releaseMatch[1] : 'Unknown';
  } catch (error) {
    console.error('Error getting OS version:', error);
    return 'Unknown';
  }
};

// Function to get IP using wtfismyip.com API
export const getPublicIP = async (): Promise<string> => {
  try {
    const response = await axios.get('https://wtfismyip.com/json');
    return response.data.YourFuckingIPAddress;
  } catch (error) {
    console.error('Error getting public IP:', error);
    return 'Unknown';
  }
};

// Function to get real-time CPU usage in percentage
export const getCPUUsage = async (): Promise<number> => {
  const cpus = os.cpus();
  const startUsage = cpus.map(cpu => cpu.times);

  // Wait for a short period to get a better snapshot
  await new Promise(resolve => setTimeout(resolve, 100));

  const endUsage = os.cpus().map(cpu => cpu.times);

  const totalStart = startUsage.reduce((total, cpu) => {
    total.user += cpu.user;
    total.nice += cpu.nice;
    total.sys += cpu.sys;
    total.idle += cpu.idle;
    total.irq += cpu.irq;
    return total;
  }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });

  const totalEnd = endUsage.reduce((total, cpu) => {
    total.user += cpu.user;
    total.nice += cpu.nice;
    total.sys += cpu.sys;
    total.idle += cpu.idle;
    total.irq += cpu.irq;
    return total;
  }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });

  const totalTime = (totalEnd.user + totalEnd.nice + totalEnd.sys + totalEnd.idle + totalEnd.irq) -
    (totalStart.user + totalStart.nice + totalStart.sys + totalStart.idle + totalStart.irq);

  const idleTime = totalEnd.idle - totalStart.idle;

  const usage = ((totalTime - idleTime) / totalTime) * 100;
  return parseFloat(usage.toFixed(2));
};

// Function to get real-time RAM usage in percentage
export const getRAMUsage = async (): Promise<number> => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usage = (usedMem / totalMem) * 100;
  return parseFloat(usage.toFixed(2));
};