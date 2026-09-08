import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';

export const dynamic = 'force-dynamic';

function iconMime(src = '') {
  const ext = src.split('.').pop()?.split('?')[0].toLowerCase() || 'png';
  const mime = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    gif: 'image/gif',
    ico: 'image/x-icon',
  };
  return mime[ext] || 'image/png';
}

export async function GET() {
  let company = null;
  try {
    await dbConnect();
    company = await Company.findOne().select('name logo').lean();
  } catch (error) {
    console.error('Web app manifest: failed to load company', error);
  }

  const name = company?.name || 'Merchandising Management System';
  const shortName = company?.name && company.name.length <= 12 ? company.name : 'MMS';
  const logo = company?.logo || '';

  const icons = [];
  if (logo) {
    icons.push({ src: logo, sizes: '192x192', type: iconMime(logo), purpose: 'any' });
    icons.push({ src: logo, sizes: '512x512', type: iconMime(logo), purpose: 'any' });
    icons.push({ src: logo, sizes: 'any', type: iconMime(logo), purpose: 'any' });
  }
  icons.push(
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
  );

  const manifest = {
    name,
    short_name: shortName,
    description: 'Merchandising Management System (MMS)',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}