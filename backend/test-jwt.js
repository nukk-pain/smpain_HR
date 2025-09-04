const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.development' });

const secret = process.env.JWT_SECRET;
console.log('Using JWT_SECRET:', secret ? 'Present' : 'Missing');
console.log('JWT_SECRET length:', secret ? secret.length : 0);

if (!secret) { 
  console.log('JWT_SECRET not found'); 
  process.exit(1); 
}

const token = jwt.sign({
  id: 'test123',
  name: 'Test Admin',
  role: 'Admin',
  permissions: ['payroll:read', 'payroll:write', 'payroll:delete', 'payroll:manage']
}, secret, { 
  expiresIn: '1h',
  issuer: 'hr-system',
  audience: 'hr-frontend'
});

console.log('Generated token:', token);