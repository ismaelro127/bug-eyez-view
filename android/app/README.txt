
# Bugz Coin + Auth (Upgraded Version)

✅ Uses:
- SQLite for real user/balance/transactions storage
- SendGrid SMTP for real verification emails
- express-session for secure sessions
- bcrypt for password hashing
- nodemailer for email sending

## How to run

1) Install dependencies:
   npm install express express-session sqlite3 nodemailer bcrypt dotenv

2) Copy .env.example to .env and fill in your SendGrid SMTP credentials.

3) Start server:
   node server.js

## API routes

- POST /api/auth/register
- GET /api/auth/verify?token=...
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me

- GET  /api/bugzcoin/balance
- POST /api/bugzcoin/earn
- POST /api/bugzcoin/spend
- GET  /api/bugzcoin/history
