import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { API, saveRecord, updateRecord, getRecord, listRecords, getSettings, setDomain, nowId } from './api.js'
import './App.css'

const QR_LOOK = {
  type: 'svg',
  margin: 1,
  qrOptions: {
    errorCorrectionLevel: 'M',
    mode: 'Byte'
  },
  dotsOptions: {
    type: 'square',
    color: '#000000'
  },
  cornersSquareOptions: {
    type: 'square',
    color: '#000000'
  },
  cornersDotOptions: {
    type: 'square',
    color: '#000000'
  },
  backgroundOptions: {
    color: '#FFFFFF'
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0,
    margin: 0
  }
}

function StyledQr({ value, size = 84, dark = '#000000', className = 'cert-qr-box' }) {
  const box = useRef(null)
  const qr = useRef(null)
  useEffect(() => {
    if (!box.current || !value) return
    const opts = {
      ...QR_LOOK,
      width: size,
      height: size,
      data: String(value),
      dotsOptions: { ...QR_LOOK.dotsOptions, color: dark },
      cornersSquareOptions: { ...QR_LOOK.cornersSquareOptions, color: dark },
      cornersDotOptions: { ...QR_LOOK.cornersDotOptions, color: dark }
    }
    if (!qr.current) {
      qr.current = new QRCodeStyling(opts)
      qr.current.append(box.current)
    } else {
      qr.current.update(opts)
    }
  }, [value, size, dark])
  return <div className={className} ref={box} style={{ width: size, height: size }} />
}

async function qrPngBlob(value, { size = 1024, dark = '#000000' } = {}) {
  const inst = new QRCodeStyling({
    ...QR_LOOK,
    type: 'canvas',
    width: size,
    height: size,
    data: String(value),
    dotsOptions: { ...QR_LOOK.dotsOptions, color: dark },
    cornersSquareOptions: { ...QR_LOOK.cornersSquareOptions, color: dark },
    cornersDotOptions: { ...QR_LOOK.cornersDotOptions, color: dark }
  })
  return inst.getRawData('png')
}

const EMPTY = {
  permitId: '',
  permitNo: 'TQxxxxxxx',
  title: 'التحقق من تصريح أُجير',
  workerName: 'MD SULAIMAN',
  idNumber: '2597423595',
  profession: 'عامل تحميل وتنزيل',
  nationality: 'بنجلاديش',
  birthDate: '',
  providerCompany: 'مؤسسة سامي سالم سليمان\nالخمسان للمقاولات',
  providerCr: '13-5462841',
  beneficiaryCompany: 'مؤسسة تسوير العربية\nللمقاولات العامة',
  beneficiaryCr: '4-72901',
  contractNote: 'عقد بالباطن',
  startDate: '2026-11-09',
  endDate: '2027-02-08',
  workSites: 'الدمام المنار محلي 31921'
}

const FIELDS = [
  ['permitNo', 'رقم التصريح', 'ltr'],
  ['workerName', 'اسم العامل', 'ltr'],
  ['idNumber', 'رقم الهوية / الإقامة', 'ltr'],
  ['profession', 'المهنة', 'rtl'],
  ['nationality', 'الجنسية', 'rtl'],
  ['providerCompany', 'المنشأة المقدمة للخدمة', 'rtl'],
  ['providerCr', 'رقم المنشأة المقدمة للخدمة', 'ltr'],
  ['beneficiaryCompany', 'المنشأة المستفيدة من الخدمة', 'rtl'],
  ['beneficiaryCr', 'رقم منشأة المستفيد', 'ltr'],
  ['contractNote', 'نبذة عن التعاقد', 'rtl'],
  ['startDate', 'تاريخ بداية التصريح', 'ltr'],
  ['endDate', 'تاريخ نهاية التصريح', 'ltr'],
  ['workSites', 'مواقع العمل', 'rtl'],
  ['birthDate', 'تاريخ الميلاد', 'ltr']
]

const statusOf = (p) => {
  const n = new Date()
  if (p.startDate && n < new Date(p.startDate)) return { k: 'pending', ar: 'لم يبدأ بعد' }
  if (p.endDate && n > new Date(p.endDate)) return { k: 'expired', ar: 'منتهي' }
  return { k: 'active', ar: 'ساري / فعال' }
}

export default function App() {
  const [tab, setTab] = useState('new')
  const [form, setForm] = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [settings, setSettings] = useState({ publicBaseUrl: '' })
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [ink, setInk] = useState('#000000')
  const [dom, setDom] = useState('')
  const [layout, setLayout] = useState('auto') // 'auto' | 'full' | 'compact'

  const flash = (m) => {
    setNote(m)
    setTimeout(() => setNote(''), 4500)
  }

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings()
      setSettings(s)
      setDom(s.publicBaseUrl || '')
    } catch (e) {
      setErr('Settings: ' + e.message)
    }
  }, [])

  const loadList = useCallback(async (term = '') => {
    try {
      const r = await listRecords(term)
      setItems(r.items || [])
    } catch (e) {
      setErr('List: ' + e.message)
    }
  }, [])

  const prefill = useCallback(async () => {
    const want = String(import.meta.env.VITE_DEFAULT_ID || 'b283254a').toLowerCase()
    try {
      const r = await getRecord(want)
      setRecord(r.permit)
      setForm({ ...EMPTY, ...r.permit })
      return
    } catch {
      /* fallback to first item */
    }
    try {
      const l = await listRecords('')
      const first = l.items?.[0]
      if (first?.permitId) {
        const r = await getRecord(first.permitId)
        setRecord(r.permit)
        setForm({ ...EMPTY, ...r.permit })
      }
    } catch {
      /* keep default EMPTY */
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadList()
    prefill()
  }, [loadSettings, loadList, prefill])

  useEffect(() => {
    if (tab === 'list') loadList(q)
  }, [tab, q, loadList])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const hasPermitExtra = Boolean(
    String(form.contractNote || '').trim() || String(form.workSites || '').trim()
  )
  const compact = layout === 'auto' ? !hasPermitExtra : layout === 'compact'

  const qrTarget = useMemo(() => {
    if (record?.qrTarget) return record.qrTarget
    const base = settings.publicBaseUrl || API || window.location.origin
    return `${base}/v/${form.permitId || form.permitNo || 'preview'}`
  }, [record, settings.publicBaseUrl, form.permitId, form.permitNo])

  const save = async () => {
    setBusy(true)
    setErr('')
    try {
      const payload = { ...form, permitId: form.permitId || undefined }
      const res = record
        ? await updateRecord(record.permitId, payload)
        : await saveRecord(payload)
      setRecord(res.permit)
      setForm({ ...EMPTY, ...res.permit })
      flash(record ? 'MongoDB میں اپڈیٹ ہو گیا ✓' : 'MongoDB میں محفوظ ہو گیا ✓ — QR بن گیا')
      loadList(q)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const downloadCertificatePdf = (customName) => {
    const prevTitle = document.title
    const fileTitle = customName || form.workerName || form.permitNo || 'Sample-Document'
    document.title = fileTitle.replace(/\s+/g, '_')
    window.print()
    setTimeout(() => {
      document.title = prevTitle
    }, 500)
  }

  const openRecord = async (id, autoPrint = false) => {
    setBusy(true)
    setErr('')
    try {
      const r = await getRecord(id)
      setRecord(r.permit)
      setForm({ ...EMPTY, ...r.permit })
      setTab('new')
      flash('ریکارڈ لوڈ ہو گیا: ' + id)
      if (autoPrint) {
        setTimeout(() => downloadCertificatePdf(r.permit.workerName || r.permit.permitNo || id), 350)
      }
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const downloadQr = async () => {
    try {
      const blob = await qrPngBlob(qrTarget, { size: 1024, dark: ink })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `qr-${record?.permitId || 'permit'}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      flash('1024px PNG ڈاؤن لوڈ ✓')
    } catch (e) {
      setErr(e.message)
    }
  }

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrTarget)
      flash('URL کاپی ہو گیا ✓')
    } catch {
      setErr('clipboard blocked')
    }
  }

  const applyDomain = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await setDomain(dom)
      setSettings({ publicBaseUrl: r.publicBaseUrl })
      flash(`ڈومین محفوظ ✓ — ${r.report?.updated ?? 0} QR دوبارہ بنے`)
      loadList(q)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="app" dir="rtl">
      <header className="top no-print">
        <div className="brand">
          <span className="mark" />
          <div>
            <h1 className="urdu">اجازت نامہ — MongoDB + QR + PDF</h1>
            <p className="ltr">Express · Mongoose · Sample Document · Internal Demo</p>
          </div>
        </div>
        <div className="pill">{record ? 'لوڈ شدہ · ' + record.permitId : 'نیا اندراج'}</div>
      </header>

      <nav className="tabs no-print">
        {[
          ['new', 'نیا اندراج / فارم'],
          ['list', 'ریکارڈز (MongoDB)'],
          ['domain', 'ڈومین اور QR']
        ].map(([k, l]) => (
          <button
            key={k}
            className={'tab' + (tab === k ? ' tab--on' : '')}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </nav>

      {err && <div className="errbar urdu-text no-print">خرابی: {err}</div>}
      {note && <div className="notebar urdu-text no-print">{note}</div>}

      {tab === 'new' && (
        <main className="grid">
          {/* Left Form Panel */}
          <section className="card no-print">
            <h2 className="urdu">فارم بھریں</h2>
            <p className="hint urdu-text">
              فارم خود بخود MongoDB سے بھر جاتا ہے۔ نیچے <b>PDF ڈاؤن لوڈ کریں</b> بٹن سے سرٹیفکیٹ نمونہ ڈیزائن میں ڈاؤن لوڈ کریں۔
            </p>

            <div className="fields">
              <label className="fld">
                <span className="fld__lb urdu-text">ID (خالی چھوڑیں تو خود بنے گا)</span>
                <div className="inkrow">
                  <input
                    value={form.permitId}
                    dir="ltr"
                    placeholder="abc12345"
                    onChange={(e) =>
                      set('permitId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    }
                  />
                  <button className="btn btn--ghost" type="button" onClick={() => set('permitId', nowId())}>
                    خود
                  </button>
                </div>
              </label>

              <label className="fld">
                <span className="fld__lb urdu-text">عنوان التصريح</span>
                <input
                  value={form.title ?? ''}
                  dir="rtl"
                  onChange={(e) => set('title', e.target.value)}
                />
              </label>

              {FIELDS.map(([k, label, dir]) => (
                <label className="fld" key={k}>
                  <span className="fld__lb urdu-text">{label}</span>
                  <input
                    value={form[k] ?? ''}
                    dir={dir}
                    onChange={(e) => set(k, e.target.value)}
                  />
                </label>
              ))}

              <label className="fld">
                <span className="fld__lb urdu-text">QR کا رنگ</span>
                <div className="inkrow">
                  <input
                    className="inkpick"
                    type="color"
                    value={ink}
                    onChange={(e) => setInk(e.target.value)}
                  />
                  <input value={ink} dir="ltr" onChange={(e) => setInk(e.target.value)} />
                </div>
              </label>
            </div>

            <label className="fld">
              <span className="fld__lb urdu-text">ڈیٹا لے آؤٹ — خودکار / مکمل / مختصر</span>
              <div className="idrow">
                {[
                  ['auto', 'خودکار'],
                  ['full', 'مکمل'],
                  ['compact', 'مختصر']
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={'mini' + (layout === k ? ' mini--pdf' : '')}
                    onClick={() => setLayout(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span className="urdu-text" style={{ fontSize: 11, color: '#667085' }}>
                خودکار: اگر «نبذة عن التعاقد / مواقع العمل» میں ڈیٹا ہو تو مکمل، ورنہ مختصر۔
              </span>
            </label>

            <div className="acts">
              <button className="btn" onClick={save} disabled={busy}>
                {record ? 'اپڈیٹ کریں' : 'محفوظ کریں + QR'}
              </button>
              <button className="btn btn--pdf" type="button" onClick={() => downloadCertificatePdf()}>
                PDF ڈاؤن لوڈ کریں
              </button>
              {record && (
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setRecord(null)
                    setForm(EMPTY)
                  }}
                >
                  نیا
                </button>
              )}
              <button className="btn btn--ghost" onClick={downloadQr} disabled={!record}>
                QR PNG
              </button>
            </div>

            <div className="url-box-card">
              <span className="urdu-text" style={{ fontSize: 12, color: '#475467' }}>
                QR لنک:
              </span>
              <code className="ltr" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                {qrTarget}
              </code>
              <div className="idrow" style={{ marginTop: 6 }}>
                <button className="mini" type="button" onClick={copyUrl}>
                  URL کاپی
                </button>
                {record && (
                  <a className="mini" href={qrTarget} target="_blank" rel="noreferrer">
                    اسکین پیج کھولیں
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Right Certificate Live Preview */}
          <section className="prevwrap">
            <div className="prevhd-row no-print">
              <span className="urdu-text">پری ویو — نمونہ دستاویز کا پری ویو</span>
              <button
                className="btn btn--pdf btn--sm"
                type="button"
                onClick={() => downloadCertificatePdf()}
              >
                تحميل / طباعة PDF
              </button>
            </div>

            <article className="cert-sheet" id="sample-certificate-pdf">
              {/* Exact Header Band matching the user's screenshot */}
            {/* Exact Header Band matching your screenshot we.png */}
<div className="cert-top-header">
  {/* Right Cell (in RTL): Logos & Ministry Text */}
  <div className="cert-top__cell cert-top__cell--r">
    <div className="cert-marks">
      <div className="ajeer-wordmark">
        <span className="ajeer-wordmark__ar">أجير</span>
        <span className="ajeer-wordmark__en">AJEER</span>
      </div>
      <div className="ajeer-emblem" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 32 32">
          <path d="M16 2 L20 12 L30 14 L22 21 L24 30 L16 25 L8 30 L10 21 L2 14 L12 12 Z" fill="#00a651" />
          <path d="M16 6 L19 13 L26 14 L20 19 L22 26 L16 22 L10 26 L12 19 L6 14 L13 13 Z" fill="#ffb81c" />
          <path d="M16 10 L18 15 L23 16 L18 20 L20 25 L16 21 L12 25 L14 20 L9 16 L14 15 Z" fill="#ed1c24" />
        </svg>
      </div>
      <div className="ministry-text">
        <span>الموارد البشرية</span>
        <span>والتنمية الاجتماعية</span>
      </div>
    </div>
  </div>

  {/* Center Cell: Title */}
  <div className="cert-top__cell cert-top__cell--c">
    <h1 className="cert-main-title">
      {form.title || 'تصريح أجير - الإعارة'}
    </h1>
  </div>

  {/* Left Cell (in RTL): QR Code + Permit No + Hint */}
  <div className="cert-top__cell cert-top__cell--l">
    <div className="cert-qr-block">
      <StyledQr value={qrTarget} size={50} dark={ink} />
      <span className="cert-qr-no ltr">{form.permitNo || 'TQxxxxxxx'}</span>
      <span className="cert-qr-hint">امسح للتحقق</span>
    </div>
  </div>
</div>
              {/* QR Code and permit info badge row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '4px', background: '#f8fafc' }}>
                  <span className="ltr" style={{ fontSize: '12px', fontWeight: 'bold' }}>{form.permitNo || 'TQxxxxxxx'}</span>
                  <StyledQr value={qrTarget} size={36} dark={ink} />
                </div>
              </div>

              {/* Intro paragraph */}
              <p className="cert-intro">
                هذا نموذج تجريبي لتصميم سجل بيانات العامل، أُعِدّ للاستخدام الداخلي وللعرض على الشاشة فقط. الحقول أدناه
                قابلة للتعبئة من قاعدة البيانات، وقد وُضِعت لبيان شكل المستند وترتيب بيانات العامل والمنشآت والتصريح داخل
                الجدول، ولا يُعتد بهذا النموذج لإثبات أي حق أو للتحقق من صحة تواجد أي عامل في مكان تقديم الخدمة.
              </p>

              {/* 1. بيانات العامل */}
              <table className="cert-tbl">
                <colgroup>
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="cert-bar" colSpan={4}>
                      بيانات العامل
                    </td>
                  </tr>
                  <tr className="h-standard">
                    <td className="cert-lbl-cell">اسم العامل</td>
                    <td className="cert-val-cell ltr">{form.workerName || '—'}</td>
                    <td className="cert-lbl-cell">المهنة</td>
                    <td className="cert-val-cell">{form.profession || '—'}</td>
                  </tr>
                  <tr className="h-standard">
                    <td className="cert-lbl-cell">رقم الهوية / الإقامة</td>
                    <td className="cert-val-cell ltr">{form.idNumber || '—'}</td>
                    <td className="cert-lbl-cell">الجنسية</td>
                    <td className="cert-val-cell">{form.nationality || '—'}</td>
                  </tr>

                  {/* 2. بيانات مقدم الخدمة */}
                  <tr>
                    <td className="cert-bar" colSpan={4}>
                      بيانات مقدم الخدمة
                    </td>
                  </tr>
                  <tr className="h-tall">
                    <td className="cert-lbl-cell">المنشأة المقدمة للخدمة</td>
                    <td className="cert-val-cell">{form.providerCompany || '—'}</td>
                    <td className="cert-lbl-cell">رقم المنشأة في وزارة الموارد البشرية والتنمية الإجتماعية</td>
                    <td className="cert-val-cell ltr">{form.providerCr || '—'}</td>
                  </tr>

                  {/* 3. بيانات المستفيد من الخدمة */}
                  <tr>
                    <td className="cert-bar" colSpan={4}>
                      بيانات المستفيد من الخدمة
                    </td>
                  </tr>
                  <tr className="h-tall">
                    <td className="cert-lbl-cell">المنشأة المستفيدة من الخدمة</td>
                    <td className="cert-val-cell">{form.beneficiaryCompany || '—'}</td>
                    <td className="cert-lbl-cell">رقم المنشأة في وزارة الموارد البشرية والتنمية الإجتماعية</td>
                    <td className="cert-val-cell ltr">{form.beneficiaryCr || '—'}</td>
                  </tr>

                  {/* 4. بيانات التصريح */}
                  <tr>
                    <td className="cert-bar" colSpan={4}>
                      بيانات التصريح
                    </td>
                  </tr>
                  {!compact && (
                    <tr className="h-standard">
                      <td className="cert-lbl-cell">نبذة عن التعاقد</td>
                      <td className="cert-val-cell" colSpan={3}>
                        {form.contractNote || '—'}
                      </td>
                    </tr>
                  )}
                  <tr className="h-standard">
                    <td className="cert-lbl-cell">تاريخ بداية التصريح</td>
                    <td className="cert-val-cell ltr">{form.startDate || '—'}</td>
                    <td className="cert-lbl-cell">تاريخ نهاية التصريح</td>
                    <td className="cert-val-cell ltr">{form.endDate || '—'}</td>
                  </tr>
                  {!compact && (
                    <tr className="h-standard">
                      <td className="cert-lbl-cell">مواقع العمل</td>
                      <td className="cert-val-cell" colSpan={3}>
                        {form.workSites || '—'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 5. إقرارات */}
              <div className="cert-decl">
                <div className="cert-decl__title">إقرارات</div>
                <div className="cert-decl__sub">أقر أنا المنشأة المقدمة للخدمة والموضحة بياناتي أعلاه وأتعهد بـ:</div>
                <ul className="cert-decl__list">
                  <li>
                    إن العامل حامل هذا النموذج يقر بأن البيانات المدونة فيه صحيحة على مسؤوليته الشخصية، وأنه يعمل لدى
                    المنشأة ولحسابها بموجب رخصة إقامة سارية المفعول، وأتحمل أي تبعات نظامية تترتب على خلاف ذلك.
                  </li>
                  <li>الالتزام والتقيد بأنظمة العمل والعمال وأي أنظمة ولوائح وقرارات أخرى ذات علاقة.</li>
                  <li>
                    أن هذا المستند نموذج تصميمي داخلي، وليس له صفة رسمية، ولا يُعتد به لدى أي جهة للتحقق من أي بيانات.
                  </li>
                  <li>أي تعديل أو كشط في هذا النموذج يجعله لاغياً.</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="cert-footer">
                <div>هذا المستند نموذج تجريبي لأغراض التصميم والعرض الداخلي فقط.</div>
              </div>
            </article>
          </section>
        </main>
      )}

      {tab === 'list' && (
        <main className="wide no-print">
          <div className="listbar">
            <input
              placeholder="رقم التصريح / نام / ID تلاش کریں"
              value={q}
              dir="rtl"
              onChange={(e) => setQ(e.target.value)}
              className="search"
            />
            <button className="btn btn--ghost" onClick={() => loadList(q)} disabled={busy}>
              ریفریش
            </button>
            <span className="count urdu-text">{items.length} ریکارڈ</span>
          </div>

          {items.length === 0 ? (
            <div className="empty urdu-text">کوئی ریکارڈ نہیں — پہلے فارم سے ایک محفوظ کریں۔</div>
          ) : (
            <div className="reclist">
              {items.map((it) => (
                <div className="rec" key={it.permitId}>
                  <img
                    className="rec__qr"
                    src={`${API}/qr/${it.permitId}.png`}
                    alt={'QR ' + it.permitId}
                  />
                  <div className="rec__body">
                    <div className="rec__top">
                      <strong className="ltr">{it.permitNo || it.permitId}</strong>
                      <span className="badge">{statusOf(it).ar}</span>
                    </div>
                    <div className="rec__name ltr">{it.workerName || '—'}</div>
                    <div className="rec__meta ltr">
                      ID {it.idNumber || '—'} · {it.startDate || '—'} → {it.endDate || '—'}
                    </div>
                    <div className="rec__url ltr">
                      {it.qr?.targetUrl || `${settings.publicBaseUrl}/v/${it.permitId}`}
                    </div>
                  </div>
                  <div className="rec__acts">
                    <button className="mini" onClick={() => openRecord(it.permitId, false)}>
                      کھولیں
                    </button>
                    <button className="mini mini--pdf" onClick={() => openRecord(it.permitId, true)}>
                      PDF
                    </button>
                    <a
                      className="mini"
                      href={`${API}/qr/${it.permitId}.png`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      QR
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {tab === 'domain' && (
        <main className="wide no-print">
          <section className="card">
            <h2 className="urdu">ڈومین / QR بیس URL</h2>
            <p className="hint urdu-text">
              یہ وہی host ہے جو QR کے اندر لکھا جاتا ہے (<code className="ltr">BASE/v/&lt;id&gt;</code>)۔
              یہ MongoDB کے <code className="ltr">UrlConfig</code> میں محفوظ رہتا ہے۔ بدلنے پر سارے QR
              نئے ڈومین کے ساتھ دوبارہ بنتے ہیں، id اور ڈیٹا وہی رہتا ہے۔
            </p>

            <div className="domrow">
              <label className="fld">
                <span className="fld__lb urdu-text">موجودہ بیس URL</span>
                <input value={settings.publicBaseUrl} dir="ltr" readOnly />
              </label>
              <label className="fld">
                <span className="fld__lb urdu-text">نیا بیس URL</span>
                <input
                  value={dom}
                  dir="ltr"
                  placeholder="https://api.nayadomain.com"
                  onChange={(e) => setDom(e.target.value)}
                />
              </label>
            </div>
            <div className="acts">
              <button className="btn" onClick={applyDomain} disabled={busy || !dom}>
                محفوظ + QR ری جنریٹ
              </button>
            </div>
            <p className="warnbox urdu-text">
              نوٹ: QR میں host لکھا ہوتا ہے، اس لیے جو QR پرنٹ ہو چکا ہے وہ پرانے host پر ہی جائے گا۔
              پرانا ڈومین زندہ رکھیں اور <code className="ltr">/v/:id</code> کو نئے ڈومین پر redirect کر دیں،
              ورنہ هر تبدیلی پر QR دوبارہ پرنٹ کرنا پڑے گا۔
            </p>
          </section>
        </main>
      )}
    </div>
  )
}