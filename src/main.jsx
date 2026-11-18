import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import VerifyPage from './pages/VerifyPage.jsx'
import './fonts.css'

/* /v/<id>  → public verify page (QR yahan redirect karta hai)
   baqi sab → admin form                                          */
const m = window.location.pathname.match(/^\/v\/([^/?#]+)/)
const id = m ? decodeURIComponent(m[1]) : ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{id ? <VerifyPage permitId={id} /> : <App />}</React.StrictMode>
)
