import { useState } from "react";

// Deployed backend ka URL yahan lagayein (phone se test = LAN IP ya deployed URL)
const API_URL = import.meta.env.VITE_API_URL || "https://ajeer-qiwa-se.vercel.app/";

export default function Home() {
  const [form, setForm] = useState({
    permitNo: "", workerName: "", profession: "", nationality: "",
    iqama: "", provider: "", beneficiary: "", startDate: "",
    endDate: "", location: "", permitType: "",
    establishmentNo: "", establishmentName: "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const [qr, setQr] = useState(null); // { target, dataUrl }
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setSaved(null); setQr(null);
    try {
      const r = await fetch(`${API_URL}/api/save-permit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || "Save failed");

      // save hote hi QR bhi generate — data Mongo me, QR me scan-URL
      const q = await fetch(`${API_URL}/api/qr/${encodeURIComponent(form.permitNo)}`).then((x) => x.json());
      if (!q.success) throw new Error(q.message || "QR failed");

      setSaved(j.permit);
      setQr(q);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.banner}>
        TEST / DEMO — يہ ایک ذاتی ٹیسٹ سسٹم ہے، سرکاری دستاویز نہیں
      </div>
      <div style={styles.card}>
        <h2 style={styles.heading}>سروس ریکارڈ – فارغ از سرکاری استعمال</h2>
        <p style={styles.sub}>Private service-record (demo) — fill → save → QR</p>

        <form onSubmit={submit} style={styles.form}>
          {[
            ["permitNo", "رقم ریکارڈ"], ["workerName", "اسم العامل"],
            ["profession", "المہنی"], ["nationality", "الجنس"],
            ["iqama", "رقم الاقامہ"], ["provider", "مقدم الخدمہ"],
            ["beneficiary", "المستفید"], ["startDate", "تاریخ البدا"],
            ["endDate", "تاریخ ختم"], ["location", "مقام"],
            ["permitType", "قسم"], ["establishmentNo", "رقم المنشاہ"],
            ["establishmentName", "نام المنشاہ"],
          ].map(([k, label]) => (
            <label key={k} style={styles.fld}>
              <span style={styles.lb}>{label}</span>
              <input style={styles.inp} dir="auto" required={k === "permitNo"}
                value={form[k]} onChange={set(k)} />
            </label>
          ))}
          <button disabled={busy} style={styles.btn}>
            {busy ? "..." : "Save + QR"}
          </button>
        </form>

        {err && <div style={styles.err}>{err}</div>}

        {qr && (
          <div style={styles.qrBox}>
            <img src={qr.dataUrl} alt="QR" style={{ width: 220, height: 220 }} />
            <p style={styles.qrTarget}>{qr.target}</p>
            <a style={styles.link} href={qr.target}>Open verify page ↗</a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f2f4f7", padding: "20px 12px", fontFamily: "Arial, sans-serif", direction: "rtl" },
  banner: { maxWidth: 760, margin: "0 auto 14px", background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", textAlign: "center", fontWeight: "bold", fontSize: 14 },
  card: { maxWidth: 760, margin: "0 auto", background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 3px 15px rgba(0,0,0,.08)" },
  heading: { textAlign: "center", color: "#183b35", margin: "0 0 4px" },
  sub: { textAlign: "center", color: "#777", margin: "0 0 18px", fontSize: 13 },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 },
  fld: { display: "flex", flexDirection: "column", gap: 4 },
  lb: { fontSize: 13, color: "#555", fontWeight: "bold" },
  inp: { border: "1px solid #d8dee4", borderRadius: 7, padding: "9px 10px", fontSize: 14 },
  btn: { gridColumn: "1 / -1", background: "#183b35", color: "#fff", border: 0, borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: "bold", cursor: "pointer" },
  err: { marginTop: 14, background: "#fef2f2", color: "#b42318", padding: 12, borderRadius: 8 },
  qrBox: { marginTop: 20, textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18 },
  qrTarget: { wordBreak: "break-all", color: "#475569", fontSize: 13 },
  link: { color: "#0f766e", fontWeight: "bold" },
};
