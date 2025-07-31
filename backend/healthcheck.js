const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        if (response.status === 'healthy') {
          console.log('Health check passed:', response);
          process.exit(0);
        } else {
          console.error('Health check failed - unhealthy status:', response);
          process.exit(1);
        }
      } catch (error) {
        console.error('Health check failed - invalid JSON:', data);
        process.exit(1);
      }
    } else {
      console.error(`Health check failed - HTTP ${res.statusCode}:`, data);
      process.exit(1);
    }
  });
});

request.on('error', (error) => {
  console.error('Health check failed - connection error:', error.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check failed - timeout');
  request.destroy();
  process.exit(1);
});

request.end();