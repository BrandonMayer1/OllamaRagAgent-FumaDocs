import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { FileUploadService } from './file-upload.service';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingModule } from './Embedding/embedding.module';
import { McpService } from './mcp/mcp.service';

@Module({
  imports: [HttpModule, ConfigModule.forRoot(), EmbeddingModule],
  controllers: [AppController],
  providers: [AppService, FileUploadService, McpService],
})
export class AppModule {}
