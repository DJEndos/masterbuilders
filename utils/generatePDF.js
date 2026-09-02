const PDFDocument = require('pdfkit');
const path = require('path');

const NAVY = '#1a2a5e';
const ORANGE = '#f2900d';
const LIGHT_GREY = '#f4f5f7';
const DARK_TEXT = '#1e1e1e';
const LOGO_PATH = path.join(__dirname, '..', 'public', 'assets', 'logo.jpg');

const SCHOOL = {
  name: 'MASTERBUILDER INTERNATIONAL SCHOOL',
  tagline: '...Assuring Success',
  address: '26/31 Ogbatai Road, Woji, Port Harcourt, Rivers State, Nigeria',
  phone: '0909 604 7209  |  +234 702 526 9485'
};

function ordinalSuffix(str) {
  return str || '—';
}

function drawHeader(doc) {
  const pageWidth = doc.page.width;

  // Navy top band
  doc.rect(0, 0, pageWidth, 100).fill(NAVY);
  // Orange accent strip
  doc.rect(0, 100, pageWidth, 5).fill(ORANGE);

  try {
    doc.image(LOGO_PATH, 40, 15, { width: 70, height: 70 });
  } catch (e) {
    /* logo optional if file missing */
  }

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(19)
    .text(SCHOOL.name, 120, 22, { width: pageWidth - 160 });

  doc
    .font('Helvetica-Oblique')
    .fontSize(10)
    .fillColor(ORANGE)
    .text(SCHOOL.tagline, 120, 44);

  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#dfe3f0')
    .text(SCHOOL.address, 120, 60, { width: pageWidth - 160 })
    .text(SCHOOL.phone, 120, 73);

  doc.y = 118;
}

function drawTitleBar(doc, result) {
  const pageWidth = doc.page.width;
  const barY = doc.y;
  doc.rect(40, barY, pageWidth - 80, 26).fill(LIGHT_GREY).strokeColor(NAVY).lineWidth(1).stroke();
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(
      `STUDENT TERMINAL REPORT SHEET — ${result.term.toUpperCase()} TERM, ${result.session} SESSION`,
      40,
      barY + 7,
      { width: pageWidth - 80, align: 'center' }
    );
  doc.y = barY + 36;
}

function labelValue(doc, x, y, label, value, labelWidth = 90) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(label, x, y, { continued: false });
  doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT).text(String(value ?? '—'), x + labelWidth, y);
}

function drawStudentInfo(doc, student, result) {
  const startY = doc.y;
  const colWidth = (doc.page.width - 80) / 2;

  doc.roundedRect(40, startY, doc.page.width - 80, 78, 4).fillAndStroke(LIGHT_GREY, '#d8dce6');

  const leftX = 52;
  const rightX = 52 + colWidth;
  let y = startY + 10;

  labelValue(doc, leftX, y, 'Student Name:', student.fullName, 85);
  labelValue(doc, rightX, y, 'Student ID:', student.studentID, 70);
  y += 16;
  labelValue(doc, leftX, y, 'Class:', result.class, 85);
  labelValue(doc, rightX, y, 'Section:', result.section, 70);
  y += 16;
  labelValue(doc, leftX, y, 'Gender:', student.gender, 85);
  labelValue(doc, rightX, y, 'No. in Class:', result.numberInClass, 70);
  y += 16;
  labelValue(doc, leftX, y, 'Average Score:', `${result.averageScore}%`, 85);
  labelValue(doc, rightX, y, 'Class Position:', ordinalSuffix(result.position), 70);
  y += 16;
  const att = result.attendance || {};
  labelValue(
    doc, leftX, y, 'Attendance:',
    att.total ? `${att.present ?? 0}/${att.total} days present` : '—',
    85
  );

  doc.y = startY + 88;
}

function drawSubjectsTable(doc, subjects = []) {
  const startX = 40;
  const tableWidth = doc.page.width - 80;
  const cols = [
    { key: 'subjectName', label: 'Subject', width: 0.30 },
    { key: 'ca1', label: 'CA1 (20)', width: 0.09 },
    { key: 'ca2', label: 'CA2 (20)', width: 0.09 },
    { key: 'exam', label: 'Exam (60)', width: 0.10 },
    { key: 'total', label: 'Total (100)', width: 0.11 },
    { key: 'grade', label: 'Grade', width: 0.08 },
    { key: 'remark', label: 'Remark', width: 0.14 },
    { key: 'subjectPosition', label: 'Pos.', width: 0.09 }
  ];

  let y = doc.y;
  const rowHeight = 20;
  const headerHeight = 22;

  // Header row
  doc.rect(startX, y, tableWidth, headerHeight).fill(NAVY);
  let x = startX;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
  cols.forEach((c) => {
    const w = c.width * tableWidth;
    doc.text(c.label, x + 4, y + 7, { width: w - 8, align: c.key === 'subjectName' ? 'left' : 'center' });
    x += w;
  });
  y += headerHeight;

  // Data rows
  subjects.forEach((s, idx) => {
    const rowBg = idx % 2 === 0 ? '#ffffff' : LIGHT_GREY;
    doc.rect(startX, y, tableWidth, rowHeight).fill(rowBg);
    doc.strokeColor('#d8dce6').lineWidth(0.5).rect(startX, y, tableWidth, rowHeight).stroke();

    x = startX;
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK_TEXT);
    cols.forEach((c) => {
      const w = c.width * tableWidth;
      let val = s[c.key];
      if (c.key === 'grade' && val) {
        doc.font('Helvetica-Bold').fillColor(ORANGE);
      } else {
        doc.font('Helvetica').fillColor(DARK_TEXT);
      }
      doc.text(val !== undefined && val !== null && val !== '' ? String(val) : '—', x + 4, y + 6, {
        width: w - 8,
        align: c.key === 'subjectName' ? 'left' : 'center'
      });
      x += w;
    });
    y += rowHeight;

    // Page break guard
    if (y > doc.page.height - 220 && idx < subjects.length - 1) {
      doc.addPage();
      y = 40;
    }
  });

  // Outer border
  doc.strokeColor(NAVY).lineWidth(1).rect(startX, doc.y, tableWidth, y - doc.y).stroke();

  doc.y = y + 12;
}

function drawGradingKey(doc) {
  const startX = 40;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text('GRADING KEY:', startX, doc.y);
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(DARK_TEXT)
    .text(
      'A = 75-100 (Excellent)   B2 = 65-74 (Very Good)   B3 = 60-64 (Good)   C4-C6 = 45-59 (Credit)   D7 = 40-44 (Pass)   E8 = 30-39 (Weak Pass)   F9 = 0-29 (Fail)',
      startX,
      doc.y + 12,
      { width: doc.page.width - 80 }
    );
  doc.y += 30;
}

function drawTraitsSection(doc, title, traits = []) {
  if (!traits.length) return;
  const startX = 40;
  const tableWidth = (doc.page.width - 80 - 12) / 2;
  const isSecondColumn = title === 'AFFECTIVE TRAITS';
  const x = isSecondColumn ? startX + tableWidth + 12 : startX;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(title, x, doc.y, { width: tableWidth });
  let y = doc.y + 14;
  traits.forEach((t) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(DARK_TEXT).text(t.trait, x, y, { width: tableWidth * 0.6, continued: false });
    // rating dots 1-5
    const dotsX = x + tableWidth * 0.62;
    for (let i = 1; i <= 5; i++) {
      doc
        .circle(dotsX + i * 12, y + 4, 3.5)
        .fillAndStroke(i <= (t.rating || 0) ? ORANGE : '#ffffff', NAVY);
    }
    y += 14;
  });
  return y;
}

function drawComments(doc, result) {
  const startX = 40;
  const width = doc.page.width - 80;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('CLASS TEACHER\'S COMMENT:', startX, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT)
    .text(result.classTeacherComment || 'No comment provided.', startX, doc.y + 12, { width });
  doc.y += 34;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text('PRINCIPAL\'S COMMENT:', startX, doc.y);
  doc.font('Helvetica').fontSize(9).fillColor(DARK_TEXT)
    .text(result.principalComment || 'No comment provided.', startX, doc.y + 12, { width });
  doc.y += 34;

  if (result.nextTermBegins) {
    const d = new Date(result.nextTermBegins);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY)
      .text(`NEXT TERM BEGINS: ${d.toDateString()}`, startX, doc.y);
    doc.y += 20;
  }
}

function drawSignatures(doc) {
  const startX = 40;
  const width = doc.page.width - 80;
  const colWidth = width / 2 - 10;
  const y = doc.page.height - 110;

  doc.strokeColor('#888').lineWidth(0.7).moveTo(startX, y).lineTo(startX + colWidth, y).stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor(DARK_TEXT).text('Class Teacher\'s Signature', startX, y + 4);

  doc.strokeColor('#888').moveTo(startX + colWidth + 20, y).lineTo(startX + width, y).stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor(DARK_TEXT).text('Principal\'s Signature & Stamp', startX + colWidth + 20, y + 4);
}

function drawFooter(doc) {
  const y = doc.page.height - 40;
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#888')
    .text(
      'This is a confidential document generated by the Masterbuilder International School Result Management System. Any alteration renders it invalid.',
      40, y, { width: doc.page.width - 80, align: 'center' }
    );
}

/**
 * Generates a PDFKit document (readable stream) for a student's result sheet.
 * @param {object} student - Student mongoose doc
 * @param {object} result - Result mongoose doc
 * @returns {PDFDocument}
 */
function generateResultPDF(student, result) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

  drawHeader(doc);
  doc.y = 118;
  drawTitleBar(doc, result);
  drawStudentInfo(doc, student, result);
  drawSubjectsTable(doc, result.subjects);
  drawGradingKey(doc);

  const traitsStartY = doc.y;
  drawTraitsSection(doc, 'PSYCHOMOTOR SKILLS', result.psychomotorSkills || []);
  doc.y = traitsStartY;
  drawTraitsSection(doc, 'AFFECTIVE TRAITS', result.affectiveTraits || []);
  doc.y = traitsStartY + Math.max((result.psychomotorSkills || []).length, (result.affectiveTraits || []).length) * 14 + 36;

  drawComments(doc, result);
  drawSignatures(doc);
  drawFooter(doc);

  doc.end();
  return doc;
}

module.exports = { generateResultPDF };
