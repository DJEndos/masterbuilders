const express = require('express');
const User = require('../models/User');
const Student = require('../models/Student');
const Result = require('../models/Result');
const { protect, authorize } = require('../middleware/auth');
const { generateStudentID, generateAccessPIN } = require('../utils/idGenerator');

const router = express.Router();
router.use(protect, authorize('admin'));

/* ---------------------------- DASHBOARD STATS ---------------------------- */
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalResults, publishedResults] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Result.countDocuments(),
      Result.countDocuments({ status: 'published' })
    ]);
    res.json({
      success: true,
      stats: { totalStudents, totalTeachers, totalResults, publishedResults, draftResults: totalResults - publishedResults }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not load dashboard stats.' });
  }
});

/* -------------------------------- TEACHERS -------------------------------- */
router.get('/teachers', async (req, res) => {
  const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 });
  res.json({ success: true, teachers });
});

router.post('/teachers', async (req, res) => {
  try {
    const { name, email, password, phone, assignedClasses, assignedSubjects } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'A user with this email already exists.' });

    const teacher = await User.create({
      name, email: email.toLowerCase(), password, phone,
      role: 'teacher',
      assignedClasses: assignedClasses || [],
      assignedSubjects: assignedSubjects || []
    });
    res.status(201).json({ success: true, teacher: { ...teacher.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not create teacher account.' });
  }
});

router.put('/teachers/:id', async (req, res) => {
  try {
    const { name, phone, assignedClasses, assignedSubjects, isActive } = req.body;
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'teacher' },
      { name, phone, assignedClasses, assignedSubjects, isActive },
      { new: true, runValidators: true }
    );
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
    res.json({ success: true, teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update teacher.' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  const teacher = await User.findOneAndDelete({ _id: req.params.id, role: 'teacher' });
  if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
  res.json({ success: true, message: 'Teacher removed.' });
});

/* -------------------------------- STUDENTS -------------------------------- */
router.get('/students', async (req, res) => {
  const { class: cls, section, search } = req.query;
  const filter = {};
  if (cls) filter.class = cls;
  if (section) filter.section = section;
  if (search) filter.$or = [
    { fullName: new RegExp(search, 'i') },
    { studentID: new RegExp(search, 'i') }
  ];
  const students = await Student.find(filter).sort({ class: 1, fullName: 1 });
  res.json({ success: true, students });
});

router.post('/students', async (req, res) => {
  try {
    const { fullName, dateOfBirth, gender, section, class: cls, parentName, parentPhone, parentEmail } = req.body;
    if (!fullName || !section || !cls) {
      return res.status(400).json({ success: false, message: 'Full name, section and class are required.' });
    }
    const studentID = await generateStudentID();
    const accessPIN = generateAccessPIN();

    const student = await Student.create({
      studentID, fullName, dateOfBirth, gender, section, class: cls,
      parentName, parentPhone, parentEmail, accessPIN
    });

    // Return the PIN once, in plaintext, so the admin can hand it to the parent.
    // It is never retrievable again after this response (hashed in DB).
    res.status(201).json({
      success: true,
      student: { ...student.toObject(), accessPIN: undefined },
      studentID,
      accessPIN,
      note: 'Save this PIN now and share it securely with the parent/student. It cannot be retrieved again — only reset.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not create student.' });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const { fullName, dateOfBirth, gender, section, class: cls, parentName, parentPhone, parentEmail, isActive } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { fullName, dateOfBirth, gender, section, class: cls, parentName, parentPhone, parentEmail, isActive },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not update student.' });
  }
});

// Reset a student's access PIN (returns the new plaintext PIN once)
router.post('/students/:id/reset-pin', async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  const newPIN = generateAccessPIN();
  student.accessPIN = newPIN;
  await student.save();
  res.json({ success: true, accessPIN: newPIN, note: 'Share this new PIN securely. The old PIN no longer works.' });
});

router.delete('/students/:id', async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  await Result.deleteMany({ student: student._id });
  res.json({ success: true, message: 'Student and their results removed.' });
});

/* ------------------------- RESULT PUBLISH / REVIEW ------------------------- */
// List results pending review (draft) or all, with filters
router.get('/results', async (req, res) => {
  const { session, term, class: cls, status } = req.query;
  const filter = {};
  if (session) filter.session = session;
  if (term) filter.term = term;
  if (cls) filter.class = cls;
  if (status) filter.status = status;
  const results = await Result.find(filter).populate('student', 'fullName studentID class').sort({ updatedAt: -1 });
  res.json({ success: true, results });
});

router.put('/results/:id/publish', async (req, res) => {
  const result = await Result.findByIdAndUpdate(
    req.params.id,
    { status: 'published', publishedBy: req.user._id, publishedAt: new Date() },
    { new: true }
  );
  if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
  res.json({ success: true, result });
});

router.put('/results/:id/unpublish', async (req, res) => {
  const result = await Result.findByIdAndUpdate(
    req.params.id,
    { status: 'draft', publishedBy: null, publishedAt: null },
    { new: true }
  );
  if (!result) return res.status(404).json({ success: false, message: 'Result not found.' });
  res.json({ success: true, result });
});

// Bulk publish all draft results for a class/session/term
router.put('/results/publish-class', async (req, res) => {
  const { session, term, class: cls } = req.body;
  if (!session || !term || !cls) {
    return res.status(400).json({ success: false, message: 'session, term and class are required.' });
  }
  const result = await Result.updateMany(
    { session, term, class: cls, status: 'draft' },
    { status: 'published', publishedBy: req.user._id, publishedAt: new Date() }
  );
  res.json({ success: true, modified: result.modifiedCount });
});

module.exports = router;
