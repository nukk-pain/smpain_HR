const { ObjectId } = require('mongodb');
const { getDatabase } = require('../utils/database');

class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async getCollection() {
    const db = await getDatabase();
    return db.collection(this.collectionName);
  }

  async findById(id) {
    try {
      const collection = await this.getCollection();
      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      throw new Error(`Error finding by ID: ${error.message}`);
    }
  }

  async findOne(query = {}) {
    try {
      const collection = await this.getCollection();
      return await collection.findOne(query);
    } catch (error) {
      throw new Error(`Error finding document: ${error.message}`);
    }
  }

  async findAll(query = {}, options = {}) {
    try {
      const collection = await this.getCollection();
      let cursor = collection.find(query);

      if (options.sort) {
        cursor = cursor.sort(options.sort);
      }

      if (options.limit) {
        cursor = cursor.limit(options.limit);
      }

      if (options.skip) {
        cursor = cursor.skip(options.skip);
      }

      if (options.projection) {
        cursor = cursor.project(options.projection);
      }

      return await cursor.toArray();
    } catch (error) {
      throw new Error(`Error finding documents: ${error.message}`);
    }
  }

  async create(data) {
    try {
      const collection = await this.getCollection();
      
      const document = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(document);
      return await this.findById(result.insertedId);
    } catch (error) {
      throw new Error(`Error creating document: ${error.message}`);
    }
  }

  async update(id, data) {
    try {
      const collection = await this.getCollection();
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Document not found');
      }

      return await this.findById(id);
    } catch (error) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  async updateMany(query, data) {
    try {
      const collection = await this.getCollection();
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      const result = await collection.updateMany(query, { $set: updateData });
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      throw new Error(`Error updating documents: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        throw new Error('Document not found');
      }

      return { deletedCount: result.deletedCount };
    } catch (error) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  }

  async deleteMany(query) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteMany(query);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      throw new Error(`Error deleting documents: ${error.message}`);
    }
  }

  async count(query = {}) {
    try {
      const collection = await this.getCollection();
      return await collection.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting documents: ${error.message}`);
    }
  }

  async aggregate(pipeline) {
    try {
      const collection = await this.getCollection();
      return await collection.aggregate(pipeline).toArray();
    } catch (error) {
      throw new Error(`Error in aggregation: ${error.message}`);
    }
  }

  async exists(query) {
    try {
      const collection = await this.getCollection();
      const count = await collection.countDocuments(query, { limit: 1 });
      return count > 0;
    } catch (error) {
      throw new Error(`Error checking existence: ${error.message}`);
    }
  }

  async paginate(query = {}, options = {}) {
    try {
      const { page = 1, limit = 10, sort = {} } = options;
      const skip = (page - 1) * limit;

      const [documents, total] = await Promise.all([
        this.findAll(query, { sort, limit, skip, projection: options.projection }),
        this.count(query)
      ]);

      return {
        documents,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalDocuments: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Error in pagination: ${error.message}`);
    }
  }

  async upsert(query, data) {
    try {
      const collection = await this.getCollection();
      
      const updateData = {
        ...data,
        updatedAt: new Date()
      };

      if (!await this.exists(query)) {
        updateData.createdAt = new Date();
      }

      const result = await collection.updateOne(
        query,
        { $set: updateData },
        { upsert: true }
      );

      if (result.upsertedId) {
        return await this.findById(result.upsertedId);
      } else {
        return await this.findOne(query);
      }
    } catch (error) {
      throw new Error(`Error in upsert: ${error.message}`);
    }
  }
}

module.exports = BaseRepository;