import { NextResponse } from 'next/server';
import fs from 'fs';
import {
  buildAssetStorageInfo,
  buildStoredAssetRecord,
  resolveUploadAbsolutePath,
} from '@/lib/serverAssetUtils';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      fileName,
      fileData,
      srdId,
      fieldId,
      fieldType,
      mimeType: providedMimeType,
      size: providedSize,
    } = body;

    if (!fileName || !fileData || !srdId || !fieldId || !fieldType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required upload fields',
        },
        { status: 400 }
      );
    }

    const matches = fileData.match(/^data:(.+);base64,(.+)$/);
    let base64Data = fileData;
    let detectedMimeType = '';
    if (matches) {
      detectedMimeType = matches[1];
      base64Data = matches[2];
    }

    const storageInfo = buildAssetStorageInfo({
      srdId,
      fieldId,
      fieldType,
      fileName,
    });

    if (!fs.existsSync(storageInfo.absoluteDirectory)) {
      fs.mkdirSync(storageInfo.absoluteDirectory, { recursive: true });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(storageInfo.absolutePath, buffer);

    const uploadedAt = new Date().toISOString();
    const asset = buildStoredAssetRecord({
      fieldType,
      srdId,
      fieldId,
      storedFileName: storageInfo.storedFileName,
      originalName: fileName,
      relativePath: storageInfo.relativePath,
      mimeType: providedMimeType || detectedMimeType || '',
      size: Number.isFinite(Number(providedSize)) ? Number(providedSize) : buffer.length,
      uploadedAt,
    });

    return NextResponse.json({ success: true, asset, url: asset.url });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ success: false, error: 'Missing url' }, { status: 400 });

    // url is like /uploads/images/x/file.png — resolve to the stored file
    const absolutePath = resolveUploadAbsolutePath(url);

    if (absolutePath && fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
