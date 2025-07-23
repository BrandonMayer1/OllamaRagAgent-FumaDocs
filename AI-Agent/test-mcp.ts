import { McpService } from './src/mcp/mcp.service';
import axios from 'axios';

async function main() {
  const mcp = new McpService();
  await mcp.onModuleInit();

  try {
    const toolsResult = await mcp.listTools();

    if (toolsResult?.tools && toolsResult.tools.length > 0) {
      const ollamaTools = toolsResult.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description || 'No description provided',
          parameters: tool.inputSchema || { type: 'object', properties: {} }
        }
      }));

      console.log('✅ Ollama Tools:', JSON.stringify(ollamaTools, null, 2));

      // ✅ Send a test request to Ollama
      const initialPrompt = 'Download the Swagger file from https://petstore.swagger.io/v2/swagger.json and list all endpoints.';
      console.log(`💬 Sending prompt to Ollama: "${initialPrompt}"`);

      const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
        model: 'llama3.1',
        messages: [
          { role: 'system', content: 'You can use the following tools to perform tasks.' },
          { role: 'user', content: initialPrompt }
        ],
        tools: ollamaTools
      });

      console.log('🔍 Ollama Response:', JSON.stringify(ollamaResponse.data, null, 2));

      const toolCalls = ollamaResponse.data.message?.tool_calls || [];

      // ✅ Handle tool calls if Ollama requests them
      for (const call of toolCalls) {
        const name = call.function.name;
        const args = call.function.arguments;

        console.log(`🔧 Executing MCP tool: ${name}`, args);

        // Call MCP tool
        const result = await mcp.invokeTool(name, args);
        console.log('✅ MCP Result:', result);

        // Feed the result back to Ollama for reasoning
        const followUp = await axios.post('http://localhost:11434/api/chat', {
          model: 'llama3.1',
          messages: [
            { role: 'assistant', content: `Tool result:\n${JSON.stringify(result)}` },
            { role: 'user', content: 'Please provide a clear answer based on the tool result.' }
          ]
        });

        console.log('💬 Final AI Response:', followUp.data.message.content);
      }

    } else {
      console.log('⚠️ No tools found.');
    }

  } catch (err) {
    console.error('❌ Error during MCP + Ollama test:', err);
  } finally {
    await mcp.onModuleDestroy();
  }
}

main();
