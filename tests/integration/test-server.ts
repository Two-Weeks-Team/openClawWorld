import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestServer {
  process: ChildProcess;
  port: number;
  baseUrl: string;
  shutdown: () => Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url: string, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Expected - server not ready yet, continue polling
    }
    await sleep(500);
  }
  throw new Error(`Server did not start within ${timeout}ms`);
}

export async function startTestServer(): Promise<TestServer> {
  const port = 10000 + Math.floor(Math.random() * 55000);
  const baseUrl = `http://localhost:${port}`;

  const serverDir = resolve(__dirname, '../../packages/server');

  const serverProcess = spawn('tsx', ['watch', 'src/index.ts'], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });

  let stdout = '';
  let stderr = '';

  serverProcess.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  try {
    await waitForServer(`${baseUrl}/health`);
  } catch (error) {
    serverProcess.kill('SIGTERM');
    throw new Error(
      `Failed to start test server on port ${port}. ` + `Stdout: ${stdout}\nStderr: ${stderr}`,
      { cause: error }
    );
  }

  const shutdown = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill('SIGKILL');
        reject(new Error('Server shutdown timeout'));
      }, 10000);

      serverProcess.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      serverProcess.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });

      serverProcess.kill('SIGTERM');
    });
  };

  return {
    process: serverProcess,
    port,
    baseUrl,
    shutdown,
  };
}

export async function withTestServer<T>(fn: (server: TestServer) => Promise<T>): Promise<T> {
  const server = await startTestServer();
  try {
    return await fn(server);
  } finally {
    await server.shutdown();
  }
}

export function getTestApiKey(): string {
  return 'test-api-key-integration';
}
