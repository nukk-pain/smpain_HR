/**
 * AI-HEADER
 * Intent: Unified repository for all document types in single collection
 * Domain Meaning: Centralized document management with consistent API
 * Misleading Names: document vs file - document is metadata, file is binary content
 * Data Contracts: Unified schema v2.0 with nested structures for all document types
 * PII: Contains user information, document metadata, access logs
 * Invariants: userId required, documentType required, unique constraint on payslips
 * RAG Keywords: unified documents, document repository, centralized storage
 */

const BaseRepository = require('./BaseRepository');
const { ObjectId } = require('mongodb');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class UnifiedDocumentRepository extends BaseRepository {
  constructor() {
    super('unified_documents');
    
    // Document type definitions
    this.DOCUMENT_TYPES = {
      PAYSLIP: 'payslip',
      CERTIFICATE: 'certificate',
      CONTRACT: 'contract',
      POLICY: 'policy',
      REPORT: 'report',
      OTHER: 'other'
    };
    
    // Status definitions
    this.STATUS = {
      ACTIVE: 'active',
      DELETED: 'deleted',
      ARCHIVED: 'archived',
      PROCESSING: 'processing',
      ERROR: 'error'
    };
    
    // Access actions
    this.ACCESS_ACTIONS = {
      VIEW: 'view',
      DOWNLOAD: 'download',
      PRINT: 'print',
      SHARE: 'share'
    };
  }

  /**
   * Create a new document with unified schema
   * DomainMeaning: Store document metadata in unified collection
   * MisleadingNames: None
   * SideEffects: Inserts document, validates uniqueness for payslips
   * Invariants: Payslips must be unique per user/year/month
   * RAG_Keywords: create document, unified schema, validation
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(create_unified_document)
   */
  async createDocument(documentData) {
    try {
      // Validate required fields
      if (!documentData.userId) {
        throw new Error('userId is required');
      }
      if (!documentData.documentType) {
        throw new Error('documentType is required');
      }
      
      // Check for duplicate payslips
      if (documentData.documentType === this.DOCUMENT_TYPES.PAYSLIP) {
        const existing = await this.findOne({
          userId: documentData.userId,
          documentType: this.DOCUMENT_TYPES.PAYSLIP,
          'temporal.year': documentData.temporal?.year,
          'temporal.month': documentData.temporal?.month,
          'status.isDeleted': { $ne: true }
        });
        
        if (existing) {
          throw new Error(`Payslip already exists for user ${documentData.userId} for ${documentData.temporal.year}/${documentData.temporal.month}`);
        }
      }
      
      // Generate file unique ID if not provided
      if (documentData.file && !documentData.file.uniqueId) {
        documentData.file.uniqueId = uuidv4();
      }
      
      // Calculate file hash if file data provided
      if (documentData.file?.originalName) {
        documentData.file.hash = crypto
          .createHash('sha256')
          .update(documentData.file.originalName + documentData.file.size)
          .digest('hex');
      }
      
      // Build complete document
      const now = new Date();
      const document = {
        ...documentData,
        
        // Ensure nested structures exist
        file: documentData.file || {},
        temporal: documentData.temporal || {},
        userInfo: documentData.userInfo || {},
        
        // Status management
        status: {
          current: this.STATUS.ACTIVE,
          isDeleted: false,
          ...documentData.status
        },
        
        // Audit information
        audit: {
          createdAt: now,
          createdBy: documentData.uploadedBy || documentData.userId,
          uploadedAt: now,
          uploadedBy: documentData.uploadedBy || documentData.userId,
          lastModifiedAt: now,
          version: 1,
          ...documentData.audit
        },
        
        // Access tracking
        accessCount: {
          views: 0,
          downloads: 0,
          prints: 0,
          shares: 0,
          ...documentData.accessCount
        },
        
        // Permissions
        permissions: {
          owner: documentData.userId,
          visibility: 'private',
          roles: {
            viewer: ['Admin', 'Supervisor'],
            editor: ['Admin'],
            admin: ['Admin']
          },
          ...documentData.permissions
        },
        
        // Search optimization
        search: {
          fullText: this._generateSearchText(documentData),
          sortKey: this._generateSortKey(documentData),
          ...documentData.search
        },
        
        // System information
        system: {
          schemaVersion: 2,
          dataQuality: {
            completeness: this._calculateCompleteness(documentData),
            validated: false
          },
          ...documentData.system
        },
        
        // Initialize history
        history: [{
          version: 1,
          action: 'created',
          performedBy: documentData.uploadedBy || documentData.userId,
          performedAt: now,
          reason: 'Document created'
        }]
      };
      
      return await this.create(document);
      
    } catch (error) {
      throw new Error(`Error creating unified document: ${error.message}`);
    }
  }

  /**
   * Find documents for a specific user
   * DomainMeaning: Retrieve user's documents with filtering
   * MisleadingNames: None
   * SideEffects: Updates access count
   * Invariants: Only returns non-deleted documents by default
   * RAG_Keywords: find user documents, query, filter
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(find_user_documents)
   */
  async findUserDocuments(userId, options = {}) {
    try {
      const {
        documentType,
        year,
        month,
        includeDeleted = false,
        limit = 100,
        skip = 0,
        sort = { 'temporal.yearMonth': -1 }
      } = options;
      
      // Build query
      const query = {
        userId: new ObjectId(userId)
      };
      
      if (!includeDeleted) {
        query['status.isDeleted'] = { $ne: true };
      }
      
      if (documentType) {
        query.documentType = documentType;
      }
      
      if (year) {
        query['temporal.year'] = year;
      }
      
      if (month) {
        query['temporal.month'] = month;
      }
      
      return await this.findAll(query, { sort, limit, skip });
      
    } catch (error) {
      throw new Error(`Error finding user documents: ${error.message}`);
    }
  }

  /**
   * Find documents by type
   * DomainMeaning: Query documents by document type
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Only returns active documents
   * RAG_Keywords: find by type, document type query
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(find_documents_by_type)
   */
  async findByDocumentType(documentType, options = {}) {
    try {
      const query = {
        documentType,
        'status.current': this.STATUS.ACTIVE
      };
      
      return await this.findAll(query, options);
      
    } catch (error) {
      throw new Error(`Error finding documents by type: ${error.message}`);
    }
  }

  /**
   * Soft delete a document
   * DomainMeaning: Mark document as deleted without removing
   * MisleadingNames: delete vs remove - soft delete preserves data
   * SideEffects: Updates status, adds history entry
   * Invariants: Document remains in database
   * RAG_Keywords: soft delete, document lifecycle
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(soft_delete_document)
   */
  async softDelete(documentId, deletedBy, reason = 'User deletion') {
    try {
      const now = new Date();
      
      const updateData = {
        'status.current': this.STATUS.DELETED,
        'status.isDeleted': true,
        'status.deletedAt': now,
        'status.deletedBy': new ObjectId(deletedBy),
        'status.deleteReason': reason,
        'audit.lastModifiedAt': now,
        'audit.lastModifiedBy': new ObjectId(deletedBy)
      };
      
      // Add history entry
      const historyEntry = {
        version: 0, // Will be updated
        action: 'deleted',
        performedBy: new ObjectId(deletedBy),
        performedAt: now,
        reason,
        changes: {
          before: { status: 'active' },
          after: { status: 'deleted' }
        }
      };
      
      // Get current document to update version
      const current = await this.findById(documentId);
      if (!current) {
        throw new Error('Document not found');
      }
      
      historyEntry.version = (current.audit?.version || 1) + 1;
      updateData['audit.version'] = historyEntry.version;
      
      // Update document
      const collection = await this.getCollection();
      await collection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: updateData,
          $push: { history: historyEntry }
        }
      );
      
      return await this.findById(documentId);
      
    } catch (error) {
      throw new Error(`Error soft deleting document: ${error.message}`);
    }
  }

  /**
   * Restore a deleted document
   * DomainMeaning: Restore soft-deleted document to active state
   * MisleadingNames: None
   * SideEffects: Updates status, adds history entry
   * Invariants: Only deleted documents can be restored
   * RAG_Keywords: restore document, undelete
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(restore_document)
   */
  async restoreDocument(documentId, restoredBy) {
    try {
      const now = new Date();
      
      // Get current document
      const current = await this.findById(documentId);
      if (!current) {
        throw new Error('Document not found');
      }
      
      if (!current.status?.isDeleted) {
        throw new Error('Document is not deleted');
      }
      
      const newVersion = (current.audit?.version || 1) + 1;
      
      const updateData = {
        'status.current': this.STATUS.ACTIVE,
        'status.isDeleted': false,
        'status.restoredAt': now,
        'status.restoredBy': new ObjectId(restoredBy),
        'audit.lastModifiedAt': now,
        'audit.lastModifiedBy': new ObjectId(restoredBy),
        'audit.version': newVersion
      };
      
      // Remove deletion fields
      const unsetData = {
        'status.deletedAt': '',
        'status.deletedBy': '',
        'status.deleteReason': ''
      };
      
      // Add history entry
      const historyEntry = {
        version: newVersion,
        action: 'restored',
        performedBy: new ObjectId(restoredBy),
        performedAt: now,
        reason: 'Document restored from trash',
        changes: {
          before: { status: 'deleted' },
          after: { status: 'active' }
        }
      };
      
      // Update document
      const collection = await this.getCollection();
      await collection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: updateData,
          $unset: unsetData,
          $push: { history: historyEntry }
        }
      );
      
      return await this.findById(documentId);
      
    } catch (error) {
      throw new Error(`Error restoring document: ${error.message}`);
    }
  }

  /**
   * Log document access
   * DomainMeaning: Track document access for audit
   * MisleadingNames: None
   * SideEffects: Updates access count and recent access log
   * Invariants: Keeps only 10 most recent access entries
   * RAG_Keywords: access log, audit trail
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(log_document_access)
   */
  async logAccess(documentId, userId, action, metadata = {}) {
    try {
      const now = new Date();
      
      const accessEntry = {
        userId: new ObjectId(userId),
        userName: metadata.userName,
        action,
        timestamp: now,
        ipAddress: metadata.ipAddress,
        deviceInfo: metadata.deviceInfo
      };
      
      // Increment appropriate counter
      const incrementField = `accessCount.${action}s`;
      
      const collection = await this.getCollection();
      await collection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $inc: { [incrementField]: 1 },
          $set: { 'accessCount.lastAccessedAt': now },
          $push: {
            recentAccess: {
              $each: [accessEntry],
              $slice: -10 // Keep only last 10 entries
            }
          }
        }
      );
      
      return { success: true };
      
    } catch (error) {
      throw new Error(`Error logging document access: ${error.message}`);
    }
  }

  /**
   * Get document statistics
   * DomainMeaning: Aggregate statistics for documents
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: None
   * RAG_Keywords: statistics, aggregation, metrics
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(get_document_statistics)
   */
  async getDocumentStatistics(filter = {}) {
    try {
      const pipeline = [
        { $match: { 'status.isDeleted': { $ne: true }, ...filter } },
        {
          $facet: {
            byType: [
              { $group: { _id: '$documentType', count: { $sum: 1 } } }
            ],
            byYear: [
              { $group: { _id: '$temporal.year', count: { $sum: 1 } } },
              { $sort: { _id: -1 } }
            ],
            byStatus: [
              { $group: { _id: '$status.current', count: { $sum: 1 } } }
            ],
            totals: [
              {
                $group: {
                  _id: null,
                  totalDocuments: { $sum: 1 },
                  totalSize: { $sum: '$file.size' },
                  avgSize: { $avg: '$file.size' }
                }
              }
            ]
          }
        }
      ];
      
      const result = await this.aggregate(pipeline);
      
      return {
        byType: result[0]?.byType || [],
        byYear: result[0]?.byYear || [],
        byStatus: result[0]?.byStatus || [],
        totals: result[0]?.totals[0] || { totalDocuments: 0, totalSize: 0, avgSize: 0 }
      };
      
    } catch (error) {
      throw new Error(`Error getting document statistics: ${error.message}`);
    }
  }

  /**
   * Replace document file
   * DomainMeaning: Replace physical file while preserving metadata
   * MisleadingNames: None
   * SideEffects: Updates file info, increments version, adds history
   * Invariants: Old file reference preserved in history
   * RAG_Keywords: replace file, update document
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(replace_document_file)
   */
  async replaceDocumentFile(documentId, newFileData, replacedBy, reason) {
    try {
      const now = new Date();
      
      // Get current document
      const current = await this.findById(documentId);
      if (!current) {
        throw new Error('Document not found');
      }
      
      const newVersion = (current.audit?.version || 1) + 1;
      
      // Generate new file unique ID
      newFileData.uniqueId = uuidv4();
      
      // Calculate new hash
      if (newFileData.originalName) {
        newFileData.hash = crypto
          .createHash('sha256')
          .update(newFileData.originalName + newFileData.size)
          .digest('hex');
      }
      
      // Update data
      const updateData = {
        file: {
          ...current.file,
          ...newFileData,
          oldPath: current.file?.path // Preserve old path
        },
        'audit.lastModifiedAt': now,
        'audit.lastModifiedBy': new ObjectId(replacedBy),
        'audit.version': newVersion
      };
      
      // History entry
      const historyEntry = {
        version: newVersion,
        action: 'replaced',
        performedBy: new ObjectId(replacedBy),
        performedAt: now,
        reason,
        changes: {
          before: { file: current.file },
          after: { file: newFileData }
        }
      };
      
      // Update document
      const collection = await this.getCollection();
      await collection.updateOne(
        { _id: new ObjectId(documentId) },
        {
          $set: updateData,
          $push: { history: historyEntry }
        }
      );
      
      return await this.findById(documentId);
      
    } catch (error) {
      throw new Error(`Error replacing document file: ${error.message}`);
    }
  }

  // Private helper methods
  
  _generateSearchText(doc) {
    const parts = [
      doc.userInfo?.name,
      doc.userInfo?.employeeId,
      doc.documentType,
      doc.documentCategory,
      doc.temporal?.year,
      doc.temporal?.month,
      doc.file?.displayName,
      ...(doc.metadata?.tags || [])
    ].filter(Boolean);
    
    return parts.join(' ');
  }
  
  _generateSortKey(doc) {
    const year = doc.temporal?.year || '0000';
    const month = String(doc.temporal?.month || '00').padStart(2, '0');
    const employeeId = doc.userInfo?.employeeId || '000000';
    const type = doc.documentType || 'unknown';
    
    return `${year}${month}_${employeeId}_${type}`;
  }
  
  _calculateCompleteness(doc) {
    const requiredFields = ['userId', 'documentType', 'file'];
    const optionalFields = ['temporal', 'userInfo', 'metadata', 'permissions'];
    
    let score = 0;
    let total = 0;
    
    // Check required fields (weight: 2)
    requiredFields.forEach(field => {
      total += 2;
      if (doc[field]) score += 2;
    });
    
    // Check optional fields (weight: 1)
    optionalFields.forEach(field => {
      total += 1;
      if (doc[field] && Object.keys(doc[field]).length > 0) score += 1;
    });
    
    return Math.round((score / total) * 100);
  }

  /**
   * Update document with audit trail
   * DomainMeaning: Update document fields with history tracking
   * MisleadingNames: None
   * SideEffects: Updates document and adds history entry
   * Invariants: Document must exist
   * RAG_Keywords: update, modify, edit
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(update_document)
   */
  async updateDocument(documentId, updateData, historyEntry = null) {
    const collection = await this.getCollection();
    
    const updateOps = {
      $set: updateData
    };
    
    if (historyEntry) {
      updateOps.$push = {
        history: historyEntry
      };
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(documentId) },
      updateOps
    );
    
    return result.modifiedCount > 0 ? result : null;
  }

  /**
   * Find documents by payroll ID
   * DomainMeaning: Retrieve documents associated with a payroll record
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns array, empty if none found
   * RAG_Keywords: payroll, documents, association
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(find_by_payroll_id)
   */
  async findByPayrollId(payrollId) {
    const collection = await this.getCollection();
    return await collection.find({
      'metadata.payroll.payrollId': new ObjectId(payrollId)
    }).toArray();
  }

  /**
   * Delete document permanently
   * DomainMeaning: Hard delete document from database
   * MisleadingNames: None
   * SideEffects: Permanently removes document
   * Invariants: Cannot be undone
   * RAG_Keywords: delete, remove, permanent
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(delete_document)
   */
  async delete(documentId) {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({
      _id: new ObjectId(documentId)
    });
    return result.deletedCount > 0;
  }
}

module.exports = UnifiedDocumentRepository;