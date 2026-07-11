/**
 * Script to fix the Costing collection's srd index
 * This drops the old non-sparse unique index and creates a new sparse one
 * Run with: node fix-costing-index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('costings');

    console.log('\nChecking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Find the srd index
    const srdIndex = indexes.find(idx => idx.key && idx.key.srd === 1);
    
    if (srdIndex) {
      console.log('\n📌 Found srd index:', srdIndex.name);
      
      // Check if it's already sparse
      if (srdIndex.sparse) {
        console.log('✅ Index is already sparse - no action needed');
      } else {
        console.log('⚠️  Index is NOT sparse - will drop and recreate');
        
        // Drop the old index
        console.log(`\nDropping index: ${srdIndex.name}`);
        await collection.dropIndex(srdIndex.name);
        console.log('✅ Dropped old index');

        // Create new sparse unique index
        console.log('\nCreating new sparse unique index on srd...');
        await collection.createIndex({ srd: 1 }, { unique: true, sparse: true });
        console.log('✅ Created sparse unique index');
      }
    } else {
      console.log('\n⚠️  No srd index found - creating sparse unique index...');
      await collection.createIndex({ srd: 1 }, { unique: true, sparse: true });
      console.log('✅ Created sparse unique index');
    }

    console.log('\n✅ Index fix complete!');
    console.log('\nVerifying new indexes...');
    const newIndexes = await collection.indexes();
    console.log('Updated indexes:', JSON.stringify(newIndexes, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixIndex();
