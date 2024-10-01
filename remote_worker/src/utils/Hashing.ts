import * as fs from 'fs';
import * as crypto from 'crypto';

export function calculateSHA256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('error', (error) => {
            reject(error);
        });

        hash.setEncoding('hex');

        stream.on('end', () => {
            hash.end();
            resolve(hash.read());
        });

        stream.pipe(hash);
    });
}