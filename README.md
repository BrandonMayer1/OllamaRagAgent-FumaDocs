# FumaDocs RAG AI Agent

A powerful AI-powered documentation assistant that combines **FumaDocs** for documentation management, **RAG (Retrieval-Augmented Generation)** for context-aware responses, and **MCP (Model Context Protocol)** for function calling capabilities.

## 🚀 Features

- **Intelligent Chat Interface**: AI-powered conversation with context awareness
- **RAG Integration**: Vector database retrieval for relevant documentation
- **Function Calling**: Generate code examples and API calls using MCP tools
- **Advanced Reasoning**: Optional Deepseek-Coder-V2 for enhanced code generation
- **File Upload Support**: Upload documentation files with Supabase storage
- **Real-time Processing**: Prevents multiple submissions during AI generation
- **Markdown Rendering**: Rich formatting for AI responses

## 🏗️ Architecture

This project combines several powerful technologies:

- **[FumaDocs](https://github.com/fuma-nama/fumadocs)**: Next.js-based documentation framework
- **[Swagger MCP](https://github.com/readingdancer/swagger-mcp)**: Model Context Protocol server for API tool generation
- **Ollama**: Local LLM inference with Llama 3.1 and Deepseek-Coder-V2
- **Vector Database**: Chunking and embedding for RAG capabilities
- **Supabase**: Optional cloud storage for uploaded files

## 📋 Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Ollama (for local LLM inference)
- Supabase account (optional, for file storage)

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd FumaDocs-Rag-Ai-Agent
```

### 2. Start Docker Containers

```bash
docker-compose up -d
```

### 3. Configure Environment Variables

Create a `.env` file in the `AI-Agent` directory:

```env
# Supabase Configuration (Optional)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### 4. Install Dependencies

```bash
npm run install:all
```

### 5. Generate Documentation

```bash
npm run generateDocs
```

### 6. Build All Projects

```bash
npm run build:all
```

## 🤖 Ollama Setup

Install and configure Ollama models:

```bash
# Install Ollama (if not already installed)
# https://ollama.ai/

# Pull required models
ollama pull llama3.1
ollama pull mxbai-embed-large

# Optional: For enhanced code generation
ollama pull deepseek-coder-v2
```

## 🚀 Running the Application

```bash
npm run start:all
```

- **FumaDocs**: http://localhost:3000
- **AI Agent**: http://localhost:3001

## 🎯 Usage

### Basic Chat
1. Open the AI Agent interface at http://localhost:3001
2. Type your question in the chat input
3. The AI will respond using RAG-enhanced context

### Advanced Features

#### Enhanced Code Generation
- Check "Use smarter reasoning for code generation" to enable Deepseek-Coder-V2
- Provides more sophisticated code generation and reasoning

#### File Uploads
- Check "File Uploads are stored in supabase" to enable cloud storage
- Upload `.md` files for additional documentation context

#### Function Calling
- Ask for specific API calls: "Generate a curl command for creating a pet"
- Request code examples: "Show me how to list all pets"
- The AI will use MCP tools to generate accurate code

## 🔧 Configuration

### Updating API Documentation
Edit `fumaDocs.json` to update the OpenAPI specification:

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Your API",
    "version": "1.0.0"
  },
  // ... your API specification
}
```

### Clearing Vector Database
```bash
npm run clearDB
```

## 📚 Credits and Acknowledgments

This project builds upon several excellent open-source projects:

### [FumaDocs](https://github.com/fuma-nama/fumadocs)
- **Creator**: [fuma-nama](https://github.com/fuma-nama)
- **Purpose**: Next.js-based documentation framework
- **License**: MIT
- **Contribution**: Provides the documentation infrastructure and MDX support

### [Swagger MCP](https://github.com/readingdancer/swagger-mcp)
- **Creator**: [readingdancer](https://github.com/readingdancer)
- **Purpose**: Model Context Protocol server for API tool generation
- **License**: MIT
- **Contribution**: Enables function calling and code generation capabilities

### Additional Technologies
- **Ollama**: Local LLM inference engine
- **Supabase**: Backend-as-a-Service for file storage
- **NestJS**: Backend framework for the AI agent
- **Next.js**: Frontend framework for documentation





---



