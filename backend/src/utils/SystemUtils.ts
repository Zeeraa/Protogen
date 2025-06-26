import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec to use it with async/await
export const execAsync = promisify(exec);

export async function killPID(pid: string) {
  await execAsync("kill -9 " + pid);
}

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
