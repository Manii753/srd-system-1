import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Stage from '@/models/Stage';
import { classifyForStage, getStageEntry } from '@/lib/sampleFilters';

// Returns how many SRDs are waiting for the current user's production stage:
//   pending  — received / sitting at my stage (the "Pending" work)
//   incoming — previous stage marked Ready but not yet received ("Coming Soon")
// The same classification logic the Inter Dept Log page uses, mirrored here so
// the sidebar badge stays in sync with the table.
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = String(session?.user?.role || '').toLowerCase();
  if (!role) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const active = (await Stage.find({}).sort({ order: 1 }).lean())
    .filter((s) => s.isActive)
    .sort((a, b) => a.order - b.order);
  if (!active.some((s) => s.name?.toLowerCase() === 'cad')) {
    active.unshift({ _id: 'cad-virtual', name: 'cad', displayName: 'CAD', order: 0, isActive: true });
  }

  const stageIndex = active.findIndex((s) => s.name?.toLowerCase() === role);
  if (stageIndex < 0) {
    return NextResponse.json({ success: true, pending: 0, incoming: 0 });
  }

  const slug = active[stageIndex].name?.toLowerCase();
  const prevSlug = stageIndex > 0 ? active[stageIndex - 1]?.name?.toLowerCase() : null;

  const srds = await SRD.find({ inProduction: true }, { sampleProcess: 1 }).lean();

  let pending = 0;
  let incoming = 0;
  for (const srd of srds) {
    const entry = getStageEntry(srd, slug);
    const prevEntry = prevSlug ? getStageEntry(srd, prevSlug) : null;
    const cls = classifyForStage(srd, entry, prevEntry, { first: stageIndex === 0 });
    if (cls === 'incoming') incoming += 1;
    else if (cls === 'my-work') pending += 1;
  }

  return NextResponse.json({ success: true, pending, incoming, stage: slug });
}