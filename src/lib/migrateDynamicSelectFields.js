import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// One-time migration: switch Brand / Buyer / Sample Type text fields to
// 'select-dynamic' so they render as autocomplete dropdowns populated from
// saved SRD values. Idempotent — only fields currently typed as 'text' are
// flipped, so running it again is a no-op.
async function migrateDynamicSelectFields() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const fields = mongoose.connection.db.collection('fields');

    const match = {
      $or: [
        { slug: 'brand' },
        { name: { $regex: '^brand$', $options: 'i' } },
        { name: { $regex: '^buyer$', $options: 'i' } },
        { slug: 'sample-type' },
        { name: { $regex: '^sample\\s*type$', $options: 'i' } },
      ],
    };

    const before = await fields
      .find(match, { projection: { name: 1, type: 1, department: 1 } })
      .toArray();
    console.log('Matched field documents:');
    for (const f of before) {
      console.log(`  - ${f.name} | ${f.type} | ${f.department} | ${f._id}`);
    }

    const result = await fields.updateMany(
      { ...match, type: 'text' },
      { $set: { type: 'select-dynamic', placeholder: 'Select or type…' } }
    );

    console.log(`\nTruly changed: ${result.modifiedCount} · skipped (already select-dynamic or non-text): ${Math.max(0, before.length - result.modifiedCount)}`);
    console.log('\n✅ Brand/Buyer/Sample Type → select-dynamic migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

migrateDynamicSelectFields();