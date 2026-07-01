import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, '..');
const workspaceRoot = path.resolve(backendRoot, '..');

const envFiles = [
  path.join(workspaceRoot, '.env'),
  path.join(backendRoot, '.env'),
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    config({
      path: envFile,
      override: true,
    });
  }
}
