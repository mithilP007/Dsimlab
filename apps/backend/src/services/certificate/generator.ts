import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generates a professional landscape PDF certificate using PDFKit
 * and saves it to the local uploads/certificates folder.
 */
export async function generateCertificatePDF(
  studentName: string,
  scenarioType: string,
  competencyBand: string,
  skills: string[],
  verificationId: string,
  issueDate: Date
): Promise<Buffer> {
  const dir = path.join(process.cwd(), 'uploads', 'certificates');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 40
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const buffer = Buffer.concat(buffers);
      
      // Save certificate PDF to uploads/certificates
      const filePath = path.join(dir, `${verificationId}.pdf`);
      fs.writeFileSync(filePath, buffer);
      
      resolve(buffer);
    });
    doc.on('error', reject);

    // Draw background border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .lineWidth(3)
       .strokeColor('#1E3A8A') // dark blue
       .stroke();
       
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50)
       .lineWidth(1)
       .strokeColor('#F59E0B') // gold
       .stroke();

    // Title
    doc.fontSize(28)
       .fillColor('#1E3A8A')
       .text('CERTIFICATE OF COMPLIANCE', 0, 70, { align: 'center' });

    doc.fontSize(14)
       .fillColor('#4B5563')
       .text('Digital Marketing Simulator Laboratory Certification', 0, 110, { align: 'center' });

    // Awarded to
    doc.fontSize(14)
       .fillColor('#6B7280')
       .text('This certificate is proudly awarded to', 0, 160, { align: 'center' });

    doc.fontSize(24)
       .fillColor('#1F2937')
       .text(studentName, 0, 190, { align: 'center', underline: true });

    // Details
    doc.fontSize(12)
       .fillColor('#4B5563')
       .text(`For successfully qualifying in the simulator scenario category:`, 0, 240, { align: 'center' });

    doc.fontSize(16)
       .fillColor('#111827')
       .text(scenarioType, 0, 260, { align: 'center' });

    // Competency band
    doc.fontSize(12)
       .fillColor('#4B5563')
       .text(`Achieved Competency Level:`, 0, 300, { align: 'center' });

    doc.fontSize(18)
       .fillColor('#F59E0B')
       .text(competencyBand, 0, 320, { align: 'center' });

    // Skills
    doc.fontSize(12)
       .fillColor('#4B5563')
       .text(`Demonstrated Core Competencies:`, 0, 360, { align: 'center' });

    doc.fontSize(12)
       .fillColor('#1F2937')
       .text(skills.join('  •  '), 0, 380, { align: 'center' });

    // Footer info
    doc.fontSize(10)
       .fillColor('#9CA3AF')
       .text(`Verification ID: ${verificationId}`, 40, 480, { align: 'left' });

    doc.fontSize(10)
       .fillColor('#9CA3AF')
       .text(`Issue Date: ${issueDate.toLocaleDateString()}`, doc.page.width - 240, 480, { align: 'right' });

    doc.end();
  });
}
