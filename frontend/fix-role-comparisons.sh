#!/bin/bash

echo "🔧 Fixing UserRole string comparisons..."

# Fix "Admin" to "admin"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/=== 'Admin'/=== 'admin'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/=== "Admin"/=== "admin"/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/!== 'Admin'/!== 'admin'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/!== "Admin"/!== "admin"/g'

# Fix "User" to "user"  
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/=== 'User'/=== 'user'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/=== "User"/=== "user"/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/!== 'User'/!== 'user'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/!== "User"/!== "user"/g'

# Fix "Supervisor" to "supervisor"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/=== 'Supervisor'/=== 'supervisor'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/=== "Supervisor"/=== "supervisor"/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/!== 'Supervisor'/!== 'supervisor'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/!== "Supervisor"/!== "supervisor"/g'

# Fix "Manager" to "manager"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/=== 'Manager'/=== 'manager'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/=== "Manager"/=== "manager"/g'
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/!== 'Manager'/!== 'manager'/g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/!== "Manager"/!== "manager"/g'

echo "✅ Role comparison fixes completed"