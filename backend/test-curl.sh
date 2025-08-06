#!/bin/bash

# Generate JWT token
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
")

echo "Testing Users API..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/users | python3 -m json.tool | head -20

echo -e "\n\nTesting Leave Pending API..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/leave/pending | python3 -m json.tool | head -20