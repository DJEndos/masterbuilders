const express = require('express');
const Result = require('../models/Result');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const { generateResultPDF } = require('../utils/generatePDF');

const router = express.Router();
router.use(protect, authorize('admin', 'teacher'));

// GET /api/results/:id  -> view a single result (staff)
router.get('/:id', async (req, res) => {
  const result = await Result.findById(req.params.id).populate('student', 'fullName studentID class section');
  if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
  res.json({ success: true, result });
});

// GET /api/results/:id/pdf -> staff can preview/print any result regardless of publish status
router.get('/:id/pdf', async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
  const student = await Student.findById(result.student);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${student.studentID}_${result.session.replace('/', '-')}_${result.term}_Term_Result.pdf"`
  );
  generateResultPDF(student, result).pipe(res);
});

module.exports = router;
