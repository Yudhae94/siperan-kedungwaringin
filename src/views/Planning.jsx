import { useState } from 'react'
import { BadgeCheck, ClipboardList, FileUp, FolderOpen, Plus, Search, Upload, Zap } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'
import ProgramTable from '../components/ProgramTable'
import RkaForm from './RkaForm'

function Planning({ programs, query, setQuery, onAdd, onDelete, onProgress, canWrite, currentUnit, onUnitFilterChange, unitFilterOptions, onNavigate }) {
  const [showRkaForm, setShowRkaForm] = useState(false)

  return <><PageTitle eyebrow="Siklus kinerja · Tahun Anggaran 2026" title="Perencanaan (E-Usulan Kegiatan)"><div className="title-actions-inline">{canWrite && <Button onClick={onAdd}><Plus size={17}/> E-Usulan Kegiatan</Button>}<button className="secondary" type="button" onClick={() => setShowRkaForm(v => !v)}>{showRkaForm ? 'Tutup form RKA' : 'Input RKA'}</button><label className="filter-select-wrap"><span>Unit</span><select value={currentUnit} onChange={e => onUnitFilterChange(e.target.value)}>{unitFilterOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div></PageTitle>
    <div className="planning-subnav">
      <button type="button" className="primary" onClick={() => onNavigate('usulan-rka')}><ClipboardList size={16}/> Usulan RKA / KAK</button>
      <button type="button" className="primary" onClick={() => onNavigate('upload-pendukung')}><FileUp size={16}/> Upload Dokumen Pendukung</button>
      <button type="button" className="primary" onClick={() => onNavigate('verifikasi-usulan')}><BadgeCheck size={16}/> Verifikasi Usulan</button>
      <button type="button" className="primary" onClick={() => onNavigate('arsip')}><FolderOpen size={16}/> Arsip Renja & DPA</button>
    </div>
    <div className="callout"><div className="callout-icon"><Zap size={19}/></div><div><b>Rencana kerja tahun 2026 sedang berjalan</b><p>Lengkapi indikator dan pagu untuk menjaga konsistensi antara rencana dan realisasi.</p></div><button onClick={() => onNavigate('pengendalian')}>Buka pengendalian →</button></div>{showRkaForm && <RkaForm />}<section className="card table-card"><div className="table-toolbar"><div><h2>Daftar E-Usulan Kegiatan</h2><p>{programs.length} usulan kegiatan terdaftar</p></div><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari usulan kegiatan..." /></div></div><ProgramTable programs={programs} canWrite={canWrite} onDelete={onDelete} onProgress={onProgress}/></section></> }

export default Planning
