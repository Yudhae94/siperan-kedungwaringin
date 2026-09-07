import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('SIPERAN render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return <div className="error-fallback"><h2>Terjadi masalah pada tampilan</h2><p>Silakan refresh halaman atau masuk kembali ke aplikasi.</p><button className="primary" onClick={() => window.location.reload()}>Muat ulang</button></div>
    }
    return this.props.children
  }
}

export default ErrorBoundary
