import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// Deployed backend ka URL (phone se test = LAN IP ya deployed URL, localhost nahi)
const API_URL = import.meta.env.VITE_API_URL || "https://ajeer-qiwa-se.vercel.app/";

export default function ViewPermit() {
  const { permitNo } = useParams();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!permitNo) {
      setError("Record number not found.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    async function fetchPermit() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(
          `${API_URL}/api/permit/${encodeURIComponent(permitNo)}`,
          { signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Record not found.");
        }
        const recordData = result.permit || result.data || result;
        if (!recordData || !recordData.permitNo) {
          throw new Error("Invalid record information.");
        }
        setPermit(recordData);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load record.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchPermit();
    return () => controller.abort();
  }, [permitNo]);

  if (loading) {
    return (
      <div style={styles.center}>
        <h3>جاری ہے...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>ریکارڈ نہیں ملا</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.banner}>
        TEST / DEMO — یہ سرکاری دستاویز نہیں، صرف ذاتی ریکارڈ ہے
      </div>
      <div style={styles.card}>
        <h2 style={styles.heading}>سروس ریکارڈ (ڈیمو)</h2>
        <p style={styles.subheading}>ریکارڈ کی معلومات</p>

        <div style={styles.status}>ریکارڈ ڈیٹا بیس سے مل گیا</div>

        <Field label="رقم ریکارڈ" value={permit.permitNo} />
        <Field label="اسم العامل" value={permit.workerName} />
        <Field label="المہنی" value={permit.profession} />
        <Field label="الجنس" value={permit.nationality} />
        <Field label="رقم الاقامہ" value={permit.iqama} />
        <Field label="مقدم الخدمہ" value={permit.provider} />
        <Field label="المستفید" value={permit.beneficiary} />
        <Field label="تاریخ البدا" value={permit.startDate} />
        <Field label="تاریخ ختم" value={permit.endDate} />
        <Field label="مقام" value={permit.location} />
        <Field label="قسم" value={permit.permitType} />
        <Field label="رقم المنشاہ" value={permit.establishmentNo} />
        <Field label="نام المنشاہ" value={permit.establishmentName} />

        <p style={styles.footer}>
          TEST/DEMO system record — not an official document.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value || "-"}</span>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f2f4f7", padding: "25px 12px", direction: "rtl", fontFamily: "Arial, sans-serif" },
  banner: { maxWidth: 650, margin: "0 auto 14px", background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", textAlign: "center", fontWeight: "bold", fontSize: 14 },
  card: { maxWidth: 650, margin: "0 auto", background: "#fff", padding: 25, borderRadius: 12, boxShadow: "0 3px 15px rgba(0,0,0,0.08)" },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif", textAlign: "center", padding: 20 },
  heading: { textAlign: "center", color: "#183b35", marginBottom: 5 },
  subheading: { textAlign: "center", color: "#777", marginBottom: 20 },
  status: { background: "#edf5ef", color: "#27623a", padding: 12, borderRadius: 7, textAlign: "center", marginBottom: 20 },
  field: { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #eee", padding: "13px 0" },
  label: { color: "#555", fontWeight: "bold" },
  value: { color: "#222", textAlign: "left", overflowWrap: "anywhere" },
  footer: { textAlign: "center", color: "#888", fontSize: 12, marginTop: 25 },
};
