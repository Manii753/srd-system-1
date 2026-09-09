import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadsRootDir, getLegacyPublicUploadsDir } from '@/lib/serverAssetUtils';

// Minimal content-type map for the file kinds this app stores.
const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
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

function isInside(root, candidate) {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  return c === r || c.startsWith(r + path.sep);
}

// Next.js serves files in public/ only for content present at build/start time.
// Files written to public/ at runtime (user uploads, avatars, etc.) are not
// added to that in-memory route table, so the browser gets a 404 until the
// server is restarted. Uploads are therefore stored outside public/ (in the
// project-root uploads/ folder) and served here directly from disk on every
// request, so newly uploaded files are available immediately. This also guards
// against path traversal.
export async function GET(request, { params }) {
  const segments = (await params).path || [];
  if (!Array.isArray(segments) || segments.length === 0 || !segments.every(isSafeSegment)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const candidates = [getUploadsRootDir(), getLegacyPublicUploadsDir()];

  for (const root of candidates) {
    const target = path.join(root, ...segments);
    if (!isInside(root, target)) {
      continue;
    }
    if (!fs.existsSync(target)) {
      continue;
    }

    try {
      const data = fs.readFileSync(target);
      const ext = path.extname(target).toLowerCase();
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
        continue;
      }
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  return new NextResponse('Not Found', { status: 404 });
}
