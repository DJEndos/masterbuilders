const user = requireRole('admin');
if (user) document.getElementById('adminName').textContent = `${user.name} (Admin)`;

function doLogout() { clearSession(); window.location.href = '/index.html'; }

// ---------------- Tabs ----------------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---------------- Stats ----------------
async function loadStats() {
  try {
    const data = await apiRequest('/admin/stats');
    document.getElementById('statStudents').textContent = data.stats.totalStudents;
    document.getElementById('statTeachers').textContent = data.stats.totalTeachers;
    document.getElementById('statPublished').textContent = data.stats.publishedResults;
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

// ---------------- Students ----------------
async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  const search = document.getElementById('studentSearch').value.trim();
  const cls = document.getElementById('studentClassFilter').value;
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (cls) params.set('class', cls);
    const data = await apiRequest(`/admin/students?${params.toString()}`);
    if (!data.students.length) {
      tbody.innerHTML = '<tr><td colspan="6">No students found.</td></tr>';
      return;
    }
    // Populate class filter options once
    const classFilter = document.getElementById('studentClassFilter');
    const existing = new Set([...classFilter.options].map(o => o.value));
    [...new Set(data.students.map(s => s.class))].forEach(c => {
      if (!existing.has(c)) classFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
    });

    tbody.innerHTML = data.students.map(s => `
      <tr>
        <td>${escapeHtml(s.studentID)}</td>
        <td>${escapeHtml(s.fullName)}</td>
        <td>${escapeHtml(s.class)}</td>
        <td>${escapeHtml(s.section)}</td>
        <td>${escapeHtml(s.parentName || '—')}</td>
        <td>
          <button class="btn sm outline" onclick='editStudent(${JSON.stringify(s)})'>Edit</button>
          <button class="btn sm orange" onclick="resetPIN('${s._id}', '${escapeHtml(s.studentID)}')">Reset PIN</button>
          <button class="btn sm danger" onclick="deleteStudent('${s._id}', '${escapeHtml(s.fullName)}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showAlert(document.getElementById('alertBox'), err.message);
  }
}

function openStudentModal() {
  document.getElementById('studentModalTitle').textContent = 'Add Student';
  document.getElementById('studentForm').reset();
  document.getElementById('studentEditId').value = '';
  document.getElementById('studentModalAlert').innerHTML = '';
  openModal('studentModal');
}

function editStudent(s) {
  document.getElementById('studentModalTitle').textContent = 'Edit Student';
  document.getElementById('studentEditId').value = s._id;
  document.getElementById('fullName').value = s.fullName;
  document.getElementById('dateOfBirth').value = s.dateOfBirth ? s.dateOfBirth.substring(0, 10) : '';
  document.getElementById('gender').value = s.gender || 'Male';
  document.getElementById('section').value = s.section;
  document.getElementById('class').value = s.class;
  document.getElementById('parentName').value = s.parentName || '';
  document.getElementById('parentPhone').value = s.parentPhone || '';
  document.getElementById('parentEmail').value = s.parentEmail || '';
  document.getElementById('studentModalAlert').innerHTML = '';
  openModal('studentModal');
}

document.getElementById('studentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('studentModalAlert');
  const editId = document.getElementById('studentEditId').value;
  const payload = {
    fullName: document.getElementById('fullName').value.trim(),
    dateOfBirth: document.getElementById('dateOfBirth').value || undefined,
    gender: document.getElementById('gender').value,
    section: document.getElementById('section').value,
    class: document.getElementById('class').value.trim(),
    parentName: document.getElementById('parentName').value.trim(),
    parentPhone: document.getElementById('parentPhone').value.trim(),
    parentEmail: document.getElementById('parentEmail').value.trim()
  };
  try {
    if (editId) {
      await apiRequest(`/admin/students/${editId}`, { method: 'PUT', body: payload });
      closeModal('studentModal');
      loadStudents();
    } else {
      const data = await apiRequest('/admin/students', { method: 'POST', body: payload });
      closeModal('studentModal');
      loadStudents();
      loadStats();
      document.getElementById('pinModalStudentID').textContent = data.studentID;
      document.getElementById('pinModalPIN').textContent = data.accessPIN;
      openModal('pinModal');
    }
  } catch (err) {
    showAlert(alertEl, err.message);
  }
});

async function resetPIN(id, studentID) {
  if (!confirm(`Reset the access PIN for ${studentID}? The old PIN will stop working immediately.`)) return;
  try {
    const data = await apiRequest(`/admin/students/${id}/reset-pin`, { method: 'POST' });
    document.getElementById('pinModalStudentID').textContent = studentID;
    document.getElementById('pinModalPIN').textContent = data.accessPIN;
    openModal('pinModal');
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

async function deleteStudent(id, name) {
  if (!confirm(`Delete ${name} and all their results permanently? This cannot be undone.`)) return;
  try {
    await apiRequest(`/admin/students/${id}`, { method: 'DELETE' });
    loadStudents();
    loadStats();
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

// ---------------- Teachers ----------------
async function loadTeachers() {
  const tbody = document.getElementById('teachersBody');
  try {
    const data = await apiRequest('/admin/teachers');
    if (!data.teachers.length) {
      tbody.innerHTML = '<tr><td colspan="5">No teachers added yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.teachers.map(t => `
      <tr>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.email)}</td>
        <td>${(t.assignedClasses || []).map(escapeHtml).join(', ') || '—'}</td>
        <td><span class="badge ${t.isActive ? 'published' : 'draft'}">${t.isActive ? 'Active' : 'Disabled'}</span></td>
        <td>
          <button class="btn sm outline" onclick='editTeacher(${JSON.stringify(t)})'>Edit</button>
          <button class="btn sm danger" onclick="deleteTeacher('${t._id}', '${escapeHtml(t.name)}')">Remove</button>
        </td>
      </tr>
    `).join('');
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

function openTeacherModal() {
  document.getElementById('teacherModalTitle').textContent = 'Add Teacher';
  document.getElementById('teacherForm').reset();
  document.getElementById('teacherEditId').value = '';
  document.getElementById('teacherPassword').required = true;
  document.getElementById('teacherPasswordLabel').textContent = 'Temporary Password';
  document.getElementById('teacherModalAlert').innerHTML = '';
  openModal('teacherModal');
}

function editTeacher(t) {
  document.getElementById('teacherModalTitle').textContent = 'Edit Teacher';
  document.getElementById('teacherEditId').value = t._id;
  document.getElementById('teacherName').value = t.name;
  document.getElementById('teacherEmail').value = t.email;
  document.getElementById('teacherEmail').disabled = true;
  document.getElementById('teacherPassword').required = false;
  document.getElementById('teacherPassword').value = '';
  document.getElementById('teacherPasswordLabel').textContent = 'Password (leave blank to keep unchanged — not editable here)';
  document.getElementById('teacherPassword').disabled = true;
  document.getElementById('teacherPhone').value = t.phone || '';
  document.getElementById('teacherClasses').value = (t.assignedClasses || []).join(', ');
  document.getElementById('teacherSubjects').value = (t.assignedSubjects || []).join(', ');
  document.getElementById('teacherModalAlert').innerHTML = '';
  openModal('teacherModal');
}

document.getElementById('teacherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('teacherModalAlert');
  const editId = document.getElementById('teacherEditId').value;
  const classes = document.getElementById('teacherClasses').value.split(',').map(s => s.trim()).filter(Boolean);
  const subjects = document.getElementById('teacherSubjects').value.split(',').map(s => s.trim()).filter(Boolean);
  try {
    if (editId) {
      await apiRequest(`/admin/teachers/${editId}`, {
        method: 'PUT',
        body: { name: document.getElementById('teacherName').value.trim(), phone: document.getElementById('teacherPhone').value.trim(), assignedClasses: classes, assignedSubjects: subjects, isActive: true }
      });
    } else {
      await apiRequest('/admin/teachers', {
        method: 'POST',
        body: {
          name: document.getElementById('teacherName').value.trim(),
          email: document.getElementById('teacherEmail').value.trim(),
          password: document.getElementById('teacherPassword').value,
          phone: document.getElementById('teacherPhone').value.trim(),
          assignedClasses: classes, assignedSubjects: subjects
        }
      });
    }
    document.getElementById('teacherEmail').disabled = false;
    document.getElementById('teacherPassword').disabled = false;
    closeModal('teacherModal');
    loadTeachers();
    loadStats();
  } catch (err) { showAlert(alertEl, err.message); }
});

async function deleteTeacher(id, name) {
  if (!confirm(`Remove teacher ${name}? They will no longer be able to log in.`)) return;
  try {
    await apiRequest(`/admin/teachers/${id}`, { method: 'DELETE' });
    loadTeachers();
    loadStats();
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

// ---------------- Results ----------------
async function loadResults() {
  const tbody = document.getElementById('resultsBody');
  const params = new URLSearchParams();
  const session = document.getElementById('filterSession').value;
  const term = document.getElementById('filterTerm').value;
  const cls = document.getElementById('filterClass').value;
  const status = document.getElementById('filterStatus').value;
  if (session) params.set('session', session);
  if (term) params.set('term', term);
  if (cls) params.set('class', cls);
  if (status) params.set('status', status);
  try {
    const data = await apiRequest(`/admin/results?${params.toString()}`);
    if (!data.results.length) {
      tbody.innerHTML = '<tr><td colspan="7">No results found for this filter.</td></tr>';
      return;
    }
    // populate filters
    const classFilter = document.getElementById('filterClass');
    const sessionFilter = document.getElementById('filterSession');
    const existingClasses = new Set([...classFilter.options].map(o => o.value));
    const existingSessions = new Set([...sessionFilter.options].map(o => o.value));
    data.results.forEach(r => {
      if (r.class && !existingClasses.has(r.class)) { classFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(r.class)}">${escapeHtml(r.class)}</option>`); existingClasses.add(r.class); }
      if (r.session && !existingSessions.has(r.session)) { sessionFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(r.session)}">${escapeHtml(r.session)}</option>`); existingSessions.add(r.session); }
    });

    tbody.innerHTML = data.results.map(r => `
      <tr>
        <td>${escapeHtml(r.student?.fullName || '—')} <br><span class="small-muted">${escapeHtml(r.student?.studentID || '')}</span></td>
        <td>${escapeHtml(r.class)}</td>
        <td>${escapeHtml(r.session)}</td>
        <td>${escapeHtml(r.term)}</td>
        <td>${r.averageScore}%</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td>
          <button class="btn sm outline" onclick="previewPDF('${r._id}')">Preview PDF</button>
          ${r.status === 'draft'
            ? `<button class="btn sm" onclick="publishResult('${r._id}')">Publish</button>`
            : `<button class="btn sm danger" onclick="unpublishResult('${r._id}')">Unpublish</button>`}
        </td>
      </tr>
    `).join('');
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

async function publishResult(id) {
  try { await apiRequest(`/admin/results/${id}/publish`, { method: 'PUT' }); loadResults(); loadStats(); }
  catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}
async function unpublishResult(id) {
  try { await apiRequest(`/admin/results/${id}/unpublish`, { method: 'PUT' }); loadResults(); loadStats(); }
  catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

async function bulkPublish() {
  const session = document.getElementById('filterSession').value;
  const term = document.getElementById('filterTerm').value;
  const cls = document.getElementById('filterClass').value;
  if (!session || !term || !cls) {
    return showAlert(document.getElementById('alertBox'), 'Select a specific Session, Term and Class above before bulk publishing.');
  }
  if (!confirm(`Publish ALL draft results for ${cls} — ${term} Term, ${session}?`)) return;
  try {
    const data = await apiRequest('/admin/results/publish-class', { method: 'PUT', body: { session, term, class: cls } });
    showAlert(document.getElementById('alertBox'), `${data.modified} result(s) published.`, 'success');
    loadResults(); loadStats();
  } catch (err) { showAlert(document.getElementById('alertBox'), err.message); }
}

function previewPDF(id) {
  const token = getToken();
  // open in new tab; browser will not send Authorization header, so we fetch and open a blob instead
  fetch(`/api/results/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => window.open(window.URL.createObjectURL(blob), '_blank'))
    .catch(() => showAlert(document.getElementById('alertBox'), 'Could not open PDF preview.'));
}

loadStats();
loadStudents();
loadTeachers();
loadResults();
