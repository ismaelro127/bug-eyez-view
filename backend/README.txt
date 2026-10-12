
# Admin Role + CSV/PDF Export + Nightly Backup

✅ Add `is_admin` flag to your users table.
✅ Secure admin-only endpoints for exporting audit log as CSV or PDF.
✅ Nightly cron backup keeps your DB safe.

## Steps

1) Run `admin_role.sql` once to add `is_admin` flag.

2) Include `admin_endpoints.js` routes in your server.

3) Start `backup_cron.js` or merge it into your main server file.

4) Run `npm install fast-csv pdfkit node-cron`.

5) Create a `/backups` folder for your daily DB copies.

Secure, exportable, and investor-ready! 🔒
