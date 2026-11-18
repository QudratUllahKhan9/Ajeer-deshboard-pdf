import React, { useEffect, useState } from 'react'
import { API } from '../api.js'
import '../App.css'

const statusOf = (p) => {
  const n = new Date()
  if (p.startDate && n < new Date(p.startDate)) return { k: 'pending', ar: 'لم يبدأ بعد' }
  if (p.endDate && n > new Date(p.endDate)) return { k: 'expired', ar: 'منتهي' }
  return { k: 'active', ar: 'ساري / فعال' }
}

const Row = ({ l, v, ltr }) => (
  <tr><th>{l}</th><td className={ltr ? 'ltr' : ''}>{v || '—'}</td></tr>
)

export default function VerifyPage({ permitId }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await fetch(`${API}/api/records/${encodeURIComponent(permitId)}`, { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (dead) return
        if (!r.ok) throw new Error(j.error === 'not found' ? 'ریکارڈ نہیں ملا / Record not found' : (j.error || 'HTTP ' + r.status))
        setD(j)
      } catch (e) { if (!dead) setErr(e.message) }
      if (!dead) setLoading(false)
    })()
    return () => { dead = true }
  }, [permitId])

  const st = d ? statusOf(d) : { k: 'active', ar: '' }

  return (
    <div className="app" dir="rtl">
      <header className="top">
        <div className="brand">
          <span className="mark" />
          <div>
            <h1 className="urdu">تصریح اجازت نامہ — تصدیق</h1>
            <p className="ltr">/v/{permitId}</p>
          </div>
        </div>
        <div className="pill">{loading ? 'لوڈ ہو رہا ہے…' : err ? 'خرابی' : 'MongoDB سے تصدیق شدہ'}</div>
      </header>

      <main className="wide">
        {loading && <div className="empty urdu-text">ڈیٹا لوڈ ہو رہا ہے…</div>}
        {err && !loading && (
          <div className="card">
            <h2 className="urdu">ریکارڈ دستیاب نہیں</h2>
            <p className="hint urdu-text">{err}</p>
            <code className="ltr">{API}/api/records/{permitId}</code>
          </div>
        )}

        {d && !loading && (
          <article className="sheet">
            <div className="sheet__brand">
              <div className="sheet__logo">أجير</div>
              <div className="sheet__t">
                <strong>{d.title || 'بيانات السجل'}</strong>
                <span>منصة أجير — التحقق من التصريح</span>
              </div>
              <div className={`st st--${st.k}`}>{st.ar}</div>
            </div>

            <div className="sheet__band">بيانات التصريح</div>
            <table className="tbl"><tbody>
              <tr>
                <th>رقم التصريح</th><td className="ltr">{d.permitNo || '—'}</td>
                <th>نوع التصريح</th><td>{d.title || '—'}</td>
              </tr>
              <tr>
                <th>تاريخ البداية</th><td className="ltr">{d.startDate || '—'}</td>
                <th>تاريخ النهاية</th><td className="ltr">{d.endDate || '—'}</td>
              </tr>
            </tbody></table>

            <div className="sheet__band">بيانات العامل</div>
            <table className="tbl"><tbody>
              <tr>
                <th>اسم العامل</th><td className="ltr">{d.workerName || '—'}</td>
                <th>رقم الهوية</th><td className="ltr">{d.idNumber || '—'}</td>
              </tr>
              <tr>
                <th>المهنة</th><td>{d.profession || '—'}</td>
                <th>الجنسية</th><td>{d.nationality || '—'}</td>
              </tr>
            </tbody></table>

            <div className="sheet__band">بيانات المنشأة</div>
            <table className="tbl"><tbody>
              <tr>
                <th>المنشأة</th><td>{d.providerCompany || '—'}</td>
                <th>السجل التجاري</th><td className="ltr">{d.providerCr || '—'}</td>
              </tr>
              <tr>
                <th>المستفيد</th><td>{d.beneficiaryCompany || '—'}</td>
                <th>س.ت المستفيد</th><td className="ltr">{d.beneficiaryCr || '—'}</td>
              </tr>
              <tr><th>ملاحظة</th><td colSpan={3} className="ltr">{d.contractNote || '—'}</td></tr>
              <tr><th>مواقع العمل</th><td colSpan={3}>{d.workSites || '—'}</td></tr>
            </tbody></table>

            <div className="sheet__foot">
              <div className="qrside">
                <img className="qrbox" style={{ width: 150, height: 150, padding: 5 }}
                     src={`${API}/qr/${encodeURIComponent(permitId)}.png`} alt={'QR ' + permitId} />
                <div className="qrhint">امسح الرمز للتحقق</div>
              </div>
              <div className="urlside">
                <span className="urdu-text">ریکارڈ ID</span>
                <code>{permitId}</code>
                <small className="urdu-text">یہ ڈیٹا MongoDB سے آیا ہے — QR میں صرف بیک اینڈ لنک اور یہی id ہے۔</small>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}
