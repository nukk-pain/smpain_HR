const fs = require('fs');
const path = require('path');

function analyzeParameterFormats() {
  console.log('🔍 Analyzing parameter format inconsistencies...\n');
  
  // Load backend APIs
  const backendAPIs = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/backend-apis.json'), 'utf8'));
  
  // Analyze parameter naming patterns
  const parameterPatterns = {
    camelCase: [],
    snake_case: [],
    mixed: [],
    other: []
  };
  
  // Extract parameters from endpoints
  backendAPIs.forEach(api => {
    const paramMatches = api.endpoint.match(/:(\w+)/g);
    if (paramMatches) {
      paramMatches.forEach(param => {
        const paramName = param.substring(1); // Remove the :
        
        if (paramName.includes('_')) {
          parameterPatterns.snake_case.push({
            endpoint: api.endpoint,
            param: paramName,
            file: api.file
          });
        } else if (paramName.match(/[a-z][A-Z]/)) {
          parameterPatterns.camelCase.push({
            endpoint: api.endpoint,
            param: paramName,
            file: api.file
          });
        } else if (paramName.toLowerCase() === paramName) {
          parameterPatterns.other.push({
            endpoint: api.endpoint,
            param: paramName,
            file: api.file
          });
        }
      });
    }
  });
  
  console.log('📊 Parameter Format Analysis:\n');
  console.log(`Snake_case parameters: ${parameterPatterns.snake_case.length}`);
  console.log(`camelCase parameters: ${parameterPatterns.camelCase.length}`);
  console.log(`Other (lowercase): ${parameterPatterns.other.length}`);
  
  console.log('\n🐍 Snake_case Parameters:');
  parameterPatterns.snake_case.forEach(p => {
    console.log(`  - ${p.param} in ${p.endpoint} (${p.file})`);
  });
  
  console.log('\n🐫 camelCase Parameters:');
  parameterPatterns.camelCase.forEach(p => {
    console.log(`  - ${p.param} in ${p.endpoint} (${p.file})`);
  });
  
  console.log('\n📝 Other Parameters:');
  parameterPatterns.other.forEach(p => {
    console.log(`  - ${p.param} in ${p.endpoint} (${p.file})`);
  });
  
  // Analyze request/response body field naming
  console.log('\n🔍 Analyzing field naming in code...\n');
  
  // Common fields to check
  const fieldPatterns = {
    snake_case: [
      'user_id', 'employee_id', 'year_month', 'start_date', 'end_date',
      'leave_type', 'created_at', 'updated_at', 'is_active', 'hire_date',
      'phone_number', 'birth_date', 'substitute_employee', 'days_count',
      'leave_balance', 'total_amount', 'base_salary', 'sales_amount'
    ],
    camelCase: [
      'userId', 'employeeId', 'yearMonth', 'startDate', 'endDate',
      'leaveType', 'createdAt', 'updatedAt', 'isActive', 'hireDate',
      'phoneNumber', 'birthDate', 'substituteEmployee', 'daysCount',
      'leaveBalance', 'totalAmount', 'baseSalary', 'salesAmount'
    ]
  };
  
  // Search for field usage in backend routes
  const routesDir = path.join(__dirname, '../backend/routes');
  const fieldUsage = {
    snake_case: {},
    camelCase: {}
  };
  
  function searchInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    fieldPatterns.snake_case.forEach(field => {
      if (content.includes(field)) {
        if (!fieldUsage.snake_case[field]) {
          fieldUsage.snake_case[field] = [];
        }
        if (!fieldUsage.snake_case[field].includes(fileName)) {
          fieldUsage.snake_case[field].push(fileName);
        }
      }
    });
    
    fieldPatterns.camelCase.forEach(field => {
      if (content.includes(field)) {
        if (!fieldUsage.camelCase[field]) {
          fieldUsage.camelCase[field] = [];
        }
        if (!fieldUsage.camelCase[field].includes(fileName)) {
          fieldUsage.camelCase[field].push(fileName);
        }
      }
    });
  }
  
  function searchDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDirectory(fullPath);
      } else if (file.endsWith('.js')) {
        searchInFile(fullPath);
      }
    });
  }
  
  searchDirectory(routesDir);
  
  console.log('📊 Field Naming Usage:\n');
  
  console.log('🐍 Snake_case fields:');
  Object.entries(fieldUsage.snake_case).forEach(([field, files]) => {
    console.log(`  ${field}: used in ${files.length} files`);
  });
  
  console.log('\n🐫 CamelCase fields:');
  Object.entries(fieldUsage.camelCase).forEach(([field, files]) => {
    console.log(`  ${field}: used in ${files.length} files`);
  });
  
  // Identify conflicts
  console.log('\n⚠️  Fields with both formats:');
  const conflicts = [];
  fieldPatterns.snake_case.forEach((snakeField, index) => {
    const camelField = fieldPatterns.camelCase[index];
    if (fieldUsage.snake_case[snakeField] && fieldUsage.camelCase[camelField]) {
      conflicts.push({
        snake: snakeField,
        camel: camelField,
        snakeFiles: fieldUsage.snake_case[snakeField],
        camelFiles: fieldUsage.camelCase[camelField]
      });
    }
  });
  
  conflicts.forEach(conflict => {
    console.log(`\n  ${conflict.snake} / ${conflict.camel}:`);
    console.log(`    Snake_case in: ${conflict.snakeFiles.join(', ')}`);
    console.log(`    camelCase in: ${conflict.camelFiles.join(', ')}`);
  });
  
  // Generate recommendations
  console.log('\n📋 Recommendations:\n');
  console.log('1. Database Fields:');
  console.log('   - MongoDB typically uses camelCase');
  console.log('   - Current database appears to use snake_case');
  console.log('   - Consider keeping database fields as-is to avoid migration');
  
  console.log('\n2. API Parameters:');
  console.log('   - URL parameters are mixed (year_month, userId, etc.)');
  console.log('   - Recommend: Use camelCase for consistency with JavaScript');
  
  console.log('\n3. Request/Response Bodies:');
  console.log('   - Currently using snake_case (matching database)');
  console.log('   - Options:');
  console.log('     a) Keep snake_case (no conversion needed)');
  console.log('     b) Use camelCase and add conversion layer');
  
  console.log('\n4. Suggested Approach:');
  console.log('   - Keep database fields as snake_case');
  console.log('   - Use camelCase in API responses');
  console.log('   - Add conversion utilities for consistency');
  
  // Save analysis
  const analysis = {
    parameters: {
      total: parameterPatterns.snake_case.length + parameterPatterns.camelCase.length + parameterPatterns.other.length,
      breakdown: {
        snake_case: parameterPatterns.snake_case.length,
        camelCase: parameterPatterns.camelCase.length,
        other: parameterPatterns.other.length
      }
    },
    fieldUsage: {
      snake_case: Object.keys(fieldUsage.snake_case).length,
      camelCase: Object.keys(fieldUsage.camelCase).length,
      conflicts: conflicts.length
    },
    patterns: parameterPatterns,
    conflicts,
    recommendations: [
      'Create field name conversion utilities',
      'Standardize URL parameters to camelCase',
      'Document naming conventions',
      'Add ESLint rules for consistency'
    ],
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../analysis/parameter-format-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  console.log('\n✅ Analysis saved to analysis/parameter-format-analysis.json');
  
  return analysis;
}

if (require.main === module) {
  analyzeParameterFormats();
}

module.exports = { analyzeParameterFormats };