
// Admin endpoints for CSV + PDF export
const csv = require('fast-csv');
const PDFDocument = require('pdfkit');

// CSV export
app.get('/api/admin/audit-log-csv', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  db.all('SELECT * FROM audit_log ORDER BY created_at DESC', [], (err, rows) => {
    res.setHeader('Content-disposition', 'attachment; filename=audit_log.csv');
    res.setHeader('Content-Type', 'text/csv');
    csv.write(rows, { headers: true }).pipe(res);
  });
});

// PDF export
app.get('/api/admin/audit-log-pdf', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  db.all('SELECT * FROM audit_log ORDER BY created_at DESC', [], (err, rows) => {
    const doc = new PDFDocument();
    res.setHeader('Content-disposition', 'attachment; filename=audit_log.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);
    rows.forEach(r => {
      doc.text(`${r.created_at} | User: ${r.user_id} | ${r.event_type} | ${r.details}`);
    });
    doc.end();
  });
});
