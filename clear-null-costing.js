/**
 * Script to clear any existing costing documents with srd: null
 * Run with: node clear-null-costing.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function clearNullCosting() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('costings');

    console.log('\nFinding documents with srd: null...');
    const nullDocs = await collection.find({ srd: null }).toArray();
    console.log(`Found ${nullDocs.length} document(s) with srd: null`);

    if (nullDocs.length > 0) {
      console.log('\nDocuments:');
      nullDocs.forEach((doc, i) => {
        console.log(`${i + 1}. _id: ${doc._id}, pocNumber: ${doc.pocNumber}, standalone: ${doc.standalone}`);
      });

      console.log('\nDeleting these documents...');
      const result = await collection.deleteMany({ srd: null });
      console.log(`✅ Deleted ${result.deletedCount} document(s)`);
    } else {
      console.log('✅ No documents with srd: null found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

clearNullCosting();
