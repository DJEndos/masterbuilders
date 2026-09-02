const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    studentID: { type: String, required: true, unique: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female'] },
    section: {
      type: String,
      enum: ['Pre-Nursery', 'Nursery', 'Primary', 'College'],
      required: true
    },
    class: { type: String, required: true, trim: true }, // e.g. "Primary 4", "JSS2", "SSS1"
    admissionDate: { type: Date, default: Date.now },
    passportPhotoUrl: { type: String, trim: true },

    // Parent / guardian info
    parentName: { type: String, trim: true },
    parentPhone: { type: String, trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },

    // Confidential access: parents/students log in to the result portal using
    // studentID + this PIN. The PIN is hashed, never returned in queries by default.
    accessPIN: { type: String, required: true, select: false },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

studentSchema.pre('save', async function (next) {
  if (!this.isModified('accessPIN')) return next();
  const salt = await bcrypt.genSalt(10);
  this.accessPIN = await bcrypt.hash(this.accessPIN, salt);
  next();
});

studentSchema.methods.comparePIN = function (candidate) {
  return bcrypt.compare(candidate, this.accessPIN);
};

module.exports = mongoose.model('Student', studentSchema);
