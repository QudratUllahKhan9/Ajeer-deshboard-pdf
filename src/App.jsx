import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import QRCodeStyling from "qr-code-styling";
import {
  API,
  saveRecord,
  updateRecord,
  getRecord,
  listRecords,
  getSettings,
  setDomain,
  nowId,
} from "./api.js";
import "./App.css";
import ajeerLogoImg from "./assets/ajeer-logo.png";
import hrsdStarImg from "./assets/hrsd-star.png";

const QR_LOOK = {
  type: "svg",
  margin: 1,
  qrOptions: {
    errorCorrectionLevel: "M",
    mode: "Byte",
  },
  dotsOptions: {
    type: "square",
    color: "#000000",
  },
  cornersSquareOptions: {
    type: "square",
    color: "#000000",
  },
  cornersDotOptions: {
    type: "square",
    color: "#000000",
  },
  backgroundOptions: {
    color: "#FFFFFF",
  },
  imageOptions: {
    hideBackgroundDots: true,
    imageSize: 0,
    margin: 0,
  },
};

function StyledQr({
  value,
  size = 76,
  dark = "#000000",
  className = "cert-qr-box",
}) {
  const box = useRef(null);
  const qr = useRef(null);
  useEffect(() => {
    if (!box.current || !value) return;
    const opts = {
      ...QR_LOOK,
      width: size,
      height: size,
      data: String(value),
      dotsOptions: { ...QR_LOOK.dotsOptions, color: dark },
      cornersSquareOptions: { ...QR_LOOK.cornersSquareOptions, color: dark },
      cornersDotOptions: { ...QR_LOOK.cornersDotOptions, color: dark },
    };
    if (!qr.current) {
      qr.current = new QRCodeStyling(opts);
      qr.current.append(box.current);
    } else {
      qr.current.update(opts);
    }
  }, [value, size, dark]);
  return (
    <div
      className={className}
      ref={box}
      style={{ width: size, height: size }}
    />
  );
}

async function qrPngBlob(value, { size = 1024, dark = "#000000" } = {}) {
  const inst = new QRCodeStyling({
    ...QR_LOOK,
    type: "canvas",
    width: size,
    height: size,
    data: String(value),
    dotsOptions: { ...QR_LOOK.dotsOptions, color: dark },
    cornersSquareOptions: { ...QR_LOOK.cornersSquareOptions, color: dark },
    cornersDotOptions: { ...QR_LOOK.cornersDotOptions, color: dark },
  });
  return inst.getRawData("png");
}

const DEFAULT_CERT = {
  permitNo: "TQ5491374",
  title: "تصريح أجير – تعاقد أجير",
  workerName: "MUHAMMAD KASHIF KHAN ZAMAN",
  idNumber: "2562349304",
  profession: "عامل بناء",
  nationality: "باكستان",
  providerCompany: "شركة عبد الله بن حمود الحربي للتجارة",
  providerCr: "17-8463219",
  beneficiaryCompany: "شركه فال السعوديه",
  beneficiaryCr: "14-1945799",
  contractNote: "Providing services according to purchase orders 104101",
  startDate: "2026-10-29",
  endDate: "2027-01-28",
  workSites: "GGC4981,4981 المتنبي, حي النور، النور 82844، السعودية",
};

const EMPTY = {
  permitId: "",
  permitNo: DEFAULT_CERT.permitNo,
  title: DEFAULT_CERT.title,
  workerName: DEFAULT_CERT.workerName,
  idNumber: DEFAULT_CERT.idNumber,
  profession: DEFAULT_CERT.profession,
  nationality: DEFAULT_CERT.nationality,
  birthDate: "",
  providerCompany: DEFAULT_CERT.providerCompany,
  providerCr: DEFAULT_CERT.providerCr,
  beneficiaryCompany: DEFAULT_CERT.beneficiaryCompany,
  beneficiaryCr: DEFAULT_CERT.beneficiaryCr,
  contractNote: DEFAULT_CERT.contractNote,
  startDate: DEFAULT_CERT.startDate,
  endDate: DEFAULT_CERT.endDate,
  workSites: DEFAULT_CERT.workSites,
};

const FIELDS = [
  ["permitNo", "رقم التصريح", "ltr"],
  ["workerName", "اسم العامل", "ltr"],
  ["idNumber", "رقم الهوية / الإقامة", "ltr"],
  ["profession", "المهنة", "rtl"],
  ["nationality", "الجنسية", "rtl"],
  ["providerCompany", "المنشأة المقدمة للخدمة", "rtl"],
  ["providerCr", "رقم المنشأة المقدمة للخدمة", "ltr"],
  ["beneficiaryCompany", "المنشأة المستفيدة من الخدمة", "rtl"],
  ["beneficiaryCr", "رقم منشأة المستفيد", "ltr"],
  ["contractNote", "نبذة عن التعاقد", "ltr"],
  ["startDate", "تاريخ بداية التصريح", "ltr"],
  ["endDate", "تاريخ نهاية التصريح", "ltr"],
  ["workSites", "مواقع العمل", "rtl"],
  ["birthDate", "تاريخ الميلاد", "ltr"],
];

const statusOf = (p) => {
  const n = new Date();
  if (p.startDate && n < new Date(p.startDate))
    return { k: "pending", ar: "لم يبدأ بعد" };
  if (p.endDate && n > new Date(p.endDate))
    return { k: "expired", ar: "منتهي" };
  return { k: "active", ar: "ساري / فعال" };
};

export default function App() {
  const [tab, setTab] = useState("new");
  const [form, setForm] = useState(EMPTY);
  const [record, setRecord] = useState(null);
  const [settings, setSettings] = useState({ publicBaseUrl: "" });
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [ink, setInk] = useState("#000000");
  const [dom, setDom] = useState("");
  const [layout, setLayout] = useState("auto"); // 'auto' | 'full' | 'compact'

  const flash = (m) => {
    setNote(m);
    setTimeout(() => setNote(""), 4500);
  };

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
      setDom(s.publicBaseUrl || "");
    } catch (e) {
      setErr("Settings: " + e.message);
    }
  }, []);

  const loadList = useCallback(async (term = "") => {
    try {
      const r = await listRecords(term);
      setItems(r.items || []);
    } catch (e) {
      setErr("List: " + e.message);
    }
  }, []);

  const prefill = useCallback(async () => {
    const want = String(
      import.meta.env.VITE_DEFAULT_ID || "b283254a",
    ).toLowerCase();
    try {
      const r = await getRecord(want);
      setRecord(r.permit);
      setForm({ ...EMPTY, ...r.permit });
      return;
    } catch {
      /* fallback to first item */
    }
    try {
      const l = await listRecords("");
      const first = l.items?.[0];
      if (first?.permitId) {
        const r = await getRecord(first.permitId);
        setRecord(r.permit);
        setForm({ ...EMPTY, ...r.permit });
      }
    } catch {
      /* keep default EMPTY */
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadList();
    prefill();
  }, [loadSettings, loadList, prefill]);

  useEffect(() => {
    if (tab === "list") loadList(q);
  }, [tab, q, loadList]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Keep fallback text & position whenever a field is empty
  const valOrDefault = (key) => {
    const raw = form[key];
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      return raw;
    }
    return DEFAULT_CERT[key] ?? "—";
  };

  const hasPermitExtra = Boolean(
    String(valOrDefault("contractNote")).trim() ||
    String(valOrDefault("workSites")).trim(),
  );
  const compact = layout === "auto" ? !hasPermitExtra : layout === "compact";

  const qrTarget = useMemo(() => {
    if (record?.qrTarget) return record.qrTarget;
    const base = settings.publicBaseUrl || API || window.location.origin;
    return `${base}/v/${form.permitId || valOrDefault("permitNo")}`;
  }, [record, settings.publicBaseUrl, form.permitId, form.permitNo]);

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const payload = { ...form, permitId: form.permitId || undefined };
      const res = record
        ? await updateRecord(record.permitId, payload)
        : await saveRecord(payload);
      setRecord(res.permit);
      setForm({ ...EMPTY, ...res.permit });
      flash(
        record
          ? "MongoDB میں اپڈیٹ ہو گیا ✓"
          : "MongoDB میں محفوظ ہو گیا ✓ — QR بن گیا",
      );
      loadList(q);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const downloadCertificatePdf = (customName) => {
    const prevTitle = document.title;
    const fileTitle =
      customName || valOrDefault("workerName") || valOrDefault("permitNo");
    document.title = fileTitle.replace(/\s+/g, "_");
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  const openRecord = async (id, autoPrint = false) => {
    setBusy(true);
    setErr("");
    try {
      const r = await getRecord(id);
      setRecord(r.permit);
      setForm({ ...EMPTY, ...r.permit });
      setTab("new");
      flash("ریکارڈ لوڈ ہو گیا: " + id);
      if (autoPrint) {
        setTimeout(
          () =>
            downloadCertificatePdf(
              r.permit.workerName || r.permit.permitNo || id,
            ),
          350,
        );
      }
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const downloadQr = async () => {
    try {
      const blob = await qrPngBlob(qrTarget, { size: 1024, dark: ink });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${record?.permitId || "permit"}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      flash("1024px PNG ڈاؤن لوڈ ✓");
    } catch (e) {
      setErr(e.message);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrTarget);
      flash("URL کاپی ہو گیا ✓");
    } catch {
      setErr("clipboard blocked");
    }
  };

  const applyDomain = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await setDomain(dom);
      setSettings({ publicBaseUrl: r.publicBaseUrl });
      flash(`ڈومین محفوظ ✓ — ${r.report?.updated ?? 0} QR دوبارہ بنے`);
      loadList(q);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="app" dir="rtl">
      <header className="top no-print">
        <div className="brand">
          <span className="mark" />
          <div>
            <h1 className="urdu">اجازت نامہ — MongoDB + QR + PDF</h1>
            <p className="ltr">
              Express · Mongoose · Sample Document · Internal Demo
            </p>
          </div>
        </div>
        <div className="pill">
          {record ? "لوڈ شدہ · " + record.permitId : "نیا اندراج"}
        </div>
      </header>

      <nav className="tabs no-print">
        {[
          ["new", "نیا اندراج / فارم"],
          ["list", "ریکارڈز (MongoDB)"],
          ["domain", "ڈومین اور QR"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={"tab" + (tab === k ? " tab--on" : "")}
            onClick={() => setTab(k)}
          >
            {l}
          </button>
        ))}
      </nav>

      {err && <div className="errbar urdu-text no-print">خرابی: {err}</div>}
      {note && <div className="notebar urdu-text no-print">{note}</div>}

      {tab === "new" && (
        <main className="grid">
          {/* Left Form Panel */}
          <section className="card no-print">
            <h2 className="urdu">فارم بھریں</h2>
            <p className="hint urdu-text">
              فارم خود بخود MongoDB سے بھر جاتا ہے۔ نیچے{" "}
              <b>PDF ڈاؤن لوڈ کریں</b> بٹن سے سرٹیفکیٹ نمونہ ڈیزائن میں ڈاؤن لوڈ
              کریں۔
            </p>

            <div className="fields">
              <label className="fld">
                <span className="fld__lb urdu-text">
                  ID (خالی چھوڑیں تو خود بنے گا)
                </span>
                <div className="inkrow">
                  <input
                    value={form.permitId}
                    dir="ltr"
                    placeholder="abc12345"
                    onChange={(e) =>
                      set(
                        "permitId",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                  />
                  <button
                    className="btn btn--ghost"
                    type="button"
                    onClick={() => set("permitId", nowId())}
                  >
                    خود
                  </button>
                </div>
              </label>

              <label className="fld">
                <span className="fld__lb urdu-text">عنوان التصريح</span>
                <input
                  value={form.title ?? ""}
                  dir="rtl"
                  onChange={(e) => set("title", e.target.value)}
                />
              </label>

              {FIELDS.map(([k, label, dir]) => (
                <label className="fld" key={k}>
                  <span className="fld__lb urdu-text">{label}</span>
                  <input
                    value={form[k] ?? ""}
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
                  <input
                    value={ink}
                    dir="ltr"
                    onChange={(e) => setInk(e.target.value)}
                  />
                </div>
              </label>
            </div>

            <label className="fld">
              <span className="fld__lb urdu-text">
                ڈیٹا لے آؤٹ — خودکار / مکمل / مختصر
              </span>
              <div className="idrow">
                {[
                  ["auto", "خودکار"],
                  ["full", "مکمل"],
                  ["compact", "مختصر"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={"mini" + (layout === k ? " mini--pdf" : "")}
                    onClick={() => setLayout(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <span
                className="urdu-text"
                style={{ fontSize: 11, color: "#667085" }}
              >
                خودکار: اگر «نبذة عن التعاقد / مواقع العمل» میں ڈیٹا ہو تو مکمل،
                ورنہ مختصر۔
              </span>
            </label>

            <div className="acts">
              <button className="btn" onClick={save} disabled={busy}>
                {record ? "اپڈیٹ کریں" : "محفوظ کریں + QR"}
              </button>
              <button
                className="btn btn--pdf"
                type="button"
                onClick={() => downloadCertificatePdf()}
              >
                PDF ڈاؤن لوڈ کریں
              </button>
              {record && (
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setRecord(null);
                    setForm(EMPTY);
                  }}
                >
                  نیا
                </button>
              )}
              <button
                className="btn btn--ghost"
                onClick={downloadQr}
                disabled={!record}
              >
                QR PNG
              </button>
            </div>

            <div className="url-box-card">
              <span
                className="urdu-text"
                style={{ fontSize: 12, color: "#475467" }}
              >
                QR لنک:
              </span>
              <code
                className="ltr"
                style={{ fontSize: 11, wordBreak: "break-all" }}
              >
                {qrTarget}
              </code>
              <div className="idrow" style={{ marginTop: 6 }}>
                <button className="mini" type="button" onClick={copyUrl}>
                  URL کاپی
                </button>
                {record && (
                  <a
                    className="mini"
                    href={qrTarget}
                    target="_blank"
                    rel="noreferrer"
                  >
                    اسکین پیج کھولیں
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Right Certificate Live Preview */}
          <section className="prevwrap">
            <div className="prevhd-row no-print">
              <span className="urdu-text">
                پری ویو — نمونہ دستاویز کا پری ویو
              </span>
              <button
                className="btn btn--pdf btn--sm"
                type="button"
                onClick={() => downloadCertificatePdf()}
              >
                تحميل / طباعة PDF
              </button>
            </div>

            <article className="cert-sheet" id="sample-certificate-pdf">
              {/* Header Band: Single outer border, no vertical divider lines */}
              <div className="cert-top-header">
                <div className="cert-top__cell cert-top__cell--r">
                  <div className="cert-marks">
                    <img
                      src={hrsdStarImg}
                      alt="الشعار"
                      className="top-ajeer-logo"
                    />
                    <div className="ministry-text">
                      <span className="ministry-text-font">
                        الموارد البشرية
                      </span>
                      <span className="ministry-text-font">
                        والتنمية الاجتماعية
                      </span>
                    </div>
                    <img
                      src={ajeerLogoImg}
                      alt="أجير"
                      className="top-ajeer-text"
                    />
                  </div>
                </div>

                <div className="cert-top__cell cert-top__cell--c">
                  <h1 className="cert-main-title">تصريح أجير – تعاقد أجير</h1>
                </div>

                <div className="cert-top__cell cert-top__cell--l">
                  <div className="cert-qr-block">
                    <StyledQr value={qrTarget} size={74} dark={ink} />
                    <span className="cert-qr-no ltr-center">
                      {valOrDefault("permitNo")}
                    </span>
                    <span className="cert-qr-hint">امسح للتحقق</span>
                  </div>
                </div>
              </div>

              {/* Intro paragraph */}
              <p className="cert-intro">
                نشعركم أنه تم التعاقد من قبلنا كجهة مقدمة للخدمة مع الجهة
                المستفيدة من الخدمة حسب المعلومات المبينة أدناه، ولذلك تم تسجيل
                معلومات العقد لتكون بحوزة العامل لإثبات عدم مخالفته لنظام العمل
                ولتقديمها إلى من يهمه الأمر من الجهات المختصة عند طلبها للتحقق
                من صحة تواجده في مكان تقديم الخدمة
              </p>

              {/* Data Table */}
          <table className="cert-tbl">
  <colgroup>
    <col />
    <col />
    <col />
    <col />
  </colgroup>
  <tbody>
    {/* 1. بيانات العامل */}
    <tr>
      <td className="cert-bar" colSpan={4}>
        بيانات العامل
      </td>
    </tr>
    <tr className="h-standard">
      <td className="cert-lbl-cell">اسم العامل</td>
      <td className="cert-val-cell ltr-right">
        {valOrDefault("workerName")}
      </td>
      <td className="cert-lbl-cell">المهنة</td>
      <td className="cert-val-cell">{valOrDefault("profession")}</td>
    </tr>
    <tr className="h-standard">
      <td className="cert-lbl-cell">رقم الهوية / الإقامة</td>
      <td className="cert-val-cell ltr">{valOrDefault("idNumber")}</td>
      <td className="cert-lbl-cell">الجنسية</td>
      <td className="cert-val-cell">{valOrDefault("nationality")}</td>
    </tr>

    {/* 2. بيانات مقدم الخدمة */}
    <tr>
      <td className="cert-bar" colSpan={4}>
        بيانات مقدم الخدمة
      </td>
    </tr>
    <tr className="h-tall">
      <td className="cert-lbl-cell">المنشأة المقدمة للخدمة</td>
      <td className="cert-val-cell">{valOrDefault("providerCompany")}</td>
      <td className="cert-lbl-cell cert-lbl-center">
        رقم المنشأة في وزارة الموارد البشرية و التنمية الإجتماعية
      </td>
      <td className="cert-val-cell ltr">{valOrDefault("providerCr")}</td>
    </tr>

    {/* 3. بيانات المستفيد من الخدمة */}
    <tr>
      <td className="cert-bar" colSpan={4}>
        بيانات المستفيد من الخدمة
      </td>
    </tr>
    <tr className="h-tall">
      <td className="cert-lbl-cell">المنشأة المستفيدة من الخدمة</td>
      <td className="cert-val-cell">{valOrDefault("beneficiaryCompany")}</td>
      <td className="cert-lbl-cell cert-lbl-center">
        رقم المنشأة في وزارة الموارد البشرية و التنمية الإجتماعية
      </td>
      <td className="cert-val-cell ltr">{valOrDefault("beneficiaryCr")}</td>
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
        <td className="cert-val-cell ltr" colSpan={3}>
          {valOrDefault("contractNote")}
        </td>
      </tr>
    )}
    <tr className="h-standard">
      <td className="cert-lbl-cell">تاريخ بداية التصريح</td>
      <td className="cert-val-cell ltr">{valOrDefault("startDate")}</td>
      <td className="cert-lbl-cell">تاريخ نهاية التصريح</td>
      <td className="cert-val-cell ltr">{valOrDefault("endDate")}</td>
    </tr>
    {!compact && (
      <tr className="h-standard">
        <td className="cert-lbl-cell">مواقع العمل</td>
        <td className="cert-val-cell ltr-right" colSpan={3}>
          {valOrDefault("workSites")}
        </td>
      </tr>
    )}
  </tbody>
</table>
              {/* 5. إقرارات */}
              <div className="cert-decl">
                <div className="cert-decl__title">إقرارات</div>
                <div className="cert-decl__sub">
                  أقر أنا المنشأة المقدمة للخدمة والموضحة بياناتي أعلاه وأتعهد
                  بـ:
                </div>
                <ul className="cert-decl__list">
                  <li>
                    إن العامل حامل هذا التصريح بحمله له يقر ويتعهد بأن البيانات
                    المدونة فيه صحيحة على مسؤوليته الشخصية، وأنه يعمل لدى
                    المنشأة ولحسابها، بموجب رخصة إقامة سارية المفعول. وأتحمل أي
                    تبعات قانونية أو غرامات تترتب على خلاف المذكور أعلاه.
                  </li>
                  <li>
                    الالتزام والتقيد بأنظمة العمل والعمال وأي أنظمة و لوائح
                    وقرارات أخرى ذات علاقة.
                  </li>
                  <li>
                    أن الموقع الإلكتروني الخاص بأجير أو القائمين عليه عبارة عن
                    وسيط إلكتروني ما بين الباحثين عن العمل وأصحاب الأعمال فقط
                    وبدون أي التزام قانوني أو غيره على القائمين على موقع أجير.
                  </li>
                  <li>أي تعديل أو كشط في هذا التصريح يجعله لاغياً.</li>
                </ul>
              </div>

              {/* Footer */}
              <div className="cert-footer">
                <div>
                  للتحقق من صحة هذا التصريح وسريان مفعوله بإمكانك زيارة موقع
                  أجير (https://ajeer.com.sa)
                </div>
                <div>
                  * خدمة معتمدة من وزارة الموارد البشرية والتنمية الإجتماعية *
                </div>
              </div>
            </article>
          </section>
        </main>
      )}

      {tab === "list" && (
        <main className="wide no-print">
          <div className="listbar">
            <input
              placeholder="رقم التصريح / نام / ID تلاش کریں"
              value={q}
              dir="rtl"
              onChange={(e) => setQ(e.target.value)}
              className="search"
            />
            <button
              className="btn btn--ghost"
              onClick={() => loadList(q)}
              disabled={busy}
            >
              ریفریش
            </button>
            <span className="count urdu-text">{items.length} ریکارڈ</span>
          </div>

          {items.length === 0 ? (
            <div className="empty urdu-text">
              کوئی ریکارڈ نہیں — پہلے فارم سے ایک محفوظ کریں۔
            </div>
          ) : (
            <div className="reclist">
              {items.map((it) => (
                <div className="rec" key={it.permitId}>
                  <img
                    className="rec__qr"
                    src={`${API}/qr/${it.permitId}.png`}
                    alt={"QR " + it.permitId}
                  />
                  <div className="rec__body">
                    <div className="rec__top">
                      <strong className="ltr">
                        {it.permitNo || it.permitId}
                      </strong>
                      <span className="badge">{statusOf(it).ar}</span>
                    </div>
                    <div className="rec__name ltr">{it.workerName || "—"}</div>
                    <div className="rec__meta ltr">
                      ID {it.idNumber || "—"} · {it.startDate || "—"} →{" "}
                      {it.endDate || "—"}
                    </div>
                    <div className="rec__url ltr">
                      {it.qr?.targetUrl ||
                        `${settings.publicBaseUrl}/v/${it.permitId}`}
                    </div>
                  </div>
                  <div className="rec__acts">
                    <button
                      className="mini"
                      onClick={() => openRecord(it.permitId, false)}
                    >
                      کھولیں
                    </button>
                    <button
                      className="mini mini--pdf"
                      onClick={() => openRecord(it.permitId, true)}
                    >
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

      {tab === "domain" && (
        <main className="wide no-print">
          <section className="card">
            <h2 className="urdu">ڈومین / QR بیس URL</h2>
            <p className="hint urdu-text">
              یہ وہی host ہے جو QR کے اندر لکھا جاتا ہے (
              <code className="ltr">BASE/v/&lt;id&gt;</code>)۔ یہ MongoDB کے{" "}
              <code className="ltr">UrlConfig</code> میں محفوظ رہتا ہے۔ بدلنے پر
              سارے QR نئے ڈومین کے ساتھ دوبارہ بنتے ہیں، id اور ڈیٹا وہی رہتا
              ہے۔
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
              <button
                className="btn"
                onClick={applyDomain}
                disabled={busy || !dom}
              >
                محفوظ + QR ری جنریٹ
              </button>
            </div>
            <p className="warnbox urdu-text">
              نوٹ: QR میں host لکھا ہوتا ہے، اس لیے جو QR پرنٹ ہو چکا ہے وہ
              پرانے host پر ہی جائے گا۔ پرانا ڈومین زندہ رکھیں اور{" "}
              <code className="ltr">/v/:id</code> کو نئے ڈومین پر redirect کر
              دیں، ورنہ هر تبدیلی پر QR دوبارہ پرنٹ کرنا پڑے گا۔
            </p>
          </section>
        </main>
      )}
    </div>
  );
}
