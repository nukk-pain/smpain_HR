// Utility to clear sales data from localStorage
export const clearSalesLocalStorage = (yearMonth?: string) => {
  if (yearMonth) {
    // Clear specific month
    localStorage.removeItem(`salesData_${yearMonth}`);
    console.log(`Cleared localStorage for ${yearMonth}`);
  } else {
    // Clear all sales data
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('salesData_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage: ${key}`);
    });
    
    if (keysToRemove.length === 0) {
      console.log('No sales data found in localStorage');
    }
  }
};

// Debug function to show all sales data in localStorage
export const debugSalesLocalStorage = () => {
  console.log('=== Sales Data in localStorage ===');
  let found = false;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('salesData_')) {
      found = true;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`${key}:`, parsed);
        } catch (e) {
          console.log(`${key}: [Invalid JSON]`);
        }
      }
    }
  }
  
  if (!found) {
    console.log('No sales data found in localStorage');
  }
  console.log('================================');
};