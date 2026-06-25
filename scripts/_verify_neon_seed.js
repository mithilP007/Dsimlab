const { PrismaClient } = require('@prisma/client');
const { verifyPassword } = require('better-auth/crypto');
const prisma = new PrismaClient();

const CHECK = [
  { email: 'superadmin@simlab.run',       expectedRole: 'ADMIN' },
  { email: 'instructor.alpha@simlab.run', expectedRole: 'INSTRUCTOR' },
  { email: 'instructor.beta@simlab.run',  expectedRole: 'INSTRUCTOR' },
  { email: 'student1@simlab.run',         expectedRole: 'STUDENT_COLLEGE' },
  { email: 'learner@simlab.run',          expectedRole: 'INDIVIDUAL' },
];

async function main() {
  console.log('\n=== NEON SEED VERIFICATION ===\n');
  await prisma.$connect();

  for (const c of CHECK) {
    const u = await prisma.user.findUnique({ where: { email: c.email }, include: { accounts: true } });
    if (!u) { console.log(`❌ NOT FOUND: ${c.email}`); continue; }

    const acct = u.accounts.find(a => a.providerId === 'credential');
    let pwOk = false;
    if (acct?.password) {
      try { pwOk = await verifyPassword({ hash: acct.password, password: 'Test@123456' }); } catch (_) {}
    }
    const roleOk = u.role === c.expectedRole;
    console.log(`${pwOk && roleOk ? '✅' : '⚠️ '} ${c.email}`);
    console.log(`     role   : ${u.role} ${roleOk ? '✅' : '❌ expected ' + c.expectedRole}`);
    console.log(`     status : ${u.status}`);
    console.log(`     pw     : ${pwOk ? 'VERIFIED ✅' : 'FAIL ❌'}`);
  }

  // Class summary
  const classes = await prisma.class.findMany({ select: { name: true, inviteCode: true } });
  console.log(`\n📚 Classes in Neon:`);
  classes.forEach(c => console.log(`   ${c.inviteCode} → ${c.name}`));

  // User count
  const total = await prisma.user.count();
  console.log(`\n👤 Total users in Neon: ${total}`);

  await prisma.$disconnect();
  console.log('\n=== DONE ===\n');
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
