# Getting Started

## 1. Start Docker Containers

```sh
docker-compose up -d
```

## 2. Configure Environment Variables

- Enter your supabase information in the `.env` file located in the project root of  `AI-Agent` 

## 3. Install All Packages

```sh
npm run install:all
```

## 4. Generate Documentation

```sh
npm run generateDocs
```

## 5. Build All Projects

```sh
npm run build:all
```

## 6. Ollama Setup Instructions

- Make sure you have Ollama installed and running locally.
- llama 3.1 and mxbai-embed-large

```sh
ollama pull llama3.1
ollama pull mxbai-embed-large

**If you want to enable smarter code generation**
ollama pull deepseek-coder-v2
```

## 7. Start the App.

```sh
npm run start:all
```
The fumadocs will be running on port 3000
The Ai agent will be runnign on port 3001

### Use smarter reasoning for code generation (Must have Deepseek-CoderV2 installed)
 -Uses DeepseekCoder-V2 instead of Ollama3.1 
### File Uploads are stored in supabase (Must have github .env setup)
 -Uploaded files from the manual submit button to supabase, if the user entered their supabase credentails to .env

### To change the Open AI docs. 
Paste new information into fumaDocs.json.

### To clear the vectorDB
```sh
npm run clearDB
```


