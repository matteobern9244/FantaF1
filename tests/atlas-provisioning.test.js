import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock mongoose
vi.mock('mongoose', () => {
  const db = {
    createCollection: vi.fn().mockResolvedValue({}),
    listCollections: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
    collection: vi.fn().mockReturnValue({
      createIndex: vi.fn().mockResolvedValue({}),
    }),
  };
  return {
    default: {
      connect: vi.fn().mockResolvedValue({}),
      disconnect: vi.fn().mockResolvedValue({}),
      connection: {
        db: db,
        createCollection: db.createCollection,
        collection: db.collection,
      },
    },
  };
});

import { runProvisioning, main } from '../scripts/atlas-provisioning.mjs';

describe('Atlas Provisioning Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = 'mongodb://localhost:27017/fantaf1_test';
  });

  it('provisions the required collections and indexes when they do not exist', async () => {
    const uri = 'mongodb://localhost:27017/fantaf1_test';
    
    await runProvisioning(uri);

    expect(mongoose.connect).toHaveBeenCalledWith(uri);
    expect(mongoose.connection.createCollection).toHaveBeenCalledTimes(5);
    expect(mongoose.connection.collection).toHaveBeenCalledWith('weekends');
    expect(mongoose.connection.collection('weekends').createIndex).toHaveBeenCalled();
    expect(mongoose.disconnect).toHaveBeenCalled();
  });

  it('skips creation if collections already exist', async () => {
    const uri = 'mongodb://localhost:27017/fantaf1_test';
    
    // Mock existing collections: some exist, some don't
    mongoose.connection.db.listCollections.mockImplementation(({ name }) => ({
      toArray: vi.fn().mockResolvedValue(name === 'appdatas' ? [{ name: 'appdatas' }] : []),
    }));

    await runProvisioning(uri);

    expect(mongoose.connection.db.listCollections).toHaveBeenCalled();
    // appdatas already exists, so createCollection should be called 4 times for the others
    expect(mongoose.connection.createCollection).toHaveBeenCalledTimes(4);
  });

  it('throws error if MONGODB_URI is missing', async () => {
    await expect(runProvisioning('')).rejects.toThrow('MONGODB_URI is required');
  });

  it('handles connection errors', async () => {
    mongoose.connect.mockRejectedValueOnce(new Error('Connection failed'));
    await expect(runProvisioning('uri')).rejects.toThrow('Connection failed');
    expect(mongoose.disconnect).toHaveBeenCalled();
  });

  it('runs successfully through main', async () => {
    await main();
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI);
  });

  it('handles errors through main', async () => {
    process.env.MONGODB_URI = '';
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    await main();
    
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleSpy).toHaveBeenCalledWith('Provisioning script failed');
    
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
