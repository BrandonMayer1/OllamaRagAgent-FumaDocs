import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private supabaseAdmin: SupabaseClient | null;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Only initialize Supabase if credentials are provided
    if (supabaseUrl && serviceRoleKey) {
      try{
        this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      }
      catch(error){
        console.log(`INVALID CREDENTIALS: ${error}`);
      }
    } else {
      console.log('Supabase credentials not configured - Supabase uploads will be disabled');
      this.supabaseAdmin = null;
    }
  }

  async uploadFile(bucket: string, file: Express.Multer.File) {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    try {
      await this.bucketExists(bucket);

      const uniqueName = file.originalname;
      const filePath = `uploads/${uniqueName}`;

      const { data, error } = await this.supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
          cacheControl: '3600'
        });

      if (error) throw error;

      return {
        path: data.path,
        publicUrl: `${this.configService.get('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${data.path}`,
        originalName: file.originalname,
        size: file.size
      };
    } catch (error) {
      console.error(`[Supabase Upload Error] ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  private async bucketExists(bucket: string) {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase is not configured');
    }

    try {
      const { data: buckets, error } = await this.supabaseAdmin.storage.listBuckets();
      if (error) throw error;

      if (!buckets.some(b => b.name === bucket)) {
        const { error: createError } = await this.supabaseAdmin.storage
          .createBucket(bucket, {
            public: false,
          });

        if (createError) throw createError;
        await new Promise(resolve => setTimeout(resolve, 500)); 
      }
    } catch (error) {
      console.error(`[Bucket Creation Error] ${error.message}`);
    }
  }
}