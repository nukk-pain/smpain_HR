#!/bin/bash

echo "Generating JWT token..."
TOKEN=$(node -e "
require('dotenv').config({ path: '.env.development' });
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret';
const token = jwt.sign(
  { 
    id: '507f1f77bcf86cd799439011',
    username: 'admin',
    name: 'Test Admin', 
    role: 'Admin',
    permissions: ['users:view', 'users:manage', 'users:delete']
  },
  secret,
  { 
    expiresIn: '24h',
    issuer: 'hr-system',
    audience: 'hr-frontend'
  }
);
console.log(token);
" 2>/dev/null)

echo "Token generated successfully"
echo ""
echo "Testing /api/users endpoint..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/users)
echo "Response: $RESPONSE" | head -100

echo ""
echo "Testing /api/leave/pending endpoint..."
RESPONSE2=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/leave/pending)
echo "Response: $RESPONSE2" | head -100