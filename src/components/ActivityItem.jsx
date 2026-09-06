function ActivityItem({ icon: Icon, title, text, time }) { return <div className="timeline-row"><div className="timeline-icon"><Icon size={16}/></div><div><b>{title}</b><small>{text}</small></div><time>{time}</time></div> }

export default ActivityItem
