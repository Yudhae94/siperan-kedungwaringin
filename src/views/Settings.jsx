import { useState } from 'react'
import { CircleHelp, KeyRound, ShieldCheck, Trash2, Users } from 'lucide-react'
import Modal from '../components/Modal'
import PageTitle from '../components/PageTitle'
import { api } from '../services/api'

function Settings({ currentUser, users, setUsers, authLog, adminContacts, setAdminContacts, notify }) {
  const [form, setForm] = useState({ type: 'whatsapp', value: '' })
  const [editingId, setEditingId] = useState(null)
  const [resetModalUser, setResetModalUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const whatsapp = adminContacts.find(c => c.type === 'whatsapp')?.value || '085771076965'
  const email = adminContacts.find(c => c.type === 'email')?.value || 'admin.siperan@kedungwaringin.go.id'

  function resetForm() {
    setForm({ type: 'whatsapp', value: '' })
    setEditingId(null)
  }

  function submitContact(e) {
    e.preventDefault()
    if (currentUser.role !== 'Super Admin') return
    const payload = { type: form.type, value: form.value.trim() }
    if (!payload.type || !payload.value) {
      notify('Isi tipe dan nilai kontak admin terlebih dahulu.')
      return
    }
    const request = editingId
      ? api(`/admin-contacts/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : api('/admin-contacts', { method: 'POST', body: JSON.stringify(payload) })

    request.then(contact => {
      if (editingId) {
        setAdminContacts(list => list.map(item => item.id === editingId ? { ...item, ...contact, ...payload } : item))
        notify('Kontak admin berhasil diperbarui')
      } else {
        setAdminContacts(list => [...list, { ...contact, ...payload }])
        notify('Kontak admin berhasil ditambahkan')
      }
      resetForm()
    }).catch(err => notify(err.message || 'Gagal menyimpan kontak admin'))
  }

  function deleteContact(id) {
    if (currentUser.role !== 'Super Admin') return
    api(`/admin-contacts/${id}`, { method: 'DELETE' }).then(() => {
      setAdminContacts(list => list.filter(item => item.id !== id))
      notify('Kontak admin berhasil dihapus')
      if (editingId === id) resetForm()
    }).catch(err => notify(err.message || 'Gagal menghapus kontak admin'))
  }

  function editContact(item) {
    setForm({ type: item.type, value: item.value })
    setEditingId(item.id)
  }

  function updateUserRole(user, newRole) {
    if (user.id === currentUser.id && newRole !== 'Super Admin') {
      notify('Anda tidak dapat menurunkan role akun sendiri.')
      return
    }
    api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) })
      .then(updated => {
        setUsers(list => list.map(u => u.id === user.id ? { ...u, role: updated.role } : u))
        notify(`Role ${user.name} diubah menjadi ${newRole}`)
      })
      .catch(err => notify(err.message || 'Gagal mengubah role'))
  }

  function toggleUserStatus(user) {
    if (user.id === currentUser.id) {
      notify('Anda tidak dapat menonaktifkan akun sendiri.')
      return
    }
    const nextStatus = user.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif'
    api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) })
      .then(updated => {
        setUsers(list => list.map(u => u.id === user.id ? { ...u, status: updated.status } : u))
        notify(`Status ${user.name} diubah menjadi ${nextStatus}`)
      })
      .catch(err => notify(err.message || 'Gagal mengubah status'))
  }

  function handleResetPassword(e) {
    e.preventDefault()
    if (!resetModalUser || !newPassword) return
    if (newPassword.length < 6) {
      notify('Password minimal 6 karakter.')
      return
    }
    api(`/users/${resetModalUser.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword })
    })
      .then(res => {
        notify(res.message || 'Password berhasil direset')
        setResetModalUser(null)
        setNewPassword('')
      })
      .catch(err => notify(err.message || 'Gagal mereset password'))
  }

  function deleteUser(user) {
    if (user.id === currentUser.id) {
      notify('Anda tidak dapat menghapus akun Anda sendiri.')
      return
    }
    if (!window.confirm(`Yakin ingin menghapus akun pengguna "${user.name}" (${user.username})?`)) return
    api(`/users/${user.id}`, { method: 'DELETE' })
      .then(() => {
        setUsers(list => list.filter(u => u.id !== user.id))
        notify(`Akun ${user.name} berhasil dihapus`)
      })
      .catch(err => notify(err.message || 'Gagal menghapus pengguna'))
  }

  return (
    <>
      <PageTitle eyebrow="Konfigurasi sistem" title="Pengaturan & Bantuan" />
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Profil & akses</h2>
              <p>Akun dan kewenangan yang sedang digunakan.</p>
            </div>
            <Users className="muted-icon" />
          </div>
          <div className="permission">
            <ShieldCheck size={18} />
            <div>
              <b>{currentUser.name}</b>
              <small>{currentUser.username} · {currentUser.role} · {currentUser.bidang || 'Kecamatan Kedungwaringin'}</small>
            </div>
          </div>
          <p className="muted">Data akun dan sesi tersimpan pada database lokal perangkat ini.</p>
        </section>

        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Kontak admin</h2>
              <p>Hubungi admin SIPERAN untuk bantuan dan koordinasi.</p>
            </div>
            <CircleHelp className="muted-icon" />
          </div>
          <div className="contact-list">
            {adminContacts.map(contact => (
              <a
                key={contact.id}
                href={contact.type === 'whatsapp' ? `https://wa.me/${contact.value.replace(/\D/g, '').replace(/^0/, '62')}` : `mailto:${contact.value}`}
                target={contact.type === 'whatsapp' ? '_blank' : undefined}
                rel={contact.type === 'whatsapp' ? 'noreferrer' : undefined}
              >
                {contact.type === 'whatsapp' ? 'WhatsApp:' : 'Email:'} {contact.value}
              </a>
            ))}
          </div>
        </section>

        {currentUser.role === 'Super Admin' && (
          <section className="card settings-card">
            <div className="card-head">
              <div>
                <h2>Kelola kontak admin</h2>
                <p>Hanya Super Admin yang dapat menambah, memperbarui, atau menghapus kontak.</p>
              </div>
              <ShieldCheck className="muted-icon" />
            </div>
            <form className="form-grid" onSubmit={submitContact}>
              <label>
                Tipe kontak
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                Nilai kontak
                <input
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'whatsapp' ? 'Contoh: 085771076965' : 'Contoh: admin@domain.go.id'}
                />
              </label>
              <div className="action-row">
                <button className="primary" type="submit">
                  {editingId ? 'Simpan perubahan' : 'Tambah kontak'}
                </button>
                {editingId && (
                  <button className="secondary" type="button" onClick={resetForm}>
                    Batal
                  </button>
                )}
              </div>
            </form>
            <div className="contact-list compact">
              {adminContacts.map(contact => (
                <div className="mini-contact" key={contact.id}>
                  <span>{contact.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                  <strong>{contact.value}</strong>
                  <div className="mini-contact-actions">
                    <button type="button" className="secondary" onClick={() => editContact(contact)}>Edit</button>
                    <button type="button" className="danger" onClick={() => deleteContact(contact.id)}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentUser.role === 'Super Admin' && (
          <section className="card settings-card user-management-card">
            <div className="card-head">
              <div>
                <h2>Manajemen Pengguna (Maintenance)</h2>
                <p>{(users || []).length} akun terdaftar · {authLog.length} riwayat aktivitas autentikasi</p>
              </div>
              <Users className="muted-icon" />
            </div>
            <div className="user-management-list">
              {(users || []).map(user => (
                <div className="user-manage-row" key={user.id}>
                  <div className="user-info-col">
                    <div className="user-name-line">
                      <b>{user.name}</b>
                      <span className={`status ${user.status === 'Nonaktif' ? 'warn' : 'done'}`}>
                        {user.status || 'Aktif'}
                      </span>
                    </div>
                    <small className="muted">
                      Username: <strong>{user.username}</strong>
                      {user.email ? ` · Email: ${user.email}` : ''}
                    </small>
                    <small className="muted">
                      Unit: {user.bidang || '-'} · Login terakhir:{' '}
                      {user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : 'Belum pernah'}
                    </small>
                  </div>

                  <div className="user-actions-col">
                    <div className="role-selector-wrap">
                      <select
                        value={user.role}
                        disabled={user.id === currentUser.id}
                        onChange={e => updateUserRole(user, e.target.value)}
                        className="role-select-inline"
                        title="Ubah Role Pengguna"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="PPTK">PPTK / Kasi</option>
                        <option value="Camat">Camat</option>
                        <option value="Sekcam">Sekcam</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className={`secondary xs ${user.status === 'Nonaktif' ? 'btn-activate' : 'btn-deactivate'}`}
                      disabled={user.id === currentUser.id}
                      onClick={() => toggleUserStatus(user)}
                      title={user.status === 'Nonaktif' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                    >
                      {user.status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>

                    <button
                      type="button"
                      className="secondary xs"
                      onClick={() => { setResetModalUser(user); setNewPassword(''); }}
                      title="Reset Password Akun"
                    >
                      <KeyRound size={13} /> Reset Pass
                    </button>

                    {user.id !== currentUser.id && (
                      <button
                        type="button"
                        className="danger xs"
                        onClick={() => deleteUser(user)}
                        title="Hapus Akun Pengguna"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Panduan singkat</h2>
              <p>Alur kerja SIPERAN yang direkomendasikan</p>
            </div>
            <CircleHelp className="muted-icon" />
          </div>
          <ol className="guide">
            <li><b>Rencanakan</b><span>Tambahkan program, indikator, dan pagu anggaran.</span></li>
            <li><b>Kendalikan</b><span>Perbarui realisasi fisik & keuangan, lalu lampirkan bukti.</span></li>
            <li><b>Evaluasi</b><span>Verifikasi dokumen berkala dan unduh laporan kinerja.</span></li>
          </ol>
        </section>
      </div>

      {resetModalUser && (
        <Modal title={`Reset Password: ${resetModalUser.name} (${resetModalUser.username})`} onClose={() => setResetModalUser(null)}>
          <form className="form-grid" onSubmit={handleResetPassword}>
            <p className="muted">
              Masukkan password baru untuk pengguna <b>{resetModalUser.username}</b>. Minimal 6 karakter.
            </p>
            <label>
              Password Baru
              <input
                required
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                autoComplete="new-password"
                minLength={6}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setResetModalUser(null)}>
                Batal
              </button>
              <button type="submit" className="primary">
                Simpan Password Baru
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

export default Settings
