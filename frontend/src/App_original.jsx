import { useEffect, useState } from 'react'
import './styles/app.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const partnerStatuses = ['Interessent', 'In Gespraechen', 'Verhandlung', 'Aktiver Partner', 'Alumni', 'Alumni IRM']
const studentStatuses = ['Aktiv', 'Alumni']
const lecturerAffiliations = ['Company', 'University']
const qualityEvaluations = ['excellent', 'good', 'average', 'poor', 'not_evaluated']
const tabs = ['dashboard', 'partners', 'lecturers', 'students', 'notes', 'webhooks']

function statusClass(status) {
  const value = status?.toLowerCase() || ''
  if (value.includes('aktiv') || value.includes('active')) return 'badge badge-ok'
  if (value.includes('verhandlung') || value.includes('gespraechen')) return 'badge badge-warn'
  if (value.includes('alumni')) return 'badge badge-neutral'
  return 'badge badge-info'
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('crm_token') || '')
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboard, setDashboard] = useState(null)

  const [partners, setPartners] = useState([])
  const [lecturers, setLecturers] = useState([])
  const [students, setStudents] = useState([])
  const [notes, setNotes] = useState([])
  const [events, setEvents] = useState([])

  const [qPartner, setQPartner] = useState('')
  const [qLecturer, setQLecturer] = useState('')
  const [qStudent, setQStudent] = useState('')
  const [qNotes, setQNotes] = useState('')

  const [history, setHistory] = useState([])
  const [historyTitle, setHistoryTitle] = useState('Select a record for timeline')
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ username: 'Hannes', password: 'hannes123' })
  const [partnerForm, setPartnerForm] = useState({ name: '', industry: '', location: '', contact_person: '', contact_email: '', contact_phone: '', website: '', notes: '', status: 'Interessent', topics: '', reservierte_plaetze: 0 })
  const [lecturerForm, setLecturerForm] = useState({
    name: '',
    contact: '',
    nationality: '',
    affiliation: '',
    organization: '',
    professional_experience: '',
    remarks: '',
    quality_evaluation: 'not_evaluated',
    contact_from: '',
    can_lecture: true,
    can_guest_lecture_only: false,
    can_supervise: false,
    did_not_lecture_yet_but_interested: false,
    did_not_supervise_yet_but_interested: false,
    teaches_german: false,
    teaches_english: false,
    lectures_held: '',
    focus_topics: '',
    is_alumni_student: false,
    alumni_student_id: ''
  })
  const [studentForm, setStudentForm] = useState({
    name: '', cohort: '', company: '', status: 'Aktiv',
    dhbw_email: '', private_email: '',
    project1_title: '', project1_supervisor: '',
    project2_title: '', project2_supervisor: '',
    bachelor_title: '', bachelor_supervisor: '',
    lecturer_potential: false, became_lecturer: false, notes: ''
  })
  const [contactForm, setContactForm] = useState({ partner_id: '', channel: 'E-Mail', summary: '' })
  const [notesForm, setNotesForm] = useState({ title: '', content: '', note_date: '', tags: '' })
  const [webhookForm, setWebhookForm] = useState({ source: 'frontend', event_type: 'note.created', payload: '{"message":"Hello from UI"}' })

  // Selected lecturer for detail view
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [editLecturerForm, setEditLecturerForm] = useState(null)

  // Selected partner for detail view
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [editPartnerForm, setEditPartnerForm] = useState(null)

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers })
    if (res.status === 401) {
      logout()
      throw new Error('Session expired')
    }
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(detail || `Request failed: ${res.status}`)
    }
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) return res.json()
    return res
  }

  async function login(e) {
    e.preventDefault()
    setError('')
    try {
      const body = new URLSearchParams()
      body.set('username', loginForm.username)
      body.set('password', loginForm.password)
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      })
      if (!res.ok) throw new Error('Invalid login')
      const data = await res.json()
      localStorage.setItem('crm_token', data.access_token)
      setToken(data.access_token)
    } catch (err) {
      setError(err.message)
    }
  }

  function logout() {
    localStorage.removeItem('crm_token')
    setToken('')
    setUser(null)
  }

  async function loadAll() {
    if (!token) return
    try {
      const [me, dash, p, l, s, n, e] = await Promise.all([
        api('/api/auth/me'),
        api('/api/dashboard'),
        api(`/api/partners${qPartner ? `?q=${encodeURIComponent(qPartner)}` : ''}`),
        api(`/api/lecturers${qLecturer ? `?q=${encodeURIComponent(qLecturer)}` : ''}`),
        api(`/api/students${qStudent ? `?q=${encodeURIComponent(qStudent)}` : ''}`),
        api(`/api/notes${qNotes ? `?q=${encodeURIComponent(qNotes)}` : ''}`),
        api('/api/webhooks')
      ])
      setUser(me)
      setDashboard(dash)
      setPartners(p)
      setLecturers(l)
      setStudents(s)
      setNotes(n)
      setEvents(e)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [token, qPartner, qLecturer, qStudent, qNotes])

  async function submitPartner(e) {
    e.preventDefault()
    await api('/api/partners', { method: 'POST', body: JSON.stringify(partnerForm) })
    setPartnerForm({ name: '', industry: '', location: '', contact_person: '', contact_email: '', contact_phone: '', website: '', notes: '', status: 'Interessent', topics: '', reservierte_plaetze: 0 })
    loadAll()
  }

  async function updatePartner(e) {
    e.preventDefault()
    await api(`/api/partners/${selectedPartner.id}`, { method: 'PUT', body: JSON.stringify(editPartnerForm) })
    setSelectedPartner(null)
    setEditPartnerForm(null)
    loadAll()
  }

  function selectPartner(partner) {
    setSelectedPartner(partner)
    setEditPartnerForm({ ...partner })
  }

  function clearSelectedPartner() {
    setSelectedPartner(null)
    setEditPartnerForm(null)
  }

  async function submitLecturer(e) {
    e.preventDefault()
    const payload = { ...lecturerForm, alumni_student_id: lecturerForm.alumni_student_id ? Number(lecturerForm.alumni_student_id) : null }
    await api('/api/lecturers', { method: 'POST', body: JSON.stringify(payload) })
    setLecturerForm({
      name: '',
      contact: '',
      nationality: '',
      affiliation: '',
      organization: '',
      professional_experience: '',
      remarks: '',
      quality_evaluation: 'not_evaluated',
      contact_from: '',
      can_lecture: true,
      can_guest_lecture_only: false,
      can_supervise: false,
      did_not_lecture_yet_but_interested: false,
      did_not_supervise_yet_but_interested: false,
      teaches_german: false,
      teaches_english: false,
      lectures_held: '',
      focus_topics: '',
      is_alumni_student: false,
      alumni_student_id: ''
    })
    loadAll()
  }

  async function updateLecturer(e) {
    e.preventDefault()
    const payload = { 
      ...editLecturerForm, 
      alumni_student_id: editLecturerForm.alumni_student_id ? Number(editLecturerForm.alumni_student_id) : null 
    }
    await api(`/api/lecturers/${selectedLecturer.id}`, { method: 'PUT', body: JSON.stringify(payload) })
    setSelectedLecturer(null)
    setEditLecturerForm(null)
    loadAll()
  }

  function selectLecturer(lecturer) {
    setSelectedLecturer(lecturer)
    setEditLecturerForm({ ...lecturer, alumni_student_id: lecturer.alumni_student_id || '' })
  }

  function clearSelectedLecturer() {
    setSelectedLecturer(null)
    setEditLecturerForm(null)
  }

  async function deleteEntity(kind, id, label = '') {
    const ok = window.confirm(`Wirklich löschen? ${label ? `\n\n${label}` : ''}`)
    if (!ok) return
    const path = kind === 'partner' ? `/api/partners/${id}` : kind === 'lecturer' ? `/api/lecturers/${id}` : `/api/students/${id}`
    await api(path, { method: 'DELETE' })
    if (kind === 'partner') clearSelectedPartner()
    if (kind === 'lecturer') clearSelectedLecturer()
    await loadAll()
  }

  async function submitStudent(e) {
    e.preventDefault()
    await api('/api/students', { method: 'POST', body: JSON.stringify(studentForm) })
    setStudentForm({ name: '', cohort: '', company: '', status: 'Aktiv', lecturer_potential: false, became_lecturer: false, notes: '' })
    loadAll()
  }

  async function submitContact(e) {
    e.preventDefault()
    await api(`/api/partners/${contactForm.partner_id}/contacts`, { method: 'POST', body: JSON.stringify({ channel: contactForm.channel, summary: contactForm.summary }) })
    setContactForm({ partner_id: '', channel: 'E-Mail', summary: '' })
    loadAll()
  }

  async function submitNote(e) {
    e.preventDefault()
    const payload = { ...notesForm, note_date: notesForm.note_date ? new Date(notesForm.note_date).toISOString() : null }
    await api('/api/notes', { method: 'POST', body: JSON.stringify(payload) })
    setNotesForm({ title: '', content: '', note_date: '', tags: '' })
    loadAll()
  }

  async function submitWebhook(e) {
    e.preventDefault()
    await api('/api/webhooks/ingest', {
      method: 'POST',
      body: JSON.stringify({
        source: webhookForm.source,
        event_type: webhookForm.event_type,
        payload: JSON.parse(webhookForm.payload)
      })
    })
    loadAll()
  }

  async function showHistory(entityType, entityId, label) {
    const result = await api(`/api/history?entity_type=${entityType}&entity_id=${entityId}`)
    setHistory(result)
    setHistoryTitle(`Timeline: ${label}`)
  }

  async function updateStatus(type, item, status) {
    const path = type === 'partner' ? `/api/partners/${item.id}` : `/api/students/${item.id}`
    await api(path, { method: 'PUT', body: JSON.stringify({ status }) })
    loadAll()
    showHistory(type, item.id, item.name)
  }

  async function toggleStudentLecturer(student) {
    await api(`/api/students/${student.id}`, { method: 'PUT', body: JSON.stringify({ became_lecturer: !student.became_lecturer }) })
    loadAll()
  }

  async function toggleLecturerAlumni(lecturer) {
    await api(`/api/lecturers/${lecturer.id}`, { method: 'PUT', body: JSON.stringify({ is_alumni_student: !lecturer.is_alumni_student }) })
    loadAll()
  }

  async function downloadCsv(tableName) {
    const res = await fetch(`${API_URL}/api/export/${tableName}.csv`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      setError('CSV export failed')
      return
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tableName}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  if (!token) {
    return (
      <main className="login-shell">
        <form className="panel login-panel" onSubmit={login}>
          <h1>CRM SGL</h1>
          <p>Sign in with seeded users (Hannes / Diana).</p>
          <label>Username<input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required /></label>
          <label>Password<input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required /></label>
          <button type="submit">Login</button>
          {error && <p className="error">{error}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell" style={{ 
      backgroundImage: 'linear-gradient(rgba(253, 248, 243, 0.70), rgba(253, 248, 243, 0.85)), url(/crm/background.jpg)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <header className="topbar">
        <div>
          <h1>CRM SGL Dashboard</h1>
          <p>{user?.username} ({user?.role})</p>
        </div>
        <div className="topbar-actions">
          {tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {activeTab === 'dashboard' && dashboard && (
        <section className="grid cards">
          <Card title="Partners" value={dashboard.partner_count} extra={`${dashboard.active_partner_count} active`} onClick={() => setActiveTab('partners')} />
          <Card title="Lecturers" value={dashboard.lecturer_count} extra="Total available" onClick={() => setActiveTab('lecturers')} />
          <Card title="Students/Alumni" value={dashboard.student_count} extra={`${dashboard.active_student_count} active`} onClick={() => setActiveTab('students')} />
          <Card title="CSV Export" value="7" extra="One-click table exports" />
        </section>
      )}

      {activeTab === 'partners' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>Partners</h2>
            <div className="toolbar">
              <input placeholder="Search partners" value={qPartner} onChange={(e) => setQPartner(e.target.value)} />
              <button onClick={() => downloadCsv('partner_companies')}>Export CSV</button>
            </div>
            <table><thead><tr><th>Name</th><th>Status</th><th>Reservierte Plätze</th><th>Kontakt</th><th>E-Mail</th><th>Actions</th></tr></thead><tbody>
              {partners.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>{item.reservierte_plaetze ?? 0}</td>
                  <td>{item.contact_person}</td>
                  <td>{item.contact_email || '-'}</td>
                  <td>
                    <button onClick={() => showHistory('partner', item.id, item.name)}>Timeline</button>
                    <button onClick={() => selectPartner(item)}>View / Edit</button>
                    <button onClick={() => deleteEntity('partner', item.id, item.name)} className="danger">Delete</button>
                    <select value={item.status} onChange={(e) => updateStatus('partner', item, e.target.value)}>
                      {partnerStatuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <div className="panel stack" style={{position:'sticky', top:'1rem', alignSelf:'flex-start', maxHeight:'90vh', overflowY:'auto'}}>
            {selectedPartner && editPartnerForm ? (
              <>
                <div className="toolbar">
                  <h3>Edit Partner: {selectedPartner.name}</h3>
                  <button onClick={clearSelectedPartner}>← Back to Create</button>
                </div>
                <form onSubmit={updatePartner} className="stack">
                  <input placeholder="Name" value={editPartnerForm.name} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, name: e.target.value })} required />
                  <input placeholder="Industry" value={editPartnerForm.industry} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, industry: e.target.value })} />
                  <input placeholder="Location" value={editPartnerForm.location} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, location: e.target.value })} />
                  <input placeholder="Contact Person" value={editPartnerForm.contact_person} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_person: e.target.value })} />
                  <input placeholder="Contact Email" value={editPartnerForm.contact_email} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_email: e.target.value })} />
                  <input placeholder="Contact Phone" value={editPartnerForm.contact_phone} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_phone: e.target.value })} />
                  <input placeholder="Website" value={editPartnerForm.website} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, website: e.target.value })} />
                  <textarea placeholder="Notes" value={editPartnerForm.notes} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, notes: e.target.value })} />
                  <input type="number" min="0" placeholder="Reservierte Plätze" value={editPartnerForm.reservierte_plaetze ?? 0} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, reservierte_plaetze: Number(e.target.value || 0) })} />
                  <select value={editPartnerForm.status} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, status: e.target.value })}>{partnerStatuses.map((s) => <option key={s}>{s}</option>)}</select>
                  <textarea placeholder="Topics" value={editPartnerForm.topics} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, topics: e.target.value })} />
                  <button type="submit">Save Changes</button>
                  <button type="button" className="danger" onClick={() => deleteEntity('partner', selectedPartner.id, selectedPartner.name)}>Delete Partner</button>
                </form>
              </>
            ) : (
              <>
                <h3>Create Partner</h3>
                <form onSubmit={submitPartner} className="stack">
                  <input placeholder="Name" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
                  <input placeholder="Industry" value={partnerForm.industry} onChange={(e) => setPartnerForm({ ...partnerForm, industry: e.target.value })} />
                  <input placeholder="Location" value={partnerForm.location} onChange={(e) => setPartnerForm({ ...partnerForm, location: e.target.value })} />
                  <input placeholder="Contact Person" value={partnerForm.contact_person} onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })} />
                  <input placeholder="Contact Email" value={partnerForm.contact_email} onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })} />
                  <input placeholder="Contact Phone" value={partnerForm.contact_phone} onChange={(e) => setPartnerForm({ ...partnerForm, contact_phone: e.target.value })} />
                  <input placeholder="Website" value={partnerForm.website} onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })} />
                  <textarea placeholder="Notes" value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} />
                  <input type="number" min="0" placeholder="Reservierte Plätze" value={partnerForm.reservierte_plaetze ?? 0} onChange={(e) => setPartnerForm({ ...partnerForm, reservierte_plaetze: Number(e.target.value || 0) })} />
                  <select value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}>{partnerStatuses.map((s) => <option key={s}>{s}</option>)}</select>
                  <textarea placeholder="Topics" value={partnerForm.topics} onChange={(e) => setPartnerForm({ ...partnerForm, topics: e.target.value })} />
                  <button type="submit">Add Partner</button>
                </form>
              </>
            )}

            <h3>Log Contact</h3>
            <form onSubmit={submitContact} className="stack">
              <input placeholder="Partner ID" value={contactForm.partner_id} onChange={(e) => setContactForm({ ...contactForm, partner_id: e.target.value })} required />
              <input placeholder="Channel" value={contactForm.channel} onChange={(e) => setContactForm({ ...contactForm, channel: e.target.value })} required />
              <textarea placeholder="Summary" value={contactForm.summary} onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })} required />
              <button type="submit">Save Contact</button>
            </form>

            <Timeline title={historyTitle} items={history} />
          </div>
        </section>
      )}

      {activeTab === 'lecturers' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>Lecturers</h2>
            <div className="toolbar">
              <input placeholder="Search by name, organization, focus topics, lectures held…" value={qLecturer} onChange={(e) => setQLecturer(e.target.value)} style={{width:'100%'}} />
              <button onClick={() => downloadCsv('lecturers')}>Export CSV</button>
            </div>
            <table><thead><tr><th>Name</th><th>Organization</th><th>Affiliation</th><th>Languages</th><th>Alumni</th><th>Actions</th></tr></thead><tbody>
              {lecturers.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.organization || '-'}</td>
                  <td>{item.affiliation || '-'}</td>
                  <td>{[item.teaches_german && 'DE', item.teaches_english && 'EN'].filter(Boolean).join(' / ') || '-'}</td>
                  <td>
                    <button onClick={() => toggleLecturerAlumni(item)}>{item.is_alumni_student ? 'Yes' : 'No'}</button>
                    {item.alumni_student_id && <small>Student #{item.alumni_student_id}</small>}
                  </td>
                  <td>
                    <button onClick={() => selectLecturer(item)}>View / Edit</button>
                    <button onClick={() => deleteEntity('lecturer', item.id, item.name)} className="danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel" style={{position:'sticky', top:'1rem', alignSelf:'flex-start', maxHeight:'90vh', overflowY:'auto'}}>
            {selectedLecturer && editLecturerForm ? (
              <>
                <div className="toolbar">
                  <h3>Edit Lecturer: {selectedLecturer.name}</h3>
                  <button onClick={clearSelectedLecturer}>← Back to Create</button>
                </div>
                <form onSubmit={updateLecturer} className="stack">
                  <input placeholder="Name" value={editLecturerForm.name} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, name: e.target.value })} required />
                  <input placeholder="Contact" value={editLecturerForm.contact} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, contact: e.target.value })} />
                  <input placeholder="Nationality" value={editLecturerForm.nationality} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, nationality: e.target.value })} />
                  <select value={editLecturerForm.affiliation} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, affiliation: e.target.value })}>
                    <option value="">Affiliation</option>
                    {lecturerAffiliations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="Organization (e.g. Kaufland, DHBW)" value={editLecturerForm.organization} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, organization: e.target.value })} />
                  <textarea placeholder="Professional experience" value={editLecturerForm.professional_experience} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, professional_experience: e.target.value })} />
                  <textarea placeholder="Remarks" value={editLecturerForm.remarks} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, remarks: e.target.value })} />
                  <select value={editLecturerForm.quality_evaluation} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, quality_evaluation: e.target.value })}>
                    {qualityEvaluations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="Contact from" value={editLecturerForm.contact_from} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, contact_from: e.target.value })} />
                  <label><input type="checkbox" checked={editLecturerForm.can_lecture} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_lecture: e.target.checked })} /> Can lecture</label>
                  <label><input type="checkbox" checked={editLecturerForm.can_guest_lecture_only} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_guest_lecture_only: e.target.checked })} /> Can guest lecture only</label>
                  <label><input type="checkbox" checked={editLecturerForm.can_supervise} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_supervise: e.target.checked })} /> Can supervise</label>
                  <label><input type="checkbox" checked={editLecturerForm.did_not_lecture_yet_but_interested} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, did_not_lecture_yet_but_interested: e.target.checked })} /> Interested in lecturing (no lectures yet)</label>
                  <label><input type="checkbox" checked={editLecturerForm.did_not_supervise_yet_but_interested} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, did_not_supervise_yet_but_interested: e.target.checked })} /> Interested in supervising (no supervision yet)</label>
                  <label><input type="checkbox" checked={editLecturerForm.teaches_german} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, teaches_german: e.target.checked })} /> Teaches German</label>
                  <label><input type="checkbox" checked={editLecturerForm.teaches_english} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, teaches_english: e.target.checked })} /> Teaches English</label>
                  <input placeholder="Lectures held" value={editLecturerForm.lectures_held} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, lectures_held: e.target.value })} />
                  <textarea placeholder="Focus topics" value={editLecturerForm.focus_topics} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, focus_topics: e.target.value })} />
                  <label><input type="checkbox" checked={editLecturerForm.is_alumni_student} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, is_alumni_student: e.target.checked })} /> Alumni student</label>
                  <input placeholder="Alumni Student ID (optional)" value={editLecturerForm.alumni_student_id} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, alumni_student_id: e.target.value })} />
                  <button type="submit">Save Changes</button>
                  <button type="button" className="danger" onClick={() => deleteEntity('lecturer', selectedLecturer.id, selectedLecturer.name)}>Delete Lecturer</button>
                </form>
              </>
            ) : (
              <>
                <h3>Create Lecturer</h3>
                <form onSubmit={submitLecturer} className="stack">
                  <input placeholder="Name" value={lecturerForm.name} onChange={(e) => setLecturerForm({ ...lecturerForm, name: e.target.value })} required />
                  <input placeholder="Contact" value={lecturerForm.contact} onChange={(e) => setLecturerForm({ ...lecturerForm, contact: e.target.value })} />
                  <input placeholder="Nationality" value={lecturerForm.nationality} onChange={(e) => setLecturerForm({ ...lecturerForm, nationality: e.target.value })} />
                  <select value={lecturerForm.affiliation} onChange={(e) => setLecturerForm({ ...lecturerForm, affiliation: e.target.value })}>
                    <option value="">Affiliation</option>
                    {lecturerAffiliations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="Organization (e.g. Kaufland, DHBW)" value={lecturerForm.organization} onChange={(e) => setLecturerForm({ ...lecturerForm, organization: e.target.value })} />
                  <textarea placeholder="Professional experience" value={lecturerForm.professional_experience} onChange={(e) => setLecturerForm({ ...lecturerForm, professional_experience: e.target.value })} />
                  <textarea placeholder="Remarks" value={lecturerForm.remarks} onChange={(e) => setLecturerForm({ ...lecturerForm, remarks: e.target.value })} />
                  <select value={lecturerForm.quality_evaluation} onChange={(e) => setLecturerForm({ ...lecturerForm, quality_evaluation: e.target.value })}>
                    {qualityEvaluations.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input placeholder="Contact from" value={lecturerForm.contact_from} onChange={(e) => setLecturerForm({ ...lecturerForm, contact_from: e.target.value })} />
                  <label><input type="checkbox" checked={lecturerForm.can_lecture} onChange={(e) => setLecturerForm({ ...lecturerForm, can_lecture: e.target.checked })} /> Can lecture</label>
                  <label><input type="checkbox" checked={lecturerForm.can_guest_lecture_only} onChange={(e) => setLecturerForm({ ...lecturerForm, can_guest_lecture_only: e.target.checked })} /> Can guest lecture only</label>
                  <label><input type="checkbox" checked={lecturerForm.can_supervise} onChange={(e) => setLecturerForm({ ...lecturerForm, can_supervise: e.target.checked })} /> Can supervise</label>
                  <label><input type="checkbox" checked={lecturerForm.did_not_lecture_yet_but_interested} onChange={(e) => setLecturerForm({ ...lecturerForm, did_not_lecture_yet_but_interested: e.target.checked })} /> Interested in lecturing (no lectures yet)</label>
                  <label><input type="checkbox" checked={lecturerForm.did_not_supervise_yet_but_interested} onChange={(e) => setLecturerForm({ ...lecturerForm, did_not_supervise_yet_but_interested: e.target.checked })} /> Interested in supervising (no supervision yet)</label>
                  <label><input type="checkbox" checked={lecturerForm.teaches_german} onChange={(e) => setLecturerForm({ ...lecturerForm, teaches_german: e.target.checked })} /> Teaches German</label>
                  <label><input type="checkbox" checked={lecturerForm.teaches_english} onChange={(e) => setLecturerForm({ ...lecturerForm, teaches_english: e.target.checked })} /> Teaches English</label>
                  <input placeholder="Lectures held" value={lecturerForm.lectures_held} onChange={(e) => setLecturerForm({ ...lecturerForm, lectures_held: e.target.value })} />
                  <textarea placeholder="Focus topics" value={lecturerForm.focus_topics} onChange={(e) => setLecturerForm({ ...lecturerForm, focus_topics: e.target.value })} />
                  <label><input type="checkbox" checked={lecturerForm.is_alumni_student} onChange={(e) => setLecturerForm({ ...lecturerForm, is_alumni_student: e.target.checked })} /> Alumni student</label>
                  <input placeholder="Alumni Student ID (optional)" value={lecturerForm.alumni_student_id} onChange={(e) => setLecturerForm({ ...lecturerForm, alumni_student_id: e.target.value })} />
                  <button type="submit">Add Lecturer</button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {activeTab === 'students' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>Students & Alumni</h2>
            <div className="toolbar">
              <input placeholder="Search students" value={qStudent} onChange={(e) => setQStudent(e.target.value)} />
              <button onClick={() => downloadCsv('students_alumni')}>Export CSV</button>
            </div>
            <table><thead><tr><th>Name</th><th>Company</th><th>Status</th><th>Became Lecturer</th><th>Actions</th></tr></thead><tbody>
              {students.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{item.company}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>
                    <label>
                      <input type="checkbox" checked={item.became_lecturer} onChange={() => toggleStudentLecturer(item)} />
                    </label>
                  </td>
                  <td>
                    <button onClick={() => showHistory('student', item.id, item.name)}>Timeline</button>
                    <button onClick={() => deleteEntity('student', item.id, item.name)} className="danger">Delete</button>
                    <select value={item.status} onChange={(e) => updateStatus('student', item, e.target.value)}>
                      {studentStatuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel stack" style={{position:'sticky', top:'1rem', alignSelf:'flex-start', maxHeight:'90vh', overflowY:'auto'}}>
            <h3>Create Student/Alumni</h3>
            <form onSubmit={submitStudent} className="stack">
              <input placeholder="Name" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
              <input placeholder="Cohort" value={studentForm.cohort} onChange={(e) => setStudentForm({ ...studentForm, cohort: e.target.value })} />
              <input placeholder="Company" value={studentForm.company} onChange={(e) => setStudentForm({ ...studentForm, company: e.target.value })} />
              <input placeholder="DHBW E-Mail" value={studentForm.dhbw_email} onChange={(e) => setStudentForm({ ...studentForm, dhbw_email: e.target.value })} />
              <input placeholder="Private E-Mail" value={studentForm.private_email} onChange={(e) => setStudentForm({ ...studentForm, private_email: e.target.value })} />

              <div className="hr"></div>
              <input placeholder="Titel Projektarbeit 1" value={studentForm.project1_title} onChange={(e) => setStudentForm({ ...studentForm, project1_title: e.target.value })} />
              <input placeholder="Betreuer/in Projektarbeit 1" value={studentForm.project1_supervisor} onChange={(e) => setStudentForm({ ...studentForm, project1_supervisor: e.target.value })} />
              <input placeholder="Titel Projektarbeit 2" value={studentForm.project2_title} onChange={(e) => setStudentForm({ ...studentForm, project2_title: e.target.value })} />
              <input placeholder="Betreuer/in Projektarbeit 2" value={studentForm.project2_supervisor} onChange={(e) => setStudentForm({ ...studentForm, project2_supervisor: e.target.value })} />
              <input placeholder="Titel Bachelorarbeit" value={studentForm.bachelor_title} onChange={(e) => setStudentForm({ ...studentForm, bachelor_title: e.target.value })} />
              <input placeholder="Betreuer/in Bachelorarbeit" value={studentForm.bachelor_supervisor} onChange={(e) => setStudentForm({ ...studentForm, bachelor_supervisor: e.target.value })} />

              <div className="hr"></div>
              <select value={studentForm.status} onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}>{studentStatuses.map((s) => <option key={s}>{s}</option>)}</select>
              <label><input type="checkbox" checked={studentForm.lecturer_potential} onChange={(e) => setStudentForm({ ...studentForm, lecturer_potential: e.target.checked })} /> Lecturer potential</label>
              <label><input type="checkbox" checked={studentForm.became_lecturer} onChange={(e) => setStudentForm({ ...studentForm, became_lecturer: e.target.checked })} /> Became lecturer</label>
              <textarea placeholder="Notes" value={studentForm.notes} onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })} />
              <button type="submit">Add Student</button>
            </form>
            <Timeline title={historyTitle} items={history} />
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>Notes & Ideas</h2>
            <div className="toolbar">
              <input placeholder="Search notes" value={qNotes} onChange={(e) => setQNotes(e.target.value)} />
              <button onClick={() => downloadCsv('notes_ideas')}>Export CSV</button>
            </div>
            <table><thead><tr><th>Title</th><th>Date</th><th>Tags</th></tr></thead><tbody>
              {notes.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{new Date(item.note_date || item.created_at).toLocaleDateString()}</td>
                  <td>{item.tags || '-'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel">
            <h3>Create Note / Idea</h3>
            <form onSubmit={submitNote} className="stack">
              <input placeholder="Title" value={notesForm.title} onChange={(e) => setNotesForm({ ...notesForm, title: e.target.value })} required />
              <textarea placeholder="Content" value={notesForm.content} onChange={(e) => setNotesForm({ ...notesForm, content: e.target.value })} />
              <label>Date<input type="date" value={notesForm.note_date} onChange={(e) => setNotesForm({ ...notesForm, note_date: e.target.value })} /></label>
              <input placeholder="Tags (comma separated)" value={notesForm.tags} onChange={(e) => setNotesForm({ ...notesForm, tags: e.target.value })} />
              <button type="submit">Add Note</button>
            </form>
          </div>
        </section>
      )}

      {activeTab === 'webhooks' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>Webhook Events</h2>
            <div className="toolbar">
              <button onClick={() => downloadCsv('webhook_events')}>Export CSV</button>
              <button onClick={loadAll}>Refresh</button>
            </div>
            <table><thead><tr><th>Source</th><th>Type</th><th>Received</th></tr></thead><tbody>
              {events.map((event) => <tr key={event.id}><td>{event.source}</td><td>{event.event_type}</td><td>{new Date(event.received_at).toLocaleString()}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel">
            <h3>Send Test Webhook</h3>
            <form onSubmit={submitWebhook} className="stack">
              <input value={webhookForm.source} onChange={(e) => setWebhookForm({ ...webhookForm, source: e.target.value })} required />
              <input value={webhookForm.event_type} onChange={(e) => setWebhookForm({ ...webhookForm, event_type: e.target.value })} required />
              <textarea rows={8} value={webhookForm.payload} onChange={(e) => setWebhookForm({ ...webhookForm, payload: e.target.value })} required />
              <button type="submit">Send</button>
            </form>
          </div>
        </section>
      )}
    </main>
  )
}

function Card({ title, value, extra, onClick }) {
  return (
    <article className="panel card" onClick={onClick} style={onClick ? {cursor:'pointer'} : {}}>
      <h3>{title}</h3>
      <strong>{value}</strong>
      <p>{extra}</p>
    </article>
  )
}

function Timeline({ title, items }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="timeline">
        {items.length === 0 && <li className="timeline-item">No status history available.</li>}
        {items.map((item) => (
          <li className="timeline-item" key={item.id}>
            <div>
              <span className="badge badge-info">{item.old_status} to {item.new_status}</span>
            </div>
            <p>{item.note || 'No note'}</p>
            <small>{new Date(item.changed_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
