
-- Add admin flag to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- Example: make your email admin
UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';
