/**
 * Server-side data directory. Use DATA_PATH when running in Electron (packaged app)
 * so user data lives in AppData; otherwise use cwd/data.
 */
import path from 'path';

export function getDataDir(): string {
  return process.env.DATA_PATH ?? path.join(process.cwd(), 'data');
}
