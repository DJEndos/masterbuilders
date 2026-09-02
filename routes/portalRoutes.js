const express = require('express');
const rateLimit = require('express-rate-limit');
const Student = require('../models/Student');
const Result = require('../models/Result');
const { generateResultPDF } = require('../utils/generatePDF');

const router = express.Router();

// Throttle lookups hard — this endpoint is confidential access, not public search.
const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes and try again.' }
});

// POST /api/portal/verify  { studentID, accessPIN }
// Confidential access check — does NOT return the result, only a short-lived session flag.
router.post('/verify', portalLimiter, async (req, res) => {
  try {
    const { studentID, accessPIN } = req.body;
    if (!studentID || !accessPIN) {
      return res.status(400).json({ success: false, message: 'Student ID and PIN are required.' });
    }

    const student = await Student.findOne({ studentID: studentID.trim().toUpperCase(), isActive: true }).select('+accessPIN');
    // Same generic error for "not found" and "wrong PIN" so a bad actor can't tell IDs apart
    if (!student || !(await student.comparePIN(accessPIN))) {
      return res.status(401).json({ success: false, message: 'Invalid Student ID or PIN.' });
    }

    res.json({
      success: true,
      student: {
        id: student._id,
        studentID: student.studentID,
        fullName: student.fullName,
        class: student.class,
        section: student.section
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

// POST /api/portal/results  { studentID, accessPIN }  -> list published results (re-verifies each time)
router.post('/results', portalLimiter, async (req, res) => {
  const { studentID, accessPIN } = req.body;
  const student = await Student.findOne({ studentID: studentID?.trim().toUpperCase(), isActive: true }).select('+accessPIN');
  if (!student || !(await student.comparePIN(accessPIN))) {
    return res.status(401).json({ success: false, message: 'Invalid Student ID or PIN.' });
  }

  const results = await Result.find({ student: student._id, status: 'published' }).sort({ session: -1, term: -1 });
  res.json({
    success: true,
    student: { studentID: student.studentID, fullName: student.fullName, class: student.class },
    results: results.map((r) => ({
      id: r._id, session: r.session, term: r.term, class: r.class,
      averageScore: r.averageScore, position: r.position, publishedAt: r.publishedAt
    }))
  });
});

// POST /api/portal/result/:id/pdf  { studentID, accessPIN }  -> confidential PDF download
router.post('/result/:id/pdf', portalLimiter, async (req, res) => {
  try {
    const { studentID, accessPIN } = req.body;
    const student = await Student.findOne({ studentID: studentID?.trim().toUpperCase(), isActive: true }).select('+accessPIN');
    if (!student || !(await student.comparePIN(accessPIN))) {
      return res.status(401).json({ success: false, message: 'Invalid Student ID or PIN.' });
    }

    const result = await Result.findOne({ _id: req.params.id, student: student._id, status: 'published' });
    if (!result) return res.status(404).json({ success: false, message: 'Result not found or not yet published.' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${student.studentID}_${result.session.replace('/', '-')}_${result.term}_Term_Result.pdf"`
    );
    generateResultPDF(student, result).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not generate result PDF.' });
  }
});

module.exports = router;
