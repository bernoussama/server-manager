const { generateHttpdConf } = require('./apps/backend/dist/chunk-JONASUC6.js');

const testConfig = {
  serverStatus: true,
  globalConfig: {
    serverRoot: '/etc/httpd',
    serverName: 'test<script>alert("xss")</script>.com',
    serverAdmin: 'admin@test">&<.com',
    listen: [{ port: 80 }, { port: 443, ssl: true }],
    customDirectives: [
      {
        name: 'Test<Directive>',
        value: 'value"with`special&chars>redirect',
        comment: 'Comment with > redirect and $ variable'
      }
    ]
  },
  virtualHosts: []
};

console.log('=== Testing HTTP Configuration Generation ===');
console.log('Original ServerName:', testConfig.globalConfig.serverName);
console.log('Original ServerAdmin:', testConfig.globalConfig.serverAdmin);
console.log('\n=== Generated Configuration ===');

try {
  const result = generateHttpdConf(testConfig);
  console.log(result);
  
  // Check if dangerous characters were sanitized
  console.log('\n=== Safety Checks ===');
  console.log('Contains <script>:', result.includes('<script>'));
  console.log('Contains >& sequences:', result.includes('>&'));
  console.log('Contains backticks:', result.includes('`'));
  console.log('Contains $ variables:', result.includes('$'));
  console.log('SSL module loaded conditionally:', result.includes('LoadModule ssl_module'));
  
} catch (error) {
  console.error('Error generating configuration:', error);
} 