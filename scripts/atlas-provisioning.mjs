import mongoose from 'mongoose';

/**
 * Provisions the MongoDB Atlas database with required collections and indexes.
 * @param {string} uri - The MongoDB URI to connect to.
 * @returns {Promise<void>}
 */
export async function runProvisioning(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  try {
    console.log(`Connecting to ${uri.replace(/:([^@]+)@/, ':****@')}...`);
    await mongoose.connect(uri);
    console.log('Connected successfully.');

    const collections = [
      'appdatas',
      'drivers',
      'weekends',
      'standingscaches',
      'admincredentials',
    ];

    for (const collName of collections) {
      console.log(`Ensuring collection exists: ${collName}`);
      const existingCollections = await mongoose.connection.db.listCollections({ name: collName }).toArray();
      
      if (existingCollections.length === 0) {
        await mongoose.connection.createCollection(collName);
        console.log(`Created collection: ${collName}`);
      } else {
        console.log(`Collection already exists: ${collName}`);
      }
    }

    // Provision indexes
    console.log('Provisioning indexes...');
    
    // weekends indexes
    await mongoose.connection.collection('weekends').createIndex(
      { meetingKey: 1 },
      { unique: true }
    );
    console.log('Index created: weekends.meetingKey (unique)');

    // standingscaches indexes
    await mongoose.connection.collection('standingscaches').createIndex(
      { standingsType: 1 },
      { unique: true }
    );
    console.log('Index created: standingscaches.standingsType (unique)');

    // admincredentials indexes
    await mongoose.connection.collection('admincredentials').createIndex(
      { isAdmin: 1 },
      { unique: true }
    );
    console.log('Index created: admincredentials.isAdmin (unique)');

    console.log('Provisioning completed successfully.');
  } catch (error) {
    console.error('Provisioning failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

/**
 * Main entry point for the script.
 */
export async function main() {
  const uri = process.env.MONGODB_URI;
  try {
    await runProvisioning(uri);
  } catch (error) {
    console.error('Provisioning script failed');
    process.exit(1);
  }
}

// If executed directly
/* v8 ignore next 3 */
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
