// A simple script to verify the HTTP server is running
const http = require('http');

const PORT = process.env.PORT || 10000;

console.log(`Attempting to connect to server on port ${PORT}...`);

const req = http.request({
  host: 'localhost',
  port: PORT,
  path: '/healthz',
  method: 'GET'
}, (res) => {
  console.log(`Server responded with status code: ${res.statusCode}`);
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
    console.log('Server is running correctly! ✅');
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error connecting to server:', error.message);
  console.error('Server is not responding on port', PORT, '❌');
  process.exit(1);
});

req.end();

// Set a timeout to exit if we can't connect
setTimeout(() => {
  console.error('Connection timed out after 5 seconds');
  console.error('Server is not responding on port', PORT, '❌');
  process.exit(1);
}, 5000);
