// Set test environment variables before any imports
process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-unit-tests';
process.env.NODE_ENV = 'test';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
