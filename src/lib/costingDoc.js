// Shared helpers to locate and number Costing documents.

import mongoose from 'mongoose';
import Costing from '@/models/Costing';

/**
 * Resolve a costing document from either its own _id (standalone drafts) or
 * the _id of the SRD it is linked to. Works with a connection that may not
 * exist yet — callers must `await dbConnect()` first.
 */
export async function findCostingDoc(id, { lean = false } = {}) {
  if (!id) return null;
  const run = (q) => (lean ? q.lean() : q);

  let doc = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    doc = await run(Costing.findById(id));
  }
  if (!doc) doc = await run(Costing.findOne({ srd: id }));
  return doc;
}

/** Next auto-incrementing POC number (1, 2, 3, …). */
export async function nextPocNumber() {
  const last = await Costing.findOne({ pocNumber: { $ne: null } })
    .sort({ pocNumber: -1 })
    .select('pocNumber')
    .lean();
  return (last?.pocNumber || 0) + 1;
}