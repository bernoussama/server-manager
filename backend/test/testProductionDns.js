/**
 * This script simulates hitting the DNS API in production mode.
 * 
 * IMPORTANT: In a real production environment, this would need to be run with sudo
 * to have proper permissions to write to /etc/named.conf and /var/named/*
 * 
 * Since we can't actually run with sudo in this environment, this script will show
 * the expected permission errors, which is the correct behavior.
 */

const fetch = require('node-fetch');
const fs = require('fs');

// Set NODE_ENV to production to test the production paths
process.env.NODE_ENV = 'production';

// Check if we have the expected production directories and permissions
function checkProductionDirs() {
  console.log('Checking production directories and permissions:');
  
  const dirs = [
    '/etc',
    '/var/named'
  ];
  
  const files = [
    '/etc/named.conf',
    '/etc/named.rfc1912.zones'
  ];
  
  dirs.forEach(dir => {
    try {
      const stats = fs.statSync(dir);
      console.log(`${dir}: exists=${stats.isDirectory()}, mode=${stats.mode.toString(8)}`);
      
      // Try to create a test file to check write permission
      try {
        const testFile = `${dir}/.permission_test_${Date.now()}`;
        fs.writeFileSync(testFile, 'test');
        console.log(`  Can write to ${dir}: YES`);
        try {
          fs.unlinkSync(testFile);
        } catch (e) {
          console.log(`  Warning: Could not clean up test file ${testFile}`);
        }
      } catch (writeErr) {
        console.log(`  Can write to ${dir}: NO - ${writeErr.message}`);
      }
    } catch (err) {
      console.log(`${dir}: ${err.message}`);
    }
  });
  
  files.forEach(file => {
    try {
      const stats = fs.statSync(file);
      console.log(`${file}: exists=${stats.isFile()}, mode=${stats.mode.toString(8)}`);
    } catch (err) {
      console.log(`${file}: ${err.message}`);
    }
  });
  
  console.log('');
}

async function testProductionConfig() {
  const url = 'http://localhost:3000/api/dns/config';
  
  const testPayload = {
    "dnsServerStatus": false,
    "listenOn": "127.0.0.1; 192.168.1.160;",
    "allowQuery": "localhost; 192.168.1.0/24;",
    "allowRecursion": "localhost;",
    "forwarders": "8.8.8.8; 8.8.4.4;",
    "allowTransfer": "",
    "zones": [
      {
        "id": "f4b0899c-6a96-46eb-bd19-3c4836d86cd1",
        "zoneName": "example.com",
        "zoneType": "master",
        "fileName": "forward.example.com",
        "allowUpdate": "none",
        "records": [
          {
            "id": "b180ed20-b0ec-40f6-a71a-b8ed778fdf12",
            "type": "A",
            "name": "@",
            "value": "192.168.1.100",
            "priority": "",
            "weight": "",
            "port": ""
          }
        ]
      }
    ]
  };
  
  try {
    console.log('Testing in PRODUCTION mode (expected to fail without sudo)...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
    
    if (response.status === 403) {
      console.log('\nPermission error is expected - this is the correct behavior.');
      console.log('In a real production environment, the server would need to run with sudo or have appropriate permissions.');
    } else if (response.status === 200) {
      console.log('\nWARNING: The request succeeded, which means either:');
      console.log('1. The server is running with sufficient permissions, or');
      console.log('2. The permission check was bypassed for some reason.');
      console.log('3. The server created temporary directories for testing instead of using production paths.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Also test getting the current configuration
async function testGetConfig() {
  const url = 'http://localhost:3000/api/dns/config';
  
  try {
    console.log('\nGetting current configuration in PRODUCTION mode...');
    const response = await fetch(url);
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run tests
async function runTests() {
  checkProductionDirs();
  await testProductionConfig();
  await testGetConfig();
}

runTests(); 