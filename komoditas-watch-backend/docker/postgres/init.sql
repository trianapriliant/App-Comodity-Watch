-- PostgreSQL initialization script for Komoditas Watch
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional database for testing if needed
-- CREATE DATABASE komoditas_watch_test;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE komoditas_watch TO postgres;

-- Create indexes that might be useful for our application
-- These will be created after Prisma migrations run, but we can prepare

-- Enable logging for slow queries (optional for development)
-- ALTER SYSTEM SET log_min_duration_statement = 1000;
-- SELECT pg_reload_conf();

-- Set timezone to Asia/Jakarta
SET timezone = 'Asia/Jakarta';
