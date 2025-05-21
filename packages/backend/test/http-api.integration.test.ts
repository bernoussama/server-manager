import request from 'supertest';
import { app } from '../../src/app'; // Main Express app
import { HTTPD_CONF_FILE, DOCUMENT_ROOT_DIR, HTTPD_ERROR_LOG_DIR, HTTPD_REQUEST_LOG_DIR } from '../../src/config/httpConfig';
import { generateHttpdConf, HttpdVHostConfig } from '../../src/services/httpService'; // For generating expected content
import { exec } from 'child_process';
import { readFile, writeFile, unlink, mkdir, rmdir } from 'fs/promises'; // For file system operations
import { existsSync } from 'fs';
import path from 'path';

// Mock the exec function from child_process
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'), // Import and retain default behavior
  exec: jest.fn((command, callback) => {
    // console.log(`Mocked exec: ${command}`);
    if (command.startsWith('systemctl is-active httpd')) {
      // Simulate httpd as active for testing reload logic
      callback(null, { stdout: 'active', stderr: '' });
      return;
    }
    if (command.startsWith('systemctl reload httpd')) {
      // Simulate successful reload
      callback(null, { stdout: '', stderr: '' });
      return;
    }
    // For other commands, you might want to call the actual exec or handle differently
    // For this test, we'll assume any other exec call is unexpected or should pass
    callback(null, { stdout: '', stderr: '' });
  }),
}));


// Helper to ensure test directories exist
const ensureTestDirs = async () => {
  const testConfDir = path.dirname(HTTPD_CONF_FILE);
  if (!existsSync(testConfDir)) await mkdir(testConfDir, { recursive: true });
  if (!existsSync(DOCUMENT_ROOT_DIR)) await mkdir(DOCUMENT_ROOT_DIR, { recursive: true });
  if (!existsSync(HTTPD_ERROR_LOG_DIR)) await mkdir(HTTPD_ERROR_LOG_DIR, { recursive: true });
  if (!existsSync(HTTPD_REQUEST_LOG_DIR)) await mkdir(HTTPD_REQUEST_LOG_DIR, { recursive: true });
};

// Helper to clean up test files and directories
const cleanupTestFiles = async () => {
  if (existsSync(HTTPD_CONF_FILE)) await unlink(HTTPD_CONF_FILE);
  if (existsSync(`${HTTPD_CONF_FILE}.bak`)) await unlink(`${HTTPD_CONF_FILE}.bak`);
  
  // Clean up dummy document root if created by tests
  const dummyDocRootPath = path.join(DOCUMENT_ROOT_DIR, 'test.example.com');
  if (existsSync(dummyDocRootPath)) await rmdir(dummyDocRootPath, { recursive: true });

  // Potentially remove test directories if they are exclusively for tests and empty
  // Be cautious with rmdir if these dirs might be shared or pre-existing in dev
};

describe('HTTP Configuration API', () => {
  // Use a fixed token for testing if your authMiddleware expects one
  const authToken = 'test-auth-token'; // Replace with a valid token or mock auth

  beforeAll(async () => {
    await ensureTestDirs();
    // If your app initializes anything async, handle it here
  });

  afterEach(async () => {
    await cleanupTestFiles();
    jest.clearAllMocks(); // Clear mock usage counts
  });
  
  // This will only work if the NODE_ENV is not 'production' for these tests
  // as HTTPD_CONF_FILE path changes based on isProd
  if (process.env.NODE_ENV === 'production') {
    console.warn("Skipping HTTP API integration tests in 'production' NODE_ENV due to path differences.");
    // return; // or use describe.skip
  }


  describe('POST /api/http/config', () => {
    it('should update HTTP configuration and reload service', async () => {
      const configPayload: HttpdVHostConfig = {
        serverName: 'test.example.com',
        documentRoot: 'test.example.com', // Relative to DOCUMENT_ROOT_DIR
      };

      const response = await request(app)
        .post('/api/http/config')
        .set('Authorization', `Bearer ${authToken}`) // Assuming Bearer token auth
        .send(configPayload)
        .expect(200);

      expect(response.body.message).toBe('HTTP configuration updated and service reloaded successfully');
      expect(response.body.data).toEqual(configPayload);

      // Verify file content
      const expectedConfContent = generateHttpdConf(configPayload);
      const actualConfContent = await readFile(HTTPD_CONF_FILE, 'utf8');
      expect(actualConfContent.trim()).toEqual(expectedConfContent.trim());

      // Verify service reload was called
      expect(exec).toHaveBeenCalledWith('systemctl is-active httpd', expect.any(Function));
      expect(exec).toHaveBeenCalledWith('systemctl reload httpd', expect.any(Function));
      
      // Verify that the specific document root directory was created
      const docRootPath = path.join(DOCUMENT_ROOT_DIR, configPayload.documentRoot);
      expect(existsSync(docRootPath)).toBe(true);
    });

    it('should return 400 for invalid data', async () => {
      const invalidPayload = {
        // serverName is missing
        documentRoot: 'test-site',
      };
      const response = await request(app)
        .post('/api/http/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPayload)
        .expect(400);
      expect(response.body.message).toBe('Validation Error');
    });
    
    it('should create a backup of existing configuration', async () => {
      const initialContent = "<VirtualHost *:80>\n  ServerName initial.example.com\n</VirtualHost>";
      await writeFile(HTTPD_CONF_FILE, initialContent, 'utf8');

      const newConfigPayload: HttpdVHostConfig = {
        serverName: 'new.example.com',
        documentRoot: 'new_site',
      };
      
      await request(app)
        .post('/api/http/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newConfigPayload)
        .expect(200);

      const backupContent = await readFile(`${HTTPD_CONF_FILE}.bak`, 'utf8');
      expect(backupContent).toBe(initialContent);
    });
  });

  describe('GET /api/http/config', () => {
    it('should return 404 if config file does not exist', async () => {
      await request(app)
        .get('/api/http/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should retrieve existing HTTP configuration', async () => {
      const testConfig: HttpdVHostConfig = {
        serverName: 'getconfig.example.com',
        documentRoot: 'get_site',
      };
      const fileContent = generateHttpdConf(testConfig);
      await writeFile(HTTPD_CONF_FILE, fileContent, 'utf8');

      const response = await request(app)
        .get('/api/http/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('HTTP configuration retrieved successfully');
      expect(response.body.data.trim()).toBe(fileContent.trim());
    });
  });
});
