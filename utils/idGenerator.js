const Student = require('../models/Student');

/**
 * Generates a unique student ID in the format MIS/YEAR/0001
 * (MIS = Masterbuilder International School)
 */
async function generateStudentID() {
  const year = new Date().getFullYear();
  const count = await Student.countDocuments({ studentID: new RegExp(`^MIS/${year}/`) });
  const nextNumber = String(count + 1).padStart(4, '0');
  const candidate = `MIS/${year}/${nextNumber}`;

  // Safety check in case of race conditions / deletions
  const exists = await Student.findOne({ studentID: candidate });
  if (exists) {
    return `MIS/${year}/${String(count + Math.floor(Math.random() * 100) + 1).padStart(4, '0')}`;
  }
  return candidate;
}

/**
 * Generates a random 6-digit numeric PIN used for confidential parent/student portal access.
 */
function generateAccessPIN() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generateStudentID, generateAccessPIN };
