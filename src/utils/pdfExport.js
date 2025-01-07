// src/utils/pdfExport.js
import jsPDF from 'jspdf';

export const exportTrainingRecordToPDF = (record, metadata) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('NAUI SCUBA Training Record', pageWidth / 2, yPos, { align: 'center' });
  
  // Student Info
  yPos += 20;
  doc.setFontSize(12);
  doc.text(`Student: ${metadata.studentName}`, 20, yPos);
  doc.text(`Course: ${metadata.courseName}`, 20, yPos + 10);
  doc.text(`Instructor: ${metadata.instructorName}`, 20, yPos + 20);

  // Academic Section
  yPos += 40;
  doc.setFontSize(14);
  doc.text('Academic Requirements', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  Object.entries(record.academics).forEach(([key, value]) => {
    doc.text(key.replace(/([A-Z])/g, ' $1').trim(), 25, yPos);
    doc.text(value.completed ? '✓' : '□', 150, yPos);
    doc.text(value.date ? new Date(value.date).toLocaleDateString() : '', 170, yPos);
    yPos += 7;
  });

  // Swimming Skills
  yPos += 10;
  doc.setFontSize(14);
  doc.text('Swimming Skills', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  Object.entries(record.swimmingSkills).forEach(([key, value]) => {
    doc.text(key.replace(/([A-Z])/g, ' $1').trim(), 25, yPos);
    doc.text(value.completed ? '✓' : '□', 150, yPos);
    doc.text(value.date ? new Date(value.date).toLocaleDateString() : '', 170, yPos);
    yPos += 7;
  });

  // Add new page for remaining sections
  doc.addPage();
  yPos = 20;

  // Open Water Dives
  doc.setFontSize(14);
  doc.text('Open Water Dives', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  Object.entries(record.openWater).forEach(([key, value]) => {
    doc.text(key.replace(/([A-Z])/g, ' $1').trim(), 25, yPos);
    doc.text(value.completed ? '✓' : '□', 150, yPos);
    doc.text(value.date ? new Date(value.date).toLocaleDateString() : '', 170, yPos);
    doc.text(value.location || '', 120, yPos);
    yPos += 7;
  });

  // Certification Info
  if (record.certification?.status === 'completed') {
    yPos += 20;
    doc.setFontSize(14);
    doc.text('Certification', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Status: ${record.certification.status}`, 25, yPos);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 25, yPos + 7);
    doc.text(`Instructor: ${metadata.instructorName}`, 25, yPos + 14);
  }

  // Save the PDF
  doc.save(`${metadata.studentName}_NAUI_SCUBA_Record.pdf`);
};