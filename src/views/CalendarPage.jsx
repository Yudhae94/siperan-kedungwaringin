import { useState, useEffect } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'

function CalendarPage({ events, canWrite, isSuperAdmin, onAdd, onEdit, onDelete }) {
  const [lastSync, setLastSync] = useState(() => new Date())
  useEffect(() => {
    setLastSync(new Date())
  }, [events])
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date))
  return <><PageTitle eyebrow="Layanan kegiatan" title="Kalender Kegiatan"><div className="title-actions-inline"><span className="subtitle">Diperbarui realtime setiap 5 detik · Sinkron terakhir {lastSync.toLocaleTimeString('id-ID')}</span>{canWrite && <Button onClick={onAdd}><Plus size={17}/> Tambah kegiatan</Button>}</div></PageTitle><section className="card table-card"><div className="table-toolbar"><div><h2>Agenda Kecamatan Kedungwaringin</h2><p>{events.length} kegiatan terjadwal</p></div><CalendarDays className="muted-icon"/></div><div className="download-list">{sortedEvents.length ? sortedEvents.map(event => { const eventDate = new Date(`${event.date}T00:00:00`); return <div className="download-row" key={event.id}><div className="date-box"><b>{eventDate.getDate()}</b><small>{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(eventDate).toUpperCase()}</small></div><div><b>{event.title}</b><small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(eventDate)}</small></div><span className={`tag ${event.type === 'Deadline' ? 'orange' : ''}`}>{event.type}</span>{canWrite && <button className="secondary xs" type="button" onClick={() => onEdit(event)}>Edit</button>}{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(event.id)}>Hapus</button>}</div> }) : <p className="muted">Belum ada kegiatan terjadwal.</p>}</div></section></>
}

export default CalendarPage
