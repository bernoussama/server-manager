const fetch = require('node-fetch');

async function testInvalidARecord() {
  const url = 'http://localhost:3000/api/dns/config';
  
  const payloadWithInvalidA = {
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
            "value": "192.168.1", // Invalid - missing last octet
            "priority": "",
            "weight": "",
            "port": ""
          }
        ]
      }
    ]
  };
  
  try {
    console.log('Testing with invalid A record...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadWithInvalidA)
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testValidARecord() {
  const url = 'http://localhost:3000/api/dns/config';
  
  const payloadWithValidA = {
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
            "value": "192.168.1.100", // Valid IP
            "priority": "",
            "weight": "",
            "port": ""
          }
        ]
      }
    ]
  };
  
  try {
    console.log('\nTesting with valid A record...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadWithValidA)
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testFullExample() {
  const url = 'http://localhost:3000/api/dns/config';
  
  const fullExample = {
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
            "value": "192.168.1.100", // Fixed from "192.168.1" to "192.168.1.100"
            "priority": "",
            "weight": "",
            "port": ""
          },
          {
            "id": "aae82911-c6fc-42af-a966-185dc1f7b944",
            "type": "CNAME",
            "name": "www",
            "value": "@",
            "priority": "",
            "weight": "",
            "port": ""
          },
          {
            "id": "f5853a0f-db34-45e6-b238-366ec96c2c9d",
            "type": "MX",
            "name": "@",
            "value": "mail.example.com",
            "priority": "10",
            "weight": "",
            "port": ""
          }
        ]
      },
      {
        "id": "78d48755-4dea-4938-9055-fd0ea67c337a",
        "zoneName": "1.168.192.in-addr.arpa",
        "zoneType": "master",
        "fileName": "reverse.example.com",
        "allowUpdate": "none",
        "records": [
          {
            "id": "e3f8ad98-5786-4d1f-9753-c713b71f1d8c",
            "type": "PTR",
            "name": "1",
            "value": "example.com.",
            "priority": "",
            "weight": "",
            "port": ""
          }
        ]
      }
    ]
  };
  
  try {
    console.log('\nTesting with full example (fixed IP)...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fullExample)
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run tests
async function runTests() {
  await testInvalidARecord();
  await testValidARecord();
  await testFullExample();
}

runTests(); 