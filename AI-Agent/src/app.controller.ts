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
        <style>
          body {
            font-family: sans-serif;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .chat-box {
            display: flex;
            flex-direction: column;
            border: 1px solid #ccc;
            background: #fff;
            padding: 10px;
            height: 300px;
            overflow-y: auto;
            margin-bottom: 20px;
          }
          .bubble {
            display: block;
            padding: 10px;
            margin: 6px 0;
            border-radius: 15px;
            max-width: 80%;
            word-wrap: break-word;
          }
          .user {
            background-color: rgb(45, 167, 238);
            color: white;
          }
          .ai {
            background-color: rgb(141, 141, 151);
            color: white;
          }
          .checkbox-container {
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="chat-box" id="chatBox">
          ${chatHistory}
        </div>
        
        <form id="chatForm">
          <input type="text" id="messageInput" required />
          <input type="submit" value="Submit" />
        </form>
        
        <form action="/upload" method="post" enctype="multipart/form-data" id="uploadForm">
          <input type="file" name="file" accept=".md" required />
          <input type="hidden" name="useSupabase" id="hiddenUseSupabase" value="false" />
          <button type="submit">Upload File</button>
        </form>
        <div class="checkbox-container">
          <label>
            <input type="checkbox" id="useAdvancedModel" />
            Use smarter reasoning for code generation (Must have Deepseek-CoderV2 installed)
          </label>
        </div>
        <div class="checkbox-container">
          <label>
            <input type="checkbox" id="useSupabase" ${this.usingSupabase ? 'checked' : ''}/>
            File Uploads are stored in supabase (Must have github .env setup)
          </label>
        </div>

        <script>
          const supabaseCheckbox = document.getElementById('useSupabase');
          const hiddenUseSupabase = document.getElementById('hiddenUseSupabase');


          document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('useSupabase').checked = ${this.usingSupabase};
          });
                    
          supabaseCheckbox.addEventListener('change', function() {
            hiddenUseSupabase.value = this.checked;
          });

          // Handle chat form submission
          document.getElementById("chatForm").addEventListener('submit', async function(e) {
            e.preventDefault();

            const inputElement = document.getElementById('messageInput');
            const message = inputElement.value;
            const useAdvanced = document.getElementById('useAdvancedModel').checked;

            const chatBox = document.getElementById('chatBox');
            chatBox.innerHTML += '<div class="bubble user">You: ' + message + '</div>';
            inputElement.value = '';

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
              chatBox.innerHTML += '<div class="bubble ai">AI: ' + data.aiResponse + '</div>';
            } catch (error) {
              chatBox.innerHTML += '<div class="bubble ai">Error getting response</div>';
            }
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
