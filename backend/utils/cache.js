// In-memory caching system for performance optimization
const NodeCache = require('node-cache');

// Cache instances with different TTL settings
const caches = {
  // Short-term cache for frequently accessed data (5 minutes)
  short: new NodeCache({ 
    stdTTL: 300, 
    checkperiod: 60,
    maxKeys: 1000,
    useClones: false
  }),
  
  // Medium-term cache for semi-static data (30 minutes) 
  medium: new NodeCache({ 
    stdTTL: 1800, 
    checkperiod: 300,
    maxKeys: 500,
    useClones: false
  }),
  
  // Long-term cache for static data (2 hours)
  long: new NodeCache({ 
    stdTTL: 7200, 
    checkperiod: 600,
    maxKeys: 200,
    useClones: false
  })
};

// Cache key prefixes for organization
const CACHE_PREFIXES = {
  USER: 'user:',
  DEPT: 'dept:',
  LEAVE: 'leave:',
  PAYROLL: 'payroll:',
  STATS: 'stats:',
  SESSION: 'session:'
};

/**
 * Generic cache wrapper function
 */
async function cacheWrapper(key, fetcher, cacheType = 'short', options = {}) {
  const cache = caches[cacheType];
  const fullKey = `${options.prefix || ''}${key}`;
  
  try {
    // Try to get from cache first
    const cached = cache.get(fullKey);
    if (cached !== undefined) {
      return cached;
    }
    
    // Cache miss - fetch data
    const data = await fetcher();
    
    // Store in cache with custom TTL if provided
    if (options.ttl) {
      cache.set(fullKey, data, options.ttl);
    } else {
      cache.set(fullKey, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Cache error for key ${fullKey}:`, error);
    // Fallback to direct fetcher call
    return await fetcher();
  }
}

/**
 * User-related caching functions
 */
const userCache = {
  // Cache user by ID
  async getById(userId, fetcher) {
    return cacheWrapper(
      userId, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.USER }
    );
  },
  
  // Cache user by username (login)
  async getByUsername(username, fetcher) {
    return cacheWrapper(
      `username:${username}`, 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.USER }
    );
  },
  
  // Cache user permissions
  async getPermissions(userId, fetcher) {
    return cacheWrapper(
      `permissions:${userId}`, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.USER }
    );
  },
  
  // Cache active users list
  async getActiveUsers(fetcher) {
    return cacheWrapper(
      'active:list', 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.USER }
    );
  },
  
  // Cache users by department
  async getByDepartment(department, fetcher) {
    return cacheWrapper(
      `dept:${department}`, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.USER }
    );
  },
  
  // Invalidate user cache
  invalidate(userId) {
    const cache = caches.medium;
    const keys = cache.keys();
    
    // Remove all keys related to this user
    keys.forEach(key => {
      if (key.includes(userId) || key.includes(CACHE_PREFIXES.USER)) {
        cache.del(key);
      }
    });
  }
};

/**
 * Department-related caching functions
 */
const departmentCache = {
  // Cache all active departments
  async getActive(fetcher) {
    return cacheWrapper(
      'active:list', 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.DEPT }
    );
  },
  
  // Cache department by ID
  async getById(deptId, fetcher) {
    return cacheWrapper(
      deptId, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.DEPT }
    );
  },
  
  // Cache department by code
  async getByCode(code, fetcher) {
    return cacheWrapper(
      `code:${code}`, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.DEPT }
    );
  },
  
  // Cache department with employee count
  async getWithEmployeeCount(deptId, fetcher) {
    return cacheWrapper(
      `withcount:${deptId}`, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.DEPT }
    );
  },
  
  // Invalidate department cache
  invalidate(deptId = null) {
    Object.values(caches).forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(CACHE_PREFIXES.DEPT) && (!deptId || key.includes(deptId))) {
          cache.del(key);
        }
      });
    });
  }
};

/**
 * Leave-related caching functions
 */
const leaveCache = {
  // Cache user's leave balance
  async getBalance(userId, fetcher) {
    return cacheWrapper(
      `balance:${userId}`, 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.LEAVE, ttl: 300 } // 5 minutes
    );
  },
  
  // Cache user's leave requests
  async getUserRequests(userId, fetcher) {
    return cacheWrapper(
      `requests:${userId}`, 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.LEAVE }
    );
  },
  
  // Cache pending requests (for managers)
  async getPendingRequests(fetcher) {
    return cacheWrapper(
      'pending:list', 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.LEAVE, ttl: 120 } // 2 minutes
    );
  },
  
  // Cache leave statistics
  async getStats(year, fetcher) {
    return cacheWrapper(
      `stats:${year}`, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.LEAVE }
    );
  },
  
  // Cache leave policy settings
  async getPolicy(fetcher) {
    return cacheWrapper(
      'policy', 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.LEAVE }
    );
  },
  
  // Invalidate leave cache for user
  invalidateUser(userId) {
    Object.values(caches).forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(CACHE_PREFIXES.LEAVE) && key.includes(userId)) {
          cache.del(key);
        }
      });
    });
  },
  
  // Invalidate all leave cache
  invalidateAll() {
    Object.values(caches).forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(CACHE_PREFIXES.LEAVE)) {
          cache.del(key);
        }
      });
    });
  }
};

/**
 * Payroll-related caching functions
 */
const payrollCache = {
  // Cache payroll data by month
  async getByMonth(yearMonth, fetcher) {
    return cacheWrapper(
      `month:${yearMonth}`, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.PAYROLL }
    );
  },
  
  // Cache employee payroll history
  async getEmployeeHistory(employeeId, fetcher) {
    return cacheWrapper(
      `history:${employeeId}`, 
      fetcher, 
      'medium',
      { prefix: CACHE_PREFIXES.PAYROLL }
    );
  },
  
  // Cache payroll statistics
  async getStats(year, fetcher) {
    return cacheWrapper(
      `stats:${year}`, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.PAYROLL }
    );
  },
  
  // Invalidate payroll cache
  invalidate(yearMonth = null) {
    Object.values(caches).forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(CACHE_PREFIXES.PAYROLL) && (!yearMonth || key.includes(yearMonth))) {
          cache.del(key);
        }
      });
    });
  }
};

/**
 * Statistics and reporting cache
 */
const statsCache = {
  // Cache dashboard statistics
  async getDashboardStats(fetcher) {
    return cacheWrapper(
      'dashboard', 
      fetcher, 
      'short',
      { prefix: CACHE_PREFIXES.STATS, ttl: 600 } // 10 minutes
    );
  },
  
  // Cache monthly reports
  async getMonthlyReport(yearMonth, fetcher) {
    return cacheWrapper(
      `monthly:${yearMonth}`, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.STATS }
    );
  },
  
  // Cache yearly reports
  async getYearlyReport(year, fetcher) {
    return cacheWrapper(
      `yearly:${year}`, 
      fetcher, 
      'long',
      { prefix: CACHE_PREFIXES.STATS }
    );
  },
  
  // Invalidate all stats
  invalidateAll() {
    const cache = caches.short;
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(CACHE_PREFIXES.STATS)) {
        cache.del(key);
      }
    });
  }
};

/**
 * Cache management utilities
 */
const cacheManager = {
  // Get cache statistics
  getStats() {
    return {
      short: {
        keys: caches.short.keys().length,
        hits: caches.short.getStats().hits,
        misses: caches.short.getStats().misses,
        hitRate: caches.short.getStats().hits / (caches.short.getStats().hits + caches.short.getStats().misses)
      },
      medium: {
        keys: caches.medium.keys().length,
        hits: caches.medium.getStats().hits,
        misses: caches.medium.getStats().misses,
        hitRate: caches.medium.getStats().hits / (caches.medium.getStats().hits + caches.medium.getStats().misses)
      },
      long: {
        keys: caches.long.keys().length,
        hits: caches.long.getStats().hits,
        misses: caches.long.getStats().misses,
        hitRate: caches.long.getStats().hits / (caches.long.getStats().hits + caches.long.getStats().misses)
      }
    };
  },
  
  // Clear all caches
  clearAll() {
    Object.values(caches).forEach(cache => cache.flushAll());
    console.log('All caches cleared');
  },
  
  // Clear specific cache type
  clear(cacheType) {
    if (caches[cacheType]) {
      caches[cacheType].flushAll();
      console.log(`${cacheType} cache cleared`);
    }
  },
  
  // Set custom cache value
  set(key, value, cacheType = 'short', ttl = null) {
    const cache = caches[cacheType];
    if (ttl) {
      cache.set(key, value, ttl);
    } else {
      cache.set(key, value);
    }
  },
  
  // Get cache value
  get(key, cacheType = 'short') {
    return caches[cacheType].get(key);
  },
  
  // Delete specific key
  del(key, cacheType = 'short') {
    return caches[cacheType].del(key);
  },
  
  // List all keys
  keys(cacheType = null) {
    if (cacheType) {
      return caches[cacheType] ? caches[cacheType].keys() : [];
    }
    
    const allKeys = {};
    Object.keys(caches).forEach(type => {
      allKeys[type] = caches[type].keys();
    });
    return allKeys;
  }
};

// Event listeners for cache events
Object.keys(caches).forEach(cacheType => {
  const cache = caches[cacheType];
  
  cache.on('set', (key, value) => {
    console.log(`Cache SET [${cacheType}]: ${key}`);
  });
  
  cache.on('del', (key, value) => {
    console.log(`Cache DEL [${cacheType}]: ${key}`);
  });
  
  cache.on('expired', (key, value) => {
    console.log(`Cache EXPIRED [${cacheType}]: ${key}`);
  });
});

module.exports = {
  cacheWrapper,
  userCache,
  departmentCache,
  leaveCache,
  payrollCache,
  statsCache,
  cacheManager,
  CACHE_PREFIXES
};