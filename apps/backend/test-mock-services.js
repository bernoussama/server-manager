#!/usr/bin/env node

// Simple test script to verify mock services are working
const http = require('http');

const makeRequest = (path) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

async function testMockServices() {
  console.log('🧪 Testing Mock Services API...\n');

  const tests = [
    { name: 'Server Info', path: '/info' },
    { name: 'All Services Status', path: '/services' },
    { name: 'DNS Service Status', path: '/services/named' },
    { name: 'DHCP Service Status', path: '/services/dhcpd' },
    { name: 'HTTP Service Status', path: '/services/httpd' },
    { name: 'System Metrics', path: '/system-metrics' },
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await makeRequest(test.path);
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}: OK`);
        if (test.name === 'All Services Status' && result.data?.data) {
          result.data.data.forEach(service => {
            console.log(`   📊 ${service.service}: ${service.status} - ${service.message}`);
          });
        } else if (test.name === 'System Metrics' && result.data) {
          console.log(`   📊 Uptime: ${result.data.uptime}`);
          console.log(`   📊 Memory: ${result.data.memory?.used}${result.data.memory?.unit} / ${result.data.memory?.total}${result.data.memory?.unit}`);
          console.log(`   📊 CPU: ${result.data.cpu?.currentLoad}% (${result.data.cpu?.cores} cores)`);
          console.log(`   📊 Active Services: ${result.data.activeServices?.length || 0}`);
        }
      } else {
        console.log(`❌ ${test.name}: Failed (${result.status})`);
        console.log(`   Error: ${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
    console.log('');
  }

  console.log('🎯 Mock Services Test Complete!');
}

// Check if server is running first
makeRequest('/info')
  .then(() => {
    testMockServices();
  })
  .catch((error) => {
    console.log('❌ Server is not running. Please start the backend server first:');
    console.log('   npm run dev');
    console.log('');
    console.log(`Error: ${error.message}`);
  }); 