import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

interface McpToolListResponse {
  tools: McpTool[];
}

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private mcpProcess: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, (result: any) => void>();

  // Start the MCP process
  async onModuleInit() {
    this.mcpProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: '../swagger-mcp', 
    });

    if (this.mcpProcess.stdout) {
      this.mcpProcess.stdout.on('data', (data) => {
        data
          .toString()
          .split('\n')
          .filter(Boolean)
          .forEach((line) => {
            try {
              const msg = JSON.parse(line);
              if (msg.id && this.pending.has(msg.id)) {
                this.pending.get(msg.id)!(msg.result);
                this.pending.delete(msg.id);
              }
            } catch (e) {
            }
          });
      });
    }

    this.mcpProcess.on('error', (err) => {
      console.error('MCP process error:', err);
    });

    this.mcpProcess.on('exit', (code, signal) => {
      console.log(`MCP process exited with code ${code}, signal ${signal}`);
    });
  }

  // Stop the MCP process
  async onModuleDestroy() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
      console.log('MCP process stopped.');
    }
  }

  private sendRequest(method: string, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.mcpProcess) {
        console.error('[sendRequest] MCP process is NOT running.');
        return reject(new Error('MCP process is not running'));
      }

      const id = ++this.requestId;
      const payload = { jsonrpc: '2.0', id, method, params };

      console.log(`[sendRequest] Sending request:`, JSON.stringify(payload, null, 2));

      this.pending.set(id, (result: any) => {
        console.log(`[sendRequest] Response received for ID ${id}.`);
        resolve(result);
      });

      try {
        this.mcpProcess.stdin!.write(JSON.stringify(payload) + '\n');
        console.log(`[sendRequest] Request written to MCP stdin.`);
      } catch (err) {
        console.error(`[sendRequest] Failed to write to MCP stdin:`, err);
        reject(err);
      }
    });
  }

  // List available tools
  async listTools(): Promise<McpToolListResponse> {
    console.log('LISTING TOOLS');
    const res = await this.sendRequest('tools/list');
    if (!res) {
      console.error('[listTools] MCP did not return a valid tool list.');
      throw new Error('MCP did not return a valid tool list');
    }
    return res as McpToolListResponse;
  }

  // Invoke a tool by name
  async invokeTool(name: string, args: Record<string, any>) {
    console.log(`[invokeTool] Invoking tool: ${name}`);
    const res = await this.sendRequest('tools/call', { name, arguments: args });
    console.log(`[invokeTool] Tool ${name} call completed.`);
    return res;
  }
}  