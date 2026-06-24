const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== SEEDING ACTIVE CLASS ENROLLMENTS ===');
  await prisma.$connect();

  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT_COLLEGE',
      classId: { not: null }
    }
  });

  console.log(`Found ${students.length} enrolled students in database.`);

  for (const s of students) {
    const existing = await prisma.classEnrollment.findFirst({
      where: { studentId: s.id, classId: s.classId }
    });

    if (!existing) {
      await prisma.classEnrollment.create({
        data: {
          classId: s.classId,
          studentId: s.id,
          studentEmail: s.email,
          status: 'ACTIVE',
          approvedAt: new Date()
        }
      });
      console.log(`- Created ACTIVE enrollment record for ${s.email}`);
    } else {
      console.log(`- Enrollment record already exists for ${s.email} (Status: ${existing.status})`);
    }
  }

  await prisma.$disconnect();
  console.log('=== COMPLETED SEEDING ACTIVE CLASS ENROLLMENTS ===');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
