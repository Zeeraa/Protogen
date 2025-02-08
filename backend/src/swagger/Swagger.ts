import consoleStamp from 'console-stamp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import swaggerAutogen from 'swagger-autogen';

consoleStamp(console);

function listTsFiles(dir: string): string[] {
  const results: string[] = [];

  const listFiles = (directory: string) => {
    const files = readdirSync(directory);

    files.forEach((file) => {
      const fullPath = join(directory, file);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively list files in subdirectory
        listFiles(fullPath);
      } else if (fullPath.endsWith('.ts')) {
        // Only push .ts files
        results.push(fullPath);
      }
    });
  };

  listFiles(dir);
  return results;
}

const server = {
  url: '/api',
  description: 'Built in'
};

const doc = {
  info: {
    version: 'v1.0.0',
    title: 'Protogen API',
    description: 'Integrated API in protogen server'
  },
  servers: [server],
  components: {
  },
  tags: [],
  securityDefinitions: {
    tokenAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Token auth used by web ui'
    },
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-api-key',
      description: 'Api key for using api in scripts'
    }
  }
};

const outputFile = '../../swagger.json';
const endpointFiles = [
  ...listTsFiles("./src/webserver/routes")
];

console.log("Endpoint files:");
console.log(JSON.stringify(endpointFiles, null, 4));

swaggerAutogen({ openapi: '3.0.0' })(outputFile, endpointFiles, doc);
