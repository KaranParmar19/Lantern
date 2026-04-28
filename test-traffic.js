const express = require('express');
const lantern = require('./sdk/src/index');
const http = require('http');

const API_KEY = process.argv[2];

if (!API_KEY) {
  console.error('\n❌ Please provide your project API key as an argument.');
  console.error('Example: node test-traffic.js ltrn_live_your_key_here\n');
  process.exit(1);
}

const app = express();
const PORT = 3005;

// Initialize SDK
lantern.init({
  projectKey: API_KEY, 
  collectorURL: 'http://localhost:4000', 
  flushInterval: 2000, 
  systemMetricsInterval: 5000, 
  debug: true,
});

app.use(lantern.middleware());
app.use(express.json());

// Endpoints
app.get('/api/users', (req, res) => res.json({ status: 'ok', users: [1, 2, 3] }));
app.get('/api/users/:id', (req, res) => {
  if (req.params.id === '999') return res.status(404).json({ error: 'Not found' });
  res.json({ id: req.params.id, name: 'Test User' });
});
app.post('/api/orders', (req, res) => {
  const delay = Math.floor(Math.random() * 500) + 100;
  setTimeout(() => res.json({ orderId: 'ORD123', processingTime: delay }), delay);
});
app.get('/api/reports', (req, res) => {
  const delay = Math.floor(Math.random() * 2000) + 1000;
  setTimeout(() => res.json({ report: 'Ready', generatedIn: delay }), delay);
});
app.get('/api/error', (req, res) => res.status(500).json({ error: 'Internal Server Error' }));

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Test app running on http://localhost:${PORT}`);
  console.log(`🔌 Connected to Lantern with API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`\nGenerating random traffic... Keep this running and check your dashboard!\n`);
  
  // Traffic Generator
  const endpoints = [
    { method: 'GET', path: '/api/users', weight: 40 },
    { method: 'GET', path: '/api/users/1', weight: 20 },
    { method: 'GET', path: '/api/users/999', weight: 10 }, // 404
    { method: 'POST', path: '/api/orders', weight: 15 },
    { method: 'GET', path: '/api/reports', weight: 5 }, // Slow
    { method: 'GET', path: '/api/error', weight: 10 }, // 500
  ];

  const makeRequest = () => {
    const rand = Math.random() * 100;
    let sum = 0;
    let target = endpoints[0];
    
    for (const ep of endpoints) {
      sum += ep.weight;
      if (rand <= sum) { target = ep; break; }
    }

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: target.path,
      method: target.method,
    };

    const req = http.request(options, (res) => {
      // Consume response data to free up memory
      res.on('data', () => {});
    });
    
    req.on('error', () => {});
    if (target.method === 'POST') req.write('{}');
    req.end();

    // Randomize next request interval (between 10ms and 150ms)
    setTimeout(makeRequest, Math.floor(Math.random() * 140) + 10);
  };

  // Start many concurrent traffic loops to simulate high production load
  const CONCURRENT_USERS = 40;
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    setTimeout(makeRequest, Math.random() * 1000);
  }
});
