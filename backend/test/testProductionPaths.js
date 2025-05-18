/**
 * This script directly tests the path selection in production mode without
 * needing to run the server.
 */

// Set NODE_ENV to production
process.env.NODE_ENV = 'production';

// Import the path logic directly from the controller to debug how path selection works
const path = require('path');
const fs = require('fs');

// Simulate the path logic from dnsController.ts
const isProd = process.env.NODE_ENV === 'production';
const BIND_ZONES_DIR = isProd ? '/var/named' : './test/dns/zones';
const BIND_CONF_DIR = isProd ? '/etc' : './test/dns/config';
const BIND_CONF_PATH = isProd ? '/etc/named.conf' : './test/dns/config/named.conf';
const ZONE_CONF_PATH = isProd ? '/etc/named.rfc1912.zones' : './test/dns/config/named.conf.zones';

// Debug paths
console.log('Path configuration:');
console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`isProd = ${isProd}`);
console.log(`BIND_ZONES_DIR = ${BIND_ZONES_DIR}`);
console.log(`BIND_CONF_DIR = ${BIND_CONF_DIR}`);
console.log(`BIND_CONF_PATH = ${BIND_CONF_PATH}`);
console.log(`ZONE_CONF_PATH = ${ZONE_CONF_PATH}`);

// Check if the production paths exist
console.log('\nProduction path check:');
const prodPaths = [
  '/var/named',
  '/etc/named.conf',
  '/etc/named.rfc1912.zones'
];

prodPaths.forEach(p => {
  try {
    const stats = fs.statSync(p);
    console.log(`${p}: EXISTS (${stats.isDirectory() ? 'directory' : 'file'})`);
  } catch (err) {
    console.log(`${p}: DOES NOT EXIST (${err.code})`);
  }
});

// Check directory creation logic
console.log('\nEnsuring critical directories exist:');
function ensureDirectoryExists(dir) {
  console.log(`Checking directory: ${dir}`);
  if (!fs.existsSync(dir)) {
    console.log(`  Directory does not exist, would create: ${dir}`);
    try {
      // Don't actually create the directory, just check permissions
      const parent = path.dirname(dir);
      const hasParentAccess = fs.accessSync(parent, fs.constants.W_OK | fs.constants.R_OK);
      console.log(`  Parent directory ${parent} is writable: ${hasParentAccess === undefined ? 'YES' : 'NO'}`);
    } catch (err) {
      console.log(`  Parent directory is not accessible: ${err.message}`);
    }
  } else {
    console.log(`  Directory already exists: ${dir}`);
  }
}

// Test the directory creation logic
ensureDirectoryExists(BIND_ZONES_DIR);
ensureDirectoryExists(path.dirname(BIND_CONF_PATH));
ensureDirectoryExists(path.dirname(ZONE_CONF_PATH)); 