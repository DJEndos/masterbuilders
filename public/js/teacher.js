const user = requireRole('teacher', 'admin');
if (user) document.getElementById('teacherName').textContent = `${user.name} (${user.role === 'admin' ? 'Admin' : 'Teacher'})`;

function doLogout() { clearSession(); window.location.href = '/index.html'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openModal(id) { document.getElementById(id).classList.add('open'); }

const DEFAULT_PSYCHOMOTOR = ['Handwriting', 'Sports/Games', 'Craft/Art', 'Punctuality'];
const DEFAULT_AFFECTIVE = ['Honesty', 'Neatness', 'Leadership', 'Cooperation with others'];

// Populate class dropdown
(function initClasses() {
  const select = document.getElementById('classSelect');
  const classes = user.role === 'admin' ? [] : (user.assignedClasses || []);
  if (user.role === 'admin') {
    select.innerHTML = '<option value="">-- Admins: type a class manually below via Students tab --</option>';
    // Allow admin to type any class name too
    const manual = document.createElement('input');
    manual.type = 'text';
    manual.placeholder = 'Enter class name (admin override)';
    manual.id = 'manualClassInput';
    manual.style.marginTop = '6px';
    select.insertAdjacentElement('afterend', manual);
  } else if (!classes.length) {
    select.innerHTML = '<option value="">No classes assigned — contact admin</option>';
  } else {
    select.innerHTML = classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }
})();

function currentClass() {
  const manual = document.getElementById('manualClassInput');
  if (manual && manual.value.trim()) return manual.value.trim();
  return document.getElementById('classSelect').value;
}

let currentStudents = [];

async function loadClassStudents() {
  const cls = currentClass();
  const tbody = document.getElementById('studentsBody');
  if (!cls) return showAlert(document.getElementById('alertBox'), 'Please select or enter a class first.');
  try {
    const data = await apiRequest(`/teacher/students?class=${encodeURIComponent(cls)}`);
    currentStudents = data.students;
    if (!data.students.length) {
      tbody.innerHTML = '<tr><td colspan="4">No students found in this class.</td></tr>';
      return;
    }
    tbody.innerHTML = data.students.map(s => `
      <tr>
        <td>${escapeHtml(s.studentID)}</td>
        <td>${escapeHtml(s.fullName)}</td>
        <td id="status-${s._id}">—</td>
        <td><button class="btn sm orange" onclick="openScoreModal('${s._id}')">Enter/Edit Scores</button></td>
      </tr>
    `).join('');
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

async function computePositions() {
  const cls = currentClass();
  const session = document.getElementById('sessionInput').value.trim();
  const term = document.getElementById('termSelect').value;
  if (!cls || !session) return showAlert(document.getElementById('alertBox'), 'Select class and enter session first.');
  try {
    const data = await apiRequest('/teacher/compute-positions', { method: 'POST', body: { session, term, class: cls } });
    showAlert(document.getElementById('alertBox'), data.message, 'success');
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

function subjectRowHtml(s = {}) {
  const id = Math.random().toString(36).slice(2, 8);
  return `
    <tr data-row-id="${id}">
      <td><input type="text" class="subj-name" value="${escapeHtml(s.subjectName || '')}" placeholder="e.g. Mathematics" /></td>
      <td><input type="number" class="subj-ca1" min="0" max="20" value="${s.ca1 ?? 0}" oninput="recalcRow('${id}')" /></td>
      <td><input type="number" class="subj-ca2" min="0" max="20" value="${s.ca2 ?? 0}" oninput="recalcRow('${id}')" /></td>
      <td><input type="number" class="subj-exam" min="0" max="60" value="${s.exam ?? 0}" oninput="recalcRow('${id}')" /></td>
      <td class="subj-total" style="font-weight:700;">${s.total ?? 0}</td>
      <td class="subj-grade" style="font-weight:700;color:#f2900d;">${s.grade ?? '—'}</td>
      <td><button type="button" class="btn sm danger" onclick="this.closest('tr').remove()">✕</button></td>
    </tr>`;
}

function addSubjectRow(s) {
  document.getElementById('subjectsBody').insertAdjacentHTML('beforeend', subjectRowHtml(s));
}

function gradeFor(total) {
  if (total >= 75) return 'A';
  if (total >= 65) return 'B2';
  if (total >= 60) return 'B3';
  if (total >= 55) return 'C4';
  if (total >= 50) return 'C5';
  if (total >= 45) return 'C6';
  if (total >= 40) return 'D7';
  if (total >= 30) return 'E8';
  return 'F9';
}

function recalcRow(id) {
  const row = document.querySelector(`tr[data-row-id="${id}"]`);
  const ca1 = Number(row.querySelector('.subj-ca1').value) || 0;
  const ca2 = Number(row.querySelector('.subj-ca2').value) || 0;
  const exam = Number(row.querySelector('.subj-exam').value) || 0;
  const total = ca1 + ca2 + exam;
  row.querySelector('.subj-total').textContent = total;
  row.querySelector('.subj-grade').textContent = gradeFor(total);
}

function traitRowsHtml(names, existing = []) {
  return names.map(name => {
    const found = existing.find(t => t.trait === name);
    const rating = found ? found.rating : 3;
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="width:180px;font-size:13px;">${escapeHtml(name)}</span>
        <input type="range" min="1" max="5" value="${rating}" data-trait="${escapeHtml(name)}" oninput="this.nextElementSibling.textContent=this.value" style="flex:1;" />
        <span style="width:16px;font-weight:700;color:#1a2a5e;">${rating}</span>
      </div>`;
  }).join('');
}

let editingResult = null;

async function openScoreModal(studentId) {
  const session = document.getElementById('sessionInput').value.trim();
  const term = document.getElementById('termSelect').value;
  if (!session) return showAlert(document.getElementById('alertBox'), 'Please enter an academic session first.');

  document.getElementById('scoreModalAlert').innerHTML = '';
  try {
    const data = await apiRequest(`/teacher/result/${studentId}?session=${encodeURIComponent(session)}&term=${term}`);
    editingResult = data.result;
    document.getElementById('scoreStudentId').value = studentId;
    document.getElementById('scoreModalTitle').textContent = `Enter Scores — ${data.student.fullName}`;

    document.getElementById('subjectsBody').innerHTML = '';
    const subjects = (data.result.subjects && data.result.subjects.length) ? data.result.subjects : [{}];
    subjects.forEach(s => addSubjectRow(s));

    const att = data.result.attendance || {};
    document.getElementById('attPresent').value = att.present || 0;
    document.getElementById('attAbsent').value = att.absent || 0;
    document.getElementById('attTotal').value = att.total || 0;

    document.getElementById('psychomotorList').innerHTML = traitRowsHtml(DEFAULT_PSYCHOMOTOR, data.result.psychomotorSkills || []);
    document.getElementById('affectiveList').innerHTML = traitRowsHtml(DEFAULT_AFFECTIVE, data.result.affectiveTraits || []);

    document.getElementById('classTeacherComment').value = data.result.classTeacherComment || '';
    document.getElementById('nextTermBegins').value = data.result.nextTermBegins ? data.result.nextTermBegins.substring(0, 10) : '';

    openModal('scoreModal');
  } catch (err) {
    showAlert(document.getElementById('alertBox'), err.message);
  }
}

document.getElementById('scoreForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('scoreModalAlert');
  const studentId = document.getElementById('scoreStudentId').value;
  const session = document.getElementById('sessionInput').value.trim();
  const term = document.getElementById('termSelect').value;

  const subjects = [...document.querySelectorAll('#subjectsBody tr')].map(row => ({
    subjectName: row.querySelector('.subj-name').value.trim(),
    ca1: Number(row.querySelector('.subj-ca1').value) || 0,
    ca2: Number(row.querySelector('.subj-ca2').value) || 0,
    exam: Number(row.querySelector('.subj-exam').value) || 0
  })).filter(s => s.subjectName);

  if (!subjects.length) return showAlert(alertEl, 'Add at least one subject with a name.');

  const psychomotorSkills = [...document.querySelectorAll('#psychomotorList input[type=range]')].map(inp => ({
    trait: inp.dataset.trait, rating: Number(inp.value)
  }));
  const affectiveTraits = [...document.querySelectorAll('#affectiveList input[type=range]')].map(inp => ({
    trait: inp.dataset.trait, rating: Number(inp.value)
  }));

  const payload = {
    studentId, session, term, subjects,
    attendance: {
      present: Number(document.getElementById('attPresent').value) || 0,
      absent: Number(document.getElementById('attAbsent').value) || 0,
      total: Number(document.getElementById('attTotal').value) || 0
    },
    psychomotorSkills, affectiveTraits,
    classTeacherComment: document.getElementById('classTeacherComment').value.trim(),
    nextTermBegins: document.getElementById('nextTermBegins').value || undefined
  };

  try {
    await apiRequest('/teacher/result', { method: 'POST', body: payload });
    closeModal('scoreModal');
    const statusCell = document.getElementById(`status-${studentId}`);
    if (statusCell) statusCell.innerHTML = '<span class="badge draft">Draft saved</span>';
    showAlert(document.getElementById('alertBox'), 'Result saved. Ask the admin to publish it once ready.', 'success');
  } catch (err) {
    showAlert(alertEl, err.message);
  }
});
