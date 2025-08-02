import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileUploadService } from './file-upload.service';
import { ChunkingService } from './Embedding/chunking.service';
import { McpService } from './mcp/mcp.service';
import { Ollama } from '@langchain/ollama';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    private readonly chunkingService: ChunkingService,
    private readonly mcp: McpService,
  ) {}
  private chatHistory: Array<{ role: string; content: string }> = [];

  async startChat(message: string, useAdvanced: Boolean) {
    // Start Tools
    const toolsResult = await this.mcp.listTools();
    const ollamaTools = toolsResult.tools.slice(1).map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || 'No description provided',
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
    }));
      

    console.log(`Received message for chat: ${message}`);

    // GET THE TOPIC
    const optimzedMessage = await this.OptimzedMessage(message);
    console.log(`Optimized search: ${optimzedMessage}`);

    // Get relevant context from vector database
    const context = await this.chunkingService.queryWithMessage(optimzedMessage);

    const payload = {
      model: 'llama3.1',
      messages: [
        ...this.chatHistory,
        {
          role: 'system',
          content: `You are an AI assistant with access to web API documentation via RAG and function calling capabilities.
        
        CRITICAL HISTORY TRACKING:
        - Always review the conversation history above for context
        - When you provide numbered lists, remember the EXACT order and mapping
        - When users reference numbers (1, 2, 3, etc.), they refer to the EXACT position in your most recent numbered list
        - Double-check your previous response to ensure correct mapping before making function calls
        
        RESPONSE RULES:
        You have exactly TWO response modes - never mix them:
        
        CONVERSATIONAL RESPONSES:
        - Use for greetings, general questions, explanations, and natural conversation
        - Answer API questions directly using the documentation context provided
        - When providing lists, use clear numbering that you can reference later
        
        FUNCTION CALLS:
        - Use when the user requests generated code/examples (curl commands, SDK code, etc.)
        - Return ONLY the JSON tool call with no explanations or commentary
        - Before making the call, verify the numbered reference against your previous response
        - Include context from conversation history in your function parameters
        
        NUMBERED REFERENCE HANDLING:
        - "curl for 1" = first item in your last numbered list
        - "curl for 2" = second item in your last numbered list
        - Always double-check the mapping before making function calls
        
        When making function calls, respond with ONLY the JSON - no introductory text or explanations.`
        },
        {
          role: 'system', 
          content: `API Documentation:\n${JSON.stringify(context)}`
        },
        {
          role: 'system',
          content: `Swagger specification: ../fumaDocs.json`
        },
        {
          role: 'user',
          content: message
        }
      ],
      stream: false,
      tools: ollamaTools,
    };
    this.chatHistory.push({
      role: 'user',
      content: `${message}`,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:11434/api/chat', payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      console.log('AI response received.');
      const aiMessage = response.data.message;
      const toolCalls = aiMessage.tool_calls || [];

      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          console.log(`Calling tool: ${call.function.name}`);
          const toolName = call.function.name;
          const args = call.function.arguments;

          const result = await this.mcp.invokeTool(toolName, args);
          console.log(`Tool ${toolName} call completed.`);

          //LOGIC FOR ADVANCED REASONING 
          let AiModel = "llama3.1";
          if (useAdvanced){
            AiModel = "deepseek-coder-v2"
          }



          const followUpPayload = {
            model: AiModel, //CHANGE TO LLAMA3.1 FOR LESS STORAGE USE
            messages: [
              ...this.chatHistory,
              {
                role: 'system',
                content: `You are an AI assistant that presents tool execution results to users in a clear, helpful way.
              
              TASK: Answer the user's question directly using the provided data.
              
              TOOL DATA:
              - Tool: ${toolName}
              - Result: ${JSON.stringify(result)}
              - User Question: "${message}"
              
              INSTRUCTIONS:
              - Answer the user's question using the result data
              - Present information clearly and conversationally
              - Format code/commands with proper markdown code blocks
              - If result contains curl commands or code, display them cleanly
              - Explain any important details or limitations
              
              CRITICAL: Do not mention "tool calls", "tool results", "based on the tool", or "according to the tool". Simply present the information as if you generated it directly.
              
              Be direct, helpful, and well-formatted in your response.`
              },
              {
                role: 'system', 
                content: `API Documentation:\n${JSON.stringify(context)}`
              },
              {
                role: 'user', 
               content: message
              }
            ],
            stream: false,
          };
          const followUpResponse = await firstValueFrom(
            this.httpService.post('http://localhost:11434/api/chat', followUpPayload, {
              headers: { 'Content-Type': 'application/json' },
            }),
          );
          console.log(`[AI]: ${followUpResponse.data.message.content}`);
          this.chatHistory.push({ role: 'assistant', content: followUpResponse.data.message.content });
          return followUpResponse.data.message.content;
        }
      }

      this.chatHistory.push({ role: 'assistant', content: aiMessage.content });
      console.log(`[AI]: ${aiMessage.content}`);
      return aiMessage.content;
    } catch (error) {
      console.error('Error in startChat:', error.message);
      throw error;
    }
  }

  async OptimzedMessage(message: string): Promise<string> {
    // USE AI TO INFER TOPIC AND GET BUZZWORDS FOR VECTOR DB RETRIEVAL
    const topicMessage = [
      ...this.chatHistory,
      {
        role: 'system',
        content: `Your only purpose is as a keyword extractor for a search, respond only with the searchable keywords. Read the conversation history above, then extract search keywords from the message below.
    Extract only the most important searchable terms as space-separated keywords on one line. If the message references previous conversation (like "number 1", "that endpoint"), include relevant context keywords. ADD NO EXTRA COMMENTARY OR NOTES JUST THE KEYWORDS!`
      },
      {
        role: 'user', 
        content: `Here is the message: ${message}`
      }];

    const topicPayload = {
      model: 'llama3.1',
      messages: topicMessage,
      stream: false,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post('http://localhost:11434/api/chat', topicPayload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );
      // Return only the first line of the response content
      return response.data.message.content;
    } catch (error) {
      console.error('Error in OptimzedMessage:', error.message);
      throw error;
    }
  }
}
