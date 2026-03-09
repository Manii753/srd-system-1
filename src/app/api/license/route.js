import { NextResponse } from 'next/server';
import { getSafeLicenseStatus } from '@/lib/license';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getSafeLicenseStatus();
  const responseStatus = status.valid ? 200 : status.error ? 503 : 403;

  return NextResponse.json(status, { status: responseStatus });
}
