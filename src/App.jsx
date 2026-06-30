import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { initializeApp } from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile,
} from "firebase/auth";
import {
  getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
  updateDoc, increment, arrayUnion, arrayRemove, deleteDoc,
} from "firebase/firestore";

// ── Firebase Config ────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCrxQj-ps-w8yjbGEiNfeodcDkgDsYVAeg",
  authDomain: "harmony-app-39299.firebaseapp.com",
  projectId: "harmony-app-39299",
  storageBucket: "harmony-app-39299.firebasestorage.app",
  messagingSenderId: "232841464057",
  appId: "1:232841464057:web:2e74e1fe08e0576de8fa28",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CLOUDINARY_CLOUD = "dxmmsq0gq";
const CLOUDINARY_PRESET = "harmony";

// ── Design Tokens ──────────────────────────────────────────────
const C = {
  primary: "#7C3AED",
  primaryDark: "#1E1B4B",
  primaryLight: "#EDE9FE",
  accent: "#F59E0B",
  success: "#10B981",
  error: "#EF4444",
  text: "#1E1B4B",
  textMuted: "#6B7280",
  bg: "#F8F7FF",
  white: "#FFFFFF",
  border: "#E5E7EB",
  card: "#FFFFFF",
  surface: "#F3F4F6",
};

const font = { display: "'Sora', sans-serif", body: "'Inter', sans-serif" };

// ── Shared Styles ──────────────────────────────────────────────
const S = {
  page: { padding: "16px 16px 90px", maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.bg },
  card: { background: C.white, borderRadius: 16, boxShadow: "0 2px 12px rgba(124,58,237,0.07)", overflow: "hidden" },
  input: { width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: font.body, outline: "none", boxSizing: "border-box", background: C.white, color: C.text },
  btn: (v = "primary") => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer",
    fontFamily: font.body, fontWeight: 600, fontSize: 14, transition: "all 0.2s",
    ...(v === "primary" ? { background: `linear-gradient(135deg, ${C.primary}, #6D28D9)`, color: C.white, boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }
      : v === "outline" ? { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` }
      : v === "ghost" ? { background: "transparent", color: C.textMuted, padding: "8px 12px" }
      : { background: C.surface, color: C.text }),
  }),
  label: { fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: "block", fontFamily: font.body },
  sectionTitle: { fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 4 },
  modal: { position: "fixed", inset: 0, background: "rgba(30,27,75,0.5)", backdropFilter: "blur(4px)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modalBox: { background: C.white, borderRadius: "24px 24px 0 0", padding: 24, paddingBottom: 40, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" },
  avatar: (size = 44) => ({ width: size, height: size, borderRadius: "50%", objectFit: "cover", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }),
  tag: { display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: C.primaryLight, color: C.primary },
};

// ── Helpers ───────────────────────────────────────────────────
const timeAgo = (ts) => {
  if (!ts) return "";
  const t = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

const uploadMedia = async (file, resourceType = "image") => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", CLOUDINARY_PRESET);
  data.append("cloud_name", CLOUDINARY_CLOUD);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`, { method: "POST", body: data });
  const result = await res.json();
  return result.secure_url;
};

const CATEGORIES = ["Academic", "Religious", "Sports", "Leadership", "Arts & Culture", "Volunteer", "Entrepreneurship", "Departmental", "Social"];

// ── Register Service Worker ────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ══════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── Logo ──────────────────────────────────────────────────────
function HarmonyLogo({ size = 28 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      </div>
      <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: size * 0.75, color: C.primaryDark, letterSpacing: "-0.5px" }}>Harmony</span>
    </div>
  );
}

// ── Splash Screen ─────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.primaryDark} 0%, #312E81 50%, #4C1D95 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, overflow: "hidden", position: "relative" }}>
      {/* Background circles */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(124,58,237,0.15)", top: -100, right: -100 }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(245,158,11,0.08)", bottom: -80, left: -80 }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(124,58,237,0.1)", bottom: 100, right: 40 }} />

      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "fadeIn 0.8s ease" }}>
        <div style={{ width: 100, height: 100, borderRadius: 28, background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(124,58,237,0.5)" }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 44, color: C.white, letterSpacing: "-1.5px", lineHeight: 1 }}>Harmony</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontFamily: font.body, fontSize: 15, marginTop: 10, letterSpacing: 0.3 }}>Connecting Students to Campus Communities</div>
        </div>
        {/* Loading dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 40 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? C.accent : "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Onboarding Screen ──────────────────────────────────────────
const ONBOARDING_SLIDES = [
  {
    emoji: "🏛️",
    title: "Discover Your Community",
    desc: "Explore hundreds of student associations, clubs, fellowships, and societies on your campus — all in one place.",
    bg: `linear-gradient(160deg, #1E1B4B 0%, #312E81 100%)`,
    accent: "#7C3AED",
  },
  {
    emoji: "🎬",
    title: "Stay in the Loop",
    desc: "Watch videos, read announcements, and discover events from associations you follow — just like your favourite social app.",
    bg: `linear-gradient(160deg, #1E1B4B 0%, #4C1D95 100%)`,
    accent: "#F59E0B",
  },
  {
    emoji: "🤝",
    title: "Connect & Belong",
    desc: "Follow associations, attend events, send messages, and find your people on campus.",
    bg: `linear-gradient(160deg, #312E81 0%, #1E1B4B 100%)`,
    accent: "#10B981",
  },
];

function OnboardingScreen({ onDone }) {
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const touchStartX = useRef(0);

  const goTo = (idx) => {
    if (animating || idx === slide) return;
    setAnimating(true);
    setTimeout(() => { setSlide(idx); setAnimating(false); }, 250);
  };

  const next = () => {
    if (slide < ONBOARDING_SLIDES.length - 1) goTo(slide + 1);
    else onDone();
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (dx > 50 && slide < ONBOARDING_SLIDES.length - 1) goTo(slide + 1);
    if (dx < -50 && slide > 0) goTo(slide - 1);
  };

  const s = ONBOARDING_SLIDES[slide];

  return (
    <div style={{ minHeight: "100vh", background: s.bg, display: "flex", flexDirection: "column", transition: "background 0.4s ease", overflow: "hidden", position: "relative" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Skip button */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "52px 24px 0" }}>
        <button style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20, padding: "8px 16px", color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: font.body, fontWeight: 600, cursor: "pointer" }}
          onClick={onDone}>Skip</button>
      </div>

      {/* Background decoration */}
      <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: `${s.accent}15`, top: -60, right: -80, transition: "all 0.4s" }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: `${s.accent}10`, bottom: 120, left: -60, transition: "all 0.4s" }} />

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 36px", opacity: animating ? 0 : 1, transition: "opacity 0.25s ease" }}>
        {/* Illustration */}
        <div style={{ width: 140, height: 140, borderRadius: 40, background: `linear-gradient(135deg, ${s.accent}30, ${s.accent}10)`, border: `2px solid ${s.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 40, boxShadow: `0 20px 60px ${s.accent}25` }}>
          <span style={{ fontSize: 64 }}>{s.emoji}</span>
        </div>

        <h2 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 28, color: C.white, textAlign: "center", marginBottom: 16, lineHeight: 1.2, letterSpacing: "-0.5px" }}>{s.title}</h2>
        <p style={{ fontFamily: font.body, fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.6, maxWidth: 300 }}>{s.desc}</p>
      </div>

      {/* Bottom */}
      <div style={{ padding: "0 28px 52px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <div key={i} onClick={() => goTo(i)} style={{ height: 8, width: i === slide ? 28 : 8, borderRadius: 4, background: i === slide ? s.accent : "rgba(255,255,255,0.25)", transition: "all 0.3s ease", cursor: "pointer" }} />
          ))}
        </div>

        {/* Button */}
        <button style={{ width: "100%", padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: font.display, fontWeight: 700, fontSize: 16, background: slide === ONBOARDING_SLIDES.length - 1 ? `linear-gradient(135deg, ${C.primary}, #6D28D9)` : "rgba(255,255,255,0.15)", color: "white", backdropFilter: "blur(8px)", boxShadow: slide === ONBOARDING_SLIDES.length - 1 ? "0 8px 24px rgba(124,58,237,0.4)" : "none", transition: "all 0.3s" }}
          onClick={next}>
          {slide === ONBOARDING_SLIDES.length - 1 ? "Get Started 🎓" : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ── Welcome Back Screen ────────────────────────────────────────
function WelcomeBackScreen({ user, onContinue }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.primaryDark} 0%, #312E81 60%, #4C1D95 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, position: "relative", overflow: "hidden" }}>
      {/* Background decoration */}
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(124,58,237,0.12)", top: -80, right: -80 }} />
      <div style={{ position: "absolute", width: 250, height: 250, borderRadius: "50%", background: "rgba(245,158,11,0.08)", bottom: -60, left: -60 }} />

      {/* Logo small */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, color: C.white }}>Harmony</span>
      </div>

      {/* Avatar */}
      <div style={{ width: 90, height: 90, borderRadius: "50%", border: `3px solid rgba(255,255,255,0.2)`, overflow: "hidden", background: `linear-gradient(135deg, ${C.primary}40, ${C.accent}20)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 36 }}>👤</span>}
      </div>

      {/* Greeting */}
      <p style={{ fontFamily: font.body, fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{greeting} 👋</p>
      <h2 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 28, color: C.white, textAlign: "center", marginBottom: 10, letterSpacing: "-0.5px" }}>
        Welcome back,<br />{user?.name?.split(" ")[0] || "Explorer"}!
      </h2>
      <p style={{ fontFamily: font.body, fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 48, lineHeight: 1.5 }}>
        Ready to explore what's happening<br />on campus today?
      </p>

      {/* Continue button */}
      <button style={{ width: "100%", maxWidth: 320, padding: "16px", borderRadius: 16, border: "none", cursor: "pointer", fontFamily: font.display, fontWeight: 700, fontSize: 16, background: `linear-gradient(135deg, ${C.primary}, #6D28D9)`, color: "white", boxShadow: "0 8px 24px rgba(124,58,237,0.45)", marginBottom: 16 }}
        onClick={onContinue}>
        Let's Go 🎓
      </button>

      {/* Quick stats row */}
      <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
        {[
          { icon: "🏛️", label: user?.role === "association" ? "Association" : "Student" },
          { icon: "🎵", label: "Harmony" },
          { icon: "📅", label: "Events" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: font.body, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const { user } = await signInWithEmailAndPassword(auth, form.email, form.password);
        const snap = await getDoc(doc(db, "users", user.uid));
        onAuth({ uid: user.uid, ...snap.data() });
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(user, { displayName: form.name });
        const userData = {
          name: form.name, email: form.email, role: form.role,
          createdAt: serverTimestamp(), followers: 0, following: 0,
          bio: "", photoURL: "", approved: form.role === "student",
        };
        await setDoc(doc(db, "users", user.uid), userData);
        if (form.role === "association") {
          await setDoc(doc(db, "associations", user.uid), {
            name: form.name, ownerId: user.uid, email: form.email,
            approved: false, createdAt: serverTimestamp(),
            category: "Academic", followers: 0, posts: 0,
            description: "", logoURL: "", coverURL: "",
            location: "", contactEmail: form.email,
          });
        }
        onAuth({ uid: user.uid, ...userData });
      }
    } catch (e) { setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "")); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${C.primaryDark} 0%, #312E81 50%, #4C1D95 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h1 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 36, color: C.white, margin: 0, letterSpacing: "-1px" }}>Harmony</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: font.body, fontSize: 14, marginTop: 6 }}>Connecting Students to Campus Communities</p>
      </div>

      {/* Card */}
      <div style={{ background: C.white, borderRadius: 24, padding: 28, width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        {/* Tabs */}
        <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {["login", "register"].map(m => (
            <button key={m} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: font.body, fontWeight: 600, fontSize: 13, transition: "all 0.2s", background: mode === m ? C.white : "transparent", color: mode === m ? C.primary : C.textMuted, boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none" }}
              onClick={() => setMode(m)}>
              {m === "login" ? "Sign In" : "Join Now"}
            </button>
          ))}
        </div>

        {error && <div style={{ background: "#FEF2F2", color: C.error, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontFamily: font.body }}>{error}</div>}

        {mode === "register" && (
          <>
            <label style={S.label}>Full Name</label>
            <input style={{ ...S.input, marginBottom: 14 }} placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <label style={S.label}>I am a</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {["student", "association"].map(r => (
                <button key={r} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `2px solid ${form.role === r ? C.primary : C.border}`, background: form.role === r ? C.primaryLight : C.white, color: form.role === r ? C.primary : C.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: font.body, textTransform: "capitalize" }}
                  onClick={() => setForm({ ...form, role: r })}>
                  {r === "student" ? "👨‍🎓 Student" : "🏛️ Association"}
                </button>
              ))}
            </div>
          </>
        )}
        <label style={S.label}>Email</label>
        <input style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <label style={S.label}>Password</label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input style={{ ...S.input, paddingRight: 44 }} type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onKeyDown={e => e.key === "Enter" && handle()} />
          <button type="button" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 18, padding: 0 }} onClick={() => setShowPass(p => !p)}>
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        <button style={{ ...S.btn(), width: "100%", opacity: loading ? 0.7 : 1 }} onClick={handle} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>
    </div>
  );
}

// ── Top Nav ───────────────────────────────────────────────────
function TopNav({ user, page, setPage, notifCount }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100, background: C.white, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 480, margin: "0 auto" }}>
      <HarmonyLogo size={24} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={{ ...S.btn("ghost"), position: "relative", padding: "8px" }} onClick={() => setPage("notifications")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={page === "notifications" ? C.primary : C.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          {notifCount > 0 && <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: C.error, color: "white", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifCount}</div>}
        </button>
        <button style={{ ...S.btn("ghost"), padding: "6px" }} onClick={() => setPage("messages")}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={page === "messages" ? C.primary : C.textMuted} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────
function BottomNav({ page, setPage, user }) {
  const isExplore = page === "explore";
  const tabs = [
    { id: "home", label: "Home", icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? (isExplore ? "white" : C.primary) : "none"} stroke={active ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted)} strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
    { id: "explore", label: "Explore", icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? (isExplore ? "white" : C.primary) : "none"} stroke={active ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted)} strokeWidth="2" strokeLinecap="round"><polygon points="5,3 19,12 5,21"/></svg> },
    { id: "events", label: "Events", icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? (isExplore ? "white" : C.primary) : "none"} stroke={active ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted)} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id: "search", label: "Discover", icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted)} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
    { id: "profile", label: "Profile", icon: (active) => <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? (isExplore ? "white" : C.primary) : "none"} stroke={active ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted)} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: isExplore ? "rgba(0,0,0,0.5)" : C.white, backdropFilter: isExplore ? "blur(10px)" : "none", borderTop: isExplore ? "1px solid rgba(255,255,255,0.1)" : `1px solid ${C.border}`, display: "flex", maxWidth: 480, margin: "0 auto" }}>
      {tabs.map(t => (
        <button key={t.id} style={{ flex: 1, padding: "10px 4px 6px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }} onClick={() => setPage(t.id)}>
          {t.icon(page === t.id)}
          <span style={{ fontSize: 10, fontFamily: font.body, fontWeight: page === t.id ? 700 : 500, color: page === t.id ? (isExplore ? "white" : C.primary) : (isExplore ? "rgba(255,255,255,0.6)" : C.textMuted) }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Association Card ───────────────────────────────────────────
function AssocCard({ assoc, onClick, compact }) {
  return (
    <div style={{ ...S.card, cursor: "pointer", transition: "transform 0.15s", ...(compact ? { minWidth: 160, flexShrink: 0 } : {}) }} onClick={onClick}>
      <div style={{ height: compact ? 80 : 100, background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, position: "relative", overflow: "hidden" }}>
        {assoc.coverURL ? <img src={assoc.coverURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, opacity: 0.3, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)" }} />}
        <div style={{ position: "absolute", bottom: -20, left: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, border: `3px solid ${C.white}`, overflow: "hidden", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {assoc.logoURL ? <img src={assoc.logoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20 }}>🏛️</span>}
          </div>
        </div>
        {assoc.category && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", borderRadius: 20, padding: "3px 8px", color: "white", fontSize: 10, fontWeight: 600, backdropFilter: "blur(4px)" }}>{assoc.category}</div>}
      </div>
      <div style={{ padding: compact ? "26px 12px 12px" : "28px 14px 14px" }}>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: compact ? 13 : 15, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{assoc.name}</div>
        {!compact && <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font.body, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{assoc.description || "Campus organization"}</div>}
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font.body }}>{assoc.followers || 0} followers</div>
      </div>
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────
function HomePage({ user, setPage, setSelectedAssoc }) {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "associations"), where("approved", "==", true), limit(10));
    getDocs(q).then(snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeatured(all.filter(a => a.followers > 0).sort((a, b) => b.followers - a.followers).slice(0, 6));
      setTrending(all.slice(0, 8));
      setRecent([...all].reverse().slice(0, 6));
    });
  }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const snap = await getDocs(collection(db, "associations"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.approved);
    const lower = q.toLowerCase();
    setSearchResults(all.filter(a =>
      a.name?.toLowerCase().includes(lower) ||
      a.category?.toLowerCase().includes(lower) ||
      a.description?.toLowerCase().includes(lower)
    ));
    setSearching(false);
  };

  const openAssoc = (a) => { setSelectedAssoc(a); setPage("assoc-profile"); };

  return (
    <div style={{ paddingBottom: 90, background: C.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.primaryDark} 0%, #4C1D95 100%)`, padding: "20px 16px 28px" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: font.body, fontSize: 13, margin: "0 0 4px" }}>Good day 👋</p>
        <h2 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, color: C.white, margin: "0 0 16px", letterSpacing: "-0.5px" }}>
          {user?.name?.split(" ")[0] || "Explorer"}
        </h2>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input style={{ ...S.input, paddingLeft: 40, paddingRight: search ? 40 : 16, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", color: C.white, fontSize: 14 }}
            placeholder="Search associations, clubs..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search.trim() && (
            <button style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", color: "white", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => { setSearch(""); setSearchResults([]); setSearching(false); }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Search Results */}
        {search.trim() && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.text, padding: 0 }} onClick={() => { setSearch(""); setSearchResults([]); setSearching(false); }}>←</button>
              <div style={{ ...S.sectionTitle, fontSize: 16, margin: 0 }}>Results for "{search}"</div>
            </div>
            {searching ? <div style={{ textAlign: "center", padding: 24, color: C.textMuted }}>Searching...</div>
              : searchResults.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: C.textMuted }}>No associations found for "{search}"</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {searchResults.map(a => (
                  <div key={a.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => openAssoc(a)}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden", background: C.primaryLight, flexShrink: 0 }}>
                      {a.logoURL ? <img src={a.logoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏛️</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{a.category} · {a.followers || 0} followers</div>
                    </div>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {!search.trim() && (
          <>
            {/* Categories */}
            <div style={{ marginTop: 20, marginBottom: 6 }}>
              <div style={{ ...S.sectionTitle, fontSize: 16 }}>Browse by Category</div>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
              {CATEGORIES.map(cat => (
                <button key={cat} style={{ ...S.tag, whiteSpace: "nowrap", cursor: "pointer", border: "none", padding: "7px 14px", fontSize: 12 }}
                  onClick={() => handleSearch(cat)}>{cat}</button>
              ))}
            </div>

            {/* Featured */}
            {featured.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 12 }}>
                  <div style={S.sectionTitle}>⭐ Featured</div>
                </div>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
                  {featured.map(a => <AssocCard key={a.id} assoc={a} compact onClick={() => openAssoc(a)} />)}
                </div>
              </>
            )}

            {/* Trending */}
            {trending.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 12 }}>
                  <div style={S.sectionTitle}>🔥 Trending</div>
                  <button style={S.btn("ghost")} onClick={() => setPage("search")}>See all</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {trending.slice(0, 5).map(a => (
                    <div key={a.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => openAssoc(a)}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", background: C.primaryLight, flexShrink: 0 }}>
                        {a.logoURL ? <img src={a.logoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏛️</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: font.body }}>{a.category}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{a.followers || 0} followers</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  ))}
                </div>
              </>
            )}

            {trending.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🏛️</div>
                <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginBottom: 8, color: C.text }}>No associations yet</div>
                <div style={{ color: C.textMuted, fontSize: 14 }}>Associations will appear here once approved.</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Explore (TikTok-style) ────────────────────────────────────
// ── Comments Sheet (Portal — renders to document.body, escapes all stacking contexts) ──
function CommentsSheet({ postCount, comments, newComment, setNewComment, user, onClose, onPost }) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* Backdrop — top 30%, video visible behind */}
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: "70vh", background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        height: "70vh", maxHeight: "70vh",
        background: "rgb(18,18,18)",
        borderRadius: "16px 16px 0 0",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 30px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", cursor: "pointer", flexShrink: 0 }} onClick={onClose}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
        </div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <span style={{ color: "white", fontFamily: font.display, fontWeight: 800, fontSize: 15 }}>
            💬 {postCount || 0} comments
          </span>
          <button style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "white", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={onClose}>✕</button>
        </div>

        {/* Scrollable comment list */}
        <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "14px 16px" }}>
          {comments.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
              <div style={{ fontSize: 40 }}>💬</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontFamily: font.display, fontWeight: 700, fontSize: 14 }}>Be the first to comment!</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Share your thoughts below</div>
            </div>
          ) : comments.map(c => (
            <div key={c.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, overflow: "hidden" }}>
                {c.userPhoto ? <img src={c.userPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{c.userName}</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.4 }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input bar — sticky bottom, TikTok style */}
        <div style={{
          position: "sticky", bottom: 0, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 12px))",
          background: "rgb(18,18,18)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "white", fontSize: 13 }}>👤</span>}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.12)", borderRadius: 22, padding: "4px 6px 4px 16px" }}>
            <input
              style={{ flex: 1, background: "transparent", border: "none", color: "white", fontSize: 13, outline: "none", fontFamily: font.body, WebkitAppearance: "none" }}
              placeholder="Add comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onPost()}
            />
            <span style={{ fontSize: 17, padding: "0 6px", opacity: 0.7 }}>😊</span>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: "50%", background: newComment.trim() ? C.primary : "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s", boxShadow: newComment.trim() ? "0 4px 12px rgba(124,58,237,0.4)" : "none" }}
            onClick={onPost}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill="white"/></svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ExplorePage({ user, setPage, setSelectedAssoc }) {
  const [videos, setVideos] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [liked, setLiked] = useState({});
  const [following, setFollowing] = useState({});
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    // Fetch all recent posts and filter for those with video media
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Show posts that are type video OR have a video mediaURL
      const videoPosts = all.filter(p =>
        p.type === "video" ||
        (p.mediaURL && (
          p.mediaURL.includes("/video/") ||
          p.mediaURL.match(/\.(mp4|mov|webm|avi|mkv)/i)
        ))
      );
      setVideos(videoPosts);
    });
    return unsub;
  }, []);

  const current = videos[currentIdx];

  const handleLike = async () => {
    if (!current || !user) return;
    const ref = doc(db, "posts", current.id);
    if (liked[current.id]) {
      await updateDoc(ref, { likes: increment(-1) });
      setLiked(p => ({ ...p, [current.id]: false }));
    } else {
      await updateDoc(ref, { likes: increment(1) });
      setLiked(p => ({ ...p, [current.id]: true }));
    }
  };

  const handleFollow = async () => {
    if (!current || !user) return;
    const assocId = current.assocId;
    const ref = doc(db, "associations", assocId);
    if (following[assocId]) {
      await updateDoc(ref, { followers: increment(-1) });
      setFollowing(p => ({ ...p, [assocId]: false }));
    } else {
      await updateDoc(ref, { followers: increment(1) });
      setFollowing(p => ({ ...p, [assocId]: true }));
      await addDoc(collection(db, "notifications"), {
        toUserId: assocId, type: "follow", message: `${user.name} started following you`,
        createdAt: serverTimestamp(), read: false,
      });
    }
  };

  const loadComments = async (postId) => {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const postComment = async () => {
    if (!newComment.trim() || !current) return;
    await addDoc(collection(db, "posts", current.id, "comments"), {
      text: newComment, userId: user.uid, userName: user.name,
      userPhoto: user.photoURL || "", createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", current.id), { comments: increment(1) });
    setNewComment("");
    loadComments(current.id);
  };

  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 50) return;
    if (dy > 0 && currentIdx < videos.length - 1) setCurrentIdx(i => i + 1);
    if (dy < 0 && currentIdx > 0) setCurrentIdx(i => i - 1);
  };

  if (videos.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 56 }}>🎬</div>
        <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, color: "white" }}>No videos yet</div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", padding: "0 32px" }}>Associations will share videos here. Follow some associations to see their content!</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {current && (
        <>
          {current.mediaURL && (
            <video
              ref={videoRef}
              key={current.id}
              src={current.mediaURL}
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
              autoPlay
              loop
              muted={muted}
              playsInline
              webkit-playsinline="true"
              preload="auto"
            />
          )}
          {!current.mediaURL && (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 56 }}>📢</span>
              <div style={{ color: "white", fontSize: 16, fontWeight: 700, textAlign: "center", padding: "0 24px" }}>{current.caption}</div>
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)" }} />

          {/* Right actions */}
          <div style={{ position: "absolute", right: 14, bottom: 120, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* Avatar + Follow */}
            <div style={{ position: "relative", marginBottom: 4 }}>
              <div
                style={{ width: 46, height: 46, borderRadius: "50%", border: "2px solid white", overflow: "hidden", background: "#333", cursor: "pointer" }}
                onClick={() => { if (setSelectedAssoc && setPage && current.assocId) { setSelectedAssoc({ id: current.assocId, name: current.assocName, logoURL: current.assocLogo }); setPage("assoc-profile"); } }}>
                {current.assocLogo ? <img src={current.assocLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏛️</div>}
              </div>
              {current.assocId !== user?.uid && (
                <button onClick={handleFollow} style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", width: 22, height: 22, borderRadius: "50%", background: following[current.assocId] ? "#22C55E" : C.primary, border: "2px solid white", cursor: "pointer", color: "white", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {following[current.assocId] ? "✓" : "+"}
                </button>
              )}
            </div>

            {[
              { icon: liked[current.id] ? "❤️" : "🤍", count: current.likes || 0, action: handleLike },
              { icon: "💬", count: current.comments || 0, action: () => { setShowComments(true); loadComments(current.id); } },
              { icon: "↗️", count: "", action: () => navigator.share?.({ title: current.assocName, url: window.location.href }) },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 28 }} onClick={b.action}>{b.icon}</button>
                {b.count !== "" && <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{b.count}</span>}
              </div>
            ))}

            <button style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setMuted(!muted)}>
              {muted ? "🔇" : "🔊"}
            </button>
          </div>

          {/* Bottom info */}
          <div style={{ position: "absolute", bottom: 90, left: 14, right: 80 }}>
            <div
              style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, color: "white", marginBottom: 4, cursor: "pointer", display: "inline-block" }}
              onClick={() => { if (setSelectedAssoc && setPage && current.assocId) { setSelectedAssoc({ id: current.assocId, name: current.assocName, logoURL: current.assocLogo }); setPage("assoc-profile"); } }}>
              {current.assocName}
            </div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: font.body, lineHeight: 1.4 }}>{current.caption}</div>
          </div>

          {/* Scroll indicators */}
          <div style={{ position: "absolute", right: 4, top: "40%", display: "flex", flexDirection: "column", gap: 4 }}>
            {videos.map((_, i) => (
              <div key={i} style={{ width: 3, height: i === currentIdx ? 18 : 5, borderRadius: 3, background: i === currentIdx ? "white" : "rgba(255,255,255,0.3)", transition: "all 0.3s", cursor: "pointer" }} onClick={() => setCurrentIdx(i)} />
            ))}
          </div>

          {/* Comments Sheet — rendered via portal, escapes all stacking contexts */}
          {showComments && (
            <CommentsSheet
              postCount={current?.comments || 0}
              comments={comments}
              newComment={newComment}
              setNewComment={setNewComment}
              user={user}
              onClose={() => setShowComments(false)}
              onPost={postComment}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Events Page ───────────────────────────────────────────────
function EventsPage({ user, setPage, setSelectedAssoc }) {
  const [events, setEvents] = useState([]);
  const [saved, setSaved] = useState({});
  const [filter, setFilter] = useState("upcoming");

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const saveEvent = async (eventId) => {
    setSaved(p => ({ ...p, [eventId]: !p[eventId] }));
  };

  const now = new Date();
  const filtered = events.filter(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return filter === "upcoming" ? d >= now : d < now;
  });

  return (
    <div style={S.page}>
      <div style={{ ...S.sectionTitle, marginBottom: 4 }}>Events</div>
      <p style={{ color: C.textMuted, fontSize: 13, fontFamily: font.body, marginBottom: 16 }}>Campus events from all associations</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["upcoming", "past"].map(f => (
          <button key={f} style={{ ...S.btn(filter === f ? "primary" : "outline"), padding: "8px 18px", fontSize: 12, borderRadius: 20, textTransform: "capitalize" }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📅</div>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No {filter} events</div>
          <div style={{ color: C.textMuted, fontSize: 14 }}>Check back soon for upcoming events!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map(e => {
            const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
            return (
              <div key={e.id} style={{ ...S.card }}>
                {e.flyerURL && <img src={e.flyerURL} alt={e.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />}
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>{e.assocName}</div>
                    </div>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22 }} onClick={() => saveEvent(e.id)}>
                      {saved[e.id] ? "🔖" : "🏷️"}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted }}>
                      <span>📅</span><span>{date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted }}>
                      <span>🕐</span><span>{e.time || "TBA"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted }}>
                      <span>📍</span><span>{e.venue || "TBA"}</span>
                    </div>
                  </div>
                  {e.description && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font.body, lineHeight: 1.5, margin: 0 }}>{e.description}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button style={{ ...S.btn("outline"), flex: 1, padding: "9px", fontSize: 12 }}
                      onClick={() => navigator.share?.({ title: e.title, text: `${e.title} - ${date.toLocaleDateString()}`, url: window.location.href })}>
                      Share
                    </button>
                    <button style={{ ...S.btn(), flex: 1, padding: "9px", fontSize: 12 }} onClick={() => saveEvent(e.id)}>
                      {saved[e.id] ? "Saved ✓" : "Save Event"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Search / Discover ─────────────────────────────────────────
function SearchPage({ user, setPage, setSelectedAssoc }) {
  const [assocs, setAssocs] = useState([]);
  const [query2, setQuery2] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "associations"), where("approved", "==", true));
    const unsub = onSnapshot(q, snap => setAssocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const filtered = assocs.filter(a => {
    const matchQ = !query2.trim() || a.name?.toLowerCase().includes(query2.toLowerCase()) || a.description?.toLowerCase().includes(query2.toLowerCase());
    const matchCat = category === "All" || a.category === category;
    return matchQ && matchCat;
  });

  return (
    <div style={S.page}>
      <div style={{ ...S.sectionTitle, marginBottom: 12 }}>Discover Associations</div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input style={{ ...S.input, paddingLeft: 42 }} placeholder="Search by name, department..." value={query2} onChange={e => setQuery2(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
        {["All", ...CATEGORIES].map(c => (
          <button key={c} style={{ ...S.tag, whiteSpace: "nowrap", cursor: "pointer", border: "none", padding: "7px 14px", fontSize: 12, background: category === c ? C.primary : C.primaryLight, color: category === c ? "white" : C.primary }} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No results</div>
          <div style={{ color: C.textMuted, fontSize: 14 }}>Try a different search or category.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          {filtered.map(a => <AssocCard key={a.id} assoc={a} compact onClick={() => { setSelectedAssoc(a); setPage("assoc-profile"); }} />)}
        </div>
      )}
    </div>
  );
}

// ── Association Profile ────────────────────────────────────────
function AssocProfilePage({ assoc, user, setPage }) {
  const [fullAssoc, setFullAssoc] = useState(assoc);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState("posts");

  useEffect(() => {
    if (!assoc?.id) return;
    getDoc(doc(db, "associations", assoc.id)).then(d => d.exists() && setFullAssoc({ id: d.id, ...d.data() }));
    getDocs(query(collection(db, "posts"), where("assocId", "==", assoc.id))).then(snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))));
    getDocs(query(collection(db, "events"), where("assocId", "==", assoc.id))).then(snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [assoc?.id]);

  const toggleFollow = async () => {
    if (!user || !assoc?.id) return;
    const ref = doc(db, "associations", assoc.id);
    if (following) {
      await updateDoc(ref, { followers: increment(-1) });
      setFollowing(false);
    } else {
      await updateDoc(ref, { followers: increment(1) });
      setFollowing(true);
    }
  };

  return (
    <div style={{ paddingBottom: 90, background: C.bg, minHeight: "100vh" }}>
      <button style={{ position: "absolute", top: 16, left: 16, zIndex: 10, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "white", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPage("home")}>←</button>

      {/* Cover */}
      <div style={{ height: 160, background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primary})`, position: "relative" }}>
        {fullAssoc?.coverURL && <img src={fullAssoc.coverURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>

      {/* Info */}
      <div style={{ padding: "0 16px", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -28 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, border: `4px solid ${C.white}`, overflow: "hidden", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
            {fullAssoc?.logoURL ? <img src={fullAssoc.logoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 30 }}>🏛️</span>}
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: 4 }}>
            {user?.uid !== assoc?.id && (
              <button style={{ ...S.btn(following ? "outline" : "primary"), padding: "9px 18px", fontSize: 13 }} onClick={toggleFollow}>
                {following ? "Following ✓" : "+ Follow"}
              </button>
            )}
            <button style={{ ...S.btn("outline"), padding: "9px 14px", fontSize: 13 }} onClick={() => setPage("messages")}>
              💬
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <h2 style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 4px" }}>{fullAssoc?.name}</h2>
          {fullAssoc?.category && <span style={S.tag}>{fullAssoc.category}</span>}
          {fullAssoc?.description && <p style={{ fontSize: 13, color: C.textMuted, fontFamily: font.body, marginTop: 8, lineHeight: 1.5 }}>{fullAssoc.description}</p>}

          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, color: C.primary }}>{fullAssoc?.followers || 0}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Followers</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, color: C.primary }}>{posts.length}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Posts</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, color: C.primary }}>{events.length}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Events</div>
            </div>
          </div>

          {/* Contact info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {fullAssoc?.location && <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 8 }}><span>📍</span><span>{fullAssoc.location}</span></div>}
            {fullAssoc?.contactEmail && <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 8 }}><span>📧</span><span>{fullAssoc.contactEmail}</span></div>}
            {fullAssoc?.contactPhone && <div style={{ fontSize: 13, color: C.textMuted, display: "flex", gap: 8 }}><span>📞</span><span>{fullAssoc.contactPhone}</span></div>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 16 }}>
          {["posts", "events", "about"].map(t => (
            <button key={t} style={{ flex: 1, padding: "10px 4px", background: "none", border: "none", cursor: "pointer", fontFamily: font.body, fontWeight: 600, fontSize: 13, color: tab === t ? C.primary : C.textMuted, borderBottom: `2px solid ${tab === t ? C.primary : "transparent"}`, marginBottom: -2, textTransform: "capitalize" }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "posts" && (
          posts.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>No posts yet</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {posts.map(p => <PostCard key={p.id} post={p} user={user} />)}
          </div>
        )}

        {tab === "events" && (
          events.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>No events yet</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {events.map(e => {
              const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
              const isOwner = user?.uid === assoc?.id;
              return (
                <div key={e.id} style={{ ...S.card, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>{e.title}</div>
                      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>📅 {d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {e.time}</div>
                      <div style={{ fontSize: 13, color: C.textMuted }}>📍 {e.venue}</div>
                    </div>
                    {isOwner && (
                      <button style={{ background: "#FEF2F2", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                        onClick={async () => {
                          if (!window.confirm("Delete this event?")) return;
                          await deleteDoc(doc(db, "events", e.id));
                          setEvents(ev => ev.filter(ev2 => ev2.id !== e.id));
                        }}>
                        <span style={{ fontSize: 16 }}>🗑️</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "about" && (
          <div style={{ ...S.card, padding: 16 }}>
            {fullAssoc?.executives?.length > 0 && (
              <>
                <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Executive Members</div>
                {fullAssoc.executives.map((ex, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < fullAssoc.executives.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</span>
                    <span style={{ fontSize: 13, color: C.primary }}>{ex.role}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────
function PostCard({ post, user, setPage, setSelectedAssoc }) {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  const handleLike = async () => {
    await updateDoc(doc(db, "posts", post.id), { likes: increment(liked ? -1 : 1) });
    setLiked(!liked);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    await deleteDoc(doc(db, "posts", post.id));
    if (post.assocId) await updateDoc(doc(db, "associations", post.assocId), { posts: increment(-1) });
    setDeleted(true);
  };

  const loadComments = async () => {
    const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    await addDoc(collection(db, "posts", post.id, "comments"), {
      text: newComment, userId: user?.uid, userName: user?.name,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", post.id), { comments: increment(1) });
    setNewComment("");
    loadComments();
  };

  const isOwner = user?.uid === post.assocId;

  const goToAssoc = () => {
    if (setSelectedAssoc && setPage && post.assocId) {
      setSelectedAssoc({ id: post.assocId, name: post.assocName, logoURL: post.assocLogo });
      setPage("assoc-profile");
    }
  };

  return (
    <div style={S.card}>
      <div style={{ padding: "12px 14px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={goToAssoc}>
          {post.assocLogo ? <img src={post.assocLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>🏛️</span>}
        </div>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={goToAssoc}>
          <div style={{ fontWeight: 700, fontSize: 13, fontFamily: font.display }}>{post.assocName}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>{timeAgo(post.createdAt)}</div>
        </div>
        {post.type && <div style={{ ...S.tag, fontSize: 10 }}>{post.type}</div>}
        {isOwner && (
          <button onClick={handleDelete} style={{ background: "#FEF2F2", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} title="Delete post">
            <span style={{ fontSize: 16 }}>🗑️</span>
          </button>
        )}
      </div>
      {post.mediaURL && (
        post.type === "video"
          ? <video src={post.mediaURL} style={{ width: "100%", maxHeight: 300, objectFit: "cover" }} controls />
          : <img src={post.mediaURL} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "cover" }} />
      )}
      <div style={{ padding: "10px 14px" }}>
        {post.caption && <p style={{ fontSize: 14, color: C.text, fontFamily: font.body, lineHeight: 1.5, margin: "0 0 10px" }}>{post.caption}</p>}
        <div style={{ display: "flex", gap: 16 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: liked ? C.error : C.textMuted, fontSize: 13, fontWeight: 600, fontFamily: font.body }} onClick={handleLike}>
            <span style={{ fontSize: 18 }}>{liked ? "❤️" : "🤍"}</span> {post.likes || 0}
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.textMuted, fontSize: 13, fontWeight: 600, fontFamily: font.body }}
            onClick={() => { setShowComments(!showComments); if (!showComments) loadComments(); }}>
            <span style={{ fontSize: 18 }}>💬</span> {post.comments || 0}
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.textMuted, fontSize: 13, fontFamily: font.body }}>
            <span style={{ fontSize: 18 }}>↗️</span>
          </button>
        </div>
        {showComments && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{c.userName} </span>
                <span style={{ color: C.textMuted }}>{c.text}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...S.input, flex: 1, padding: "8px 12px", fontSize: 13 }} placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && postComment()} />
              <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 12 }} onClick={postComment}>Post</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────
function ProfilePage({ user, setUser, setPage }) {
  const [profile, setProfile] = useState(null);
  const [assocProfile, setAssocProfile] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateAssoc, setShowCreateAssoc] = useState(false);
  const [posts, setPosts] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then(d => d.exists() && setProfile({ ...d.data() }));
    if (user.role === "association") {
      getDoc(doc(db, "associations", user.uid)).then(d => d.exists() && setAssocProfile({ id: d.id, ...d.data() }));
      const q = query(collection(db, "posts"), where("assocId", "==", user.uid));
      const unsub = onSnapshot(q, snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))));
      return unsub;
    }
  }, [user?.uid]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadMedia(file, "image");
      await updateDoc(doc(db, "users", user.uid), { photoURL: url });
      if (user.role === "association") await updateDoc(doc(db, "associations", user.uid), { logoURL: url });
      setUser(u => ({ ...u, photoURL: url }));
    } catch {}
    setUploadingPhoto(false);
    e.target.value = "";
  };

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={S.sectionTitle}>Profile</div>
        <button style={S.btn("ghost")} onClick={() => signOut(auth)}>Sign out</button>
      </div>

      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${C.primary}` }}>
            {user?.photoURL ? <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28 }}>👤</span>}
          </div>
          <input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", borderRadius: "50%" }} onChange={handlePhotoUpload} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: C.textMuted, textTransform: "capitalize" }}>{user?.role}</div>
          {user?.role === "association" && !assocProfile?.approved && (
            <div style={{ background: "#FEF3C7", color: "#92400E", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 4 }}>⏳ Pending approval</div>
          )}
        </div>
      </div>

      {/* Association actions */}
      {user?.role === "association" && assocProfile?.approved && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button style={{ ...S.btn(), flex: 1, fontSize: 13 }} onClick={() => setShowCreatePost(true)}>+ Post Content</button>
          <button style={{ ...S.btn("outline"), flex: 1, fontSize: 13 }} onClick={() => setShowCreateEvent(true)}>+ Add Event</button>
        </div>
      )}

      {/* Become an association — for students who don't currently have one */}
      {user?.role === "student" && (
        <div style={{ ...S.card, padding: 18, marginBottom: 20, background: `linear-gradient(135deg, ${C.primaryLight}, ${C.white})`, border: `1px solid ${C.primary}25` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🏛️</span>
            <div>
              <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Run an association?</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>Create or re-create your association profile</div>
            </div>
          </div>
          <button style={{ ...S.btn(), width: "100%", fontSize: 13 }} onClick={() => setShowCreateAssoc(true)}>
            + Create Association
          </button>
        </div>
      )}

      {user?.role === "association" && assocProfile && (
        <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>Association Profile</div>
            <button
              style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "7px 12px", cursor: "pointer", color: C.error, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}
              onClick={async () => {
                if (!window.confirm("⚠️ Delete your association permanently? All posts and data will be lost. This cannot be undone.")) return;
                // Delete all posts
                const postsSnap = await getDocs(query(collection(db, "posts"), where("assocId", "==", user.uid)));
                await Promise.all(postsSnap.docs.map(d => deleteDoc(doc(db, "posts", d.id))));
                // Delete all events
                const eventsSnap = await getDocs(query(collection(db, "events"), where("assocId", "==", user.uid)));
                await Promise.all(eventsSnap.docs.map(d => deleteDoc(doc(db, "events", d.id))));
                // Delete association doc
                await deleteDoc(doc(db, "associations", user.uid));
                // Update user role back to student
                await updateDoc(doc(db, "users", user.uid), { role: "student", approved: true });
                setUser(u => ({ ...u, role: "student" }));
                alert("Association deleted successfully.");
              }}>
              🗑️ Delete Association
            </button>
          </div>
          <AssocProfileEditor assocProfile={assocProfile} userId={user.uid} onUpdate={setAssocProfile} />
        </div>
      )}

      {user?.role === "association" && posts.length > 0 && (
        <div>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Your Posts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map(p => <PostCard key={p.id} post={p} user={user} />)}
          </div>
        </div>
      )}

      {showCreatePost && <CreatePostModal user={user} assocProfile={assocProfile} onClose={() => setShowCreatePost(false)} />}
      {showCreateEvent && <CreateEventModal user={user} assocProfile={assocProfile} onClose={() => setShowCreateEvent(false)} />}
      {showCreateAssoc && (
        <CreateAssocModal
          user={user}
          onClose={() => setShowCreateAssoc(false)}
          onCreated={() => {
            setUser(u => ({ ...u, role: "association", approved: false }));
            getDoc(doc(db, "associations", user.uid)).then(d => d.exists() && setAssocProfile({ id: d.id, ...d.data() }));
          }}
        />
      )}
    </div>
  );
}

// ── Association Profile Editor ────────────────────────────────
function AssocProfileEditor({ assocProfile, userId, onUpdate }) {
  const [form, setForm] = useState({
    description: assocProfile?.description || "",
    location: assocProfile?.location || "",
    contactEmail: assocProfile?.contactEmail || "",
    contactPhone: assocProfile?.contactPhone || "",
    category: assocProfile?.category || "Academic",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateDoc(doc(db, "associations", userId), form);
    onUpdate(p => ({ ...p, ...form }));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCover = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingCover(true);
    const url = await uploadMedia(file, "image");
    await updateDoc(doc(db, "associations", userId), { coverURL: url });
    onUpdate(p => ({ ...p, coverURL: url }));
    setUploadingCover(false);
    e.target.value = "";
  };

  return (
    <div>
      <label style={S.label}>Cover Image</label>
      <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, height: 80, marginBottom: 12, overflow: "hidden", position: "relative", cursor: "pointer", background: C.surface }}>
        {assocProfile?.coverURL ? <img src={assocProfile.coverURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>{uploadingCover ? "Uploading..." : "📷 Tap to upload cover"}</div>}
        <input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={handleCover} />
      </div>
      <label style={S.label}>Category</label>
      <select style={{ ...S.input, marginBottom: 12 }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <label style={S.label}>Description</label>
      <textarea style={{ ...S.input, height: 80, resize: "vertical", marginBottom: 12 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell students about your association..." />
      <label style={S.label}>Meeting Location</label>
      <input style={{ ...S.input, marginBottom: 12 }} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. New Site Block A, Room 101" />
      <label style={S.label}>Contact Email</label>
      <input style={{ ...S.input, marginBottom: 12 }} value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} placeholder="association@university.edu" />
      <label style={S.label}>Contact Phone</label>
      <input style={{ ...S.input, marginBottom: 14 }} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="+233 ..." />
      <button style={{ ...S.btn(), width: "100%", opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>
        {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}

// ── Create Post Modal ─────────────────────────────────────────

// ── Create Post Modal ─────────────────────────────────────────
function CreatePostModal({ user, assocProfile, onClose }) {
  const [caption, setCaption] = useState("");
  const [type, setType] = useState("image");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setError("File too large. Max 50MB."); return; }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (f.type.startsWith("video")) setType("video");
  };

  const submit = async () => {
    if (!caption.trim() && !file) { setError("Please add a caption or media."); return; }
    setUploading(true); setUploadProgress(0); setError("");
    try {
      let mediaURL = "";
      if (file) {
        const resourceType = file.type.startsWith("video") ? "video" : "image";
        mediaURL = await new Promise((resolve, reject) => {
          const data = new FormData();
          data.append("file", file);
          data.append("upload_preset", CLOUDINARY_PRESET);
          data.append("cloud_name", CLOUDINARY_CLOUD);
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`);
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
          xhr.onload = () => { const r = JSON.parse(xhr.responseText); r.secure_url ? resolve(r.secure_url) : reject(new Error(r.error?.message || "Upload failed")); };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.send(data);
        });
      }
      await addDoc(collection(db, "posts"), {
        assocId: user.uid, assocName: assocProfile?.name || user.name,
        assocLogo: assocProfile?.logoURL || "",
        caption: caption.trim(), mediaURL, type, isPublic,
        likes: 0, comments: 0, shares: 0, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "associations", user.uid), { posts: increment(1) });
      onClose();
    } catch (err) { setError("Upload failed: " + err.message); }
    setUploading(false); setUploadProgress(0);
  };

  const postTypes = [
    { id: "image", label: "📸 Image" },
    { id: "video", label: "🎬 Video" },
    { id: "announcement", label: "📢 Announcement" },
    { id: "event_flyer", label: "🗓️ Flyer" },
  ];

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Create Post</div>
        {error && <div style={{ background: "#FEF2F2", color: C.error, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {postTypes.map(t => (
            <button key={t.id} style={{ ...S.tag, cursor: "pointer", border: "none", fontSize: 12, padding: "7px 12px", background: type === t.id ? C.primary : C.primaryLight, color: type === t.id ? "white" : C.primary, fontWeight: 600 }}
              onClick={() => { setType(t.id); setFile(null); setPreview(""); setError(""); }}>
              {t.label}
            </button>
          ))}
        </div>

        {(type === "image" || type === "video" || type === "event_flyer") && (
          <div style={{ marginBottom: 14 }}>
            {!preview ? (
              <div>
                <label htmlFor="mediaFileInput" style={{ display: "block", border: `2px dashed ${C.primary}`, borderRadius: 14, height: 160, cursor: "pointer", background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ fontSize: 44 }}>{type === "video" ? "🎬" : "📸"}</span>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.primary, fontFamily: font.display }}>
                      Tap here to select {type === "video" ? "video" : "image"}
                    </div>
                    {type === "video" && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>MP4 or MOV · Max 50MB</div>}
                  </div>
                </label>
                <input
                  id="mediaFileInput"
                  type="file"
                  accept={type === "video" ? "video/mp4,video/quicktime,video/mov,video/*" : "image/jpeg,image/png,image/gif,image/*"}
                  style={{ display: "none" }}
                  onChange={handleFile}
                />
              </div>
            ) : (
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 200, background: "#000" }}>
                {type === "video"
                  ? <video src={preview} style={{ width: "100%", height: "100%", objectFit: "cover" }} controls playsInline />
                  : <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                }
                <button style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => { setFile(null); setPreview(""); }}>✕</button>
                <div style={{ position: "absolute", bottom: 8, left: 10, background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "3px 10px", color: "white", fontSize: 11, fontWeight: 600 }}>
                  {type === "video" ? "🎬 Video selected" : "📸 Image selected"}
                </div>
              </div>
            )}
          </div>
        )}

        {uploading && file && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
              <span>Uploading {type}...</span><span>{uploadProgress}%</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${uploadProgress}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`, borderRadius: 3, transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        <textarea style={{ ...S.input, height: 90, resize: "vertical", marginBottom: 12 }}
          placeholder={type === "announcement" ? "Write your announcement..." : "Write a caption..."}
          value={caption} onChange={e => setCaption(e.target.value)} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: C.surface, borderRadius: 12 }}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} id="public" style={{ width: 16, height: 16, accentColor: C.primary }} />
          <label htmlFor="public" style={{ fontSize: 13, color: C.textMuted, fontFamily: font.body, cursor: "pointer" }}>🌍 Public — appears in Explore feed</label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btn(), flex: 1, opacity: uploading ? 0.7 : 1 }} onClick={submit} disabled={uploading}>
            {uploading ? (uploadProgress > 0 ? `${uploadProgress}%...` : "Processing...") : "Post"}
          </button>
          <button style={{ ...S.btn("outline"), flex: 1 }} onClick={onClose} disabled={uploading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Event Modal ────────────────────────────────────────
// ── Create/Become Association Modal ───────────────────────────
function CreateAssocModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", category: "Academic", description: "", contactEmail: user?.email || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name.trim()) { setError("Please enter your association name."); return; }
    setLoading(true);
    setError("");
    try {
      await setDoc(doc(db, "associations", user.uid), {
        name: form.name.trim(), ownerId: user.uid, email: user.email,
        approved: false, createdAt: serverTimestamp(),
        category: form.category, followers: 0, posts: 0,
        description: form.description.trim(), logoURL: "", coverURL: "",
        location: "", contactEmail: form.contactEmail.trim() || user.email,
      });
      await updateDoc(doc(db, "users", user.uid), { role: "association", approved: false });
      onCreated();
      onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 26 }}>🏛️</span>
          <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18 }}>Create Association</div>
        </div>
        {error && <div style={{ background: "#FEF2F2", color: C.error, padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <label style={S.label}>Association Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Computer Science Society" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

        <label style={S.label}>Category</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, height: 80, resize: "vertical", marginBottom: 12 }} placeholder="What does your association do?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <label style={S.label}>Contact Email</label>
        <input style={{ ...S.input, marginBottom: 16 }} placeholder="association@email.com" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} />

        <div style={{ background: "#FEF3C7", color: "#92400E", padding: "10px 14px", borderRadius: 10, fontSize: 12, marginBottom: 16 }}>
          ⏳ Your association will need admin approval before it appears publicly.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create Association"}</button>
          <button style={{ ...S.btn("outline"), flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ user, assocProfile, onClose }) {
  const [form, setForm] = useState({ title: "", date: "", time: "", venue: "", description: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!form.title || !form.date) { alert("Title and date are required"); return; }
    setUploading(true);
    try {
      let flyerURL = "";
      if (file) flyerURL = await uploadMedia(file, "image");
      await addDoc(collection(db, "events"), {
        ...form, date: new Date(form.date), flyerURL,
        assocId: user.uid, assocName: assocProfile?.name || user.name,
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) { alert("Error: " + err.message); }
    setUploading(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Create Event</div>
        <label style={S.label}>Event Title *</label>
        <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Annual Dinner Night" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <label style={S.label}>Date *</label>
        <input type="date" style={{ ...S.input, marginBottom: 12 }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <label style={S.label}>Time</label>
        <input type="time" style={{ ...S.input, marginBottom: 12 }} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
        <label style={S.label}>Venue</label>
        <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Great Hall" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, height: 70, marginBottom: 12 }} placeholder="What's this event about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <label style={S.label}>Event Flyer (optional)</label>
        <input type="file" accept="image/*" style={{ ...S.input, marginBottom: 16, padding: "10px" }} onChange={e => setFile(e.target.files[0])} />
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btn(), flex: 1, opacity: uploading ? 0.7 : 1 }} onClick={submit} disabled={uploading}>{uploading ? "Creating..." : "Create Event"}</button>
          <button style={{ ...S.btn("outline"), flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────
function NotificationsPage({ user }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [user?.uid]);

  const markRead = (id) => setDoc(doc(db, "notifications", id), { read: true }, { merge: true });

  return (
    <div style={S.page}>
      <div style={{ ...S.sectionTitle, marginBottom: 16 }}>Notifications</div>
      {notifs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔔</div>
          <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>All caught up!</div>
          <div style={{ color: C.textMuted, fontSize: 14 }}>Notifications from associations you follow will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {notifs.map(n => (
            <div key={n.id} style={{ ...S.card, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", background: n.read ? C.white : `${C.primary}08`, borderLeft: n.read ? "none" : `3px solid ${C.primary}`, cursor: "pointer" }} onClick={() => markRead(n.id)}>
              <div style={{ fontSize: 24 }}>{n.type === "follow" ? "👤" : n.type === "event" ? "📅" : "🔔"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, fontFamily: font.body }}>{n.message}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary, flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────
function MessagesPage({ user }) {
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, snap => setConvos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!selected) return;
    const q = query(collection(db, "conversations", selected.id, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [selected]);

  const send = async () => {
    if (!newMsg.trim() || !selected) return;
    const text = newMsg.trim(); setNewMsg("");
    await addDoc(collection(db, "conversations", selected.id, "messages"), { text, senderId: user.uid, senderName: user.name, createdAt: serverTimestamp() });
    await setDoc(doc(db, "conversations", selected.id), { lastMessage: text, lastMessageAt: serverTimestamp() }, { merge: true });
  };

  const startChat = async () => {
    if (!recipientEmail.trim()) return;
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", recipientEmail.trim())));
    if (snap.empty) { alert("User not found"); return; }
    const other = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const existing = convos.find(c => c.participants?.includes(other.id));
    if (existing) { setSelected(existing); setNewChat(false); return; }
    const ref = await addDoc(collection(db, "conversations"), {
      participants: [user.uid, other.id],
      participantNames: [user.name, other.name],
      lastMessage: "", lastMessageAt: serverTimestamp(),
    });
    setSelected({ id: ref.id, participants: [user.uid, other.id], participantNames: [user.name, other.name] });
    setNewChat(false); setRecipientEmail("");
  };

  return (
    <div style={S.page}>
      {!selected ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={S.sectionTitle}>Messages</div>
            <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 13 }} onClick={() => setNewChat(true)}>+ New</button>
          </div>
          {convos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px" }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>💬</div>
              <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No messages yet</div>
              <div style={{ color: C.textMuted, fontSize: 14 }}>Send inquiries directly to associations.</div>
            </div>
          ) : convos.map(c => (
            <div key={c.id} style={{ ...S.card, padding: 14, display: "flex", gap: 12, alignItems: "center", marginBottom: 8, cursor: "pointer" }} onClick={() => setSelected(c)}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏛️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontFamily: font.display }}>{c.participantNames?.filter(n => n !== user.name).join(", ")}</div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{c.lastMessage || "Start conversation"}</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
            <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setSelected(null)}>←</button>
            <div style={{ fontFamily: font.display, fontWeight: 700 }}>{selected.participantNames?.filter(n => n !== user.name).join(", ")}</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
            {messages.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.senderId === user.uid ? "flex-end" : "flex-start" }}>
                <div style={{ background: m.senderId === user.uid ? C.primary : C.surface, color: m.senderId === user.uid ? "white" : C.text, borderRadius: m.senderId === user.uid ? "16px 16px 2px 16px" : "16px 16px 16px 2px", padding: "10px 14px", maxWidth: "72%", fontSize: 13, fontFamily: font.body }}>{m.text}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 12 }}>
            <input style={{ ...S.input, flex: 1, borderRadius: 24 }} placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
            <button style={{ ...S.btn(), borderRadius: "50%", width: 44, height: 44, padding: 0, flexShrink: 0 }} onClick={send}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill="white"/></svg>
            </button>
          </div>
        </div>
      )}
      {newChat && (
        <div style={S.modal} onClick={() => setNewChat(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 18, marginBottom: 16 }}>New Message</div>
            <label style={S.label}>Search by email</label>
            <input style={{ ...S.input, marginBottom: 16 }} placeholder="association@email.com" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1 }} onClick={startChat}>Start Chat</button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => setNewChat(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────
function AdminPage({ user }) {
  const [pendingAssocs, setPendingAssocs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    getDocs(query(collection(db, "associations"), where("approved", "==", false))).then(snap => setPendingAssocs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "users")).then(snap => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20))).then(snap => setAllPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const approve = async (id) => {
    await updateDoc(doc(db, "associations", id), { approved: true });
    await updateDoc(doc(db, "users", id), { approved: true });
    setPendingAssocs(p => p.filter(a => a.id !== id));
  };

  const reject = async (id) => {
    await deleteDoc(doc(db, "associations", id));
    setPendingAssocs(p => p.filter(a => a.id !== id));
  };

  const removePost = async (id) => {
    await deleteDoc(doc(db, "posts", id));
    setAllPosts(p => p.filter(post => post.id !== id));
  };

  return (
    <div style={S.page}>
      <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, marginBottom: 4 }}>Admin Dashboard</div>
      <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>Harmony Management</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ num: pendingAssocs.length, label: "Pending", color: C.accent }, { num: allUsers.length, label: "Users", color: C.primary }, { num: allPosts.length, label: "Posts", color: C.success }].map(s => (
          <div key={s.label} style={{ ...S.card, padding: 14, textAlign: "center" }}>
            <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, color: s.color }}>{s.num}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["pending", "users", "posts"].map(t => (
          <button key={t} style={{ ...S.btn(tab === t ? "primary" : "outline"), padding: "8px 14px", fontSize: 12, textTransform: "capitalize" }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "pending" && (
        pendingAssocs.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>No pending associations ✓</div> :
        pendingAssocs.map(a => (
          <div key={a.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
            <div style={{ fontFamily: font.display, fontWeight: 700, fontSize: 15 }}>{a.name}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>{a.email}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{a.category}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1, fontSize: 13, background: C.success, boxShadow: "none" }} onClick={() => approve(a.id)}>✓ Approve</button>
              <button style={{ ...S.btn("outline"), flex: 1, fontSize: 13, color: C.error, borderColor: C.error }} onClick={() => reject(a.id)}>✕ Reject</button>
            </div>
          </div>
        ))
      )}

      {tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allUsers.map(u => (
            <div key={u.id} style={{ ...S.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{u.email} · {u.role}</div>
              </div>
              <div style={{ ...S.tag, background: u.role === "association" ? C.primaryLight : C.surface, color: u.role === "association" ? C.primary : C.textMuted, fontSize: 10 }}>{u.role}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "posts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allPosts.map(p => (
            <div key={p.id} style={{ ...S.card, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.assocName}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{p.caption?.slice(0, 50) || "No caption"}</div>
              </div>
              <button style={{ background: C.error, border: "none", borderRadius: 8, padding: "6px 12px", color: "white", fontSize: 12, cursor: "pointer" }} onClick={() => removePost(p.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [page, setPage] = useState("home");
  const [selectedAssoc, setSelectedAssoc] = useState(null);
  const [notifCount, setNotifCount] = useState(0);

  const ADMIN_EMAILS = ["asantegideon060@gmail.com"];

  // Splash screen — show for 2 seconds then check if first visit
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      const seen = localStorage.getItem("harmony_onboarded");
      if (!seen) {
        setShowOnboarding(true);
      }
      // Welcome back shown after auth resolves — handled in auth listener
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        const snap = await getDoc(doc(db, "users", fireUser.uid));
        if (snap.exists()) {
          const data = { uid: fireUser.uid, ...snap.data() };
          setUser(data);
          // Show welcome back for returning users (onboarding already seen)
          const seen = localStorage.getItem("harmony_onboarded");
          if (seen) setShowWelcomeBack(true);
          // Notif count
          const q = query(collection(db, "notifications"), where("toUserId", "==", fireUser.uid), where("read", "==", false));
          onSnapshot(q, s => setNotifCount(s.size));
        }
      } else setUser(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (showSplash) return <SplashScreen />;

  if (showOnboarding) return (
    <OnboardingScreen onDone={() => {
      localStorage.setItem("harmony_onboarded", "true");
      setShowOnboarding(false);
    }} />
  );

  if (showWelcomeBack && user) return (
    <WelcomeBackScreen user={user} onContinue={() => setShowWelcomeBack(false)} />
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.primaryDark}, #4C1D95)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
      </div>
      <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 28, color: "white" }}>Harmony</div>
    </div>
  );

  if (!user) return <AuthScreen onAuth={setUser} />;

  const isAdmin = ADMIN_EMAILS.includes(user.email);

  const renderPage = () => {
    if (page === "assoc-profile" && selectedAssoc) return <AssocProfilePage assoc={selectedAssoc} user={user} setPage={setPage} />;
    if (page === "notifications") return <NotificationsPage user={user} />;
    if (page === "messages") return <MessagesPage user={user} />;
    if (isAdmin && page === "admin") return <AdminPage user={user} />;
    switch (page) {
      case "home": return <HomePage user={user} setPage={setPage} setSelectedAssoc={setSelectedAssoc} />;
      case "explore": return <ExplorePage user={user} setPage={setPage} setSelectedAssoc={setSelectedAssoc} />;
      case "events": return <EventsPage user={user} setPage={setPage} setSelectedAssoc={setSelectedAssoc} />;
      case "search": return <SearchPage user={user} setPage={setPage} setSelectedAssoc={setSelectedAssoc} />;
      case "profile": return <ProfilePage user={user} setUser={setUser} setPage={setPage} />;
      default: return <HomePage user={user} setPage={setPage} setSelectedAssoc={setSelectedAssoc} />;
    }
  };

  const hideNav = false;

  return (
    <div style={{ fontFamily: font.body, maxWidth: 480, margin: "0 auto", position: "relative" }}>
      {!hideNav && <TopNav user={user} page={page} setPage={setPage} notifCount={notifCount} />}

      {isAdmin && page !== "explore" && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px 0" }}>
          <button style={{ ...S.btn("outline"), padding: "6px 16px", fontSize: 12 }} onClick={() => setPage("admin")}>⚙️ Admin Dashboard</button>
        </div>
      )}

      {renderPage()}

      {!hideNav && <BottomNav page={page} setPage={setPage} user={user} />}
    </div>
  );
}

