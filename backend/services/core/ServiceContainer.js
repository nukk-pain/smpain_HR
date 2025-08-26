/**
 * Service Container - Dependency Injection Container
 * Manages service lifecycle and dependencies
 */

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.dependencies = new Map();
    this.initializationOrder = [];
  }
  
  /**
   * Register a service factory
   */
  register(name, factory, options = {}) {
    const { 
      singleton = true, 
      dependencies = [],
      initPriority = 100 
    } = options;
    
    this.factories.set(name, {
      factory,
      singleton,
      dependencies,
      initPriority
    });
    
    // Store dependencies for resolution
    this.dependencies.set(name, dependencies);
    
    // Update initialization order
    this.updateInitializationOrder();
    
    return this;
  }
  
  /**
   * Get a service instance
   */
  async get(name) {
    // Check if singleton already exists
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }
    
    // Check if factory exists
    const factoryConfig = this.factories.get(name);
    if (!factoryConfig) {
      throw new Error(`Service '${name}' not registered`);
    }
    
    // Resolve dependencies
    const deps = await this.resolveDependencies(factoryConfig.dependencies);
    
    // Create instance
    const instance = await this.createInstance(factoryConfig.factory, deps);
    
    // Store singleton if needed
    if (factoryConfig.singleton) {
      this.singletons.set(name, instance);
    }
    
    // Store in services map
    this.services.set(name, instance);
    
    return instance;
  }
  
  /**
   * Resolve service dependencies
   */
  async resolveDependencies(dependencies) {
    const resolved = {};
    
    for (const dep of dependencies) {
      // Check for circular dependencies
      if (this.hasCircularDependency(dep, [])) {
        throw new Error(`Circular dependency detected for '${dep}'`);
      }
      
      resolved[dep] = await this.get(dep);
    }
    
    return resolved;
  }
  
  /**
   * Create service instance
   */
  async createInstance(factory, dependencies) {
    let instance;
    
    if (typeof factory === 'function') {
      // Check if it's a class (constructor function)
      if (factory.prototype && factory.prototype.constructor === factory) {
        instance = new factory(dependencies);
      } else {
        // Regular factory function
        instance = await factory(dependencies);
      }
    } else {
      // Direct value
      instance = factory;
    }
    
    // Initialize if it has an initialize method
    if (instance && typeof instance.initialize === 'function') {
      await instance.initialize();
    }
    
    return instance;
  }
  
  /**
   * Check for circular dependencies
   */
  hasCircularDependency(serviceName, path = []) {
    if (path.includes(serviceName)) {
      return true;
    }
    
    const deps = this.dependencies.get(serviceName);
    if (!deps || deps.length === 0) {
      return false;
    }
    
    const newPath = [...path, serviceName];
    for (const dep of deps) {
      if (this.hasCircularDependency(dep, newPath)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Update initialization order based on dependencies
   */
  updateInitializationOrder() {
    const visited = new Set();
    const order = [];
    
    const visit = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      
      const deps = this.dependencies.get(name) || [];
      for (const dep of deps) {
        visit(dep);
      }
      
      order.push(name);
    };
    
    // Visit all services
    for (const [name] of this.factories) {
      visit(name);
    }
    
    this.initializationOrder = order;
  }
  
  /**
   * Initialize all services in correct order
   */
  async initializeAll() {
    console.log('Initializing services in order:', this.initializationOrder);
    
    for (const name of this.initializationOrder) {
      try {
        await this.get(name);
        console.log(`✓ Initialized ${name}`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${name}:`, error.message);
        throw error;
      }
    }
  }
  
  /**
   * Shutdown all services in reverse order
   */
  async shutdownAll() {
    const reverseOrder = [...this.initializationOrder].reverse();
    console.log('Shutting down services in order:', reverseOrder);
    
    for (const name of reverseOrder) {
      const service = this.services.get(name);
      if (service && typeof service.shutdown === 'function') {
        try {
          await service.shutdown();
          console.log(`✓ Shut down ${name}`);
        } catch (error) {
          console.error(`✗ Failed to shut down ${name}:`, error.message);
        }
      }
    }
    
    // Clear all references
    this.services.clear();
    this.singletons.clear();
  }
  
  /**
   * Get health status of all services
   */
  async getHealthStatus() {
    const health = {};
    
    for (const [name, service] of this.services) {
      if (service && typeof service.getHealth === 'function') {
        health[name] = await service.getHealth();
      } else {
        health[name] = { status: 'unknown' };
      }
    }
    
    return health;
  }
  
  /**
   * Check if a service is registered
   */
  has(name) {
    return this.factories.has(name);
  }
  
  /**
   * Clear all services (for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.dependencies.clear();
    this.initializationOrder = [];
  }
}

// Export singleton instance
module.exports = new ServiceContainer();