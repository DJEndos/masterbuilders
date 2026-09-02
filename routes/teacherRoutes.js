const express = require('express');
const Student = require('../models/Student');
const Result = require('../models/Result');
const { protect, authorize } = require('../middleware/auth');
const { computeSubjectTotal } = require('../utils/grading');

const router = express.Router();
router.use(protect, authorize('teacher', 'admin'));

// GET /api/teacher/students?class=Primary4  -> students in a class the teacher can enter scores for
router.get('/students', async (req, res) => {
  const { class: cls } = req.query;
  if (!cls) return res.status(400).json({ success: false, message: 'class query param is required.' });

  if (req.user.role === 'teacher' && !req.user.assignedClasses.includes(cls)) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }
  const students = await Student.find({ class: cls, isActive: true }).sort({ fullName: 1 });
  res.json({ success: true, students });
});

// GET /api/teacher/result/:studentId?session=...&term=...  -> fetch or scaffold a result
router.get('/result/:studentId', async (req, res) => {
  const { session, term } = req.query;
  if (!session || !term) return res.status(400).json({ success: false, message: 'session and term are required.' });

  const student = await Student.findById(req.params.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  let result = await Result.findOne({ student: student._id, session, term });
  if (!result) {
    result = { student: student._id, session, term, class: student.class, section: student.section, subjects: [] };
  }
  res.json({ success: true, result, student });
});

// POST /api/teacher/result  -> create or update a result (upsert), auto-computes grades/totals
router.post('/result', async (req, res) => {
  try {
    const {
      studentId, session, term, subjects, attendance, psychomotorSkills, affectiveTraits,
      classTeacherComment, principalComment, nextTermBegins
    } = req.body;

    if (!studentId || !session || !term || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: 'studentId, session, term and subjects[] are required.' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    if (req.user.role === 'teacher' && !req.user.assignedClasses.includes(student.class)) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
    }

    // Compute grade/total per subject
    const gradedSubjects = subjects.map((s) => {
      const { total, grade, remark } = computeSubjectTotal(s.ca1, s.ca2, s.exam);
      return { ...s, total, grade, remark };
    });

    const totalScore = gradedSubjects.reduce((sum, s) => sum + s.total, 0);
    const averageScore = gradedSubjects.length ? Number((totalScore / gradedSubjects.length).toFixed(2)) : 0;

    const existing = await Result.findOne({ student: studentId, session, term });

    const payload = {
      student: studentId,
      session,
      term,
      class: student.class,
      section: student.section,
      subjects: gradedSubjects,
      totalScore,
      averageScore,
      attendance,
      psychomotorSkills,
      affectiveTraits,
      classTeacherComment,
      principalComment,
      nextTermBegins,
      createdBy: req.user._id
    };

    let result;
    if (existing) {
      // Editing an already-published result reverts it to draft for admin re-approval
      if (existing.status === 'published') payload.status = 'draft';
      result = await Result.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true });
    } else {
      result = await Result.create(payload);
    }

    res.status(200).json({ success: true, result });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A result for this student/session/term already exists.' });
    }
    res.status(500).json({ success: false, message: 'Could not save result.', error: err.message });
  }
});

// Recompute class positions for a given class/session/term based on averageScore
router.post('/compute-positions', async (req, res) => {
  const { session, term, class: cls } = req.body;
  if (!session || !term || !cls) {
    return res.status(400).json({ success: false, message: 'session, term and class are required.' });
  }
  if (req.user.role === 'teacher' && !req.user.assignedClasses.includes(cls)) {
    return res.status(403).json({ success: false, message: 'You are not assigned to this class.' });
  }

  const { ordinal } = require('../utils/grading');
  const results = await Result.find({ session, term, class: cls }).sort({ averageScore: -1 });
  const numberInClass = results.length;

  await Promise.all(
    results.map((r, idx) =>
      Result.findByIdAndUpdate(r._id, { position: ordinal(idx + 1), numberInClass })
    )
  );

  res.json({ success: true, message: `Positions computed for ${numberInClass} student(s).` });
});

module.exports = router;
