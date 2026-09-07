function PageTitle({ eyebrow, title, children }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="title-actions">{children}</div></div> }

export default PageTitle
