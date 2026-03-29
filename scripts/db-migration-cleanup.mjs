import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('ERRORE: MONGODB_URI non definita nel file .env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connesso con successo a MongoDB.');

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    const dbNames = dbs.databases.map(db => db.name);

    console.log('Database trovati:', dbNames.join(', '));

    const databasesToDelete = ['fantaf1_local_dev'];

    for (const dbName of databasesToDelete) {
      if (dbNames.includes(dbName)) {
        console.log(`Eliminazione database: ${dbName}...`);
        await client.db(dbName).dropDatabase();
        console.log(`Database ${dbName} eliminato.`);
      } else {
        console.log(`Database ${dbName} non trovato, salto.`);
      }
    }

    if (dbNames.includes('fantaf1')) {
      console.log('Database fantaf1 trovato e pronto all\'uso.');
    } else {
      console.warn('ATTENZIONE: Database fantaf1 non trovato. Verifica la configurazione dell\'ambiente condiviso.');
    }

  } catch (error) {
    console.error('Errore durante la migrazione del database:', error);
  } finally {
    await client.close();
  }
}

run();
