// Unit tests for BaseRepository
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const BaseRepository = require('../../repositories/BaseRepository');

describe('BaseRepository', () => {
  let mongoServer;
  let connection;
  let db;
  let repository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    connection = await MongoClient.connect(uri);
    db = connection.db();

    // Mock getDatabase function
    jest.mock('../../utils/database', () => ({
      getDatabase: jest.fn(() => Promise.resolve(db))
    }));

    repository = new BaseRepository('testCollection');
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collection before each test
    await db.collection('testCollection').deleteMany({});
  });

  describe('create', () => {
    it('should create a new document with timestamps', async () => {
      const testData = { name: 'Test Item', value: 123 };
      
      const result = await repository.create(testData);
      
      expect(result).toBeDefined();
      expect(result._id).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.value).toBe(123);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle creation errors gracefully', async () => {
      // Mock database error
      const mockCollection = {
        insertOne: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      
      jest.spyOn(repository, 'getCollection').mockResolvedValue(mockCollection);
      
      await expect(repository.create({ name: 'Test' }))
        .rejects
        .toThrow('Error creating document: Database error');
    });
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      // Insert test document
      const testData = { name: 'Test Item', value: 123 };
      const created = await repository.create(testData);
      
      const found = await repository.findById(created._id);
      
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(created._id.toString());
      expect(found.name).toBe('Test Item');
    });

    it('should return null for non-existent ID', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();
      
      const result = await repository.findById(nonExistentId);
      
      expect(result).toBeNull();
    });

    it('should handle invalid ObjectId', async () => {
      await expect(repository.findById('invalid-id'))
        .rejects
        .toThrow('Error finding by ID');
    });
  });

  describe('findOne', () => {
    it('should find document by query', async () => {
      await repository.create({ name: 'Test Item 1', category: 'A' });
      await repository.create({ name: 'Test Item 2', category: 'B' });
      
      const found = await repository.findOne({ category: 'B' });
      
      expect(found).toBeDefined();
      expect(found.name).toBe('Test Item 2');
      expect(found.category).toBe('B');
    });

    it('should return null when no match found', async () => {
      const result = await repository.findOne({ nonExistent: 'value' });
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Insert test data
      await repository.create({ name: 'Item 1', priority: 1, active: true });
      await repository.create({ name: 'Item 2', priority: 2, active: true });
      await repository.create({ name: 'Item 3', priority: 3, active: false });
    });

    it('should find all documents', async () => {
      const results = await repository.findAll();
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.name)).toContain('Item 1');
      expect(results.map(r => r.name)).toContain('Item 2');
      expect(results.map(r => r.name)).toContain('Item 3');
    });

    it('should find documents with query filter', async () => {
      const results = await repository.findAll({ active: true });
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.active)).toBe(true);
    });

    it('should support sorting', async () => {
      const results = await repository.findAll({}, { sort: { priority: -1 } });
      
      expect(results).toHaveLength(3);
      expect(results[0].priority).toBe(3);
      expect(results[1].priority).toBe(2);
      expect(results[2].priority).toBe(1);
    });

    it('should support limit and skip', async () => {
      const results = await repository.findAll({}, { 
        sort: { priority: 1 }, 
        limit: 2, 
        skip: 1 
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].priority).toBe(2);
      expect(results[1].priority).toBe(3);
    });
  });

  describe('update', () => {
    it('should update document and return updated version', async () => {
      const original = await repository.create({ name: 'Original', value: 100 });
      
      const updated = await repository.update(original._id, { 
        name: 'Updated', 
        value: 200 
      });
      
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated');
      expect(updated.value).toBe(200);
      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(updated.createdAt.getTime());
    });

    it('should throw error for non-existent document', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();
      
      await expect(repository.update(nonExistentId, { name: 'Updated' }))
        .rejects
        .toThrow('Error updating document: Document not found');
    });
  });

  describe('delete', () => {
    it('should delete document successfully', async () => {
      const document = await repository.create({ name: 'To Delete' });
      
      const result = await repository.delete(document._id);
      
      expect(result.deletedCount).toBe(1);
      
      // Verify document is deleted
      const found = await repository.findById(document._id);
      expect(found).toBeNull();
    });

    it('should throw error for non-existent document', async () => {
      const { ObjectId } = require('mongodb');
      const nonExistentId = new ObjectId();
      
      await expect(repository.delete(nonExistentId))
        .rejects
        .toThrow('Error deleting document: Document not found');
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ category: 'A', active: true });
      await repository.create({ category: 'A', active: false });
      await repository.create({ category: 'B', active: true });
    });

    it('should count all documents', async () => {
      const count = await repository.count();
      expect(count).toBe(3);
    });

    it('should count documents with query', async () => {
      const count = await repository.count({ category: 'A' });
      expect(count).toBe(2);
    });

    it('should count documents with complex query', async () => {
      const count = await repository.count({ category: 'A', active: true });
      expect(count).toBe(1);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await repository.create({ name: 'Existing Item', code: 'EX001' });
    });

    it('should return true for existing document', async () => {
      const exists = await repository.exists({ code: 'EX001' });
      expect(exists).toBe(true);
    });

    it('should return false for non-existing document', async () => {
      const exists = await repository.exists({ code: 'NONEXISTENT' });
      expect(exists).toBe(false);
    });
  });

  describe('paginate', () => {
    beforeEach(async () => {
      // Create 15 test documents
      for (let i = 1; i <= 15; i++) {
        await repository.create({ 
          name: `Item ${i}`, 
          order: i,
          category: i <= 8 ? 'A' : 'B'
        });
      }
    });

    it('should paginate results correctly', async () => {
      const result = await repository.paginate({}, { 
        page: 2, 
        limit: 5, 
        sort: { order: 1 } 
      });
      
      expect(result.documents).toHaveLength(5);
      expect(result.documents[0].order).toBe(6);
      expect(result.documents[4].order).toBe(10);
      
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.totalDocuments).toBe(15);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should handle filtered pagination', async () => {
      const result = await repository.paginate(
        { category: 'A' }, 
        { page: 1, limit: 5, sort: { order: 1 } }
      );
      
      expect(result.documents).toHaveLength(5);
      expect(result.pagination.totalDocuments).toBe(8);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should handle last page correctly', async () => {
      const result = await repository.paginate({}, { 
        page: 3, 
        limit: 5, 
        sort: { order: 1 } 
      });
      
      expect(result.documents).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should insert new document when not exists', async () => {
      const result = await repository.upsert(
        { code: 'NEW001' },
        { code: 'NEW001', name: 'New Item', value: 100 }
      );
      
      expect(result).toBeDefined();
      expect(result.code).toBe('NEW001');
      expect(result.name).toBe('New Item');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should update existing document when exists', async () => {
      // First create a document
      await repository.create({ code: 'EX001', name: 'Original', value: 50 });
      
      const result = await repository.upsert(
        { code: 'EX001' },
        { code: 'EX001', name: 'Updated', value: 150 }
      );
      
      expect(result).toBeDefined();
      expect(result.code).toBe('EX001');
      expect(result.name).toBe('Updated');
      expect(result.value).toBe(150);
    });
  });

  describe('aggregate', () => {
    beforeEach(async () => {
      await repository.create({ category: 'A', value: 10, active: true });
      await repository.create({ category: 'A', value: 20, active: true });
      await repository.create({ category: 'B', value: 30, active: true });
      await repository.create({ category: 'B', value: 40, active: false });
    });

    it('should perform aggregation pipeline', async () => {
      const pipeline = [
        { $match: { active: true } },
        { 
          $group: {
            _id: '$category',
            totalValue: { $sum: '$value' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ];
      
      const results = await repository.aggregate(pipeline);
      
      expect(results).toHaveLength(2);
      expect(results[0]._id).toBe('A');
      expect(results[0].totalValue).toBe(30);
      expect(results[0].count).toBe(2);
      expect(results[1]._id).toBe('B');
      expect(results[1].totalValue).toBe(30);
      expect(results[1].count).toBe(1);
    });
  });
});