import { Controller, Get, Post, Body, Res, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { FileUploadService } from './file-upload.service';
import { SupabaseService } from './Embedding/supabase.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileUploadService: FileUploadService,
    private readonly supabaseService: SupabaseService,
  ) {}
  private UserChats: string[] = [];
  private AiChats: string[] = [];
  private usingSupabase: boolean = false;

  @Get()
  Homepage() {
    let chatHistory = '';
    for (let i = 0; i < this.UserChats.length; i++) {
      chatHistory += `<div class="bubble user">You: ${this.UserChats[i]}</div>`;
      if (this.AiChats[i] != null) {
        chatHistory += `<div class="bubble ai">AI: ${this.AiChats[i]}</div>`;
      }
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <title>ChatBot</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: sans-serif;
            background-color: #f5f5f5;
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 10px;
        }

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .chat-box {
            flex: 1;
            border: 1px solid #ddd;
            background: #fff;
            padding: 15px;
            overflow-y: auto;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-height: 0;
        }

        .chat-box::-webkit-scrollbar {
            width: 8px;
        }

        .chat-box::-webkit-scrollbar-thumb {
            background: #ccc;
            border-radius: 4px;
        }

        .bubble {
            display: block;
            padding: 12px 16px;
            margin: 8px 0;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
            line-height: 1.4;
        }

        .user {
            background-color: #2da7ee;
            color: white;
            margin-left: auto;
        }

        .ai {
            background-color: #8d8d97;
            color: white;
            margin-right: auto;
        }

        /* Markdown styling for AI responses */
        .ai h1, .ai h2, .ai h3, .ai h4, .ai h5, .ai h6 {
            margin: 0.5em 0 0.3em 0;
            font-weight: bold;
        }

        .ai p {
            margin: 0.5em 0;
        }

        .ai ul, .ai ol {
            margin: 0.5em 0;
            padding-left: 1.5em;
        }

        .ai li {
            margin: 0.25em 0;
        }

        .ai code {
            background-color: rgba(255,255,255,0.2);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }

        .ai pre {
            background-color: rgba(255,255,255,0.2);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 0.5em 0;
        }

        .ai pre code {
            background: none;
            padding: 0;
        }

        .ai strong {
            font-weight: bold;
        }

        .ai em {
            font-style: italic;
        }

        .controls-container {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            flex-shrink: 0;
        }

        .chat-form {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }

        #messageInput {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            outline: none;
        }

        #messageInput:focus {
            border-color: #2da7ee;
            box-shadow: 0 0 0 2px rgba(45, 167, 238, 0.2);
        }

        .submit-btn {
            padding: 12px 20px;
            background-color: #2da7ee;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }

        .submit-btn:hover {
            background-color: #2590c7;
        }

        .upload-form {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 15px;
            padding: 12px;
            background-color: #f9f9f9;
            border-radius: 6px;
            border: 1px solid #eee;
        }

        .file-input {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            font-size: 14px;
        }

        .upload-btn {
            padding: 8px 16px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .upload-btn:hover {
            background-color: #218838;
        }

        .options-container {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .checkbox-container {
            flex: 1;
            min-width: 250px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 6px;
            border: 1px solid #eee;
        }

        .checkbox-container label {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            cursor: pointer;
            font-size: 13px;
            line-height: 1.3;
        }

        .checkbox-container input[type="checkbox"] {
            margin-top: 2px;
        }

        .loading {
            display: none;
            text-align: center;
            padding: 8px;
            color: #666;
            font-style: italic;
            background: rgba(255,255,255,0.9);
            border-radius: 4px;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-box" id="chatBox">
            ${chatHistory}
        </div>

        <div class="loading" id="loading">Thinking...</div>
    </div>

    <div class="controls-container">
        <form class="chat-form" id="chatForm">
            <input type="text" id="messageInput" placeholder="Type your message..." required />
            <button type="submit" class="submit-btn">Submit</button>
        </form>

        <form class="upload-form" action="/upload" method="post" enctype="multipart/form-data" id="uploadForm">
            <input type="file" class="file-input" name="file" accept=".md" required />
            <input type="hidden" name="useSupabase" id="hiddenUseSupabase" value="false" />
            <button type="submit" class="upload-btn">Upload File</button>
        </form>

        <div class="options-container">
            <div class="checkbox-container">
                <label>
                    <input type="checkbox" id="useAdvancedModel" />
                    Use smarter reasoning for code generation (Must have Deepseek-CoderV2 installed)
                </label>
            </div>

            <div class="checkbox-container">
                <label>
                    <input type="checkbox" id="useSupabase" />
                    File Uploads are stored in supabase (Must have github .env setup)
                </label>
            </div>
        </div>
    </div>

    <script>
        const supabaseCheckbox = document.getElementById('useSupabase');
        const hiddenUseSupabase = document.getElementById('hiddenUseSupabase');
        const chatBox = document.getElementById('chatBox');
        const loading = document.getElementById('loading');

                 document.addEventListener('DOMContentLoaded', function() {
             document.getElementById('useSupabase').checked = ${this.usingSupabase};
             // Set the hidden input value to match the checkbox state
             hiddenUseSupabase.value = ${this.usingSupabase};
             
             // Restore advanced reasoning checkbox state from localStorage
             const savedAdvancedState = localStorage.getItem('useAdvancedModel');
             if (savedAdvancedState !== null) {
                 document.getElementById('useAdvancedModel').checked = savedAdvancedState === 'true';
             }
         });

                 supabaseCheckbox.addEventListener('change', function() {
             hiddenUseSupabase.value = this.checked;
         });
         
         // Save advanced reasoning checkbox state to localStorage
         document.getElementById('useAdvancedModel').addEventListener('change', function() {
             localStorage.setItem('useAdvancedModel', this.checked.toString());
         });

        function scrollToBottom() {
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'bubble ' + (isUser ? 'user' : 'ai');
            
            if (isUser) {
                messageDiv.textContent = content;
            } else {
                // Parse markdown for AI responses - check if marked is loaded
                if (typeof marked !== 'undefined') {
                    try {
                        messageDiv.innerHTML = marked.parse(content);
                    } catch (error) {
                        console.error('Markdown parsing error:', error);
                        messageDiv.textContent = content; // Fallback to plain text
                    }
                } else {
                    console.warn('Marked.js not loaded, displaying as plain text');
                    messageDiv.textContent = content;
                }
            }
            
            chatBox.appendChild(messageDiv);
            scrollToBottom();
        }

        // Handle chat form submission
        document.getElementById("chatForm").addEventListener('submit', async function(e) {
            e.preventDefault();

            const inputElement = document.getElementById('messageInput');
            const message = inputElement.value;
            const useAdvanced = document.getElementById('useAdvancedModel').checked;

            if (!message.trim()) return;

            // Add user message
            addMessage('You: ' + message, true);
            inputElement.value = '';

            // Show loading
            loading.style.display = 'block';

            try {
                const response = await fetch('/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        useAdvanced: useAdvanced
                    })
                });

                const data = await response.json();
                
                // Hide loading and add response
                loading.style.display = 'none';
                
                // Remove "AI: " prefix if it exists since we add it in addMessage
                let aiResponse = data.aiResponse;
                if (aiResponse.startsWith('AI: ')) {
                    aiResponse = aiResponse.substring(4);
                }
                addMessage('AI: ' + aiResponse, false);
                
            } catch (error) {
                loading.style.display = 'none';
                addMessage('AI: Error getting response', false);
            }
        });

        // Handle Enter key
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('chatForm').dispatchEvent(new Event('submit'));
            }
        });

        // Process existing chat history for markdown
        function processExistingMessages() {
            const existingBubbles = chatBox.querySelectorAll('.bubble.ai');
            existingBubbles.forEach(bubble => {
                const content = bubble.textContent || bubble.innerText;
                if (content && typeof marked !== 'undefined') {
                    try {
                        bubble.innerHTML = marked.parse(content);
                    } catch (error) {
                        console.error('Error processing existing message:', error);
                    }
                }
            });
        }

        // Initialize - wait for marked.js to load
        document.addEventListener('DOMContentLoaded', function() {
            // Process any existing chat history
            if (typeof marked !== 'undefined') {
                console.log('Marked.js loaded successfully');
                processExistingMessages();
            } else {
                console.error('Marked.js failed to load');
            }
            
            scrollToBottom();
        });
    </script>
</body>
</html>`;
  }

  @Post('submit')
  async handleSubmit(@Body() body) {
    const userMessage = body.message;
    const useAdvanced = body.useAdvanced;
    if (useAdvanced){
      console.log("[!!] USING ADVANCED REASONING [!!]");
    }
    this.UserChats.push(userMessage);
    const AiResponse = await this.appService.startChat(userMessage, useAdvanced);
    this.AiChats.push(AiResponse);
    return { aiResponse: AiResponse };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
    @Body() body: any,
  ) {
    if (!file) {
      return res.status(400).send('No file uploaded');
    }

    try {
      const useSupabase = body.useSupabase === 'true';
      this.usingSupabase = body.useSupabase === 'true';

      
      if (useSupabase) {
        try {
          await this.supabaseService.uploadFile('doc-storage', file);
          console.log('-----------------UPLOADED FILE TO SUPABASE--------------------');
        } catch (supabaseError) {
          console.error('Supabase upload failed:', supabaseError.message);
        }
      }
      
      await this.fileUploadService.handleFileUpload(file);
      
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).send('Error processing file');
    }
    
    res.redirect('/');
  }
}
