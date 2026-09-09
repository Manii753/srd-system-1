import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPublicDir } from '@/lib/serverAssetUtils';

// Audio (voice notes) and other runtime-written files under public/assets are
// not part of Next.js's build-time static route table, so newly written files
// there 404 until restart. This handler serves them directly from disk so they
// are available immediately.
const MIME_TYPES = {
  '.webm': 'audio/webm',
  '.mp4': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function isSafeSegment(segment) {
  return (
    segment &&
    segment !== '' &&
    segment !== '.' &&
    segment !== '..' &&
    !segment.includes('\\') &&
    !segment.startsWith('/')
  );
}

export async function GET(request, { params }) {
  const segments = (await params).path || [];
  if (!Array.isArray(segments) || segments.length === 0 || !segments.every(isSafeSegment)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const assetsRoot = path.join(getPublicDir(), 'assets');
  const target = path.join(assetsRoot, ...segments);
  const resolved = path.resolve(target);
  const rootResolved = path.resolve(assetsRoot);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const data = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
