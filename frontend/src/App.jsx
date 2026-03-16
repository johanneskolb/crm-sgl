import { useEffect, useState } from 'react'
import { useTranslation, LanguageSwitcher } from './i18n'
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
  const { t } = useTranslation()
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
  const [historyTitle, setHistoryTitle] = useState(t('timeline.selectRecord'))
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
    is_active: true,
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
  const [notesForm, setNotesForm] = useState({ title: '', content: '', note_date: '', tags: '', source: '' })
  const [webhookForm, setWebhookForm] = useState({ source: 'frontend', event_type: 'note.created', payload: '{"message":"Hello from UI"}' })

  // Selected lecturer for detail view
  const [selectedLecturer, setSelectedLecturer] = useState(null)
  const [editLecturerForm, setEditLecturerForm] = useState(null)

  // Selected partner for detail view
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [editPartnerForm, setEditPartnerForm] = useState(null)

  // Selected student for detail view
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [editStudentForm, setEditStudentForm] = useState(null)

  // Course management for lecturers
  const [availableCohorts] = useState(['HD21A21', 'HD22A21', 'HD23A23', 'HD24B21', 'HD25A23'])
  const [availableCourseNames, setAvailableCourseNames] = useState([])
  const [newCourse, setNewCourse] = useState({ course_name: '', subject: '', semester: '' })
  const [courseAutocomplete, setCourseAutocomplete] = useState({ cohort: false, course: false })

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

  useEffect(() => {
    if (activeTab === 'lecturers' && token) {
      loadAvailableCourseNames()
    }
  }, [activeTab, token])


  async function loadAvailableCourseNames() {
    if (!token) return
    try {
      // Fetch all lecturers to get unique course names
      const allLecturers = await api('/api/lecturers')
      const courseNames = new Set()
      allLecturers.forEach(lecturer => {
        lecturer.courses?.forEach(course => {
          if (course.course_name) courseNames.add(course.course_name)
        })
      })
      setAvailableCourseNames(Array.from(courseNames).sort())
    } catch (err) {
      console.error('Failed to load course names:', err)
    }
  }

  async function addCourse(e) {
    e.preventDefault()
    if (!selectedLecturer || !newCourse.course_name || !newCourse.semester) return
    
    try {
      await api(`/api/lecturers/${selectedLecturer.id}/courses`, {
        method: 'POST',
        body: JSON.stringify(newCourse)
      })
      setNewCourse({ course_name: '', subject: '', semester: '' })
      // Reload lecturer data
      const updated = await api(`/api/lecturers?q=${encodeURIComponent(selectedLecturer.name)}`)
      const lecturer = updated.find(l => l.id === selectedLecturer.id)
      if (lecturer) {
        setSelectedLecturer(lecturer)
        setEditLecturerForm({ ...lecturer, alumni_student_id: lecturer.alumni_student_id || '' })
      }
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeCourse(courseId) {
    if (!selectedLecturer) return
    
    try {
      await api(`/api/lecturers/${selectedLecturer.id}/courses/${courseId}`, {
        method: 'DELETE'
      })
      // Reload lecturer data
      const updated = await api(`/api/lecturers?q=${encodeURIComponent(selectedLecturer.name)}`)
      const lecturer = updated.find(l => l.id === selectedLecturer.id)
      if (lecturer) {
        setSelectedLecturer(lecturer)
        setEditLecturerForm({ ...lecturer, alumni_student_id: lecturer.alumni_student_id || '' })
      }
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }


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

  async function updateStudent(e) {
    e.preventDefault()
    await api(`/api/students/${selectedStudent.id}`, { method: 'PUT', body: JSON.stringify(editStudentForm) })
    setSelectedStudent(null)
    setEditStudentForm(null)
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

  function selectStudent(student) {
    setSelectedStudent(student)
    setEditStudentForm({ ...student })
  }

  function clearSelectedStudent() {
    setSelectedStudent(null)
    setEditStudentForm(null)
  }

  async function deleteEntity(kind, id, label = '') {
    const ok = window.confirm(`${t('partners.deleteConfirm')} ${label ? `\n\n${label}` : ''}`)
    if (!ok) return
    const path = kind === 'partner' ? `/api/partners/${id}` : kind === 'lecturer' ? `/api/lecturers/${id}` : `/api/students/${id}`
    await api(path, { method: 'DELETE' })
    if (kind === 'partner') clearSelectedPartner()
    if (kind === 'lecturer') clearSelectedLecturer()
    if (kind === 'student') clearSelectedStudent()
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
    setNotesForm({ title: '', content: '', note_date: '', tags: '', source: '' })
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
    setHistoryTitle(`${t('timeline.title')}: ${label}`)
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
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
          <label>{t('login.username')}<input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required /></label>
          <label>{t('login.password')}<input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required /></label>
          <button type="submit">{t('login.button')}</button>
          {error && <p className="error">{error}</p>}
          <div style={{ marginTop: '1rem' }}>
            <LanguageSwitcher />
          </div>
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
          <h1>{t('app.title')}</h1>
          <p>{user?.username} ({user?.role})</p>
        </div>
        <div className="topbar-actions">
          {tabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{t(`tabs.${tab}`)}</button>)}
          <LanguageSwitcher />
          <button onClick={logout}>{t('app.logout')}</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {activeTab === 'dashboard' && dashboard && (
        <section className="grid cards">
          <Card title={t('dashboard.partners')} value={dashboard.partner_count} extra={t('dashboard.partnersExtra', { count: dashboard.active_partner_count })} onClick={() => setActiveTab('partners')} />
          <Card title={t('dashboard.lecturers')} value={dashboard.lecturer_count} extra={t('dashboard.lecturersExtra')} onClick={() => setActiveTab('lecturers')} />
          <Card title={t('dashboard.students')} value={dashboard.student_count} extra={t('dashboard.studentsExtra', { count: dashboard.active_student_count })} onClick={() => setActiveTab('students')} />
          <Card title={t('dashboard.csvExport')} value="7" extra={t('dashboard.csvExportExtra')} />
        </section>
      )}

      {activeTab === 'partners' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>{t('partners.title')}</h2>
            <div className="toolbar">
              <input placeholder={t('partners.searchPlaceholder')} value={qPartner} onChange={(e) => setQPartner(e.target.value)} />
              <button onClick={() => downloadCsv('partner_companies')}>{t('partners.exportCsv')}</button>
            </div>
            <table><thead><tr><th>{t('partners.name')}</th><th>{t('partners.status')}</th><th>{t('partners.reservedSeats')}</th><th>{t('partners.contact')}</th><th>{t('partners.email')}</th><th>{t('partners.actions')}</th></tr></thead><tbody>
              {partners.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><span className={statusClass(item.status)}>{t(`partners.statuses.${item.status}`)}</span></td>
                  <td>{item.reservierte_plaetze ?? 0}</td>
                  <td>{item.contact_person}</td>
                  <td>{item.contact_email || '-'}</td>
                  <td>
                    <button onClick={() => showHistory('partner', item.id, item.name)}>{t('partners.timeline')}</button>
                    <button onClick={() => selectPartner(item)}>{t('partners.viewEdit')}</button>
                    <button onClick={() => deleteEntity('partner', item.id, item.name)} className="danger">{t('partners.delete')}</button>
                    <select value={item.status} onChange={(e) => updateStatus('partner', item, e.target.value)}>
                      {partnerStatuses.map((s) => <option key={s}>{t(`partners.statuses.${s}`)}</option>)}
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
                  <h3>{t('partners.edit')}: {selectedPartner.name}</h3>
                  <button onClick={clearSelectedPartner}>{t('partners.backToCreate')}</button>
                </div>
                <form onSubmit={updatePartner} className="stack">
                  <input placeholder={t('partners.name')} value={editPartnerForm.name} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, name: e.target.value })} required />
                  <input placeholder={t('partners.industry')} value={editPartnerForm.industry} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, industry: e.target.value })} />
                  <input placeholder={t('partners.location')} value={editPartnerForm.location} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, location: e.target.value })} />
                  <input placeholder={t('partners.contactPerson')} value={editPartnerForm.contact_person} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_person: e.target.value })} />
                  <input placeholder={t('partners.contactEmail')} value={editPartnerForm.contact_email} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_email: e.target.value })} />
                  <input placeholder={t('partners.contactPhone')} value={editPartnerForm.contact_phone} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, contact_phone: e.target.value })} />
                  <input placeholder={t('partners.website')} value={editPartnerForm.website} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, website: e.target.value })} />
                  <textarea placeholder={t('partners.notes')} value={editPartnerForm.notes} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, notes: e.target.value })} />
                  <input type="number" min="0" placeholder={t('partners.reservedSeats')} value={editPartnerForm.reservierte_plaetze ?? 0} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, reservierte_plaetze: Number(e.target.value || 0) })} />
                  <select value={editPartnerForm.status} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, status: e.target.value })}>{partnerStatuses.map((s) => <option key={s} value={s}>{t(`partners.statuses.${s}`)}</option>)}</select>
                  <textarea placeholder={t('partners.topics')} value={editPartnerForm.topics} onChange={(e) => setEditPartnerForm({ ...editPartnerForm, topics: e.target.value })} />
                  <button type="submit">{t('partners.saveChanges')}</button>
                  <button type="button" className="danger" onClick={() => deleteEntity('partner', selectedPartner.id, selectedPartner.name)}>{t('partners.deletePartner')}</button>
                </form>
              </>
            ) : (
              <>
                <h3>{t('partners.create')}</h3>
                <form onSubmit={submitPartner} className="stack">
                  <input placeholder={t('partners.name')} value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
                  <input placeholder={t('partners.industry')} value={partnerForm.industry} onChange={(e) => setPartnerForm({ ...partnerForm, industry: e.target.value })} />
                  <input placeholder={t('partners.location')} value={partnerForm.location} onChange={(e) => setPartnerForm({ ...partnerForm, location: e.target.value })} />
                  <input placeholder={t('partners.contactPerson')} value={partnerForm.contact_person} onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })} />
                  <input placeholder={t('partners.contactEmail')} value={partnerForm.contact_email} onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })} />
                  <input placeholder={t('partners.contactPhone')} value={partnerForm.contact_phone} onChange={(e) => setPartnerForm({ ...partnerForm, contact_phone: e.target.value })} />
                  <input placeholder={t('partners.website')} value={partnerForm.website} onChange={(e) => setPartnerForm({ ...partnerForm, website: e.target.value })} />
                  <textarea placeholder={t('partners.notes')} value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} />
                  <input type="number" min="0" placeholder={t('partners.reservedSeats')} value={partnerForm.reservierte_plaetze ?? 0} onChange={(e) => setPartnerForm({ ...partnerForm, reservierte_plaetze: Number(e.target.value || 0) })} />
                  <select value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}>{partnerStatuses.map((s) => <option key={s} value={s}>{t(`partners.statuses.${s}`)}</option>)}</select>
                  <textarea placeholder={t('partners.topics')} value={partnerForm.topics} onChange={(e) => setPartnerForm({ ...partnerForm, topics: e.target.value })} />
                  <button type="submit">{t('partners.addPartner')}</button>
                </form>
              </>
            )}

            <h3>{t('partners.logContact')}</h3>
            <form onSubmit={submitContact} className="stack">
              <input placeholder={t('partners.partnerId')} value={contactForm.partner_id} onChange={(e) => setContactForm({ ...contactForm, partner_id: e.target.value })} required />
              <input placeholder={t('partners.channel')} value={contactForm.channel} onChange={(e) => setContactForm({ ...contactForm, channel: e.target.value })} required />
              <textarea placeholder={t('partners.summary')} value={contactForm.summary} onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })} required />
              <button type="submit">{t('partners.saveContact')}</button>
            </form>

            <Timeline title={historyTitle} items={history} t={t} />
          </div>
        </section>
      )}

      {activeTab === 'lecturers' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>{t('lecturers.title')}</h2>
            <div className="toolbar">
              <input placeholder={t('lecturers.searchPlaceholder')} value={qLecturer} onChange={(e) => setQLecturer(e.target.value)} style={{width:'100%'}} />
              <button onClick={() => downloadCsv('lecturers')}>{t('lecturers.exportCsv')}</button>
            </div>
            <table><thead><tr><th>{t('lecturers.name')}</th><th>{t('lecturers.organization')}</th><th>{t('lecturers.courses')}</th><th>{t('lecturers.focusTopics')}</th><th>{t('lecturers.languages')}</th><th>{t('lecturers.actions')}</th></tr></thead><tbody>
              {lecturers.map((item) => (
                <tr key={item.id} style={{
                  borderLeft: `6px solid ${item.is_active ? '#10b981' : '#d1d5db'}`,
                  background: item.is_active ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                }}>
                  <td>{item.name}</td>
                  <td>{item.organization || '-'}</td>
                  <td>{item.courses?.map(c => c.course_name).join(', ') || '-'}</td>
                  <td>{item.focus_topics || '-'}</td>
                  <td>{[item.teaches_german && '🇩🇪', item.teaches_english && '🇬🇧'].filter(Boolean).join(' ') || '-'}</td>
                  <td>
                    <button onClick={() => selectLecturer(item)}>{t('lecturers.viewEdit')}</button>
                    <button onClick={() => deleteEntity('lecturer', item.id, item.name)} className="danger">{t('lecturers.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel" style={{position:'sticky', top:'1rem', alignSelf:'flex-start', maxHeight:'90vh', overflowY:'auto'}}>
            {selectedLecturer && editLecturerForm ? (
              <>
                <div className="toolbar">
                  <h3>{t('lecturers.edit')}: {selectedLecturer.name}</h3>
                  <button onClick={clearSelectedLecturer}>{t('lecturers.backToCreate')}</button>
                </div>
                <form onSubmit={updateLecturer} className="stack">
                  <input placeholder={t('lecturers.name')} value={editLecturerForm.name} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, name: e.target.value })} required />
                  <input placeholder={t('lecturers.contact')} value={editLecturerForm.contact} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, contact: e.target.value })} />
                  <input placeholder={t('lecturers.nationality')} value={editLecturerForm.nationality} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, nationality: e.target.value })} />
                  <select value={editLecturerForm.affiliation} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, affiliation: e.target.value })}>
                    <option value="">{t('lecturers.affiliationLabel')}</option>
                    {lecturerAffiliations.map((s) => <option key={s} value={s}>{t(`lecturers.affiliations.${s}`)}</option>)}
                  </select>
                  <input placeholder={t('lecturers.organizationPlaceholder')} value={editLecturerForm.organization} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, organization: e.target.value })} />
                  <textarea placeholder={t('lecturers.professionalExperience')} value={editLecturerForm.professional_experience} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, professional_experience: e.target.value })} />
                  <textarea placeholder={t('lecturers.remarks')} value={editLecturerForm.remarks} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, remarks: e.target.value })} />
                  <select value={editLecturerForm.quality_evaluation} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, quality_evaluation: e.target.value })}>
                    {qualityEvaluations.map((s) => <option key={s} value={s}>{t(`lecturers.quality.${s}`)}</option>)}
                  </select>
                  <input placeholder={t('lecturers.contactFrom')} value={editLecturerForm.contact_from} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, contact_from: e.target.value })} />
                  <label><input type="checkbox" checked={editLecturerForm.is_active} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, is_active: e.target.checked })} /> <strong>{t('lecturers.isActive')}</strong></label>
                  <label><input type="checkbox" checked={editLecturerForm.can_lecture} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_lecture: e.target.checked })} /> {t('lecturers.canLecture')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.can_guest_lecture_only} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_guest_lecture_only: e.target.checked })} /> {t('lecturers.canGuestLectureOnly')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.can_supervise} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, can_supervise: e.target.checked })} /> {t('lecturers.canSupervise')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.did_not_lecture_yet_but_interested} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, did_not_lecture_yet_but_interested: e.target.checked })} /> {t('lecturers.interestedInLecturing')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.did_not_supervise_yet_but_interested} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, did_not_supervise_yet_but_interested: e.target.checked })} /> {t('lecturers.interestedInSupervising')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.teaches_german} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, teaches_german: e.target.checked })} /> {t('lecturers.teachesGerman')}</label>
                  <label><input type="checkbox" checked={editLecturerForm.teaches_english} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, teaches_english: e.target.checked })} /> {t('lecturers.teachesEnglish')}</label>
                  <input placeholder={t('lecturers.lecturesHeld')} value={editLecturerForm.lectures_held} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, lectures_held: e.target.value })} />
                  <textarea placeholder={t('lecturers.focusTopics')} value={editLecturerForm.focus_topics} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, focus_topics: e.target.value })} />
                  <label><input type="checkbox" checked={editLecturerForm.is_alumni_student} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, is_alumni_student: e.target.checked })} /> {t('lecturers.alumniStudent')}</label>
                  <input placeholder={t('lecturers.alumniStudentId')} value={editLecturerForm.alumni_student_id} onChange={(e) => setEditLecturerForm({ ...editLecturerForm, alumni_student_id: e.target.value })} />
                  {/* Course Management Section - UI Variant B */}
                  <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #eee'}}>
                    <h4 style={{marginBottom: '1rem'}}>Kurszuordnungen verwalten</h4>
                    
                    {/* Display existing courses */}
                    {selectedLecturer.courses && selectedLecturer.courses.length > 0 ? (
                      <div style={{marginBottom: '1rem'}}>
                        <strong>Zugeordnete Kurse:</strong>
                        <ul style={{listStyle: 'none', padding: 0, marginTop: '0.5rem'}}>
                          {selectedLecturer.courses.map(course => (
                            <li key={course.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem',
                              marginBottom: '0.25rem',
                              backgroundColor: '#f5f5f5',
                              borderRadius: '4px'
                            }}>
                              <span>
                                <strong>{course.course_name}</strong>
                                {course.subject && ` (${course.subject})`}
                                {course.semester && ` - ${course.semester}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeCourse(course.id)}
                                className="danger"
                                style={{padding: '0.25rem 0.5rem', fontSize: '0.85rem'}}
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '1rem'}}>
                        Keine Kurse zugeordnet
                      </p>
                    )}

                    {/* Add new course form */}
                    <div style={{border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', backgroundColor: '#fafafa'}}>
                      <strong style={{display: 'block', marginBottom: '0.5rem'}}>
                        Kurs hinzufügen:
                      </strong>
                      <form onSubmit={addCourse} style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {/* Cohort autocomplete */}
                        <div style={{position: 'relative'}}>
                          <input
                            type="text"
                            placeholder="Kohorte (z.B. HD25A23)"
                            value={newCourse.semester}
                            onChange={(e) => {
                              setNewCourse({ ...newCourse, semester: e.target.value })
                              setCourseAutocomplete({ ...courseAutocomplete, cohort: e.target.value.length > 0 })
                            }}
                            onBlur={() => setTimeout(() => setCourseAutocomplete({ ...courseAutocomplete, cohort: false }), 200)}
                            required
                          />
                          {courseAutocomplete.cohort && newCourse.semester && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              zIndex: 1000,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              {availableCohorts
                                .filter(c => c.toLowerCase().includes(newCourse.semester.toLowerCase()))
                                .map(cohort => (
                                  <div
                                    key={cohort}
                                    onMouseDown={() => {
                                      setNewCourse({ ...newCourse, semester: cohort })
                                      setCourseAutocomplete({ ...courseAutocomplete, cohort: false })
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #eee'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                  >
                                    {cohort}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>

                        {/* Course name autocomplete */}
                        <div style={{position: 'relative'}}>
                          <input
                            type="text"
                            placeholder="Vorlesungsname"
                            value={newCourse.course_name}
                            onChange={(e) => {
                              setNewCourse({ ...newCourse, course_name: e.target.value })
                              setCourseAutocomplete({ ...courseAutocomplete, course: e.target.value.length > 0 })
                            }}
                            onBlur={() => setTimeout(() => setCourseAutocomplete({ ...courseAutocomplete, course: false }), 200)}
                            required
                          />
                          {courseAutocomplete.course && newCourse.course_name && availableCourseNames.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: 'white',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              zIndex: 1000,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              {availableCourseNames
                                .filter(c => c.toLowerCase().includes(newCourse.course_name.toLowerCase()))
                                .slice(0, 10)
                                .map(courseName => (
                                  <div
                                    key={courseName}
                                    onMouseDown={() => {
                                      setNewCourse({ ...newCourse, course_name: courseName })
                                      setCourseAutocomplete({ ...courseAutocomplete, course: false })
                                    }}
                                    style={{
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #eee',
                                      fontSize: '0.9rem'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                  >
                                    {courseName}
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>

                        {/* Subject/short name (optional) */}
                        <input
                          type="text"
                          placeholder="Kurzbezeichnung (optional)"
                          value={newCourse.subject}
                          onChange={(e) => setNewCourse({ ...newCourse, subject: e.target.value })}
                        />

                        <button type="submit" style={{marginTop: '0.5rem'}}>
                          ➕ Kurs hinzufügen
                        </button>
                      </form>
                    </div>
                  </div>
                  <button type="submit">{t('lecturers.saveChanges')}</button>
                  <button type="button" className="danger" onClick={() => deleteEntity('lecturer', selectedLecturer.id, selectedLecturer.name)}>{t('lecturers.deleteLecturer')}</button>
                </form>
              </>
            ) : (
              <>
                <h3>{t('lecturers.create')}</h3>
                <form onSubmit={submitLecturer} className="stack">
                  <input placeholder={t('lecturers.name')} value={lecturerForm.name} onChange={(e) => setLecturerForm({ ...lecturerForm, name: e.target.value })} required />
                  <input placeholder={t('lecturers.contact')} value={lecturerForm.contact} onChange={(e) => setLecturerForm({ ...lecturerForm, contact: e.target.value })} />
                  <input placeholder={t('lecturers.nationality')} value={lecturerForm.nationality} onChange={(e) => setLecturerForm({ ...lecturerForm, nationality: e.target.value })} />
                  <select value={lecturerForm.affiliation} onChange={(e) => setLecturerForm({ ...lecturerForm, affiliation: e.target.value })}>
                    <option value="">{t('lecturers.affiliationLabel')}</option>
                    {lecturerAffiliations.map((s) => <option key={s} value={s}>{t(`lecturers.affiliations.${s}`)}</option>)}
                  </select>
                  <input placeholder={t('lecturers.organizationPlaceholder')} value={lecturerForm.organization} onChange={(e) => setLecturerForm({ ...lecturerForm, organization: e.target.value })} />
                  <textarea placeholder={t('lecturers.professionalExperience')} value={lecturerForm.professional_experience} onChange={(e) => setLecturerForm({ ...lecturerForm, professional_experience: e.target.value })} />
                  <textarea placeholder={t('lecturers.remarks')} value={lecturerForm.remarks} onChange={(e) => setLecturerForm({ ...lecturerForm, remarks: e.target.value })} />
                  <select value={lecturerForm.quality_evaluation} onChange={(e) => setLecturerForm({ ...lecturerForm, quality_evaluation: e.target.value })}>
                    {qualityEvaluations.map((s) => <option key={s} value={s}>{t(`lecturers.quality.${s}`)}</option>)}
                  </select>
                  <input placeholder={t('lecturers.contactFrom')} value={lecturerForm.contact_from} onChange={(e) => setLecturerForm({ ...lecturerForm, contact_from: e.target.value })} />
                  <label><input type="checkbox" checked={lecturerForm.can_lecture} onChange={(e) => setLecturerForm({ ...lecturerForm, can_lecture: e.target.checked })} /> {t('lecturers.canLecture')}</label>
                  <label><input type="checkbox" checked={lecturerForm.can_guest_lecture_only} onChange={(e) => setLecturerForm({ ...lecturerForm, can_guest_lecture_only: e.target.checked })} /> {t('lecturers.canGuestLectureOnly')}</label>
                  <label><input type="checkbox" checked={lecturerForm.can_supervise} onChange={(e) => setLecturerForm({ ...lecturerForm, can_supervise: e.target.checked })} /> {t('lecturers.canSupervise')}</label>
                  <label><input type="checkbox" checked={lecturerForm.did_not_lecture_yet_but_interested} onChange={(e) => setLecturerForm({ ...lecturerForm, did_not_lecture_yet_but_interested: e.target.checked })} /> {t('lecturers.interestedInLecturing')}</label>
                  <label><input type="checkbox" checked={lecturerForm.did_not_supervise_yet_but_interested} onChange={(e) => setLecturerForm({ ...lecturerForm, did_not_supervise_yet_but_interested: e.target.checked })} /> {t('lecturers.interestedInSupervising')}</label>
                  <label><input type="checkbox" checked={lecturerForm.teaches_german} onChange={(e) => setLecturerForm({ ...lecturerForm, teaches_german: e.target.checked })} /> {t('lecturers.teachesGerman')}</label>
                  <label><input type="checkbox" checked={lecturerForm.teaches_english} onChange={(e) => setLecturerForm({ ...lecturerForm, teaches_english: e.target.checked })} /> {t('lecturers.teachesEnglish')}</label>
                  <input placeholder={t('lecturers.lecturesHeld')} value={lecturerForm.lectures_held} onChange={(e) => setLecturerForm({ ...lecturerForm, lectures_held: e.target.value })} />
                  <textarea placeholder={t('lecturers.focusTopics')} value={lecturerForm.focus_topics} onChange={(e) => setLecturerForm({ ...lecturerForm, focus_topics: e.target.value })} />
                  <label><input type="checkbox" checked={lecturerForm.is_active} onChange={(e) => setLecturerForm({ ...lecturerForm, is_active: e.target.checked })} /> <strong>{t('lecturers.isActive')}</strong></label>
                  <label><input type="checkbox" checked={lecturerForm.is_alumni_student} onChange={(e) => setLecturerForm({ ...lecturerForm, is_alumni_student: e.target.checked })} /> {t('lecturers.alumniStudent')}</label>
                  <input placeholder={t('lecturers.alumniStudentId')} value={lecturerForm.alumni_student_id} onChange={(e) => setLecturerForm({ ...lecturerForm, alumni_student_id: e.target.value })} />
                  <button type="submit">{t('lecturers.addLecturer')}</button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {activeTab === 'students' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>{t('students.title')}</h2>
            <div className="toolbar">
              <input placeholder={t('students.searchPlaceholder')} value={qStudent} onChange={(e) => setQStudent(e.target.value)} />
              <button onClick={() => downloadCsv('students_alumni')}>{t('students.exportCsv')}</button>
            </div>
            <table><thead><tr><th>{t('students.name')}</th><th>{t('students.company')}</th><th>{t('students.status')}</th><th>{t('students.becameLecturer')}</th><th>{t('students.actions')}</th></tr></thead><tbody>
              {students.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{item.company}</td>
                  <td><span className={statusClass(item.status)}>{t(`students.statuses.${item.status}`)}</span></td>
                  <td>
                    <label>
                      <input type="checkbox" checked={item.became_lecturer} onChange={() => toggleStudentLecturer(item)} />
                    </label>
                  </td>
                  <td>
                    <button onClick={() => selectStudent(item)}>{t('students.viewEdit')}</button>
                    <button onClick={() => showHistory('student', item.id, item.name)}>{t('students.timeline')}</button>
                    <button onClick={() => deleteEntity('student', item.id, item.name)} className="danger">{t('students.delete')}</button>
                    <select value={item.status} onChange={(e) => updateStatus('student', item, e.target.value)}>
                      {studentStatuses.map((s) => <option key={s} value={s}>{t(`students.statuses.${s}`)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel stack" style={{position:'sticky', top:'1rem', alignSelf:'flex-start', maxHeight:'90vh', overflowY:'auto'}}>
            {selectedStudent && editStudentForm ? (
              <>
                <div className="toolbar">
                  <h3>{t('students.edit')}: {selectedStudent.name}</h3>
                  <button onClick={clearSelectedStudent}>{t('students.backToCreate')}</button>
                </div>
                <form onSubmit={updateStudent} className="stack">
                  <input placeholder={t('students.name')} value={editStudentForm.name} onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })} required />
                  <input placeholder={t('students.cohort')} value={editStudentForm.cohort || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, cohort: e.target.value })} />
                  <input placeholder={t('students.company')} value={editStudentForm.company || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, company: e.target.value })} />
                  
                  <div className="hr"></div>
                  <h4>{t('students.emails')}</h4>
                  <input placeholder={t('students.dhbwEmail')} value={editStudentForm.dhbw_email || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, dhbw_email: e.target.value })} />
                  <input placeholder={t('students.privateEmail')} value={editStudentForm.private_email || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, private_email: e.target.value })} />

                  <div className="hr"></div>
                  <h4>{t('students.pa1')}</h4>
                  <input placeholder={t('students.project1Title')} value={editStudentForm.project1_title || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, project1_title: e.target.value })} />
                  <input placeholder={t('students.project1Supervisor')} value={editStudentForm.project1_supervisor || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, project1_supervisor: e.target.value })} />

                  <div className="hr"></div>
                  <h4>{t('students.pa2')}</h4>
                  <input placeholder={t('students.project2Title')} value={editStudentForm.project2_title || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, project2_title: e.target.value })} />
                  <input placeholder={t('students.project2Supervisor')} value={editStudentForm.project2_supervisor || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, project2_supervisor: e.target.value })} />

                  <div className="hr"></div>
                  <h4>{t('students.ba')}</h4>
                  <input placeholder={t('students.bachelorTitle')} value={editStudentForm.bachelor_title || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, bachelor_title: e.target.value })} />
                  <input placeholder={t('students.bachelorSupervisor')} value={editStudentForm.bachelor_supervisor || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, bachelor_supervisor: e.target.value })} />

                  <div className="hr"></div>
                  <select value={editStudentForm.status} onChange={(e) => setEditStudentForm({ ...editStudentForm, status: e.target.value })}>{studentStatuses.map((s) => <option key={s} value={s}>{t(`students.statuses.${s}`)}</option>)}</select>
                  <label><input type="checkbox" checked={editStudentForm.lecturer_potential || false} onChange={(e) => setEditStudentForm({ ...editStudentForm, lecturer_potential: e.target.checked })} /> {t('students.lecturerPotential')}</label>
                  <label><input type="checkbox" checked={editStudentForm.became_lecturer || false} onChange={(e) => setEditStudentForm({ ...editStudentForm, became_lecturer: e.target.checked })} /> {t('students.becameLecturer')}</label>
                  <textarea placeholder={t('students.notes')} value={editStudentForm.notes || ''} onChange={(e) => setEditStudentForm({ ...editStudentForm, notes: e.target.value })} />
                  <button type="submit">{t('students.update')}</button>
                  <button type="button" className="danger" onClick={() => deleteEntity('student', selectedStudent.id, selectedStudent.name)}>{t('students.deleteStudent')}</button>
                </form>
              </>
            ) : (
              <>
                <h3>{t('students.create')}</h3>
                <form onSubmit={submitStudent} className="stack">
                  <input placeholder={t('students.name')} value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
                  <input placeholder={t('students.cohort')} value={studentForm.cohort} onChange={(e) => setStudentForm({ ...studentForm, cohort: e.target.value })} />
                  <input placeholder={t('students.company')} value={studentForm.company} onChange={(e) => setStudentForm({ ...studentForm, company: e.target.value })} />
                  <input placeholder={t('students.dhbwEmail')} value={studentForm.dhbw_email} onChange={(e) => setStudentForm({ ...studentForm, dhbw_email: e.target.value })} />
                  <input placeholder={t('students.privateEmail')} value={studentForm.private_email} onChange={(e) => setStudentForm({ ...studentForm, private_email: e.target.value })} />

                  <div className="hr"></div>
                  <input placeholder={t('students.project1Title')} value={studentForm.project1_title} onChange={(e) => setStudentForm({ ...studentForm, project1_title: e.target.value })} />
                  <input placeholder={t('students.project1Supervisor')} value={studentForm.project1_supervisor} onChange={(e) => setStudentForm({ ...studentForm, project1_supervisor: e.target.value })} />
                  <input placeholder={t('students.project2Title')} value={studentForm.project2_title} onChange={(e) => setStudentForm({ ...studentForm, project2_title: e.target.value })} />
                  <input placeholder={t('students.project2Supervisor')} value={studentForm.project2_supervisor} onChange={(e) => setStudentForm({ ...studentForm, project2_supervisor: e.target.value })} />
                  <input placeholder={t('students.bachelorTitle')} value={studentForm.bachelor_title} onChange={(e) => setStudentForm({ ...studentForm, bachelor_title: e.target.value })} />
                  <input placeholder={t('students.bachelorSupervisor')} value={studentForm.bachelor_supervisor} onChange={(e) => setStudentForm({ ...studentForm, bachelor_supervisor: e.target.value })} />

                  <div className="hr"></div>
                  <select value={studentForm.status} onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}>{studentStatuses.map((s) => <option key={s} value={s}>{t(`students.statuses.${s}`)}</option>)}</select>
                  <label><input type="checkbox" checked={studentForm.lecturer_potential} onChange={(e) => setStudentForm({ ...studentForm, lecturer_potential: e.target.checked })} /> {t('students.lecturerPotential')}</label>
                  <label><input type="checkbox" checked={studentForm.became_lecturer} onChange={(e) => setStudentForm({ ...studentForm, became_lecturer: e.target.checked })} /> {t('students.becameLecturer')}</label>
                  <textarea placeholder={t('students.notes')} value={studentForm.notes} onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })} />
                  <button type="submit">{t('students.addStudent')}</button>
                </form>
                <Timeline title={historyTitle} items={history} t={t} />
              </>
            )}
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>{t('notes.title')}</h2>
            <div className="toolbar">
              <input placeholder={t('notes.searchPlaceholder')} value={qNotes} onChange={(e) => setQNotes(e.target.value)} />
              <button onClick={() => downloadCsv('notes_ideas')}>{t('notes.exportCsv')}</button>
            </div>
            <table><thead><tr><th>{t('notes.titleColumn')}</th><th>{t('notes.date')}</th><th>{t('notes.source')}</th><th>{t('notes.tags')}</th></tr></thead><tbody>
              {notes.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{new Date(item.note_date || item.created_at).toLocaleDateString()}</td>
                  <td>{item.source || '-'}</td>
                  <td>{item.tags || '-'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel">
            <h3>{t('notes.create')}</h3>
            <form onSubmit={submitNote} className="stack">
              <input placeholder={t('notes.titlePlaceholder')} value={notesForm.title} onChange={(e) => setNotesForm({ ...notesForm, title: e.target.value })} required />
              <textarea placeholder={t('notes.content')} value={notesForm.content} onChange={(e) => setNotesForm({ ...notesForm, content: e.target.value })} />
              <label>{t('notes.dateLabel')}<input type="date" value={notesForm.note_date} onChange={(e) => setNotesForm({ ...notesForm, note_date: e.target.value })} /></label>
              <input placeholder={t('notes.sourcePlaceholder')} value={notesForm.source} onChange={(e) => setNotesForm({ ...notesForm, source: e.target.value })} />
              <input placeholder={t('notes.tagsPlaceholder')} value={notesForm.tags} onChange={(e) => setNotesForm({ ...notesForm, tags: e.target.value })} />
              <button type="submit">{t('notes.addNote')}</button>
            </form>
          </div>
        </section>
      )}

      {activeTab === 'webhooks' && (
        <section className="grid two-col">
          <div className="panel">
            <h2>{t('webhooks.title')}</h2>
            <div className="toolbar">
              <button onClick={() => downloadCsv('webhook_events')}>{t('webhooks.exportCsv')}</button>
              <button onClick={loadAll}>{t('webhooks.refresh')}</button>
            </div>
            <table><thead><tr><th>{t('webhooks.source')}</th><th>{t('webhooks.type')}</th><th>{t('webhooks.received')}</th></tr></thead><tbody>
              {events.map((event) => <tr key={event.id}><td>{event.source}</td><td>{event.event_type}</td><td>{new Date(event.received_at).toLocaleString()}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel">
            <h3>{t('webhooks.sendTest')}</h3>
            <form onSubmit={submitWebhook} className="stack">
              <input value={webhookForm.source} onChange={(e) => setWebhookForm({ ...webhookForm, source: e.target.value })} required />
              <input value={webhookForm.event_type} onChange={(e) => setWebhookForm({ ...webhookForm, event_type: e.target.value })} required />
              <textarea rows={8} value={webhookForm.payload} onChange={(e) => setWebhookForm({ ...webhookForm, payload: e.target.value })} required />
              <button type="submit">{t('webhooks.send')}</button>
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

function Timeline({ title, items, t }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="timeline">
        {items.length === 0 && <li className="timeline-item">{t('timeline.noHistory')}</li>}
        {items.map((item) => (
          <li className="timeline-item" key={item.id}>
            <div>
              <span className="badge badge-info">{item.old_status} {t('timeline.to')} {item.new_status}</span>
            </div>
            <p>{item.note || t('timeline.noNote')}</p>
            <small>{new Date(item.changed_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
