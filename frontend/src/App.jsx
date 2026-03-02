import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const partnerStatuses = ['Interessent', 'In Gespraechen', 'Verhandlung', 'Aktiver Partner', 'Alumni']
const studentStatuses = ['Aktiv', 'Alumni']
const tabs = ['dashboard', 'partners', 'lecturers', 'students', 'webhooks']

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
  const [events, setEvents] = useState([])

  const [qPartner, setQPartner] = useState('')
  const [qLecturer, setQLecturer] = useState('')
  const [qStudent, setQStudent] = useState('')

  const [history, setHistory] = useState([])
  const [historyTitle, setHistoryTitle] = useState('Select a record for timeline')
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ username: 'Hannes', password: 'hannes123' })
  const [partnerForm, setPartnerForm] = useState({ name: '', industry: '', location: '', contact_person: '', status: 'Interessent', topics: '' })
  const [lecturerForm, setLecturerForm] = useState({ name: '', contact: '', expertise: '', can_lecture: true, can_supervise: false, lectures_held: '', focus_topics: '' })
  const [studentForm, setStudentForm] = useState({ name: '', cohort: '', company: '', status: 'Aktiv', lecturer_potential: false, notes: '' })
  const [contactForm, setContactForm] = useState({ partner_id: '', channel: 'E-Mail', summary: '' })
  const [webhookForm, setWebhookForm] = useState({ source: 'frontend', event_type: 'note.created', payload: '{"message":"Hello from UI"}' })

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
      const [me, dash, p, l, s, e] = await Promise.all([
        api('/api/auth/me'),
        api('/api/dashboard'),
        api(`/api/partners${qPartner ? `?q=${encodeURIComponent(qPartner)}` : ''}`),
        api(`/api/lecturers${qLecturer ? `?q=${encodeURIComponent(qLecturer)}` : ''}`),
        api(`/api/students${qStudent ? `?q=${encodeURIComponent(qStudent)}` : ''}`),
        api('/api/webhooks')
      ])
      setUser(me)
      setDashboard(dash)
      setPartners(p)
      setLecturers(l)
      setStudents(s)
      setEvents(e)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadAll()
  }, [token, qPartner, qLecturer, qStudent])

  async function submitPartner(e) {
    e.preventDefault()
    await api('/api/partners', { method: 'POST', body: JSON.stringify(partnerForm) })
    setPartnerForm({ name: '', industry: '', location: '', contact_person: '', status: 'Interessent', topics: '' })
    loadAll()
  }

  async function submitLecturer(e) {
    e.preventDefault()
    await api('/api/lecturers', { method: 'POST', body: JSON.stringify(lecturerForm) })
    setLecturerForm({ name: '', contact: '', expertise: '', can_lecture: true, can_supervise: false, lectures_held: '', focus_topics: '' })
    loadAll()
  }

  async function submitStudent(e) {
    e.preventDefault()
    await api('/api/students', { method: 'POST', body: JSON.stringify(studentForm) })
    setStudentForm({ name: '', cohort: '', company: '', status: 'Aktiv', lecturer_potential: false, notes: '' })
    loadAll()
  }

  async function submitContact(e) {
    e.preventDefault()
    await api(`/api/partners/${contactForm.partner_id}/contacts`, { method: 'POST', body: JSON.stringify({ channel: contactForm.channel, summary: contactForm.summary }) })
    setContactForm({ partner_id: '', channel: 'E-Mail', summary: '' })
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
    <main className="app-shell">
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
          <Card title="Partners" value={dashboard.partner_count} extra={`${dashboard.active_partner_count} active`} />
          <Card title="Lecturers" value={dashboard.lecturer_count} extra="Total available" />
          <Card title="Students/Alumni" value={dashboard.student_count} extra={`${dashboard.active_student_count} active`} />
          <Card title="CSV Export" value="6" extra="One-click table exports" />
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
            <table><thead><tr><th>Name</th><th>Status</th><th>Contact</th><th>Actions</th></tr></thead><tbody>
              {partners.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>{item.contact_person}</td>
                  <td>
                    <button onClick={() => showHistory('partner', item.id, item.name)}>Timeline</button>
                    <select value={item.status} onChange={(e) => updateStatus('partner', item, e.target.value)}>
                      {partnerStatuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <div className="panel stack">
            <h3>Create Partner</h3>
            <form onSubmit={submitPartner} className="stack">
              <input placeholder="Name" value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} required />
              <input placeholder="Industry" value={partnerForm.industry} onChange={(e) => setPartnerForm({ ...partnerForm, industry: e.target.value })} />
              <input placeholder="Location" value={partnerForm.location} onChange={(e) => setPartnerForm({ ...partnerForm, location: e.target.value })} />
              <input placeholder="Contact Person" value={partnerForm.contact_person} onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })} />
              <select value={partnerForm.status} onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}>{partnerStatuses.map((s) => <option key={s}>{s}</option>)}</select>
              <textarea placeholder="Topics" value={partnerForm.topics} onChange={(e) => setPartnerForm({ ...partnerForm, topics: e.target.value })} />
              <button type="submit">Add Partner</button>
            </form>

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
              <input placeholder="Search lecturers" value={qLecturer} onChange={(e) => setQLecturer(e.target.value)} />
              <button onClick={() => downloadCsv('lecturers')}>Export CSV</button>
            </div>
            <table><thead><tr><th>Name</th><th>Expertise</th><th>Lecture</th><th>Supervise</th></tr></thead><tbody>
              {lecturers.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.expertise}</td><td>{item.can_lecture ? 'Yes' : 'No'}</td><td>{item.can_supervise ? 'Yes' : 'No'}</td></tr>)}
            </tbody></table>
          </div>
          <div className="panel">
            <h3>Create Lecturer</h3>
            <form onSubmit={submitLecturer} className="stack">
              <input placeholder="Name" value={lecturerForm.name} onChange={(e) => setLecturerForm({ ...lecturerForm, name: e.target.value })} required />
              <input placeholder="Contact" value={lecturerForm.contact} onChange={(e) => setLecturerForm({ ...lecturerForm, contact: e.target.value })} />
              <textarea placeholder="Expertise" value={lecturerForm.expertise} onChange={(e) => setLecturerForm({ ...lecturerForm, expertise: e.target.value })} />
              <label><input type="checkbox" checked={lecturerForm.can_lecture} onChange={(e) => setLecturerForm({ ...lecturerForm, can_lecture: e.target.checked })} /> Can lecture</label>
              <label><input type="checkbox" checked={lecturerForm.can_supervise} onChange={(e) => setLecturerForm({ ...lecturerForm, can_supervise: e.target.checked })} /> Can supervise</label>
              <input placeholder="Lectures held" value={lecturerForm.lectures_held} onChange={(e) => setLecturerForm({ ...lecturerForm, lectures_held: e.target.value })} />
              <textarea placeholder="Focus topics" value={lecturerForm.focus_topics} onChange={(e) => setLecturerForm({ ...lecturerForm, focus_topics: e.target.value })} />
              <button type="submit">Add Lecturer</button>
            </form>
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
            <table><thead><tr><th>Name</th><th>Company</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {students.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{item.company}</td>
                  <td><span className={statusClass(item.status)}>{item.status}</span></td>
                  <td>
                    <button onClick={() => showHistory('student', item.id, item.name)}>Timeline</button>
                    <select value={item.status} onChange={(e) => updateStatus('student', item, e.target.value)}>
                      {studentStatuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="panel stack">
            <h3>Create Student/Alumni</h3>
            <form onSubmit={submitStudent} className="stack">
              <input placeholder="Name" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
              <input placeholder="Cohort" value={studentForm.cohort} onChange={(e) => setStudentForm({ ...studentForm, cohort: e.target.value })} />
              <input placeholder="Company" value={studentForm.company} onChange={(e) => setStudentForm({ ...studentForm, company: e.target.value })} />
              <select value={studentForm.status} onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}>{studentStatuses.map((s) => <option key={s}>{s}</option>)}</select>
              <label><input type="checkbox" checked={studentForm.lecturer_potential} onChange={(e) => setStudentForm({ ...studentForm, lecturer_potential: e.target.checked })} /> Lecturer potential</label>
              <textarea placeholder="Notes" value={studentForm.notes} onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })} />
              <button type="submit">Add Student</button>
            </form>
            <Timeline title={historyTitle} items={history} />
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

function Card({ title, value, extra }) {
  return (
    <article className="panel card">
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
