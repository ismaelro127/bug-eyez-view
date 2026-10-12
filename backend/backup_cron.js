
// Nightly backup using node-cron
const cron = require('node-cron');
const fs = require('fs');

cron.schedule('0 2 * * *', () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = './backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  fs.copyFileSync('./bugzcoin.db', `${backupDir}/bugzcoin_${timestamp}.db`);
  logger.info('Nightly backup completed:', timestamp);
});
