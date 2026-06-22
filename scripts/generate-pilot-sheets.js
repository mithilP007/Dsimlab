const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ARTIFACT_DIR = 'D:\\simlab-pilot-artifacts';
const WORKSPACE_DIR = 'd:\\ads backend';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// 1. Data Structure for Pilot Accounts
const accounts = [
  { role: 'Super Admin', name: 'Super Admin', email: 'superadmin@simlab.run', password: 'Test@123456', code: 'N/A', url: 'http://localhost:5173/login', instructions: 'Log in to access administrative settings, audit logs, and monitoring tools.' },
  { role: 'Instructor Alpha', name: 'Dr. John Alpha', email: 'instructor.alpha@simlab.run', password: 'Test@123456', code: 'SEO101 / GADS102', url: 'http://localhost:5173/login', instructions: 'Log in to manage classrooms Intro to SEO (SEO101) & Google Ads Mastery (GADS102), review student stats, and approve certificates.' },
  { role: 'Instructor Beta', name: 'Prof. Mary Beta', email: 'instructor.beta@simlab.run', password: 'Test@123456', code: 'SOC103', url: 'http://localhost:5173/login', instructions: 'Log in to manage classroom Social Performance Media (SOC103), review student stats, and approve certificates.' },
  
  { role: 'Student 1', name: 'Pilot Student 1', email: 'student1@simlab.run', password: 'Test@123456', code: 'SEO101', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SEO101, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 2', name: 'Pilot Student 2', email: 'student2@simlab.run', password: 'Test@123456', code: 'SEO101', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SEO101, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 3', name: 'Pilot Student 3', email: 'student3@simlab.run', password: 'Test@123456', code: 'SEO101', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SEO101, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 4', name: 'Pilot Student 4', email: 'student4@simlab.run', password: 'Test@123456', code: 'SEO101', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SEO101, and wait for Dr. Alpha to approve your request.' },
  
  { role: 'Student 5', name: 'Pilot Student 5', email: 'student5@simlab.run', password: 'Test@123456', code: 'GADS102', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code GADS102, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 6', name: 'Pilot Student 6', email: 'student6@simlab.run', password: 'Test@123456', code: 'GADS102', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code GADS102, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 7', name: 'Pilot Student 7', email: 'student7@simlab.run', password: 'Test@123456', code: 'GADS102', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code GADS102, and wait for Dr. Alpha to approve your request.' },
  { role: 'Student 8', name: 'Pilot Student 8', email: 'student8@simlab.run', password: 'Test@123456', code: 'GADS102', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code GADS102, and wait for Dr. Alpha to approve your request.' },
  
  { role: 'Student 9', name: 'Pilot Student 9', email: 'student9@simlab.run', password: 'Test@123456', code: 'SOC103', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SOC103, and wait for Prof. Beta to approve your request.' },
  { role: 'Student 10', name: 'Pilot Student 10', email: 'student10@simlab.run', password: 'Test@123456', code: 'SOC103', url: 'http://localhost:5173/login', instructions: 'Log in, enter join code SOC103, and wait for Prof. Beta to approve your request.' },
  
  { role: 'Individual Learner', name: 'Individual Pilot Learner', email: 'learner@simlab.run', password: 'Test@123456', code: 'N/A', url: 'http://localhost:5173/login', instructions: 'Log in and launch your standalone sandbox campaign simulation.' }
];

// 2. Generate CSV
function generateCSV() {
  const headers = 'Role,Name,Email,TemporaryPassword,ClassJoinCode,LoginURL,Instructions\n';
  const rows = accounts.map(a => `"${a.role}","${a.name}","${a.email}","${a.password}","${a.code}","${a.url}","${a.instructions}"`).join('\n');
  const csvContent = headers + rows;
  
  fs.writeFileSync(path.join(WORKSPACE_DIR, 'pilot-accounts.csv'), csvContent);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'pilot-accounts.csv'), csvContent);
  console.log('- CSV file generated successfully at workspace root and D drive.');
}

// 3. Generate Instructor PDF
function generateInstructorPDF() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(path.join(WORKSPACE_DIR, 'instructor-login-sheet.pdf'));
  doc.pipe(stream);
  
  // Header
  doc.fontSize(22).fillColor('#1E3A8A').text('SimLab Pilot | Instructor Login Sheet', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#4B5563').text('Digital Marketing Simulation Laboratory - Controlled Pilot Onboarding', { align: 'center' });
  doc.moveDown(1.5);
  
  // Instructions Intro
  doc.fontSize(12).fillColor('#1F2937').text('Welcome to the SimLab pilot program. Below are your login credentials and initial setup instructions. Please log in using the staging platform link.', { lineGap: 4 });
  doc.moveDown(1.5);

  const instructors = accounts.filter(a => a.role.includes('Instructor'));
  
  instructors.forEach((inst, idx) => {
    const startY = doc.y;
    doc.rect(50, startY, 500, 160).lineWidth(1).strokeColor('#E5E7EB').stroke();
    
    // Draw inside box
    doc.fontSize(14).fillColor('#1E3A8A').text(`  ${inst.name} (${inst.role})`, 70, startY + 15);
    doc.fontSize(10).fillColor('#374151').text(`  • Email: ${inst.email}`, 70, startY + 45);
    doc.text(`  • Password: ${inst.password}`, 70, startY + 65);
    doc.text(`  • Class Join Codes: ${inst.code}`, 70, startY + 85);
    doc.text(`  • Portal URL: ${inst.url}`, 70, startY + 105);
    doc.fontSize(9).fillColor('#6B7280').text(`  • Instructions: ${inst.instructions}`, 70, startY + 125, { width: 440 });
    
    doc.y = startY + 180; // Advance document cursor past the box
  });
  
  doc.end();
  
  // Save D drive copy
  stream.on('finish', () => {
    fs.copyFileSync(path.join(WORKSPACE_DIR, 'instructor-login-sheet.pdf'), path.join(ARTIFACT_DIR, 'instructor-login-sheet.pdf'));
    console.log('- Instructor login sheet PDF generated successfully.');
  });
}

// 4. Generate Student PDF
function generateStudentPDF() {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(path.join(WORKSPACE_DIR, 'student-login-sheet.pdf'));
  doc.pipe(stream);
  
  // Header
  doc.fontSize(22).fillColor('#1E3A8A').text('SimLab Pilot | Student Onboarding Sheet', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#4B5563').text('Digital Marketing Simulation Laboratory - Student Credentials', { align: 'center' });
  doc.moveDown(1.5);

  const students = accounts.filter(a => a.role.includes('Student') || a.role.includes('Individual'));
  
  students.forEach((student, idx) => {
    // Add page if too many boxes
    if (idx > 0 && idx % 3 === 0) {
      doc.addPage();
      doc.fontSize(16).fillColor('#1E3A8A').text('SimLab Pilot | Student Onboarding Sheet (Cont.)', { align: 'center' });
      doc.moveDown(1.5);
    }
    
    const startY = doc.y;
    doc.rect(50, startY, 500, 160).lineWidth(1).strokeColor('#E5E7EB').stroke();
    
    // Draw details inside box
    doc.fontSize(14).fillColor('#1E3A8A').text(`  ${student.name} (${student.role})`, 70, startY + 15);
    doc.fontSize(10).fillColor('#374151').text(`  • Email: ${student.email}`, 70, startY + 45);
    doc.text(`  • Password: ${student.password}`, 70, startY + 65);
    doc.text(`  • Class Join Code: ${student.code}`, 70, startY + 85);
    doc.text(`  • Login URL: ${student.url}`, 70, startY + 105);
    doc.fontSize(9).fillColor('#6B7280').text(`  • Instructions: ${student.instructions}`, 70, startY + 125, { width: 440 });
    
    doc.y = startY + 180; // Advance document cursor past the box
  });
  
  doc.end();
  
  // Save D drive copy
  stream.on('finish', () => {
    fs.copyFileSync(path.join(WORKSPACE_DIR, 'student-login-sheet.pdf'), path.join(ARTIFACT_DIR, 'student-login-sheet.pdf'));
    console.log('- Student login sheet PDF generated successfully.');
  });
}

generateCSV();
generateInstructorPDF();
generateStudentPDF();
