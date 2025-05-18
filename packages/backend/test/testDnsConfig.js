// Test script to validate that a specific DNS payload passes validation
const { dnsConfigurationSchema } = require('@server-manager/shared/validators');

const testPayload = {
  "dnsServerStatus": false,
  "listenOn": "127.0.0.1; 192.168.1.160;",
  "allowQuery": "localhost; 192.168.1.0/24;",
  "allowRecursion": "localhost;",
  "forwarders": "8.8.8.8; 8.8.4.4;",
  "allowTransfer": "none;",
  "zones": [
    {
      "id": "57d674ae-b40f-499d-8067-ad414b650833",
      "zoneName": "example.com",
      "zoneType": "master",
      "fileName": "forward.example.com",
      "allowUpdate": "none",
      "records": [
        {
          "id": "9d5a08af-0fdf-452e-862f-d913d7198447",
          "type": "A",
          "name": "@",
          "value": "192.168.1.1",
          "priority": "",
          "weight": "",
          "port": ""
        },
        {
          "id": "b2e3def8-6ef5-41f2-b416-a5e9ee73818a",
          "type": "CNAME",
          "name": "www",
          "value": "@",
          "priority": "",
          "weight": "",
          "port": ""
        },
        {
          "id": "fed9d8d5-3ff6-424b-b3e6-bd56e2bee0e7",
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
      "id": "67457104-9353-461c-8ae5-be28c06a2e72",
      "zoneName": "1.168.192.in-addr.arpa",
      "zoneType": "master",
      "fileName": "reverse.example.com",
      "allowUpdate": "none",
      "records": [
        {
          "id": "4c472e2f-6888-4769-8dfe-9e619882bb8f",
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

function testValidation() {
  try {
    // First we need to parse the strings to arrays using the schema's transform function
    const parsed = dnsConfigurationSchema.parse(testPayload);
    console.log("Validation successful!");
    console.log("Transformed data:", JSON.stringify(parsed, null, 2));
    return true;
  } catch (error) {
    console.error("Validation failed:", error.errors);
    return false;
  }
}

// Run the test
testValidation(); 