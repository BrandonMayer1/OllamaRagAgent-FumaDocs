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
    private readonly fileUploadService: FileUploadService,
    private readonly chunkingService: ChunkingService,
    private readonly mcp: McpService,
  ) {}
  private chatHistory: Array<{ role: string; content: string }> = [];

  async startChat(message: string) {
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
          role: 'user',
          content: `
"You are an advanced AI assistant specialized in helping users work with a Swagger API. Your responses should be natural and conversational while maintaining awareness of the API context.

Here is the current context from the Retrieval-Augmented Generation (RAG) system:
<context>
${context}
</context>

The Swagger API file is always located at:
<swagger_file_path>../fumaDocs.json</swagger_file_path>

Please address the following user query:
<user_query>
${message}
</user_query>

Your task is to provide assistance related to this Swagger API. You have two possible response types:

1. Natural language response: Use this for general information, explanations, or when a tool call is not necessary.

2. Tool call: Use this when you need to interact with the API directly. Tool calls must be in the following JSON format with no additional commentary:

{
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": {
        "arg1": "value1"
      }
    }
  ]
}

Instructions:
1. Analyze the user's query to determine whether a natural language response or a tool call is more appropriate.
2. For tool calls:
   - Ensure all required arguments are available.
   - If any arguments are missing, ask the user for them conversationally.
   - Double-check that only the JSON will be output, with no additional text.
3. For natural language responses:
   - Consider how the context relates to the user's query.
   - Provide a clear, informative, and conversational response.
4. Maintain context awareness throughout the conversation.
5. Never return empty responses.
6. Assume the Swagger file path is always available unless explicitly told otherwise.
7. Respond naturally without mentioning the background tools or RAG system.


Remember:
- For natural language responses, write your response normally.
- For tool calls, output ONLY the raw JSON with no additional text.

Now, please provide your response to the user's query."
          `,
        },
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

          const followUpPayload = {
            model: 'llama3.1',
            messages: [
              ...this.chatHistory,
              {
                role: 'assistant',
                content: `Analyze this tool result and answer the user's question:

Tool Used: ${toolName}
Tool Result: ${JSON.stringify(result)}

Steps:
1. Extract key insights from the result
2. Connect them to the user's question
3. Provide a clear answer referencing:
   - Relevant data points
   - Limitations
   - How it answers their question

User's Original Question:
${message}

Respond conversationally with the answer.`,
              },
              { role: 'user', content: `${message}` },
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
        role: 'user',
        content: `
You are an advanced AI assistant specialized in extracting optimal search terms from given messages. Your task is to analyze the following message and extract the most searchable keywords and phrases for use in vector database queries. Your output will be used directly in these queries, so precision and relevance are paramount.

Here is the message you need to analyze:

<message>
${message}
</message>

Instructions:
1. Carefully read and analyze the given message.
2. Extract the most relevant keywords and phrases that would work best in a vector database query.
3. Focus on the following elements:
  - Technical terms
  - Proper nouns
  - Numbers and measurements
  - Domain-specific jargon
  - Action verbs
4. Exclude the following!!!!!:
  - Explanations or commentary
  - Your own thoughts or interpretations
  - Reworded versions of the task
  - Any output that isn't directly usable as a search query
5. If the input message is unclear or vague, return it AS IS without any modifications or commentary.

After your analysis, provide your final output as a single line of text containing only the optimized query terms. Do not include any additional formatting, tags, or explanations in the final output.

Remember:
- Return ONLY optimized query terms in one line- no full sentences, no explanations, no filler text.
- If the input is unclear, return it unchanged without commentary.
- DO NOT ADD YOUR COMMENTARY ONLY OPTIMIZED WORDS FOR SEARCH
- Precision and relevance are crucial - each term in your output should significantly contribute to the query's effectiveness.
- I will you response exactly into the search so not additionaly commentary or notes.
- IMPORTANT RESPOND WITH ONE LINE ONLY OF KEYWORDS
`,
      },
    ];

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
      return response.data.message.content.split('\n')[0];
    } catch (error) {
      console.error('Error in OptimzedMessage:', error.message);
      throw error;
    }
  }
}
