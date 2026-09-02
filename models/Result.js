const mongoose = require('mongoose');

const subjectResultSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, trim: true },
    ca1: { type: Number, default: 0, min: 0, max: 20 },       // 1st Continuous Assessment
    ca2: { type: Number, default: 0, min: 0, max: 20 },       // 2nd Continuous Assessment
    exam: { type: Number, default: 0, min: 0, max: 60 },      // Exam score
    total: { type: Number, default: 0 },                      // ca1 + ca2 + exam (max 100)
    grade: { type: String },                                  // A, B, C, D, E, F
    remark: { type: String },                                 // Excellent, Good, Pass, Fail...
    subjectPosition: { type: String, trim: true },             // e.g. "3rd"
    classAverage: { type: Number },
    highestInClass: { type: Number },
    lowestInClass: { type: Number },
    teacherInitials: { type: String, trim: true }
  },
  { _id: false }
);

const traitSchema = new mongoose.Schema(
  { trait: { type: String, required: true }, rating: { type: Number, min: 1, max: 5 } },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    session: { type: String, required: true, trim: true }, // e.g. "2025/2026"
    term: { type: String, enum: ['First', 'Second', 'Third'], required: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },

    subjects: [subjectResultSchema],

    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    position: { type: String, trim: true },     // e.g. "5th"
    numberInClass: { type: Number },

    attendance: {
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },

    psychomotorSkills: [traitSchema],   // e.g. Handwriting, Sports, Punctuality
    affectiveTraits: [traitSchema],     // e.g. Honesty, Neatness, Leadership

    classTeacherComment: { type: String, trim: true },
    principalComment: { type: String, trim: true },
    nextTermBegins: { type: Date },

    // Workflow: teacher creates/edits as draft -> admin publishes -> visible to parents
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date }
  },
  { timestamps: true }
);

// One result per student per session/term
resultSchema.index({ student: 1, session: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);
