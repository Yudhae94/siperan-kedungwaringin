function Button({ children, onClick, secondary = false }) { return <button onClick={onClick} className={secondary ? 'secondary' : 'primary'}>{children}</button> }

export default Button
