function Stat({ label, value, note, icon: Icon, tone = 'green' }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }

export default Stat
