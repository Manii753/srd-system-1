import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getPublicDir } from '@/lib/serverAssetUtils';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.type?.includes('webm') ? 'webm' : file.type?.includes('mp4') ? 'mp4' : 'ogg';
    const filename = `voice_${timestamp}_${randomStr}.${extension}`;
    
    // Create directory if it doesn't exist
    const uploadDir = path.join(getPublicDir(), 'assets', 'voice-chats');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
    }
    
    // Save file
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);
    
    // Return public URL
    const publicUrl = `/assets/voice-chats/${filename}`;
    const mimeType = file.type || 'audio/webm';

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      size: buffer.length,
      mimeType: mimeType
    });
  } catch (error) {
    console.error('Error uploading audio:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
