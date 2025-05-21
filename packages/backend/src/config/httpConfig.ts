// Determine paths based on environment
const isProd = process.env.NODE_ENV === 'production';

// HTTP configuration paths
export const HTTPD_CONF_DIR = isProd ? '/etc/httpd/conf.d' : './test/httpd/conf.d';
export const HTTPD_CONF_FILE = isProd ? `${HTTPD_CONF_DIR}/web.conf` : `${HTTPD_CONF_DIR}/web.conf`;

// Log files
export const HTTPD_ERROR_LOG_DIR = isProd ? '/var/log/httpd' : './test/httpd/logs';
export const HTTPD_REQUEST_LOG_DIR = isProd ? '/var/log/httpd' : './test/httpd/logs';

// Document root
export const DOCUMENT_ROOT_DIR = isProd ? '/var/www/html' : './test/httpd/www';
