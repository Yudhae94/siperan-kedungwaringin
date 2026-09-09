import { ChevronDown, CircleHelp, LogOut, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { navGroups } from '../constants'

function Sidebar({ sidebar, setSidebar, active, setActive, adminContacts, currentUser, signOut }) {
  const [expanded, setExpanded] = useState(() => {
    const initial = {}
    navGroups.forEach(g => {
      if (g.items.some(i => i.id === active)) initial[g.title] = true
    })
    return initial
  })

  useEffect(() => {
    navGroups.forEach(g => {
      if (g.items.some(i => i.id === active)) {
        setExpanded(prev => ({ ...prev, [g.title]: true }))
      }
    })
  }, [active])

  const toggleGroup = title => setExpanded(prev => ({ ...prev, [title]: !prev[title] }))

  return <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
    <div className="brand"><div className="brand-mark">S</div><div><b>SIPERAN</b><small>KEDUNGWARINGIN</small></div><button className="close-nav" onClick={() => setSidebar(false)}><X size={18}/></button></div>
    <div className="office"><span className="online-dot"/> Kecamatan Kedungwaringin <ChevronDown size={14}/></div>
    <nav>{navGroups.map(g => {
      const isOpen = expanded[g.title] !== false
      const hasDropdown = g.items.length > 1
      return (
        <div className="nav-group" key={g.title}>
          <label
            className={hasDropdown ? 'nav-group-toggle' : ''}
            onClick={hasDropdown ? () => toggleGroup(g.title) : undefined}
          >
            {g.title}
            {hasDropdown && <ChevronDown size={12} className={`nav-chevron ${isOpen ? 'open' : ''}`}/>}
          </label>
          {(!hasDropdown || isOpen) && g.items.map(({ id, label, icon: Icon }) => (
            <button key={id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); setSidebar(false) }}>
              <Icon size={18}/><span>{label}</span>{id === 'pengendalian' && <em>4</em>}
            </button>
          ))}
        </div>
      )
    })}</nav>
    <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><div><b>Butuh bantuan?</b><small>Silakan hubungi Admin SIPERAN Kedungwaringin</small>{(() => { const wa = adminContacts.find(c => c.type === 'whatsapp')?.value || '085771076965'; const waLink = `https://wa.me/${wa.replace(/\D/g, '').replace(/^0/, '62')}`; return <><a className="help-link" href={waLink} target="_blank" rel="noreferrer">Hubungi Admin</a>{currentUser.role === 'Super Admin' && <button type="button" className="help-link" onClick={() => setActive('pengaturan')}>Edit Nomor HP & Email</button>}</> })()}</div></div><div className="user-mini"><div className="avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div><button className="logout-btn" title="Keluar" onClick={signOut}><LogOut size={16}/></button></div></div>
    </aside>
}

export default Sidebar