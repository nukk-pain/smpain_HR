/**
 * User filters hook
 * 
 * Provides comprehensive filtering, searching, and sorting functionality
 * for user lists with optimized performance and flexible configuration.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { USER_ROLES, UserRole } from '../constants/userRoles';

// User interface with flexible properties
export interface FilterableUser {
  id?: number | string;
  name?: string;
  username?: string;
  role?: string;
  department?: string;
  position?: string;
  status?: string;
  [key: string]: any;
}

// Filter interface
export interface UserFilters {
  search: string;
  department: string;
  role: string;
  status: string;
  [key: string]: string;
}

// Sort configuration
export type SortField = 'id' | 'name' | 'username' | 'department' | 'role' | 'status' | 'position';
export type SortOrder = 'asc' | 'desc';

// Filter configuration
export interface FilterConfig {
  searchFields?: string[];
  customFilters?: Record<string, (user: FilterableUser, value: string) => boolean>;
  debounceDelay?: number;
}

// Hook options
export interface UseUserFiltersOptions extends FilterConfig {
  initialFilters?: Partial<UserFilters>;
  initialSortBy?: SortField;
  initialSortOrder?: SortOrder;
}

// Hook return interface
export interface UseUserFiltersReturn {
  readonly filteredUsers: readonly FilterableUser[];
  readonly filters: Readonly<UserFilters>;
  readonly sortBy: SortField;
  readonly sortOrder: SortOrder;
  readonly departments: readonly string[];
  readonly roles: readonly string[];
  readonly activeFilterCount: number;
  readonly hasActiveFilters: boolean;
  readonly isFiltering: boolean;
  setSearch: (search: string) => void;
  setDepartment: (department: string) => void;
  setRole: (role: string) => void;
  setStatus: (status: string) => void;
  setFilter: (key: string, value: string) => void;
  setSortBy: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
  resetFilters: () => void;
  applyPreset: (preset: Partial<UserFilters>) => void;
}

// Default filter state
const DEFAULT_FILTERS: UserFilters = {
  search: '',
  department: '',
  role: '',
  status: 'all'
};

// Default search fields
const DEFAULT_SEARCH_FIELDS = ['name', 'username'];

// Debounce hook for search
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Helper to extract unique values from array
const getUniqueValues = (items: any[], field: string): string[] => {
  const values = new Set(
    items
      .map(item => item[field])
      .filter(value => value !== undefined && value !== null && value !== '')
  );
  return Array.from(values).sort();
};

// Case-insensitive string comparison
const matchesSearch = (value: any, search: string): boolean => {
  if (!value) return false;
  return value.toString().toLowerCase().includes(search.toLowerCase());
};

// Optimized filter function
const filterUsers = (
  users: FilterableUser[],
  filters: UserFilters,
  searchFields: string[],
  customFilters?: Record<string, (user: FilterableUser, value: string) => boolean>
): FilterableUser[] => {
  // Early return if no filters
  const hasFilters = Object.entries(filters).some(([key, value]) => 
    key === 'status' ? value !== 'all' : !!value
  );
  
  if (!hasFilters) return users;

  return users.filter(user => {
    // Search filter (across multiple fields)
    if (filters.search) {
      const matchesAnyField = searchFields.some(field => 
        matchesSearch(user[field], filters.search)
      );
      if (!matchesAnyField) return false;
    }

    // Standard filters
    if (filters.department && user.department !== filters.department) return false;
    if (filters.role && user.role !== filters.role) return false;
    if (filters.status !== 'all' && user.status !== filters.status) return false;

    // Custom filters
    if (customFilters) {
      for (const [key, filterFn] of Object.entries(customFilters)) {
        if (filters[key] && !filterFn(user, filters[key])) {
          return false;
        }
      }
    }

    return true;
  });
};

// Optimized sort function
const sortUsers = (
  users: FilterableUser[],
  sortBy: SortField,
  sortOrder: SortOrder
): FilterableUser[] => {
  return [...users].sort((a, b) => {
    const aValue = (a[sortBy] ?? '').toString();
    const bValue = (b[sortBy] ?? '').toString();
    
    // Handle numeric comparison for IDs
    if (sortBy === 'id') {
      const aNum = parseInt(aValue, 10);
      const bNum = parseInt(bValue, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
    }
    
    // String comparison with locale support
    const comparison = aValue.localeCompare(bValue, 'ko-KR', { 
      numeric: true,
      sensitivity: 'base'
    });
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

/**
 * Custom hook for user filtering and sorting
 */
export const useUserFilters = (
  users: FilterableUser[],
  options: UseUserFiltersOptions = {}
): UseUserFiltersReturn => {
  const {
    searchFields = DEFAULT_SEARCH_FIELDS,
    customFilters,
    debounceDelay = 300,
    initialFilters = {},
    initialSortBy = 'name',
    initialSortOrder = 'asc'
  } = options;

  // State management
  const [filters, setFilters] = useState<UserFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });
  
  const [sortBy, setSortByState] = useState<SortField>(initialSortBy);
  const [sortOrder, setSortOrderState] = useState<SortOrder>(initialSortOrder);
  const [isFiltering, setIsFiltering] = useState(false);

  // Debounced search value
  const debouncedSearch = useDebounce(filters.search, debounceDelay);

  // Memoized filters with debounced search
  const effectiveFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters, debouncedSearch]);

  // Extract unique departments and roles
  const departments = useMemo(() => 
    getUniqueValues(users, 'department'),
    [users]
  );

  const roles = useMemo(() => 
    getUniqueValues(users, 'role'),
    [users]
  );

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    const filtered = filterUsers(
      users,
      effectiveFilters,
      searchFields,
      customFilters
    );
    
    const sorted = sortUsers(filtered, sortBy, sortOrder);
    
    return sorted;
  }, [users, effectiveFilters, searchFields, customFilters, sortBy, sortOrder]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.entries(effectiveFilters).filter(([key, value]) => {
      if (key === 'status') return value !== 'all';
      return !!value;
    }).length;
  }, [effectiveFilters]);

  const hasActiveFilters = activeFilterCount > 0;

  // Update filtering state when dependencies change
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 0);
    return () => clearTimeout(timer);
  }, [users, effectiveFilters, searchFields, customFilters, sortBy, sortOrder]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setDepartment = useCallback((department: string) => {
    setFilters(prev => ({ ...prev, department }));
  }, []);

  const setRole = useCallback((role: string) => {
    setFilters(prev => ({ ...prev, role }));
  }, []);

  const setStatus = useCallback((status: string) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Sort setters
  const setSortBy = useCallback((field: SortField) => {
    setSortByState(field);
  }, []);

  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order);
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrderState(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    setSortByState(initialSortBy);
    setSortOrderState(initialSortOrder);
  }, [initialFilters, initialSortBy, initialSortOrder]);

  // Apply preset filters
  const applyPreset = useCallback((preset: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...preset }));
  }, []);

  return {
    filteredUsers: Object.freeze(filteredUsers) as readonly FilterableUser[],
    filters: Object.freeze(effectiveFilters),
    sortBy,
    sortOrder,
    departments: Object.freeze(departments) as readonly string[],
    roles: Object.freeze(roles) as readonly string[],
    activeFilterCount,
    hasActiveFilters,
    isFiltering,
    setSearch,
    setDepartment,
    setRole,
    setStatus,
    setFilter,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    resetFilters,
    applyPreset
  };
};