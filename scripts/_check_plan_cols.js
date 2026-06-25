const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Plan' ORDER BY ordinal_position`)
  .then(r => { console.log('Plan columns:', JSON.stringify(r)); })
  .catch(e => { console.error('ERR:', e.message); })
  .finally(() => p.$disconnect());
