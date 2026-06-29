import React, { useState, useEffect, useRef, useMemo } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  collection, addDoc, getDocs, doc, setDoc,
  getDoc, query, orderBy, onSnapshot, serverTimestamp,
  where, limit, deleteDoc
} from "firebase/firestore";

const THEMES = {
  light: {
    primary: "#00A896", primaryDark: "#007A6E", primaryLight: "#00C4B4",
    secondary: "#1A1A2E", accent: "#FFD700", white: "#FFFFFF",
    offWhite: "#F8F9FA", grey: "#F0F2F5", greyMid: "#E4E6EA",
    greyDark: "#65676B", text: "#1C1E21", textLight: "#65676B",
    success: "#31A24C", error: "#FA3E3E", premium: "#FFD700",
    card: "#FFFFFF", border: "#E4E6EA",
  },
  dark: {
    primary: "#00C4B4", primaryDark: "#00A896", primaryLight: "#00D4C4",
    secondary: "#0A0A0A", accent: "#FFD700", white: "#1A1A1A",
    offWhite: "#121212", grey: "#2A2A2A", greyMid: "#333333",
    greyDark: "#AAAAAA", text: "#F0F0F0", textLight: "#AAAAAA",
    success: "#4ADE80", error: "#F87171", premium: "#FFD700",
    card: "#1E1E1E", border: "#333333",
  },
};

const C = THEMES.light;

const FONT = "'DM Sans', 'Nunito', sans-serif";

const CATEGORIES = ["All", "Fashion", "Electronics", "Beauty", "Food", "Sports", "Home"];


// ── Verified Badge SVG ─────────────────────────────────────────
// ── Badge System ──────────────────────────────────────────────
// Blue Tick: Admin verified, trusted long-term user (MEDIUM size)
const VerifiedBadge = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

// Gold Star: Premium subscriber (LARGE size - most prominent)
const PremiumBadge = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="11" fill="#FFD700"/>
    <path d="M12 4L14.09 9.26L20 10.27L16 14.14L17.09 20.02L12 17.27L6.91 20.02L8 14.14L4 10.27L9.91 9.26L12 4Z" fill="#333"/>
  </svg>
);

// Trending badge: New store, no special status (SMALL)
const TrendingBadge = () => (
  <span style={{ background: "linear-gradient(135deg, #FF6B6B, #FF8E53)", color: "white", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 6, verticalAlign: "middle", letterSpacing: 0.3 }}>
    🔥 NEW
  </span>
);

// Legacy PremiumStar kept for backward compat
const PremiumStar = () => <PremiumBadge size={14} />;

const S = {
  app: { fontFamily: FONT, background: C.offWhite, minHeight: "100vh", color: C.text, paddingBottom: 80 },
  nav: { background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, height: 56, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  logo: { fontWeight: 800, fontSize: 22, color: C.primary, letterSpacing: -0.5, cursor: "pointer" },
  page: { maxWidth: 1100, margin: "0 auto", padding: "20px 16px" },
  card: { background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  btn: (v = "primary") => ({ background: v === "primary" ? C.primary : v === "outline" ? "transparent" : v === "grey" ? C.grey : C.secondary, color: v === "outline" ? C.primary : v === "grey" ? C.text : C.white, border: v === "outline" ? `1.5px solid ${C.primary}` : "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13, transition: "all 0.15s", fontFamily: FONT }),
  input: { width: "100%", background: C.grey, border: `1.5px solid transparent`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT },
  label: { fontSize: 12, fontWeight: 700, color: C.greyDark, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4, color: C.text },
  sectionSub: { fontSize: 13, color: C.greyDark, marginBottom: 16 },
  divider: { height: 1, background: C.border, margin: "20px 0" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modalBox: { background: C.white, borderRadius: 18, padding: 28, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" },
  avatar: (size = 40) => ({ width: size, height: size, borderRadius: "50%", background: `${C.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }),
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "8px 0 12px", zIndex: 100 },
  bottomBtn: (active) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: active ? C.primary : C.greyDark, fontFamily: FONT, fontSize: 10, fontWeight: active ? 700 : 500, padding: "4px 16px" }),
  alert: (type) => ({ background: type === "success" ? "rgba(49,162,76,0.1)" : "rgba(250,62,62,0.1)", border: `1px solid ${type === "success" ? C.success : C.error}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: type === "success" ? C.success : C.error, marginBottom: 12 }),
};

// ── Auth Page ──────────────────────────────────────────────────
// ── Splash Screen ──────────────────────────────────────────────
// Cinematic 4-second dark-premium intro. Sequence:
// 0.0s  — Black screen
// 0.3s  — Central glow pulse appears
// 0.8s  — Logo fades + scales in
// 1.6s  — Tagline types itself out
// 2.4s  — Floating market icons drift upward
// 3.2s  — Ghana-flag color wave sweeps across
// 4.0s  — Whole screen zooms into centre (handled by auth state change)
function SplashScreen() {
  const [phase, setPhase] = useState(0);
  // Phase timeline (10 seconds total):
  // 0 → 0.0s  white bg, product icons visible as watermark
  // 1 → 0.6s  teal wave blob starts rising from bottom
  // 2 → 2.2s  wave fills to center — logo fades in on teal
  // 3 → 4.0s  wave fills full screen — "WELCOME" fades in
  // 4 → 6.0s  "Buy · Sell · Connect" appears, tagline types
  // 5 → 8.5s  white wave sweeps back up from bottom (exit)
  // 6 → 10.0s fully teal — transition out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 6000),
      setTimeout(() => setPhase(5), 8500),
      setTimeout(() => setPhase(6), 10000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const TAGLINE = "Ghana's Social Commerce Platform";
  const [typedChars, setTypedChars] = useState(0);
  useEffect(() => {
    if (phase < 4) return;
    setTypedChars(0);
    let i = 0;
    const iv = setInterval(() => { i++; setTypedChars(i); if (i >= TAGLINE.length) clearInterval(iv); }, 38);
    return () => clearInterval(iv);
  }, [phase]);

  // Background product icons as watermark pattern
  const PATTERN_ICONS = ["👗","👟","📱","🛍️","💍","🎧","👜","⌚","💄","🛒","👒","🧴","📦","💼","🎀"];

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", fontFamily: FONT, background: "#f0faf9" }}>
      <style>{`
        @keyframes splashWaveRise {
          0%   { clip-path: ellipse(65% 0% at 50% 100%); }
          30%  { clip-path: ellipse(75% 30% at 50% 100%); }
          60%  { clip-path: ellipse(85% 60% at 50% 100%); }
          100% { clip-path: ellipse(120% 100% at 50% 100%); }
        }
        @keyframes splashWaveFill {
          0%   { clip-path: ellipse(120% 100% at 50% 100%); }
          100% { clip-path: ellipse(200% 200% at 50% 100%); }
        }
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.7) translateY(20px); }
          60%  { transform: scale(1.05) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashFadeIn {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashWelcome {
          0%   { opacity: 0; letter-spacing: 12px; }
          100% { opacity: 0.9; letter-spacing: 6px; }
        }
        @keyframes splashIconFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes splashWhiteWipeUp {
          0%   { clip-path: ellipse(65% 0% at 50% 100%); }
          100% { clip-path: ellipse(200% 200% at 50% 100%); }
        }
        @keyframes splashShimmer {
          0%   { left: -80%; }
          100% { left: 160%; }
        }
        @keyframes splashPulseRing {
          0%   { transform: scale(0.9); opacity: 0.5; }
          50%  { transform: scale(1.06); opacity: 0.8; }
          100% { transform: scale(0.9); opacity: 0.5; }
        }
        @keyframes splashTypeTag {
          from { opacity: 0; } to { opacity: 1; }
        }
      `}</style>

      {/* ── White background with subtle product icon watermark ── */}
      <div style={{ position: "absolute", inset: 0, background: "#f0faf9", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, opacity: 0.07, userSelect: "none", pointerEvents: "none" }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 72, fontSize: 28,
              animation: `splashIconFloat ${2.5 + (i % 5) * 0.4}s ${(i % 7) * 0.3}s ease-in-out infinite`
            }}>{PATTERN_ICONS[i % PATTERN_ICONS.length]}</div>
          ))}
        </div>
      </div>

      {/* ── Rising teal wave ── */}
      {phase >= 1 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: `linear-gradient(160deg, ${C.primary} 0%, #0a8c80 50%, #0d7a70 100%)`,
          animation: phase === 1 ? "splashWaveRise 1.6s cubic-bezier(0.4,0,0.2,1) forwards" :
                     phase >= 2 && phase < 5 ? "splashWaveFill 1.4s cubic-bezier(0.4,0,0.2,1) forwards" : "none",
          clipPath: phase >= 3 ? "none" : undefined,
        }}>
          {/* Shimmer highlight on the teal */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
            <div style={{
              position: "absolute", top: "30%", bottom: 0, width: "45%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              animation: "splashShimmer 3s ease-in-out 1s infinite",
            }} />
          </div>
        </div>
      )}

      {/* ── White exit-wave sweeping up (phase 5) ── */}
      {phase >= 5 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 8, background: "#f0faf9",
          animation: "splashWhiteWipeUp 1.5s cubic-bezier(0.4,0,0.2,1) forwards",
        }} />
      )}

      {/* ── Logo + Text layer (above teal wave) ── */}
      {phase >= 2 && phase < 6 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
        }}>

          {/* Pulsing ring around logo */}
          <div style={{
            width: 150, height: 150, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            animation: "splashPulseRing 2.4s ease-in-out infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}>
            {/* Logo */}
            <div style={{
              position: "relative",
              animation: "splashLogoIn 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}>
              <img
                src="https://res.cloudinary.com/dxmmsq0gq/image/upload/WhatsApp_Image_2026-06-09_at_9.31.32_PM_ficnea.jpg"
                alt="E-Connect"
                style={{
                  width: 120, height: 120, borderRadius: 28, display: "block",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.25), 0 0 0 3px rgba(255,255,255,0.3)",
                }}
              />
              {/* Gold shimmer sweep */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", pointerEvents: "none" }}>
                <div style={{
                  position: "absolute", top: 0, bottom: 0, width: "55%",
                  background: "linear-gradient(90deg, transparent, rgba(255,235,80,0.3), transparent)",
                  animation: "splashShimmer 2.5s ease-in-out 0.5s infinite",
                }} />
              </div>
            </div>
          </div>

          {/* Brand name */}
          <div style={{ textAlign: "center", animation: "splashFadeIn 0.8s 0.3s ease-out both" }}>
            <div style={{ color: "white", fontWeight: 900, fontSize: 36, letterSpacing: 1.5, textShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
              E-Connect
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, letterSpacing: 5, textTransform: "uppercase", marginTop: 3 }}>
              Easy Connect
            </div>
          </div>

          {/* WELCOME */}
          {phase >= 3 && (
            <div style={{
              marginTop: 36, color: "rgba(255,255,255,0.85)", fontSize: 22, fontWeight: 700,
              letterSpacing: 6, textTransform: "uppercase",
              animation: "splashWelcome 1.2s ease-out forwards",
            }}>
              WELCOME
            </div>
          )}

          {/* Tagline typewriter */}
          {phase >= 4 && (
            <div style={{
              marginTop: 14, color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center",
              minHeight: 22, maxWidth: 280, lineHeight: 1.5,
              animation: "splashFadeIn 0.5s ease-out both",
            }}>
              {TAGLINE.slice(0, typedChars)}
              <span style={{ opacity: typedChars < TAGLINE.length ? 1 : 0, color: "rgba(255,255,255,0.8)" }}>|</span>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom bar ── */}
      {phase >= 3 && phase < 5 && (
        <div style={{
          position: "absolute", bottom: 52, left: 0, right: 0, zIndex: 6, textAlign: "center",
          animation: "splashFadeIn 1s 0.5s ease-out both",
        }}>
          {/* Ghana flag stripe */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 10 }}>
            {["#CE1126","#FCD116","#006B3F"].map((c, i) => (
              <div key={i} style={{ width: 28, height: 4, borderRadius: 2, background: c, opacity: 0.85 }} />
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>
            BUY · SELL · CONNECT
          </div>
        </div>
      )}
    </div>
  );
}

function Auth({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tabAnimating, setTabAnimating] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (isLogin) {
        const res = await signInWithEmailAndPassword(auth, form.email, form.password);
        setUser(res.user);
      } else {
        if (!form.name) { setError("Please enter your full name."); setLoading(false); return; }
        const res = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(res.user, { displayName: form.name });
        const adminEmails = ["admin@econnect.gh", "asantegideon060@gmail.com", "selormatsubonuedie@gmail.com", "akowuahisaac686@gmail.com", "nyarkomatthew925491@gmail.com", "ebenezer.boateng009@stu.ucc.edu.gh"];
        await setDoc(doc(db, "users", res.user.uid), {
          name: form.name, email: form.email, phone: form.phone,
          role: adminEmails.includes(form.email) ? "admin" : "user",
          followers: 0, following: 0, createdAt: serverTimestamp(),
        });
        setUser(res.user);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(.*\)/, "").trim());
    }
    setLoading(false);
  };

  const switchTab = (login) => {
    if (loading || isLogin === login) return;
    setTabAnimating(true);
    setTimeout(() => { setIsLogin(login); setError(""); setTabAnimating(false); }, 200);
  };

  // ── Floating product emoji particles ──
  const PARTICLES = [
    { emoji: "🛍️", x: "8%",  y: "12%", size: 26, delay: "0s",   dur: "6s"  },
    { emoji: "👗", x: "85%", y: "8%",  size: 22, delay: "1.2s", dur: "7s"  },
    { emoji: "📱", x: "70%", y: "22%", size: 20, delay: "0.5s", dur: "5.5s"},
    { emoji: "👟", x: "15%", y: "35%", size: 24, delay: "2s",   dur: "8s"  },
    { emoji: "💍", x: "80%", y: "50%", size: 18, delay: "0.8s", dur: "6.5s"},
    { emoji: "🎧", x: "5%",  y: "60%", size: 22, delay: "1.5s", dur: "7.5s"},
    { emoji: "👜", x: "88%", y: "70%", size: 20, delay: "0.3s", dur: "5s"  },
    { emoji: "⌚", x: "20%", y: "75%", size: 18, delay: "2.2s", dur: "6s"  },
    { emoji: "💄", x: "55%", y: "82%", size: 22, delay: "1s",   dur: "7s"  },
    { emoji: "🛒", x: "40%", y: "5%",  size: 20, delay: "1.8s", dur: "6.5s"},
  ];

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily: FONT, overflow: "hidden" }}>
      <style>{`
        @keyframes authBgShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes authFloat {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
          33%  { opacity: 0.28; }
          50%  { transform: translateY(-22px) rotate(8deg); opacity: 0.22; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.18; }
        }
        @keyframes authCardIn {
          0%   { opacity: 0; transform: translateY(40px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes authPulseRing {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes authTabSlide {
          0%   { opacity: 1; }
          50%  { opacity: 0; transform: translateX(${isLogin ? "-" : ""}10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes authNavBubble {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.18); }
          60%  { transform: scale(0.93); }
          100% { transform: scale(1); }
        }
        @keyframes authSpinner {
          100% { transform: rotate(360deg); }
        }
        .auth-input { 
          width: 100%; box-sizing: border-box; border: none; outline: none;
          background: rgba(255,255,255,0.12); border-radius: 16px;
          padding: 15px 18px; font-size: 14px; font-family: ${FONT};
          color: white; backdrop-filter: blur(8px);
          border: 1.5px solid rgba(255,255,255,0.15);
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .auth-input::placeholder { color: rgba(255,255,255,0.5); }
        .auth-input:focus {
          background: rgba(255,255,255,0.22);
          border-color: rgba(255,255,255,0.55);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.08);
        }
        .auth-btn-main {
          width: 100%; padding: 15px; border: none; border-radius: 16px; cursor: pointer;
          font-size: 15px; font-weight: 800; font-family: ${FONT};
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          color: #0d7a70; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
          letter-spacing: 0.3px;
        }
        .auth-btn-main:active { transform: scale(0.97); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .auth-btn-main:disabled { opacity: 0.65; }
      `}</style>

      {/* ── Animated gradient background ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        background: "linear-gradient(-45deg, #0d7a70, #14b8a6, #0891b2, #1d4ed8, #7c3aed, #0d7a70)",
        backgroundSize: "400% 400%",
        animation: "authBgShift 12s ease infinite",
      }} />

      {/* ── Dark overlay for depth ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.38)" }} />

      {/* ── Floating emoji particles ── */}
      {PARTICLES.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y, fontSize: p.size, zIndex: 2,
          animation: `authFloat ${p.dur} ${p.delay} ease-in-out infinite`,
          pointerEvents: "none", userSelect: "none",
        }}>{p.emoji}</div>
      ))}

      {/* ── Main scrollable area ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>

        {/* ── Logo section ── */}
        <div style={{ textAlign: "center", marginBottom: 28, animation: "authCardIn 0.7s ease-out both" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
            {/* Pulsing ring behind logo */}
            <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "rgba(255,255,255,0.15)", animation: "authPulseRing 2.5s ease-out infinite" }} />
            <img
              src="https://res.cloudinary.com/dxmmsq0gq/image/upload/WhatsApp_Image_2026-06-09_at_9.31.32_PM_ficnea.jpg"
              alt="E-Connect"
              style={{ width: 88, height: 88, borderRadius: 24, objectFit: "contain", boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.2)", position: "relative", zIndex: 1, display: "block" }}
            />
          </div>
          <div style={{ color: "white", fontWeight: 900, fontSize: 28, letterSpacing: 1, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>E-Connect</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>Social Commerce · Ghana</div>
        </div>

        {/* ── Glassmorphism card ── */}
        <div style={{
          width: "100%", maxWidth: 400,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          borderRadius: 28,
          border: "1.5px solid rgba(255,255,255,0.22)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          padding: "28px 24px 24px",
          animation: "authCardIn 0.6s 0.1s ease-out both",
        }}>

          {/* ── Tab switcher (Pinterest-inspired bubble nav) ── */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", borderRadius: 20, padding: 4, marginBottom: 24, position: "relative" }}>
            {/* Sliding pill indicator */}
            <div style={{
              position: "absolute", top: 4, bottom: 4,
              width: "calc(50% - 4px)",
              left: isLogin ? 4 : "calc(50%)",
              background: "rgba(255,255,255,0.92)",
              borderRadius: 16,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              transition: "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              zIndex: 0,
            }} />
            {[{ label: "Login", active: isLogin }, { label: "Register", active: !isLogin }].map(({ label, active }) => (
              <button key={label}
                onClick={() => switchTab(label === "Login")}
                style={{
                  flex: 1, padding: "10px 0", border: "none", borderRadius: 16, cursor: "pointer",
                  fontWeight: 800, fontSize: 13, fontFamily: FONT, position: "relative", zIndex: 1,
                  background: "transparent",
                  color: active ? "#0d7a70" : "rgba(255,255,255,0.7)",
                  transition: "color 0.3s",
                  animation: tabAnimating && active ? "authNavBubble 0.4s ease-out" : "none",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Form fields ── */}
          <div style={{ opacity: tabAnimating ? 0 : 1, transition: "opacity 0.2s", display: "flex", flexDirection: "column", gap: 12 }}>
            {error && (
              <div style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#fecaca", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
                ⚠️ {error}
              </div>
            )}

            {!isLogin && (
              <>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>👤</span>
                  <input className="auth-input" style={{ paddingLeft: 44 }} placeholder="Full name" value={form.name}
                    onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)}
                    onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>📞</span>
                  <input className="auth-input" style={{ paddingLeft: 44 }} placeholder="+233..." value={form.phone}
                    onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)}
                    onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </>
            )}

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>✉️</span>
              <input className="auth-input" style={{ paddingLeft: 44 }} type="email" placeholder="Email address"
                value={form.email} onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔒</span>
              <input className="auth-input" style={{ paddingLeft: 44, paddingRight: 48 }}
                type={showPassword ? "text" : "password"} placeholder="Password"
                value={form.password} onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handle()} />
              <button onClick={() => setShowPassword(p => !p)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.7, color: "white" }}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {isLogin && (
              <div style={{ textAlign: "right" }}>
                <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 12, cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}>
                  Forgot Password?
                </button>
              </div>
            )}

            {/* ── Main action button ── */}
            <button className="auth-btn-main" style={{ marginTop: 4 }} onClick={handle} disabled={loading}>
              {loading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: "2.5px solid #0d7a70", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "authSpinner 0.7s linear infinite" }} />
                    Please wait...
                  </span>
                : isLogin ? "Login" : "Create Account"}
            </button>
          </div>
        </div>

        {/* ── Footer switch text ── */}
        <div style={{ marginTop: 20, color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center", animation: "authCardIn 0.6s 0.2s ease-out both" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => switchTab(!isLogin)}
            style={{ background: "none", border: "none", color: "white", fontWeight: 800, cursor: "pointer", fontFamily: FONT, fontSize: 13, textDecoration: "underline" }}>
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cloudinary Config ─────────────────────────────────────────
const CLOUDINARY_CLOUD = "dxmmsq0gq";
const CLOUDINARY_PRESET = "Econnect";

// ── Product Image Carousel ─────────────────────────────────────
function ProductImageCarousel({ images, height = 200, onClick, autoRotate = true, activeIndex, onIndexChange }) {
  const [internalIdx, setInternalIdx] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);

  // Controlled mode: parent (e.g. ProductDetail) owns the active index
  // so it can sync thumbnails, variant selection, and Add-to-Cart state.
  const isControlled = activeIndex !== undefined;
  const idx = isControlled ? activeIndex : internalIdx;
  const setIdx = (updater) => {
    if (isControlled) {
      const next = typeof updater === "function" ? updater(activeIndex) : updater;
      onIndexChange && onIndexChange(next);
    } else {
      setInternalIdx(updater);
    }
  };

  useEffect(() => {
    if (!autoRotate || !images || images.length <= 1) return;
    timerRef.current = setInterval(() => setIdx(prev => (prev + 1) % images.length), 3000);
    return () => clearInterval(timerRef.current);
  }, [images?.length, autoRotate]);

  if (!images || images.length === 0) return null;

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 40) return; // ignore small movements/taps
    clearInterval(timerRef.current);
    if (diff > 0) setIdx(prev => (prev + 1) % images.length); // swiped left -> next
    else setIdx(prev => (prev - 1 + images.length) % images.length); // swiped right -> prev
  };

  return (
    <div style={{ position: "relative", height, overflow: "hidden", borderRadius: 0, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <img src={images[idx]} alt="product" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.4s" }} />
      {images.length > 1 && (
        <>
          {/* Dot indicators */}
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
            {images.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); clearInterval(timerRef.current); }}
                style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 3, background: i === idx ? "white" : "rgba(255,255,255,0.5)", transition: "width 0.3s", cursor: "pointer" }} />
            ))}
          </div>
          {/* Left/Right tap areas */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "30%", height: "100%", zIndex: 2 }}
            onClick={e => { e.stopPropagation(); clearInterval(timerRef.current); setIdx(prev => (prev - 1 + images.length) % images.length); }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: "30%", height: "100%", zIndex: 2 }}
            onClick={e => { e.stopPropagation(); clearInterval(timerRef.current); setIdx(prev => (prev + 1) % images.length); }} />
          {/* Image counter */}
          <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", borderRadius: 10, padding: "2px 8px", fontSize: 10, color: "white", fontWeight: 700 }}>
            {idx + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ── Add Product Modal ──────────────────────────────────────────
function AddProductModal({ user, onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", price: "", category: "Fashion", description: "", stock: "" });
  const [images, setImages] = useState([]); // array of URLs
  const [previews, setPreviews] = useState([]); // array of preview URLs
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 6) { setError("Maximum 6 images allowed."); return; }
    setUploading(true);
    setError("");
    try {
      const uploaded = [];
      const prevs = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(Math.round(((i) / files.length) * 100));
        const data = new FormData();
        data.append("file", files[i]);
        data.append("upload_preset", CLOUDINARY_PRESET);
        data.append("cloud_name", CLOUDINARY_CLOUD);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: data });
        const result = await res.json();
        uploaded.push(result.secure_url);
        prevs.push(result.secure_url);
      }
      setImages(prev => [...prev, ...uploaded]);
      setPreviews(prev => [...prev, ...prevs]);
      setUploadProgress(100);
    } catch (err) { setError("Image upload failed. Please try again."); }
    setUploading(false);
    setUploadProgress(0);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
    if (carouselIdx >= images.length - 1) setCarouselIdx(Math.max(0, images.length - 2));
  };

  const handle = async () => {
    if (!form.name || !form.price) { setError("Please fill in name and price."); return; }
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      await addDoc(collection(db, "products"), {
        name: form.name, price: Number(form.price), category: form.category,
        description: form.description,
        image: images[0] || "", // primary image
        images: images, // all images
        stock: Number(form.stock) || 0,
        seller: user.displayName || "Unknown", sellerId: user.uid,
        sellerVerified: userData.verified || false,
        sellerPremium: userData.premium || false,
        isSeller: userData.isSeller || false,
        likes: 0, rating: 0, reviews: 0, premium: userData.premium || false,
        createdAt: serverTimestamp()
      });
      onAdded(); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Add New Product</h3>
        {error && <div style={S.alert("error")}>{error}</div>}

        <label style={S.label}>Product Images (up to 6)</label>

        {/* Image preview carousel */}
        {previews.length > 0 && (
          <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", position: "relative", height: 180 }}>
            <ProductImageCarousel images={previews} height={180} />
          </div>
        )}

        {/* Thumbnail row with remove */}
        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {previews.map((url, i) => (
              <div key={i} style={{ position: "relative", width: 56, height: 56 }}>
                <img src={url} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: `2px solid ${i === 0 ? C.primary : C.border}` }} />
                {i === 0 && <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, background: C.primary, color: "white", fontSize: 8, fontWeight: 700, textAlign: "center", borderRadius: "0 0 6px 6px" }}>MAIN</div>}
                <button style={{ position: "absolute", top: -4, right: -4, background: C.error, border: "none", borderRadius: "50%", width: 18, height: 18, color: "white", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
                  onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
            {previews.length < 6 && (
              <div style={{ width: 56, height: 56, border: `2px dashed ${C.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, color: C.greyDark }}
                onClick={() => document.getElementById("imgInput").click()}>+</div>
            )}
          </div>
        )}

        {/* Upload button */}
        {previews.length === 0 && (
          <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 12, cursor: "pointer" }}
            onClick={() => document.getElementById("imgInput").click()}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
            <div style={{ fontSize: 13, color: C.greyDark, fontWeight: 600 }}>
              {uploading ? `Uploading... ${uploadProgress}%` : "Tap to upload photos (max 6)"}
            </div>
            <div style={{ fontSize: 11, color: C.greyDark, marginTop: 4 }}>Select multiple photos at once</div>
          </div>
        )}
        {previews.length > 0 && uploading && (
          <div style={{ marginBottom: 10, background: C.grey, borderRadius: 6, height: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${uploadProgress}%`, background: C.primary, transition: "width 0.3s" }} />
          </div>
        )}
        <input id="imgInput" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />

        <label style={S.label}>Product Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Ankara Dress" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label style={S.label}>Price (GH₵) *</label>
        <input style={{ ...S.input, marginBottom: 12 }} type="number" placeholder="e.g. 150" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        <label style={S.label}>Category</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
        </select>
        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, marginBottom: 12, height: 80, resize: "vertical" }} placeholder="Describe your product..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <label style={S.label}>Stock Quantity</label>
        <input style={{ ...S.input, marginBottom: 16 }} type="number" placeholder="e.g. 10" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...S.btn(), flex: 1, opacity: (loading || uploading) ? 0.7 : 1 }} onClick={handle} disabled={loading || uploading}>
            {loading ? "Adding..." : uploading ? `Uploading ${uploadProgress}%...` : "Add Product"}
          </button>
          <button style={{ ...S.btn("outline"), flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}


// ── Stories Feature ────────────────────────────────────────────
function StoriesBar({ user, setPage, setViewingPublicProfile }) {
  const [stories, setStories] = useState([]);      // flat list from Firestore
  const [storyGroups, setStoryGroups] = useState([]); // [{userId, userName, userPhoto, items:[]}]
  const [viewedUsers, setViewedUsers] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("econnect-viewed-stories") || "[]")); }
    catch { return new Set(); }
  });

  // ── Viewer state: which GROUP is open, and which SLIDE inside it ──
  const [viewingGroup, setViewingGroup] = useState(null);  // a storyGroup object
  const [slideIndex, setSlideIndex] = useState(0);         // index within viewingGroup.items

  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState("image");
  const [previewUrl, setPreviewUrl] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [songName, setSongName] = useState("");
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [musicSearching, setMusicSearching] = useState(false);
  const [musicError, setMusicError] = useState(null);
  const [selectedMusicPreview, setSelectedMusicPreview] = useState(null);
  const [selectedSongMeta, setSelectedSongMeta] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState(null);
  const progressRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const previewAudioRef = useRef(null);
  const previewTimeoutRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseStartRef = useRef(0);
  const isPausedRef = useRef(false);
  const pressTimerRef = useRef(null);
  const pressXRef = useRef(0);
  const longPressTriggeredRef = useRef(false);
  const STORY_DURATION = 5000;
  const PRESS_HOLD_MS = 200;

  const SUGGESTED_ARTISTS = ["Shatta Wale", "Stonebwoy", "Sarkodie", "Black Sherif", "Burna Boy", "Davido", "Wizkid", "King Promise"];

  const fetchStories = async () => {
    try {
      const snap = await getDocs(collection(db, "stories"));
      const now = Date.now();
      const active = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => {
        if (!s.expiresAt) return false;
        const exp = s.expiresAt.toMillis ? s.expiresAt.toMillis() : new Date(s.expiresAt).getTime();
        return exp > now && !s.deleted;
      });
      // Sort oldest→newest within each user so stories play chronologically
      active.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return ta - tb;
      });
      setStories(active);

      // ── GROUP by userId: one entry per person on the dashboard ──
      const groupMap = new Map();
      active.forEach(s => {
        if (!groupMap.has(s.userId)) {
          groupMap.set(s.userId, {
            userId: s.userId,
            userName: s.userName,
            userPhoto: s.userPhoto || s.imageUrl || "",
            items: [],
          });
        }
        groupMap.get(s.userId).items.push(s);
      });
      setStoryGroups(Array.from(groupMap.values()));
    } catch (err) { console.error("Failed to load stories:", err); }
  };

  useEffect(() => { fetchStories(); }, []);

  // ── The current slide inside the open group ──
  const currentSlide = viewingGroup ? viewingGroup.items[slideIndex] : null;

  // ── Progress bar effect: drives auto-advance for IMAGE slides ──
  useEffect(() => {
    if (!viewingGroup || !currentSlide) { setProgress(0); return; }
    if (currentSlide.mediaType === "video") return; // video uses onTimeUpdate
    setProgress(0);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(progressRef.current); goNextSlide(); }
    }, 50);
    return () => clearInterval(progressRef.current);
  }, [currentSlide?.id, slideIndex]);

  // ── Audio sync: restart music for each slide ──
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; }
    if (!currentSlide?.songUrl) return;
    const url = currentSlide.songUrl;
    if (!url.startsWith("http")) return;
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.src = url;
    audio.loop = true;
    audioRef.current = audio;
    if (!isPausedRef.current) {
      audio.play().catch(err => {
        if (err.name === "NotAllowedError") {
          const retry = () => { audio.play().catch(() => {}); document.removeEventListener("touchstart", retry); document.removeEventListener("click", retry); };
          document.addEventListener("touchstart", retry, { once: true });
          document.addEventListener("click", retry, { once: true });
        }
      });
    }
    return () => { audio.pause(); audio.src = ""; };
  }, [currentSlide?.id]);

  // ── Navigate within the group ──
  const goNextSlide = () => {
    if (!viewingGroup) return;
    if (slideIndex < viewingGroup.items.length - 1) {
      setSlideIndex(i => i + 1);
      setProgress(0);
    } else {
      // Reached the end of this user's stories → mark as viewed and close
      closeStory();
    }
  };

  const goPrevSlide = () => {
    if (!viewingGroup) return;
    if (slideIndex > 0) {
      setSlideIndex(i => i - 1);
      setProgress(0);
    } else {
      // Already at first slide — restart it
      startTimeRef.current = Date.now();
      setProgress(0);
      if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}); }
      if (audioRef.current) { audioRef.current.currentTime = 0; }
    }
  };

  const openGroup = (group) => {
    isPausedRef.current = false;
    setIsPaused(false);
    setViewingGroup(group);
    setSlideIndex(0);
    setProgress(0);
  };

  const closeStory = () => {
    if (viewingGroup) {
      // Mark this user's stories as fully viewed
      const updated = new Set(viewedUsers);
      updated.add(viewingGroup.userId);
      setViewedUsers(updated);
      try { localStorage.setItem("econnect-viewed-stories", JSON.stringify([...updated])); } catch (e) {}
    }
    clearInterval(progressRef.current);
    clearTimeout(pressTimerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    isPausedRef.current = false;
    setIsPaused(false);
    setViewingGroup(null);
    setSlideIndex(0);
    setProgress(0);
  };

  const pausePlayback = () => {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    pauseStartRef.current = Date.now();
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  };

  const resumePlayback = () => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    setIsPaused(false);
    const pausedDuration = Date.now() - pauseStartRef.current;
    startTimeRef.current += pausedDuration;
    if (videoRef.current) videoRef.current.play().catch(() => {});
    if (audioRef.current) audioRef.current.play().catch(() => {});
  };

  const handlePressStart = (e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    pressXRef.current = x;
    longPressTriggeredRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      pausePlayback();
    }, PRESS_HOLD_MS);
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimerRef.current);
    if (longPressTriggeredRef.current) { resumePlayback(); return; }
    const w = window.innerWidth;
    if (pressXRef.current < w * 0.3) goPrevSlide();
    else goNextSlide();
  };

  useEffect(() => {
    return () => {
      clearInterval(progressRef.current);
      clearTimeout(pressTimerRef.current);
      clearTimeout(previewTimeoutRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, []);

  const fetchWithTimeout = async (url, ms = 6000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // JSONP request - bypasses CORS and service-worker fetch interception entirely
  // by loading a <script> tag, which is how the iTunes Search API has been
  // accessed client-side for over a decade.
  const searchMusicJSONP = (url) => {
    return new Promise((resolve, reject) => {
      const cbName = `__itunesCb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("JSONP timeout")); }, 6000);
      const cleanup = () => {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      };
      window[cbName] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error("JSONP script error")); };
      script.src = `${url}&callback=${cbName}`;
      document.body.appendChild(script);
    });
  };

  const searchMusic = async (q) => {
    if (!q.trim()) return;
    setMusicSearching(true);
    setMusicError(null);
    setMusicResults([]);
    const term = encodeURIComponent(q.trim());
    const directUrls = [
      // Ghana & Nigeria storefronts surface local/Afrobeats catalog better
      `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=20&country=GH`,
      `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=20&country=NG`,
      `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=20&country=US`,
      `https://itunes.apple.com/search?term=${term}&media=music&limit=20`,
    ];

    // 1. Try JSONP first - most reliable, bypasses CORS/SW entirely
    for (const directUrl of directUrls) {
      try {
        const data = await searchMusicJSONP(directUrl);
        if (data?.results && data.results.length > 0) {
          setMusicResults(data.results);
          setMusicSearching(false);
          return;
        }
      } catch (err) {
        // fall through to fetch-based attempts
      }
    }

    // 2. Fall back to fetch (direct + proxies)
    const attempts = [];
    for (const directUrl of directUrls) {
      attempts.push(directUrl);
      attempts.push(`https://corsproxy.io/?${encodeURIComponent(directUrl)}`);
      attempts.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`);
      attempts.push(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`);
      attempts.push(`https://thingproxy.freeboard.io/fetch/${directUrl}`);
    }
    for (const url of attempts) {
      try {
        const res = await fetchWithTimeout(url, 6000);
        if (!res.ok) continue;
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch (e) { continue; }
        if (data.results && data.results.length > 0) {
          setMusicResults(data.results);
          setMusicSearching(false);
          return;
        }
      } catch (err) {
        // try next fallback
      }
    }
    setMusicError("No songs found for this search. Try a different name or spelling.");
    setMusicSearching(false);
  };

  // ── 15-second background preview, triggered by tapping a track row
  // or its trailing play icon. Tapping the same track again pauses it. ──
  const togglePreview = (track) => {
    const trackId = track.trackId || track.previewUrl;
    clearTimeout(previewTimeoutRef.current);
    if (previewingTrackId === trackId) {
      previewAudioRef.current?.pause();
      setPreviewingTrackId(null);
      return;
    }
    previewAudioRef.current?.pause();
    if (!track.previewUrl) return;
    const audio = new Audio(track.previewUrl);
    audio.play().catch(() => {});
    audio.onended = () => setPreviewingTrackId(prev => (prev === trackId ? null : prev));
    previewAudioRef.current = audio;
    setPreviewingTrackId(trackId);
    // Cap the preview at 15 seconds even if the source clip is longer
    previewTimeoutRef.current = setTimeout(() => {
      audio.pause();
      setPreviewingTrackId(prev => (prev === trackId ? null : prev));
    }, 15000);
  };

  // ── Confirms the song selection and hands its metadata back to the
  // Post Story modal (songId, title, artistName, previewUrl). ──
  const selectMusicTrack = (track) => {
    previewAudioRef.current?.pause();
    clearTimeout(previewTimeoutRef.current);
    setPreviewingTrackId(null);
    setSongUrl(track.previewUrl || "");
    setSongName(`${track.trackName} - ${track.artistName}`);
    setSelectedMusicPreview(track.previewUrl);
    setSelectedSongMeta({
      songId: track.trackId,
      title: track.trackName,
      artistName: track.artistName,
      previewUrl: track.previewUrl,
    });
    setShowMusicSearch(false);
    setMusicResults([]);
    setMusicQuery("");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      // Check duration
      const url = URL.createObjectURL(file);
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadedmetadata = () => {
        if (vid.duration > 30) {
          alert("Video must be 30 seconds or less.");
          return;
        }
        setSelectedFile(file);
        setSelectedFileType("video");
        setPreviewUrl(url);
        setShowUploadModal(true);
      };
    } else {
      setSelectedFile(file);
      setSelectedFileType("image");
      setPreviewUrl(URL.createObjectURL(file));
      setShowUploadModal(true);
    }
  };

  const handleSongSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSongUrl(URL.createObjectURL(file));
    setSongName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const isVideo = selectedFileType === "video";
      const data = new FormData();
      data.append("file", selectedFile);
      data.append("upload_preset", "Econnect");
      data.append("cloud_name", "dxmmsq0gq");
      const endpoint = isVideo
        ? "https://api.cloudinary.com/v1_1/dxmmsq0gq/video/upload"
        : "https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload";
      const res = await fetch(endpoint, { method: "POST", body: data });
      const result = await res.json();

      // ── Song URL resolution ──
      // • iTunes search tracks: `songUrl` is already an HTTPS CDN URL → use directly.
      // • "My Music" file picked locally: `songUrl` is a blob: URL → upload to Cloudinary first.
      // • No song selected: empty string.
      let uploadedSongUrl = "";
      if (songUrl && !songUrl.startsWith("blob:")) {
        // Already a public HTTPS URL (iTunes 30-second preview) — save it as-is.
        uploadedSongUrl = songUrl;
      } else if (songUrl && songUrl.startsWith("blob:")) {
        // Local file picked by the user — upload to Cloudinary so the URL persists
        // across devices and doesn't expire when the browser tab closes.
        const songFile = document.getElementById("songInput")?.files[0];
        if (songFile) {
          const sData = new FormData();
          sData.append("file", songFile);
          sData.append("upload_preset", "Econnect");
          sData.append("cloud_name", "dxmmsq0gq");
          const sRes = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/video/upload", { method: "POST", body: sData });
          const sResult = await sRes.json();
          uploadedSongUrl = sResult.secure_url || "";
        }
      }

      // Get thumbnail for preview circle
      const thumbnail = isVideo
        ? result.secure_url.replace("/upload/", "/upload/so_0,w_200,h_200,c_fill/").replace(".mp4", ".jpg")
        : result.secure_url;

      await addDoc(collection(db, "stories"), {
        mediaUrl: result.secure_url,
        imageUrl: thumbnail,
        mediaType: isVideo ? "video" : "image",
        userName: user?.displayName || "User",
        userId: user?.uid,
        userPhoto: user?.photoURL || "",
        songUrl: uploadedSongUrl,
        songName: songName || "",
        songId: selectedSongMeta?.songId || null,
        songArtist: selectedSongMeta?.artistName || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: serverTimestamp(),
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      setPreviewUrl("");
      setSongUrl("");
      setSongName("");
      setSelectedSongMeta(null);
      fetchStories();
    } catch (err) { console.error(err); alert("Upload failed. Try again."); }
    setUploading(false);
  };

  return (
    <>
      <div style={{ ...S.card, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {/* Add Story Button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", minWidth: 64 }}
            onClick={() => document.getElementById("storyFileInput").click()}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: C.grey, display: "flex", alignItems: "center", justifyContent: "center", border: `2.5px dashed ${C.primary}` }}>
              {uploading ? <span style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>...</span> : <span style={{ fontSize: 26 }}>+</span>}
            </div>
            <span style={{ fontSize: 10, color: C.greyDark, fontWeight: 600 }}>Add Story</span>
            <input id="storyFileInput" type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileSelect} />
          </div>

          {/* One tray entry per user — SVG segmented ring + latest-story thumbnail */}
          {storyGroups.map(group => {
            const isViewed = viewedUsers.has(group.userId);
            const totalSegments = group.items.length;
            const ringColor = isViewed ? "#d1d5db" : "#00a884";

            // ── DYNAMIC THUMBNAIL: show the latest story's media, not the profile photo ──
            // Uses the most recent story item's imageUrl (works for both image and video stories).
            // Falls back to profile photo, then generic avatar.
            const latestStory = group.items[group.items.length - 1];
            const thumbSrc = latestStory?.imageUrl || latestStory?.mediaUrl || group.userPhoto || null;

            // ── SVG segmented ring geometry ──
            const SIZE = 62;          // outer diameter
            const STROKE = 2.8;       // ring stroke width
            const GAP = totalSegments > 1 ? 3 : 0;  // gap between segments (degrees)
            const CENTER = SIZE / 2;
            const RADIUS = CENTER - STROKE / 2 - 1;
            const CIRC = 2 * Math.PI * RADIUS;
            const segAngle = 360 / totalSegments;
            const gapAngle = totalSegments > 1 ? GAP : 0;
            const segFraction = (segAngle - gapAngle) / 360;
            const dashLen = CIRC * segFraction;
            const dashGap = CIRC * (gapAngle / 360);

            return (
              <div key={group.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", minWidth: 64 }}
                onClick={() => openGroup(group)}>

                {/* Container for SVG ring + circular thumbnail */}
                <div style={{ position: "relative", width: SIZE, height: SIZE }}>

                  {/* ── Circular cropped thumbnail (latest story media) ── */}
                  <div style={{
                    position: "absolute",
                    inset: STROKE + 2,  // inset by ring stroke + small gap = the white border effect
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: C.grey,
                    border: `2px solid white`,
                  }}>
                    {thumbSrc
                      ? <img
                          className="status-thumb-image"
                          src={thumbSrc}
                          alt={group.userName}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>}
                  </div>

                  {/* ── SVG segmented ring, rendered on top ── */}
                  <svg
                    width={SIZE} height={SIZE}
                    style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                  >
                    {Array.from({ length: totalSegments }).map((_, i) => {
                      // Each segment starts where the previous ended + gap
                      const startAngle = i * segAngle + gapAngle / 2;
                      const startFrac = startAngle / 360;
                      // strokeDashoffset shifts the start of the dash pattern around the circle
                      const offset = CIRC - CIRC * startFrac;
                      return (
                        <circle
                          key={i}
                          cx={CENTER} cy={CENTER} r={RADIUS}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth={STROKE}
                          strokeDasharray={`${dashLen} ${CIRC - dashLen}`}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          style={{ transition: "stroke 0.4s ease" }}
                        />
                      );
                    })}
                  </svg>

                  {/* Story count badge (only if multiple stories) */}
                  {totalSegments > 1 && (
                    <div style={{
                      position: "absolute", bottom: 0, right: 0,
                      background: ringColor, border: "1.5px solid white",
                      borderRadius: "50%", width: 17, height: 17,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: "white", fontWeight: 900, zIndex: 2,
                    }}>
                      {totalSegments}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: 10, color: isViewed ? C.greyDark : C.text, fontWeight: isViewed ? 500 : 700, textAlign: "center", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {group.userId === user?.uid ? "You" : group.userName}
                </span>
              </div>
            );
          })}
          {storyGroups.length === 0 && <div style={{ display: "flex", alignItems: "center", color: C.greyDark, fontSize: 13, paddingLeft: 8 }}>No stories yet. Be the first!</div>}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 18, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>Post Story</h3>
            {previewUrl && (
              <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16, height: 200, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedFileType === "video"
                  ? <video src={previewUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} controls />
                  : <img src={previewUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>🎵 Add a song (optional)</label>
              {songName ? (
                <div style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}30`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>🎵</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.primary }}>{songName}</span>
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.greyDark }} onClick={() => { setSongUrl(""); setSongName(""); setSelectedMusicPreview(null); }}>✕</button>
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn("outline"), flex: 1, padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  onClick={() => setShowMusicSearch(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="9" r="5"/><line x1="14.5" y1="14.5" x2="19" y2="19"/></svg>
                  Search Songs
                </button>
                <input id="songInput" type="file" accept="audio/*" style={{ display: "none" }} onChange={handleSongSelect} />
                <button style={{ ...S.btn("outline"), flex: 1, padding: "10px" }} onClick={() => document.getElementById("songInput").click()}>
                  📁 My Music
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1, opacity: uploading ? 0.7 : 1 }} onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Post Story"}
              </button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => { setShowUploadModal(false); setPreviewUrl(""); setSelectedFile(null); setSongUrl(""); setSongName(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      {showMusicSearch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 700, display: "flex", flexDirection: "column", fontFamily: FONT }}>
          <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ background: "none", border: "none", color: "white", fontSize: 24, cursor: "pointer" }} onClick={() => { setShowMusicSearch(false); setMusicResults([]); setMusicQuery(""); }}>←</button>
            <div style={{ fontWeight: 800, fontSize: 18, color: "white" }}>🎵 Search Music</div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 24, padding: "12px 18px", color: "white", fontSize: 15, outline: "none" }}
                placeholder="Search songs or artists..."
                value={musicQuery}
                onChange={e => setMusicQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchMusic(musicQuery)}
                autoFocus
              />
              <button style={{ ...S.btn(), padding: "12px 18px", borderRadius: 24 }} onClick={() => searchMusic(musicQuery)}>
                Search
              </button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
            {musicSearching && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.5)" }}>Searching...</div>}
            {!musicSearching && musicResults.length === 0 && musicQuery && (
              <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 14 }}>{musicError || "No results found"}</div>
                <button style={{ ...S.btn(), padding: "8px 18px", fontSize: 13, marginBottom: 20 }} onClick={() => searchMusic(musicQuery)}>Try Again</button>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 10 }}>Or try a popular artist:</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {SUGGESTED_ARTISTS.map(name => (
                    <button key={name} onClick={() => { setMusicQuery(name); searchMusic(name); }}
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", borderRadius: 16, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!musicSearching && musicResults.length === 0 && !musicQuery && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Search for any song or artist</div>
              </div>
            )}
            {musicResults.map((track, i) => {
              const trackId = track.trackId || track.previewUrl || i;
              const isPreviewing = previewingTrackId === trackId;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Tap artwork or row to preview 15s */}
                  <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#333", flexShrink: 0, position: "relative", cursor: "pointer" }}
                    onClick={() => togglePreview(track)}>
                    {track.artworkUrl60 ? <img src={track.artworkUrl60} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎵</div>}
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isPreviewing
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => togglePreview(track)}>
                    <div style={{ fontWeight: 700, color: "white", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.trackName}</div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>{track.artistName} · {Math.floor((track.trackTimeMillis || 0) / 60000)}:{String(Math.floor(((track.trackTimeMillis || 0) % 60000) / 1000)).padStart(2, "0")}</div>
                    {isPreviewing && <div style={{ color: C.primary, fontSize: 11, marginTop: 2, fontWeight: 700 }}>▶ Playing 15s preview…</div>}
                  </div>
                  {/* Confirm selection - returns metadata to Post Story modal */}
                  <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 12, flexShrink: 0, borderRadius: 16 }} onClick={() => selectMusicTrack(track)}>
                    Select
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fullscreen Story Viewer ── */}
      {viewingGroup && currentSlide && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 600, display: "flex", flexDirection: "column" }}>

          {/* ── Segmented progress bars: one segment per slide in THIS user's group ── */}
          <div style={{ display: "flex", gap: 3, padding: "10px 12px 0", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
            {viewingGroup.items.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, background: "white",
                  width: i < slideIndex ? "100%" : i === slideIndex ? `${progress}%` : "0%",
                  transition: i === slideIndex ? "none" : "none",
                }} />
              </div>
            ))}
          </div>

          {/* ── Header: avatar, name, close ── */}
          <div style={{ position: "absolute", top: 22, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => {
                const g = viewingGroup;
                closeStory();
                setViewingPublicProfile && setViewingPublicProfile({ uid: g.userId, displayName: g.userName, photoURL: g.userPhoto });
                setPage && setPage("publicProfile");
              }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: "2px solid white" }}>
                {viewingGroup.userPhoto
                  ? <img src={viewingGroup.userPhoto} alt={viewingGroup.userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ height: "100%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>}
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{viewingGroup.userName}</div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                  {slideIndex + 1} / {viewingGroup.items.length} · Tap to view profile
                </div>
              </div>
            </div>
            <button style={{ background: "rgba(0,0,0,0.45)", border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={closeStory}>✕</button>
          </div>

          {/* ── Media: unified gesture surface (tap left/right + press-hold) ── */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
            onMouseLeave={() => { clearTimeout(pressTimerRef.current); if (longPressTriggeredRef.current) { resumePlayback(); longPressTriggeredRef.current = false; } }}
            onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}>

            {currentSlide.mediaType === "video"
              ? <video ref={videoRef} src={currentSlide.mediaUrl || currentSlide.imageUrl}
                  style={{ width: "100%", height: "100vh", objectFit: "contain" }}
                  autoPlay playsInline
                  onEnded={goNextSlide}
                  onTimeUpdate={e => { const pct = (e.target.currentTime / e.target.duration) * 100; setProgress(pct); }} />
              : <img src={currentSlide.mediaUrl || currentSlide.imageUrl} alt="story"
                  style={{ width: "100%", height: "100vh", objectFit: "contain" }} />}

            {/* Pause overlay */}
            {isPaused && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                </div>
              </div>
            )}
          </div>

          {/* Prefetch next slide */}
          {viewingGroup.items[slideIndex + 1] && (
            viewingGroup.items[slideIndex + 1].mediaType === "video"
              ? <video src={viewingGroup.items[slideIndex + 1].mediaUrl} preload="auto" muted style={{ display: "none" }} />
              : <img src={viewingGroup.items[slideIndex + 1].mediaUrl || viewingGroup.items[slideIndex + 1].imageUrl} alt="" style={{ display: "none" }} />
          )}

          {/* Song info */}
          {(currentSlide.songName || currentSlide.songUrl) && (
            <div style={{ position: "absolute", bottom: 30, left: 16, right: 60, zIndex: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.55)", borderRadius: 20, padding: "8px 14px", cursor: "pointer" }}
              onClick={() => { if (audioRef.current?.paused) audioRef.current.play().catch(() => {}); }}>
              <span style={{ fontSize: 16, display: "inline-block", animation: "spin 2s linear infinite" }}>🎵</span>
              <span style={{ color: "white", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentSlide.songName || (currentSlide.songArtist ? `♪ ${currentSlide.songArtist}` : "♪ Song")}
              </span>
            </div>
          )}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}



// ── Edit Product Modal ─────────────────────────────────────────
function EditProductModal({ product, user, onClose, onUpdated }) {
  const [form, setForm] = useState({
    name: product.name || "",
    price: product.price || "",
    category: product.category || "Fashion",
    description: product.description || "",
    stock: product.stock || "",
  });
  const [imageUrl, setImageUrl] = useState(product.image || "");
  const [imagePreview, setImagePreview] = useState(product.image || "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file); data.append("upload_preset", "Econnect"); data.append("cloud_name", "dxmmsq0gq");
      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload", { method: "POST", body: data });
      const result = await res.json();
      setImageUrl(result.secure_url);
      setImagePreview(result.secure_url);
    } catch (err) { setError("Image upload failed. Try again."); }
    setUploading(false);
  };

  const handleUpdate = async () => {
    if (!form.name || !form.price) { setError("Please fill in name and price."); return; }
    setLoading(true);
    try {
      await setDoc(doc(db, "products", product.id), {
        name: form.name, price: Number(form.price), category: form.category,
        description: form.description, image: imageUrl,
        stock: Number(form.stock) || 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      onUpdated(); onClose();
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleDelete = async () => {
    const confirm = window.confirm("Are you sure you want to delete this product? This cannot be undone.");
    if (!confirm) return;
    await setDoc(doc(db, "products", product.id), { deleted: true }, { merge: true });
    onUpdated(); onClose();
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Edit Product</h3>
        {error && <div style={S.alert("error")}>{error}</div>}

        <label style={S.label}>Product Image</label>
        <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 12, cursor: "pointer", background: C.grey }}
          onClick={() => document.getElementById("editImgInput").click()}>
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: 13, color: C.greyDark }}>{uploading ? "Uploading..." : "Tap to add a product photo"}</div>
            </div>
          )}
        </div>
        <input id="editImgInput" type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />

        <label style={S.label}>Product Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

        <label style={S.label}>Price (GH₵) *</label>
        <input style={{ ...S.input, marginBottom: 12 }} type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />

        <label style={S.label}>Category</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
        </select>

        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, marginBottom: 12, height: 80, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

        <label style={S.label}>Stock Quantity</label>
        <input style={{ ...S.input, marginBottom: 16 }} type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button style={{ ...S.btn(), flex: 1, opacity: (loading || uploading) ? 0.7 : 1 }} onClick={handleUpdate} disabled={loading || uploading}>
            {loading ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
          </button>
          <button style={{ ...S.btn("outline"), flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
        <button style={{ ...S.btn("outline"), width: "100%", color: C.error, borderColor: C.error }} onClick={handleDelete}>
          🗑️ Delete Product
        </button>
      </div>
    </div>
  );
}




// ── Location Search Page ───────────────────────────────────────
function LocationPage({ user, setPage, setSelectedProduct }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [tab, setTab] = useState("sellers");

  const GHANA_CITIES = ["Cape Coast", "Accra", "Kumasi", "Takoradi", "Tamale", "Sunyani", "Ho", "Koforidua", "Wa", "Bolgatanga"];

  useEffect(() => {
    getDocs(collection(db, "users")).then(snap => setSellers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isSeller && s.city)));
    getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))).then(snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted)));
  }, []);

  const detectLocation = () => {
    setLoading(true);
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("Geolocation is not supported by your browser."); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          setCityFilter(city);
          if (user) await setDoc(doc(db, "users", user.uid), { city, lat: latitude, lng: longitude }, { merge: true });
        } catch (err) { console.error(err); }
        setLoading(false);
      },
      (err) => { setLocationError("Could not get your location. Please select your city manually."); setLoading(false); }
    );
  };

  const filteredSellers = sellers.filter(s => {
    const matchCity = !cityFilter || s.city?.toLowerCase().includes(cityFilter.toLowerCase());
    const matchSearch = !search || s.businessName?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  const filteredProducts = products.filter(p => {
    const matchCity = !cityFilter || p.sellerCity?.toLowerCase().includes(cityFilter.toLowerCase());
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Search by Location</div>
      <p style={S.sectionSub}>Find sellers and products near you</p>

      <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📍 Your Location</div>
        <button style={{ ...S.btn(), width: "100%", marginBottom: 10, opacity: loading ? 0.7 : 1 }} onClick={detectLocation} disabled={loading}>
          {loading ? "Detecting location..." : userLocation ? "📍 Location detected. Tap to update" : "📍 Detect My Location"}
        </button>
        {locationError && <div style={{ ...S.alert("error"), marginBottom: 8 }}>{locationError}</div>}
        <div style={{ fontSize: 13, color: C.greyDark, marginBottom: 8 }}>Or select your city:</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={{ ...S.btn(cityFilter === "" ? "primary" : "grey"), padding: "6px 12px", fontSize: 11 }} onClick={() => setCityFilter("")}>All Cities</button>
          {GHANA_CITIES.map(city => (
            <button key={city} style={{ ...S.btn(cityFilter === city ? "primary" : "grey"), padding: "6px 12px", fontSize: 11 }}
              onClick={() => setCityFilter(city)}>{city}</button>
          ))}
        </div>
        {cityFilter && <div style={{ marginTop: 10, fontSize: 13, color: C.primary, fontWeight: 600 }}>📍 Showing results for: {cityFilter}</div>}
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>🔍</span>
        <input style={{ ...S.input, paddingLeft: 38 }} placeholder="Search sellers or products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["sellers", "products"].map(t => (
          <button key={t} style={{ ...S.btn(tab === t ? "primary" : "grey"), padding: "8px 16px", textTransform: "capitalize" }}
            onClick={() => setTab(t)}>{t} {tab === t && `(${t === "sellers" ? filteredSellers.length : filteredProducts.length})`}</button>
        ))}
      </div>

      {tab === "sellers" && (
        filteredSellers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>No sellers found {cityFilter ? `in ${cityFilter}` : ""}</div>
            <div style={{ color: C.greyDark, fontSize: 13 }}>Try a different city or search term.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 80 }}>
            {filteredSellers.map(s => (
              <div key={s.id} style={{ ...S.card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏪</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.businessName || s.name}</span>
                    {s.premium && <PremiumBadge size={18} />}
                    {!s.premium && s.verified && <VerifiedBadge size={14} />}
                    {!s.premium && !s.verified && s.isSeller && <TrendingBadge />}
                    {s.premium && <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>}
                  </div>
                  <div style={{ fontSize: 12, color: C.greyDark, marginTop: 2 }}>📍 {s.city}</div>
                  <div style={{ fontSize: 12, color: C.greyDark }}>{s.storeDescription || "Local seller"}</div>
                </div>
                {s.storeContact && (
                  <a href={`tel:${s.storeContact}`} style={{ textDecoration: "none" }}>
                    <button style={{ ...S.btn("outline"), padding: "7px 12px", fontSize: 12 }}>📞 Call</button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "products" && (
        filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>No products found {cityFilter ? `in ${cityFilter}` : ""}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 80 }}>
            {filteredProducts.map(p => (
              <div key={p.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
                <div style={{ height: 130, background: C.grey, overflow: "hidden" }}>
                  {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.greyDark, display: "flex", alignItems: "center", gap: 3 }}>
                    {p.seller}
                    {p.sellerPremium && <PremiumBadge size={15} />}
                    {!p.sellerPremium && p.sellerVerified && <VerifiedBadge size={12} />}
                    {!p.sellerPremium && !p.sellerVerified && p.isSeller && <TrendingBadge />}
                  </div>
                  <div style={{ fontSize: 11, color: C.greyDark }}>📍 {p.sellerCity}</div>
                  <div style={{ color: C.primary, fontWeight: 800, marginTop: 4 }}>GH₵{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Order Tracking Page ────────────────────────────────────────
function OrderTrackingPage({ user, startChat }) {
  const [orders, setOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my-orders");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const ORDER_STATUSES = [
    { key: "pending", label: "Order Received", icon: "📥", color: "#F59E0B" },
    { key: "processing", label: "Processing", icon: "⚙️", color: "#3B82F6" },
    { key: "out_for_delivery", label: "Out for Delivery", icon: "🚚", color: "#8B5CF6" },
    { key: "delivered", label: "Delivered", icon: "✅", color: "#10B981" },
    { key: "cancelled", label: "Cancelled", icon: "❌", color: "#EF4444" },
  ];

  const getStatusIndex = (status) => ORDER_STATUSES.findIndex(s => s.key === status);
  const getStatus = (key) => ORDER_STATUSES.find(s => s.key === key) || ORDER_STATUSES[0];

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc")))
      .then(snap => { setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    getDocs(query(collection(db, "orders")))
      .then(snap => {
        const mine = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(o =>
          o.items?.some(i => i.sellerId === user.uid)
        );
        setSellerOrders(mine);
      });
  }, [user]);

  const updateOrderStatus = async (orderId, newStatus, buyerId) => {
    await setDoc(doc(db, "orders", orderId), { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
    const statusInfo = getStatus(newStatus);
    await sendNotification(buyerId, "order", `Your order status has been updated to: ${statusInfo.label} ${statusInfo.icon}`, "E-Connect", { orderId });
    setSellerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder(prev => ({ ...prev, status: newStatus }));
  };

  const getTimeAgo = (ts) => {
    if (!ts) return "";
    const now = Date.now();
    const time = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    const diff = Math.floor((now - time) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Orders</div>
      <p style={S.sectionSub}>Track and manage all orders</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { key: "my-orders", label: "My Orders" },
          { key: "seller-orders", label: "Customer Orders" },
        ].map(t => (
          <button key={t.key} style={{ ...S.btn(tab === t.key ? "primary" : "grey"), padding: "8px 16px" }}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>Loading orders...</div> : (

        tab === "my-orders" ? (
          orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>No orders yet</div>
              <div style={{ color: C.greyDark, fontSize: 13 }}>Your orders will appear here after you shop.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 80 }}>
              {orders.map(order => {
                const status = getStatus(order.status || "pending");
                const statusIdx = getStatusIndex(order.status || "pending");
                return (
                  <div key={order.id} style={{ ...S.card, padding: 16, cursor: "pointer" }}
                    onClick={() => setSelectedOrder(order)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Order · GH₵{order.total}</div>
                        <div style={{ fontSize: 12, color: C.greyDark, marginTop: 2 }}>{order.items?.length} item{order.items?.length !== 1 ? "s" : ""} · {getTimeAgo(order.createdAt)}</div>
                      </div>
                      <span style={{ background: `${status.color}20`, color: status.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    {order.status !== "cancelled" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12 }}>
                        {ORDER_STATUSES.filter(s => s.key !== "cancelled").map((s, i) => {
                          const activeIdx = getStatusIndex(order.status || "pending");
                          const isActive = i <= activeIdx;
                          return (
                            <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : 0 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: isActive ? s.color : C.greyMid, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, border: `2px solid ${isActive ? s.color : C.greyMid}` }}>
                                {isActive ? s.icon : <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.greyDark }} />}
                              </div>
                              {i < 3 && <div style={{ flex: 1, height: 3, background: i < activeIdx ? s.color : C.greyMid, transition: "background 0.3s" }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                          {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                      ))}
                      {order.items?.length > 3 && <div style={{ width: 44, height: 44, borderRadius: 8, background: C.grey, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: C.greyDark, fontWeight: 700 }}>+{order.items.length - 3}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          sellerOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>No customer orders yet</div>
              <div style={{ color: C.greyDark, fontSize: 13 }}>Orders from customers will appear here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 80 }}>
              {sellerOrders.map(order => {
                const status = getStatus(order.status || "pending");
                return (
                  <div key={order.id} style={{ ...S.card, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customerName}</div>
                        <div style={{ fontSize: 12, color: C.greyDark }}>{order.customerPhone} · {order.delivery} · GH₵{order.total}</div>
                        <div style={{ fontSize: 12, color: C.greyDark, marginTop: 2 }}>{getTimeAgo(order.createdAt)}</div>
                      </div>
                      <span style={{ background: `${status.color}20`, color: status.color, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      {order.items?.filter(i => i.sellerId === user.uid).map((item, i) => (
                        <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 3 }}>• {item.name} × {item.qty} · GH₵{item.price * item.qty}</div>
                      ))}
                    </div>

                    {order.address && <div style={{ fontSize: 12, color: C.greyDark, marginBottom: 10 }}>📍 {order.address}</div>}

                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Update Status:</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {ORDER_STATUSES.map(s => (
                        <button key={s.key} style={{ background: order.status === s.key ? s.color : C.grey, color: order.status === s.key ? "white" : C.text, border: "none", borderRadius: 20, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
                          onClick={() => updateOrderStatus(order.id, s.key, order.userId)}>
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )
      )}

      {selectedOrder && (
        <div style={S.modal} onClick={() => setSelectedOrder(null)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Order Details</h3>
            <div style={{ fontSize: 12, color: C.greyDark, marginBottom: 16 }}>{getTimeAgo(selectedOrder.createdAt)}</div>
            <div style={{ ...S.card, padding: 14, marginBottom: 14, background: `${getStatus(selectedOrder.status).color}10`, border: `1px solid ${getStatus(selectedOrder.status).color}30` }}>
              <div style={{ fontWeight: 700, color: getStatus(selectedOrder.status).color, fontSize: 15 }}>
                {getStatus(selectedOrder.status).icon} {getStatus(selectedOrder.status).label}
              </div>
            </div>
            {selectedOrder.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                  {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: C.greyDark }}>{item.seller} · Qty: {item.qty}</div>
                </div>
                <div style={{ fontWeight: 700, color: C.primary }}>GH₵{item.price * item.qty}</div>
              </div>
            ))}
            <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
              <span>Total</span>
              <span style={{ color: C.primary }}>GH₵{selectedOrder.total}</span>
            </div>
            <div style={{ fontSize: 13, color: C.greyDark, marginBottom: 4 }}>📞 {selectedOrder.customerPhone}</div>
            {selectedOrder.address && <div style={{ fontSize: 13, color: C.greyDark, marginBottom: 14 }}>📍 {selectedOrder.address}</div>}
            {tab === "my-orders" && selectedOrder.items?.[0]?.sellerId && (
              <button style={{ ...S.btn(), width: "100%", marginBottom: 10 }}
                onClick={() => startChat && startChat({
                  id: selectedOrder.items[0].sellerId,
                  name: selectedOrder.items[0].seller || "Seller",
                  productName: selectedOrder.items[0].name,
                  orderId: selectedOrder.id,
                })}>
                💬 Message Seller about this Order
              </button>
            )}
            {tab === "seller-orders" && selectedOrder.userId && (
              <button style={{ ...S.btn(), width: "100%", marginBottom: 10 }}
                onClick={() => startChat && startChat({
                  id: selectedOrder.userId,
                  name: selectedOrder.customerName || "Buyer",
                  productName: selectedOrder.items?.[0]?.name,
                  orderId: selectedOrder.id,
                })}>
                💬 Message Buyer about this Order
              </button>
            )}
            <button style={{ ...S.btn("outline"), width: "100%" }} onClick={() => setSelectedOrder(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notifications Page ─────────────────────────────────────────
function NotificationsPage({ user, setPage, setChatSeller, setSelectedProduct, setViewingPublicProfile }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "denied"
  );

  const requestNotifPermission = async () => {
    if (!("Notification" in window)) { alert("Your browser does not support notifications."); return; }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("E-Connect 🔔", {
            body: "Notifications enabled! You will now receive updates.",
            icon: "https://res.cloudinary.com/dxmmsq0gq/image/upload/w_192,h_192,c_fill/WhatsApp_Image_2026-06-09_at_9.31.32_PM_ficnea.jpg",
            vibrate: [200, 100, 200],
          });
        } catch (e) {
          // Service worker not ready - fall back to plain notification
          new Notification("E-Connect 🔔", { body: "Notifications enabled! You will now receive updates." });
        }
      } else {
        new Notification("E-Connect 🔔", { body: "Notifications enabled! You will now receive updates." });
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Deduplicate: collapse consecutive notifications with the same type+message+fromUserId
      // (keeps the most recent, but counts how many were collapsed)
      const deduped = [];
      for (const n of all) {
        const last = deduped[deduped.length - 1];
        if (last && last.type === n.type && last.message === n.message && last.fromUserId === n.fromUserId) {
          last._count = (last._count || 1) + 1;
          // Keep the most recent createdAt and id, mark older duplicates for cleanup
          last._dupIds = last._dupIds || [];
          last._dupIds.push(n.id);
        } else {
          deduped.push({ ...n, _count: 1, _dupIds: [] });
        }
      }
      setNotifications(deduped);
      setLoading(false);
      // Clean up duplicate notification docs in the background (best-effort)
      deduped.forEach(n => {
        if (n._dupIds && n._dupIds.length > 0) {
          n._dupIds.forEach(dupId => {
            setDoc(doc(db, "notifications", dupId), { read: true, _duplicate: true }, { merge: true }).catch(() => {});
          });
        }
      });
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => setDoc(doc(db, "notifications", n.id), { read: true }, { merge: true })));
  };

  const handleNotificationClick = async (n) => {
    await setDoc(doc(db, "notifications", n.id), { read: true }, { merge: true });
    switch (n.type) {
      case "message":
        if (n.conversationId) {
          setChatSeller && setChatSeller({ id: n.fromUserId, name: n.fromUserName, conversationId: n.conversationId });
        }
        setPage && setPage("messages");
        break;
      case "follow":
      case "nudge":
        if (n.fromUserId) {
          setViewingPublicProfile && setViewingPublicProfile({ uid: n.fromUserId, displayName: n.fromUserName });
          setPage && setPage("publicProfile");
        }
        break;
      case "like":
      case "comment":
        if (n.productId) {
          // Need full product data - navigate to discover/home where ProductDetail can be opened
          setPage && setPage("home");
        } else if (n.reelId) {
          setPage && setPage("reels");
        }
        break;
      case "order":
        setPage && setPage("orders");
        break;
      case "premium":
      case "verification":
      case "ad_approved":
      case "ad_rejected":
        setPage && setPage("profile");
        break;
      default:
        break;
    }
  };

  const getIcon = (type) => {
    const icons = {
      like: "❤️", follow: "👤", order: "🛒", comment: "💬", message: "✉️",
      ad_approved: "⭐", ad_rejected: "❌", premium: "⭐", review: "⭐", nudge: "👋",
    };
    return icons[type] || "🔔";
  };

  const getTimeAgo = (ts) => {
    if (!ts) return "";
    const now = Date.now();
    const time = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    const diff = Math.floor((now - time) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={S.sectionTitle}>Notifications</div>
          <div style={{ fontSize: 13, color: C.greyDark }}>{notifications.filter(n => !n.read).length} unread</div>
        </div>
        {notifications.some(n => !n.read) && (
          <button style={{ ...S.btn("outline"), padding: "7px 14px", fontSize: 12 }} onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {/* Push Notification Permission Banner */}
      {notifPermission !== "granted" && (
        <div style={{ ...S.card, padding: 16, marginBottom: 16, background: `${C.primary}10`, border: `1px solid ${C.primary}30`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Enable Push Notifications</div>
            <div style={{ fontSize: 12, color: C.greyDark }}>Get notified about messages, orders, likes and follows even when the app is closed.</div>
          </div>
          <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 12, whiteSpace: "nowrap" }} onClick={requestNotifPermission}>
            Allow
          </button>
        </div>
      )}
      {notifPermission === "granted" && (
        <div style={{ ...S.card, padding: 12, marginBottom: 16, background: "#e6faf8", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>Push notifications are enabled!</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No notifications yet</div>
          <div style={{ color: C.greyDark, fontSize: 13 }}>When someone likes, follows or orders from you it will show here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 80 }}>
          {notifications.map(n => (
            <div key={n.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12, background: n.read ? C.white : `${C.primary}08`, borderLeft: n.read ? "none" : `3px solid ${C.primary}`, cursor: "pointer" }}
              onClick={() => handleNotificationClick(n)}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {getIcon(n.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: n.read ? 500 : 700, color: C.text, lineHeight: 1.4 }}>
                  {n.message}
                  {n._count > 1 && <span style={{ color: C.greyDark, fontWeight: 600 }}> ({n._count}x)</span>}
                </div>
                <div style={{ fontSize: 12, color: C.greyDark, marginTop: 3 }}>{getTimeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Shop Hours Helper ───────────────────────────────────────────
function getShopStatus(seller) {
  if (!seller?.shopHoursEnabled) return { isOpen: true, label: "" };
  const now = new Date();
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = days[now.getDay()];
  const shopDays = seller.shopDays || ["Mon","Tue","Wed","Thu","Fri"];
  if (!shopDays.includes(today)) return { isOpen: false, label: `🔴 Closed today · Opens ${shopDays[0] || "Monday"}` };
  const [openH, openM] = (seller.openTime || "08:00").split(":").map(Number);
  const [closeH, closeM] = (seller.closeTime || "18:00").split(":").map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  if (nowMins < openMins) return { isOpen: false, label: `🔴 Closed · Opens at ${seller.openTime}` };
  if (nowMins >= closeMins) return { isOpen: false, label: `🔴 Closed · Opens tomorrow at ${seller.openTime}` };
  const minsLeft = closeMins - nowMins;
  if (minsLeft <= 30) return { isOpen: true, label: `🟡 Closing soon · Closes at ${seller.closeTime}` };
  return { isOpen: true, label: `🟢 Open · Closes at ${seller.closeTime}` };
}


// ── Product Image Placeholder ───────────────────────────────────
function ProductPlaceholder({ name, category, size = "100%" }) {
  const gradients = [
    "linear-gradient(135deg, #00A896, #00D4B8)",
    "linear-gradient(135deg, #F97316, #FB923C)",
    "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    "linear-gradient(135deg, #EC4899, #F472B6)",
    "linear-gradient(135deg, #0EA5E9, #38BDF8)",
    "linear-gradient(135deg, #10B981, #34D399)",
    "linear-gradient(135deg, #F59E0B, #FCD34D)",
    "linear-gradient(135deg, #EF4444, #F87171)",
  ];
  const categoryIcons = {
    "Fashion": "👗", "Food": "🍔", "Electronics": "📱", "Beauty": "💄",
    "Sports": "⚽", "Home": "🏠", "Health": "💊", "Books": "📚",
    "Toys": "🧸", "Jewelry": "💍", "Shoes": "👟", "Bags": "👜",
  };
  const letter = (name || "P").charAt(0).toUpperCase();
  const gradient = gradients[letter.charCodeAt(0) % gradients.length];
  const icon = categoryIcons[category] || null;
  return (
    <div style={{ width: size, height: "100%", background: gradient, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {icon && <div style={{ fontSize: 28, opacity: 0.9 }}>{icon}</div>}
      <div style={{ fontSize: icon ? 22 : 40, fontWeight: 900, color: "white", opacity: 0.95, textShadow: "0 2px 8px rgba(0,0,0,0.2)", letterSpacing: -1 }}>{letter}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600, textAlign: "center", maxWidth: 80, lineHeight: 1.2 }}>{(name || "").slice(0, 20)}</div>
    </div>
  );
}

// ── Send Notification Helper ────────────────────────────────────
async function sendNotification(toUserId, type, message, fromUserName, meta = {}) {
  if (!toUserId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      toUserId, type, message, fromUserName: fromUserName || "",
      read: false, createdAt: serverTimestamp(), ...meta,
    });
  } catch (err) { console.error("Notification error:", err); }
}

// Shows a local device notification (used when WE receive a new notification doc)
function showLocalNotification(type, message) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const icons = { like: "❤️", follow: "👤", order: "🛒", comment: "💬", message: "✉️", ad_approved: "⭐", premium: "⭐", review: "⭐", nudge: "👋" };
  const icon = icons[type] || "🔔";
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification("E-Connect " + icon, {
        body: message,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200],
        tag: type,
        renotify: true,
      });
    }).catch(() => {
      try { new Notification("E-Connect " + icon, { body: message }); } catch (e) {}
    });
  } else {
    try { new Notification("E-Connect " + icon, { body: message }); } catch (e) {}
  }
}

// ── Approved Ads Banner ────────────────────────────────────────
// ── Shared Bottom-Sheet Ad Detail / Video Player Overlay ─────────
// Used by BOTH the Promoted Image Carousel and the Trending
// Shoppable Videos section below. Handles image ads (static photo)
// and video ads (full <video> player with controls).
function AdDetailModal({ ad, onClose, setViewingPublicProfile, setPage, setChatSeller }) {
  if (!ad) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: C.white, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.greyMid }} />
        </div>
        <div style={{ position: "relative" }}>
          {ad.adType === "video" ? (
            // Full video controller + seek bar - only rendered once the
            // sheet is opened (never autoplays on the main feed).
            <video src={ad.mediaUrl || ad.imageUrl} style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} controls autoPlay playsInline poster={ad.imageUrl} />
          ) : (
            <img src={ad.imageUrl} alt={ad.businessName} style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }} />
          )}
          <div style={{ position: "absolute", top: 10, right: 10, background: "#FFD700", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#333", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#333"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            Promoted
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{ad.title || ad.businessName}</div>
          {ad.description && <div style={{ color: C.greyDark, fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{ad.description}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: 12, background: C.grey, borderRadius: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.primary, flexShrink: 0 }}>
              {(ad.businessName || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.businessName}</div>
              <div style={{ fontSize: 12, color: C.greyDark }}>Posted this ad</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...S.btn("outline"), flex: 1 }}
              onClick={() => {
                onClose();
                setViewingPublicProfile && setViewingPublicProfile({ uid: ad.userId, displayName: ad.businessName });
                setPage && setPage("publicProfile");
              }}>
              👤 View Profile
            </button>
            <button style={{ ...S.btn(), flex: 1 }}
              onClick={() => {
                onClose();
                setChatSeller && setChatSeller({ id: ad.userId, name: ad.businessName, productName: ad.title });
                setPage && setPage("messages");
              }}>
              💬 Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Promoted Image Carousel ──────────────────────────────────────
// Sits directly below the Welcome Banner. ONLY rotates static image
// ads (adType !== "video"). Video ads are handled separately by
// <TrendingShoppableVideos /> further down the page.
function PromotedImageCarousel({ ads, setViewingPublicProfile, setPage, setChatSeller }) {
  const [current, setCurrent] = useState(0);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showSponsoredTip, setShowSponsoredTip] = useState(false);
  const containerRef = useRef(null);

  // ── PLUG POINT: this is where static image ads are filtered from
  // the full ads list. Video ads (adType === "video") are excluded
  // here and instead picked up by TrendingShoppableVideos below. ──
  const imageAds = useMemo(() => ads.filter(a => a.adType !== "video"), [ads]);

  useEffect(() => {
    // Show the "Sponsored" tooltip once per device, on first encounter
    try {
      if (!localStorage.getItem("econnect-sponsored-tip-seen")) {
        setShowSponsoredTip(true);
      }
    } catch (e) {}
  }, []);

  // Pause auto-rotate when the carousel scrolls out of view
  useEffect(() => {
    if (!containerRef.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (imageAds.length <= 1 || selectedAd || !isVisible) return;
    const timer = setInterval(() => setCurrent(prev => (prev + 1) % imageAds.length), 4000);
    return () => clearInterval(timer);
  }, [imageAds.length, selectedAd, isVisible]);

  // Reset index if the filtered list shrinks (e.g. ads reload)
  useEffect(() => {
    if (current >= imageAds.length) setCurrent(0);
  }, [imageAds.length, current]);

  const dismissSponsoredTip = () => {
    setShowSponsoredTip(false);
    try { localStorage.setItem("econnect-sponsored-tip-seen", "true"); } catch (e) {}
  };

  if (imageAds.length === 0) return null;

  const ad = imageAds[current];

  return (
    <>
      <div ref={containerRef} style={{ ...S.card, overflow: "hidden", marginBottom: 16, cursor: "pointer", position: "relative" }} onClick={() => setSelectedAd(ad)}>
        <div style={{ position: "relative" }}>
          <img src={ad.imageUrl} alt={ad.businessName} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", top: 10, right: 10, background: "#FFD700", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "#333", display: "flex", alignItems: "center", gap: 4 }}
            onClick={(e) => { if (showSponsoredTip) { e.stopPropagation(); dismissSponsoredTip(); } }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#333"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
            Promoted
          </div>
          {showSponsoredTip && (
            <div style={{ position: "absolute", top: 42, right: 10, background: "rgba(20,20,20,0.92)", color: "white", borderRadius: 10, padding: "10px 12px", fontSize: 11, maxWidth: 200, zIndex: 5, lineHeight: 1.4 }}
              onClick={(e) => { e.stopPropagation(); dismissSponsoredTip(); }}>
              <div style={{ position: "absolute", top: -5, right: 16, width: 10, height: 10, background: "rgba(20,20,20,0.92)", transform: "rotate(45deg)" }} />
              "Promoted" means a seller paid to feature this here. Tap to dismiss.
            </div>
          )}
          {/* Standard horizontal page-indicator dots, bottom-right */}
          {imageAds.length > 1 && (
            <div style={{ position: "absolute", bottom: 8, right: 12, display: "flex", gap: 4 }}>
              {imageAds.map((_, i) => <div key={i} style={{ width: i === current ? 16 : 6, height: 6, borderRadius: 3, background: i === current ? "white" : "rgba(255,255,255,0.6)", transition: "width 0.3s" }} />)}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title || ad.businessName}</div>
          {ad.description && <div style={{ color: C.greyDark, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.description}</div>}
        </div>
      </div>

      {/* ── PLUG POINT: existing Bottom-Sheet Player Overlay, shared with TrendingShoppableVideos ── */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} setViewingPublicProfile={setViewingPublicProfile} setPage={setPage} setChatSeller={setChatSeller} />
    </>
  );
}

// ── Trending Shoppable Videos ────────────────────────────────────
// Horizontally scrollable row of vertical (9:16) video preview cards.
// Shows ONLY a static thumbnail + play icon (never autoplays, to save
// user data). Tapping a card opens the shared bottom-sheet video
// player overlay (<AdDetailModal />) with full controls.
function TrendingShoppableVideos({ ads, setViewingPublicProfile, setPage, setChatSeller }) {
  const [selectedAd, setSelectedAd] = useState(null);

  // ── PLUG POINT: this is where video ads are filtered from the full
  // ads list. Static image ads (adType !== "video") are excluded here
  // and instead handled by <PromotedImageCarousel /> above. ──
  const videoAds = useMemo(() => ads.filter(a => a.adType === "video"), [ads]);

  if (videoAds.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>🎬</span>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Trending Shoppable Videos</span>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {videoAds.map(ad => (
          <div key={ad.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer", minWidth: 150, width: 150, height: 260, flexShrink: 0, position: "relative" }}
            onClick={() => setSelectedAd(ad)}>
            {/* Static thumbnail only - the real <video> only loads inside the bottom-sheet overlay */}
            {ad.imageUrl
              ? <img src={ad.imageUrl} alt={ad.title || ad.businessName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: "100%", background: C.grey }} />}

            {/* Dark gradient so the title text stays readable */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.7) 100%)" }} />

            {/* Center play icon overlay */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>

            {/* "Promoted" badge */}
            <div style={{ position: "absolute", top: 8, right: 8, background: "#FFD700", borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700, color: "#333" }}>
              Promoted
            </div>

            {/* Title + Shop Now overlay at bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 10px 12px" }}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 14, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                {ad.title || ad.businessName}
              </div>
              <div style={{ background: C.primary, color: "white", borderRadius: 20, padding: "6px 0", textAlign: "center", fontWeight: 700, fontSize: 12 }}>
                Shop Now
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PLUG POINT: existing Bottom-Sheet Player Overlay, shared with PromotedImageCarousel ── */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} setViewingPublicProfile={setViewingPublicProfile} setPage={setPage} setChatSeller={setChatSeller} />
    </div>
  );
}

// ── Premium Carousel ─────────────────────────────────────────
function PremiumCarousel({ products, setSelectedProduct, setSelectedProductGroup, setPage }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (paused || products.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(prev => (prev + 1) % products.length), 2000);
    return () => clearInterval(timerRef.current);
  }, [paused, products.length]);

  if (!products.length) return null;
  const p = products[current];

  // Group premium products by seller so swiping in ProductDetail
  // shows that seller's other premium items too
  const openProduct = () => {
    const sellerGroup = products.filter(x => x.sellerId === p.sellerId);
    setSelectedProduct(p);
    setSelectedProductGroup(sellerGroup.length > 1 ? sellerGroup : null);
    setPage("product");
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; setPaused(true); };
  const handleTouchEnd = (e) => {
    if (touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) setCurrent(prev => diff > 0 ? (prev + 1) % products.length : (prev - 1 + products.length) % products.length);
    }
    touchStartX.current = null;
    setPaused(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <PremiumBadge size={22} />
        <span style={{ fontWeight: 900, fontSize: 17 }}>Premium Stores</span>
        <span style={{ fontSize: 11, color: C.greyDark }}>{products.length} featured</span>
      </div>

      <div style={{ borderRadius: 16, overflow: "hidden", cursor: "pointer", position: "relative", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
        onClick={openProduct}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>

        <div style={{ height: 220, background: C.grey, position: "relative", overflow: "hidden" }}>
          {p.image
            ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ProductPlaceholder name={p.name} category={p.category} />}

          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.75) 100%)" }} />

          <div style={{ position: "absolute", top: 12, left: 12, background: "#FFD700", borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 800, color: "#333", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <PremiumBadge size={13} /> Premium ⭐
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg, #FF6B6B, #FF8E53)", borderRadius: 20, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: "white" }}>
            🔥 Trending
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>{p.seller}</span>
              <PremiumBadge size={14} />
            </div>
            <div style={{ fontWeight: 900, fontSize: 20, color: "white", marginBottom: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#FFD700", fontWeight: 900, fontSize: 20 }}>GH₵{p.price}</span>
              <div style={{ background: C.primary, borderRadius: 20, padding: "6px 18px", color: "white", fontWeight: 700, fontSize: 13 }}>Shop Now</div>
            </div>
          </div>
        </div>

        {products.length > 1 && (
          <div style={{ background: "#111", padding: "8px 0", display: "flex", gap: 5, justifyContent: "center", alignItems: "center" }}>
            {products.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); setCurrent(i); setPaused(true); setTimeout(() => setPaused(false), 3000); }}
                style={{ width: i === current ? 20 : 6, height: 6, borderRadius: 3, background: i === current ? "#FFD700" : "rgba(255,255,255,0.3)", transition: "all 0.3s", cursor: "pointer" }} />
            ))}
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginLeft: 6 }}>{paused ? "⏸" : "▶"}</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Home Page ──────────────────────────────────────────────────
// ── RotatingProductCard ──────────────────────────────────────────
// If the group has only 1 product, renders a normal static card.
// If it has 2+, automatically cycles every 2 s with a fade transition,
// pauses on hover/touch-start, and always opens whichever product is
// currently visible when clicked or when "Add to Cart" is tapped.
function RotatingProductCard({ group, setSelectedProduct, setSelectedProductGroup, setPage, addToCart, initialDelay = 0 }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true); // drives opacity fade
  const [frozen, setFrozen] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const advance = () => {
    // Fade out → swap product → fade in
    setVisible(false);
    timeoutRef.current = setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % group.length);
      setVisible(true);
    }, 220); // 220 ms cross-fade
  };

  const startTimer = () => {
    clearInterval(intervalRef.current);
    if (group.length <= 1) return;
    intervalRef.current = setInterval(advance, 2000);
  };

  useEffect(() => {
    if (group.length <= 1) return;
    // Staggered start: each card gets a unique initial delay so they
    // don't all flip at the same millisecond.
    const t = setTimeout(startTimer, initialDelay);
    return () => { clearTimeout(t); clearInterval(intervalRef.current); clearTimeout(timeoutRef.current); };
  }, [group.length]);

  const freeze = () => { setFrozen(true); clearInterval(intervalRef.current); };
  const unfreeze = () => { setFrozen(false); startTimer(); };

  const p = group[activeIdx]; // the product currently shown

  return (
    <div style={{ ...S.card, overflow: "hidden", cursor: "pointer", position: "relative" }}
      onClick={() => { setSelectedProduct(p); setSelectedProductGroup(group.length > 1 ? group : null); setPage("product"); }}
      onMouseEnter={freeze} onMouseLeave={unfreeze}
      onTouchStart={freeze} onTouchEnd={unfreeze}>

      {/* Multi-product indicator dots */}
      {group.length > 1 && (
        <div style={{ position: "absolute", top: 6, right: 6, zIndex: 3, display: "flex", gap: 3 }}>
          {group.map((_, i) => (
            <div key={i} style={{ width: i === activeIdx ? 14 : 6, height: 6, borderRadius: 3, background: i === activeIdx ? C.primary : "rgba(255,255,255,0.7)", transition: "width 0.25s, background 0.25s" }} />
          ))}
        </div>
      )}

      <div style={{ height: 110, overflow: "hidden", background: C.grey, position: "relative" }}>
        {/* Fading image layer */}
        <div style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, transition: "opacity 0.22s ease-in-out" }}>
          {p.image
            ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
            : <ProductPlaceholder name={p.name} category={p.category} />}
        </div>
        <div style={{ position: "absolute", top: 6, left: 6, zIndex: 2 }}><TrendingBadge /></div>
        {/* "X more" label so buyers know there are more variants */}
        {group.length > 1 && (
          <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "2px 7px", fontSize: 10, color: "white", fontWeight: 700, zIndex: 2 }}>
            {activeIdx + 1}/{group.length}
          </div>
        )}
      </div>

      <div style={{ padding: 10 }}>
        {/* Product name fades with the image */}
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, opacity: visible ? 1 : 0, transition: "opacity 0.22s", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.name}
        </div>
        <div style={{ color: C.greyDark, fontSize: 11, marginBottom: 6 }}>{p.seller}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: C.primary, fontWeight: 800, fontSize: 14, opacity: visible ? 1 : 0, transition: "opacity 0.22s" }}>GH₵{p.price}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.greyDark, padding: 0 }}
              onClick={e => { e.stopPropagation(); /* like logic kept identical */ }}>♥</button>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.greyDark, padding: 0 }}
              onClick={e => { e.stopPropagation(); navigator.share ? navigator.share({ title: p.name, text: `Check out ${p.name} on E-Connect!`, url: window.location.href }) : navigator.clipboard?.writeText(window.location.href); }}>↗</button>
          </div>
        </div>
        {/* Add to Cart always sends the CURRENTLY VISIBLE product */}
        <button style={{ ...S.btn(), width: "100%", padding: "7px", fontSize: 12 }}
          onClick={e => { e.stopPropagation(); addToCart(p); }}>
          Add to Cart
        </button>
      </div>
    </div>
  );
}
function ProductCardSkeleton() {
  return (
    <div style={{ ...S.card, overflow: "hidden" }}>
      <div className="skeleton-shimmer" style={{ height: 110, background: C.greyMid }} />
      <div style={{ padding: 10 }}>
        <div className="skeleton-shimmer" style={{ height: 13, width: "80%", borderRadius: 4, background: C.greyMid, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 11, width: "50%", borderRadius: 4, background: C.greyMid, marginBottom: 8 }} />
        <div className="skeleton-shimmer" style={{ height: 14, width: "40%", borderRadius: 4, background: C.greyMid }} />
      </div>
    </div>
  );
}

function Home({ user, cart, setCart, setPage, setSelectedProduct, setSelectedProductGroup, setViewingPublicProfile, setChatSeller }) {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [cartMsg, setCartMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [ads, setAds] = useState([]);

  // Fetch approved ads ONCE here and split them between the image
  // carousel and the video section via props - avoids each section
  // running its own Firestore query (and its own loading flicker).
  useEffect(() => {
    getDocs(query(collection(db, "ads"), where("status", "==", "approved")))
      .then(snap => setAds(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const fetchProducts = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);
      setProducts(list);
      try { localStorage.setItem("econnect-products-cache", JSON.stringify({ data: list, cachedAt: Date.now() })); } catch (e) {}
    } catch (e) { console.error("Failed to fetch products:", e); }
    setLoading(false);
  };

  useEffect(() => {
    // Load cached products instantly for fast first paint
    try {
      const cached = JSON.parse(localStorage.getItem("econnect-products-cache") || "null");
      if (cached?.data?.length) {
        setProducts(cached.data);
        setLoading(false);
        // Refresh in the background
        fetchProducts(true);
        return;
      }
    } catch (e) {}
    fetchProducts();
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("econnect-search-history") || "[]");
      setSearchHistory(hist);
    } catch (e) {}
    // Load trending searches from Firestore
    getDocs(query(collection(db, "searchQueries"), orderBy("count", "desc"), limit(8)))
      .then(snap => setTrendingSearches(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);


  const saveSearchTerm = async (term) => {
    const t = term.trim();
    if (!t) return;
    // Update local history (max 8, no duplicates, most recent first)
    const updated = [t, ...searchHistory.filter(h => h.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setSearchHistory(updated);
    try { localStorage.setItem("econnect-search-history", JSON.stringify(updated)); } catch (e) {}
    // Increment global trending counter
    const key = t.toLowerCase();
    try {
      const ref = doc(db, "searchQueries", key);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await setDoc(ref, { term: t, count: (snap.data().count || 0) + 1, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(ref, { term: t, count: 1, updatedAt: serverTimestamp() });
      }
    } catch (e) {}
  };

  const removeSearchHistoryItem = (term) => {
    const updated = searchHistory.filter(h => h !== term);
    setSearchHistory(updated);
    try { localStorage.setItem("econnect-search-history", JSON.stringify(updated)); } catch (e) {}
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem("econnect-search-history"); } catch (e) {}
  };

  const applySearch = (term) => {
    setSearch(term);
    setShowSearchPanel(false);
    saveSearchTerm(term);
  };

  const filtered = products.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── GROUP products by sellerId + category ───────────────────────
  // Products from the same seller in the same category share one card
  // slot; the RotatingProductCard cycles through them every 2 seconds.
  const standardProducts = filtered.filter(p => !p.sellerPremium && !p.sellerVerified);

  const groupedCards = useMemo(() => {
    const map = new Map();
    standardProducts.forEach(p => {
      const key = `${p.sellerId || p.seller}-${p.category}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    // Return an array of groups; each group is an array of products
    return Array.from(map.values());
  }, [standardProducts.map(p => p.id).join(","), activeCategory, search]);


  const addToCart = (p) => {
    setCart(prev => { const ex = prev.find(i => i.id === p.id); if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i); return [...prev, { ...p, qty: 1 }]; });
    setCartMsg(true); setTimeout(() => setCartMsg(false), 2000);
  };

  return (
    <div style={S.page}>
      {cartMsg && <div style={{ position: "fixed", top: 70, right: 20, background: C.success, color: "white", borderRadius: 10, padding: "10px 18px", zIndex: 200, fontWeight: 700, fontSize: 13 }}>✅ Added to cart!</div>}

      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
        <input
          style={{ ...S.input, paddingLeft: 38 }}
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setShowSearchPanel(true)}
          onBlur={() => setTimeout(() => setShowSearchPanel(false), 150)}
          onKeyDown={e => { if (e.key === "Enter" && search.trim()) { saveSearchTerm(search); setShowSearchPanel(false); } }}
        />
        {search && (
          <button style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: 16, color: C.greyDark, cursor: "pointer" }}
            onClick={() => setSearch("")}>✕</button>
        )}

        {/* Search History & Trending Panel */}
        {showSearchPanel && (searchHistory.length > 0 || trendingSearches.length > 0) && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: C.white, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 50, padding: 14, maxHeight: 320, overflowY: "auto" }}>
            {searchHistory.length > 0 && (
              <div style={{ marginBottom: trendingSearches.length > 0 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.greyDark }}>🕐 Recent Searches</span>
                  <span style={{ fontSize: 12, color: C.primary, cursor: "pointer", fontWeight: 600 }} onMouseDown={e => { e.preventDefault(); clearSearchHistory(); }}>Clear</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {searchHistory.map(term => (
                    <div key={term} style={{ display: "flex", alignItems: "center", gap: 6, background: C.grey, borderRadius: 20, padding: "6px 10px 6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      onMouseDown={e => { e.preventDefault(); applySearch(term); }}>
                      {term}
                      <span style={{ color: C.greyDark, fontSize: 13, lineHeight: 1 }} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); removeSearchHistoryItem(term); }}>✕</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {trendingSearches.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.greyDark, marginBottom: 8 }}>🔥 Trending Searches</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {trendingSearches.map(t => (
                    <div key={t.id} style={{ background: `${C.primary}12`, color: C.primary, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      onMouseDown={e => { e.preventDefault(); applySearch(t.term); }}>
                      {t.term}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <StoriesBar user={user} setPage={setPage} setViewingPublicProfile={setViewingPublicProfile} />

      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius: 14, padding: "18px 20px", marginBottom: 16, color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Welcome to E-Connect</div>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Ghana's Social Commerce Platform</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Buy from local sellers. Support small businesses.</div>
        <button style={{ background: "white", color: C.primary, border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => setPage("discover")}>Discover Sellers</button>
      </div>

      <PromotedImageCarousel ads={ads} setViewingPublicProfile={setViewingPublicProfile} setPage={setPage} setChatSeller={setChatSeller} />

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} style={{ ...S.btn(activeCategory === cat ? "primary" : "grey"), padding: "8px 16px", whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={() => setActiveCategory(cat)}>{cat}</button>
        ))}
      </div>

      {/* ── TIER 1: PREMIUM (Large Banner) ── */}
      {filtered.some(p => p.sellerPremium) && (
        <PremiumCarousel products={filtered.filter(p => p.sellerPremium)} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} setPage={setPage} />
      )}

      {/* ── NEW: Trending Shoppable Videos (video ads only) ── */}
      <TrendingShoppableVideos ads={ads} setViewingPublicProfile={setViewingPublicProfile} setPage={setPage} setChatSeller={setChatSeller} />

      {/* ── TIER 2: VERIFIED (Medium Cards horizontal scroll) ── */}
      {filtered.some(p => p.sellerVerified && !p.sellerPremium) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <VerifiedBadge size={18} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>Verified Stores</span>
          </div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {filtered.filter(p => p.sellerVerified && !p.sellerPremium).map(p => (
              <div key={p.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer", minWidth: 200, flexShrink: 0, border: `1.5px solid #1DA1F2` }}
                onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
                <div style={{ height: 130, overflow: "hidden", background: C.grey, position: "relative" }}>
                  {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                  <div style={{ position: "absolute", top: 8, left: 8, background: "#1DA1F2", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 4 }}>
                    <VerifiedBadge size={10} /> Verified
                  </div>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ color: C.greyDark, fontSize: 12, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    {p.seller} <VerifiedBadge size={12} />
                  </div>
                  <div style={{ color: C.primary, fontWeight: 800, fontSize: 15 }}>GH₵{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* ── TIER 3: NEW/TRENDING (Grouped Rotating Cards) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingBadge />
          <span style={{ fontWeight: 800, fontSize: 16 }}>Trending</span>
          <span style={{ fontSize: 12, color: C.greyDark }}>{standardProducts.length} products</span>
        </div>
        <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 12 }} onClick={() => setShowAdd(true)}>+ Add Product</button>
      </div>

      {loading ? (
        <>
          <style>{`
            .skeleton-shimmer { position: relative; overflow: hidden; background-color: ${C.greyMid}; }
            .skeleton-shimmer::after { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.4s infinite; }
            @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          `}</style>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </>
      ) : groupedCards.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          <p style={{ color: C.greyDark }}>No products yet. Be the first to add one!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {groupedCards.map((group, gi) => (
            <RotatingProductCard
              key={group[0].id}
              group={group}
              setSelectedProduct={setSelectedProduct}
              setSelectedProductGroup={setSelectedProductGroup}
              setPage={setPage}
              addToCart={addToCart}
              initialDelay={gi * 200 + Math.floor(Math.random() * 400)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddProductModal user={user} onClose={() => setShowAdd(false)} onAdded={fetchProducts} />}
    </div>
  );
}

// ── Product Detail ─────────────────────────────────────────────
function ProductDetail({ product, productGroup, setCart, setPage, user, startChat }) {
  const group = (productGroup && productGroup.length > 1) ? productGroup : [product];
  const initialIdx = productGroup ? productGroup.findIndex(p => p.id === product.id) : 0;

  // ── Dual-index state: which PRODUCT in the group, and which IMAGE within it ──
  const [activeIdx, setActiveIdx] = useState(Math.max(0, initialIdx));       // group index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);             // image-within-product index
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);       // mirrors currentImageIndex, tracked separately

  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [reviews, setReviews] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [sellerData, setSellerData] = useState(null);
  const pageTopRef = useRef(null);

  const activeProduct = group[activeIdx] || group[0];

  // ── Images for the active product ──
  const productImages = (activeProduct.images && activeProduct.images.length > 0)
    ? activeProduct.images
    : (activeProduct.image ? [activeProduct.image] : []);

  // ── Variant labels: use seller-provided labels, or auto-generate from image index ──
  // For a grouped view, the "variants" are the products themselves.
  // For a single-product view, variants are the images within that product.
  const imageVariantLabels = productImages.map((_, i) =>
    activeProduct.variantLabels?.[i] || `Variant ${i + 1}`
  );

  // ── Sync helper: updates all three indices together ──
  const selectImageAndVariant = (i) => {
    setCurrentImageIndex(i);
    setSelectedVariantIndex(i);
  };

  // Reset image index whenever the active group product changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setSelectedVariantIndex(0);
  }, [activeIdx]);

  const selectProduct = (i) => {
    setActiveIdx(i);
    pageTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const idx = productGroup ? productGroup.findIndex(p => p.id === product?.id) : 0;
    setActiveIdx(Math.max(0, idx));
  }, [product?.id]);

  useEffect(() => {
    if (!activeProduct?.id) return;
    getDocs(query(collection(db, "reviews"), where("productId", "==", activeProduct.id)))
      .then(snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))).catch(() => {});
  }, [activeProduct?.id]);

  useEffect(() => {
    if (!activeProduct?.id || !activeProduct?.sellerId) return;
    addDoc(collection(db, "productViews"), { productId: activeProduct.id, sellerId: activeProduct.sellerId, viewedAt: serverTimestamp() }).catch(() => {});
    getDoc(doc(db, "users", activeProduct.sellerId)).then(d => { if (d.exists()) setSellerData(d.data()); }).catch(() => {});
    try {
      const rv = JSON.parse(localStorage.getItem("econnect-recently-viewed") || "[]");
      localStorage.setItem("econnect-recently-viewed", JSON.stringify([activeProduct.id, ...rv.filter(id => id !== activeProduct.id)].slice(0, 20)));
    } catch (e) {}
  }, [activeProduct?.id]);

  if (!activeProduct) return null;

  const shopStatus = sellerData ? getShopStatus({ ...activeProduct, ...sellerData }) : null;

  // ── addToCart captures BOTH the group-product index AND the image/variant index ──
  const addToCart = () => {
    const cartItem = {
      ...activeProduct,
      qty: 1,
      currentImageIndex,
      selectedVariantIndex,
      selectedImageIndex: currentImageIndex,
      selectedImage: productImages[currentImageIndex] || activeProduct.image,
      selectedVariant: productImages.length > 1
        ? imageVariantLabels[selectedVariantIndex]
        : activeProduct.name,
    };
    setCart(prev => {
      // Separate cart lines per product+variant combination
      const key = `${activeProduct.id}-${selectedVariantIndex}`;
      const ex = prev.find(i => `${i.id}-${i.selectedVariantIndex ?? 0}` === key);
      if (ex) return prev.map(i => `${i.id}-${i.selectedVariantIndex ?? 0}` === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, cartItem];
    });
    setPage("cart");
  };

  const submitReview = async () => {
    if (!review.trim()) return;
    await addDoc(collection(db, "reviews"), { productId: activeProduct.id, text: review, rating, createdAt: serverTimestamp() });
    setSubmitted(true); setReview("");
  };

  return (
    <div style={S.page} ref={pageTopRef}>
      <button style={{ ...S.btn("grey"), marginBottom: 16, color: C.text }} onClick={() => setPage("home")}>← Back</button>
      <div style={S.card}>

        {/* ── Main image carousel (swipeable, manual-only) ── */}
        <div style={{ height: 280, overflow: "hidden", borderRadius: "14px 14px 0 0", background: C.grey, position: "relative" }}>
          {productImages.length > 1
            ? <ProductImageCarousel images={productImages} height={280} autoRotate={false}
                activeIndex={currentImageIndex} onIndexChange={selectImageAndVariant} />
            : productImages[0]
              ? <img src={productImages[0]} alt={activeProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ProductPlaceholder name={activeProduct.name} category={activeProduct.category} />}
          {group.length > 1 && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", borderRadius: 12, padding: "4px 10px", fontSize: 11, color: "white", fontWeight: 700 }}>
              {activeIdx + 1} / {group.length} items
            </div>
          )}
        </div>

        {/* ── Image thumbnail row (within the active product) ── */}
        {productImages.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: "12px 14px 0", overflowX: "auto" }}>
            {productImages.map((img, i) => (
              <div key={i} onClick={() => selectImageAndVariant(i)}
                style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  border: i === currentImageIndex ? `2.5px solid ${C.primary}` : `2px solid transparent`,
                  opacity: i === currentImageIndex ? 1 : 0.55, transition: "all 0.2s" }}>
                <img src={img} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Group product thumbnail row (only when multiple products in group) ── */}
        {group.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: "12px 14px 0", overflowX: "auto" }}>
            {group.map((p, i) => {
              const thumb = (p.images && p.images[0]) || p.image;
              return (
                <div key={p.id} onClick={() => selectProduct(i)}
                  style={{ flexShrink: 0, cursor: "pointer", textAlign: "center", width: 60 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden",
                    border: i === activeIdx ? `2.5px solid ${C.primary}` : `2px solid transparent`,
                    opacity: i === activeIdx ? 1 : 0.55, transition: "all 0.2s", marginBottom: 4 }}>
                    {thumb ? <img src={thumb} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <ProductPlaceholder name={p.name} category={p.category} />}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: i === activeIdx ? 800 : 500, color: i === activeIdx ? C.primary : C.greyDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name.split(" ").slice(0, 2).join(" ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: 20 }}>
          {/* ── Dynamic product info ── */}
          <div style={{ fontSize: 12, color: C.greyDark, marginBottom: 4 }}>{activeProduct.category}</div>
          <h2 style={{ fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>{activeProduct.name}</h2>
          <div style={{ color: C.greyDark, fontSize: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            By {activeProduct.seller}
            {activeProduct.sellerPremium && <PremiumBadge size={18} />}
            {!activeProduct.sellerPremium && activeProduct.sellerVerified && <VerifiedBadge size={15} />}
          </div>
          {shopStatus?.label && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: shopStatus.isOpen ? "#e6faf8" : "#FEE2E2", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: shopStatus.isOpen ? C.success : C.error, marginBottom: 12 }}>
              {shopStatus.label}
            </div>
          )}
          {shopStatus && !shopStatus.isOpen && (
            <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: C.error, fontWeight: 600 }}>
              ⚠️ This shop is currently closed. You can still add to cart but the seller may not respond until they reopen.
            </div>
          )}
          <div style={{ color: C.primary, fontWeight: 800, fontSize: 28, marginBottom: 12 }}>GH₵{activeProduct.price}</div>
          {activeProduct.description && (
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{activeProduct.description}</p>
          )}
          <div style={{ background: C.grey, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.greyDark }}>
            📦 {activeProduct.stock || 0} items in stock
            {sellerData?.storeContact && (
              <> · 📞 Contact: <a href={`tel:${sellerData.storeContact}`} style={{ color: C.greyDark, textDecoration: "underline" }}>{sellerData.storeContact}</a></>
            )}
          </div>

          {/* ══ VARIANT SELECTION ══════════════════════════════════════════
              Case A: Single product with multiple images → image-based variants
              Case B: Group of products → product-name chips
              Both appear right above Add to Cart per the spec.           */}

          {/* Case A — single product, multiple photos = choose which variant/colour */}
          {group.length === 1 && productImages.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.greyDark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Variant: <span style={{ color: C.primary, textTransform: "none" }}>{imageVariantLabels[selectedVariantIndex]}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {productImages.map((img, i) => (
                  <button key={i} onClick={() => selectImageAndVariant(i)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      border: i === selectedVariantIndex ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                      background: i === selectedVariantIndex ? `${C.primary}12` : C.white,
                      color: i === selectedVariantIndex ? C.primary : C.text,
                      transition: "all 0.18s",
                    }}>
                    <img src={img} alt={imageVariantLabels[i]}
                      style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                    {imageVariantLabels[i]}
                    {i === selectedVariantIndex && <span style={{ fontSize: 11 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Case B — group of products = select which product */}
          {group.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.greyDark, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Select Item: <span style={{ color: C.primary, textTransform: "none" }}>{activeProduct.name}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {group.map((p, i) => (
                  <button key={p.id} onClick={() => selectProduct(i)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                      border: i === activeIdx ? `2px solid ${C.primary}` : `1px solid ${C.border}`,
                      background: i === activeIdx ? `${C.primary}12` : C.white,
                      color: i === activeIdx ? C.primary : C.text,
                      transition: "all 0.18s",
                    }}>
                    {((p.images && p.images[0]) || p.image) && (
                      <img src={(p.images && p.images[0]) || p.image} alt={p.name}
                        style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    {p.name.length > 16 ? p.name.slice(0, 16) + "…" : p.name}
                    {i === activeIdx && <span style={{ fontSize: 11 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Add to Cart (always bound to exact active product + variant) ── */}
          <button style={{ ...S.btn(), width: "100%", padding: 14, fontSize: 15, marginBottom: 10 }} onClick={addToCart}>
            Add to Cart{group.length > 1 ? ` — ${activeProduct.name}` : productImages.length > 1 ? ` — ${imageVariantLabels[selectedVariantIndex]}` : ""}
          </button>
          {activeProduct.sellerId && activeProduct.sellerId !== user?.uid && (
            <button style={{ ...S.btn("outline"), width: "100%", padding: 14, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onClick={() => startChat({ id: activeProduct.sellerId, name: activeProduct.seller, productName: activeProduct.name, productId: activeProduct.id })}>
              💬 Chat with Seller
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={S.sectionTitle}>Reviews</div>
        {submitted && <div style={{ ...S.alert("success"), marginTop: 8 }}>✅ Review submitted!</div>}
        <div style={{ ...S.card, padding: 16, marginTop: 12, marginBottom: 16 }}>
          <label style={S.label}>Leave a Review</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[1,2,3,4,5].map(s => <button key={s} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", opacity: s <= rating ? 1 : 0.3 }} onClick={() => setRating(s)}>⭐</button>)}
          </div>
          <textarea style={{ ...S.input, height: 80, resize: "vertical", marginBottom: 10 }} placeholder="Write your review..." value={review} onChange={e => setReview(e.target.value)} />
          <button style={S.btn()} onClick={submitReview}>Submit Review</button>
        </div>
        {reviews.map(r => (
          <div key={r.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
            <div style={{ color: C.accent, marginBottom: 6 }}>{"⭐".repeat(r.rating)}</div>
            <div style={{ fontSize: 13 }}>{r.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Cart ───────────────────────────────────────────────────────

// ── Cart ───────────────────────────────────────────────────────
function Cart({ cart, setCart, setPage, user }) {
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: user?.displayName || "", phone: "", address: "", delivery: "delivery" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const [sellerContacts, setSellerContacts] = useState([]);

  useEffect(() => {
    // Load seller MoMo numbers for items in cart
    if (!cart.length) return;
    const sellerIds = [...new Set(cart.map(i => i.sellerId).filter(Boolean))];
    Promise.all(sellerIds.map(id => getDoc(doc(db, "users", id)))).then(docs => {
      setSellerContacts(docs.filter(d => d.exists()).map(d => ({
        id: d.id, name: d.data().businessName || d.data().name, contact: d.data().storeContact || d.data().phone || ""
      })));
    });
  }, [cart]);

  const handleOrder = async () => {
    if (!form.name || !form.phone) return;
    setLoading(true);
    await addDoc(collection(db, "orders"), {
      items: cart, total, customerName: form.name, customerPhone: form.phone,
      address: form.address, delivery: form.delivery, userId: user?.uid || "guest",
      status: "pending", paymentMethod: "momo",
      createdAt: serverTimestamp()
    });
    setDone(true); setCart([]);
    setLoading(false);
    setTimeout(() => { setDone(false); setCheckout(false); setPage("orders"); }, 3000);
  };

  if (done) return (
    <div style={{ ...S.page, textAlign: "center", paddingTop: 80 }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${C.success}15`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, margin: "0 auto 16px" }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
      <h2 style={{ fontWeight: 800, fontSize: 24, color: C.success }}>Order Placed!</h2>
      <p style={{ color: C.greyDark }}>Your order has been saved. The seller will contact you at {form.phone}.</p>
      <p style={{ color: C.greyDark, fontSize: 13 }}>Support: +233 54 194 0967</p>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Your Cart</div>
      <p style={S.sectionSub}>{cart.length} item{cart.length !== 1 ? "s" : ""}</p>
      {cart.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p style={{ color: C.greyDark }}>Your cart is empty.</p>
          <button style={{ ...S.btn(), marginTop: 16 }} onClick={() => setPage("home")}>Browse Products</button>
        </div>
      ) : (
        <>
          {cart.map((item, idx) => {
            const displayImage = item.selectedImage || item.image;
            const cartKey = `${item.id}-${item.selectedVariantIndex ?? 0}-${idx}`;
            return (
              <div key={cartKey} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                  {displayImage ? <img src={displayImage} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={item.name} category={item.category} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                  {item.selectedVariant && <div style={{ fontSize: 12, color: C.greyDark, marginTop: 2 }}>Variant: {item.selectedVariant}</div>}
                  <div style={{ color: C.primary, fontWeight: 800 }}>GH₵{item.price} × {item.qty}</div>
                </div>
                <button style={{ background: "none", border: "none", color: C.error, cursor: "pointer", fontSize: 20 }}
                  onClick={() => setCart(prev => prev.filter((i, iIdx) => !(i.id === item.id && (i.selectedVariantIndex ?? 0) === (item.selectedVariantIndex ?? 0) && iIdx === idx)))}>✕</button>
              </div>
            );
          })}
          <div style={{ ...S.card, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: C.primary }}>GH₵{total}</span>
            </div>
          </div>
          <button style={{ ...S.btn(), width: "100%", padding: 14, fontSize: 15 }} onClick={() => setCheckout(true)}>Proceed to Checkout</button>
        </>
      )}
      {checkout && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Checkout · GH₵{total}</h3>
            <label style={S.label}>Full Name</label>
            <input style={{ ...S.input, marginBottom: 12 }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
            <label style={S.label}>Phone Number</label>
            <input style={{ ...S.input, marginBottom: 12 }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+233..." />
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {["delivery", "pickup"].map(opt => (
                <button key={opt} style={{ ...S.btn(form.delivery === opt ? "primary" : "grey"), flex: 1 }} onClick={() => setForm({ ...form, delivery: opt })}>{opt === "delivery" ? "🚚 Delivery" : "🏪 Pickup"}</button>
              ))}
            </div>
            {form.delivery === "delivery" && <input style={{ ...S.input, marginBottom: 12 }} placeholder="Delivery address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />}
            {/* Seller MoMo numbers */}
            <div style={{ background: `${C.primary}10`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📞 Send MoMo payment to seller{sellerContacts.length > 1 ? "s" : ""}:</div>
              {sellerContacts.length > 0 ? sellerContacts.map(s => (
                <div key={s.id} style={{ fontSize: 13, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.greyDark }}>{s.name}</span>
                  <span style={{ fontWeight: 700, color: C.primary }}>{s.contact || "Contact seller directly"}</span>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: C.greyDark }}>Contact the seller directly for payment details.</div>
              )}
              <div style={{ fontSize: 11, color: C.greyDark, marginTop: 6 }}>Pay the seller after placing your order.</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} onClick={handleOrder} disabled={loading}>{loading ? "Placing..." : "Place Order"}</button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => setCheckout(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TikTok-Style Reels Page ────────────────────────────────────

// ── Live Selling Page ──────────────────────────────────────────
function LivePage({ user, setPage, setCart }) {
  const [liveStreams, setLiveStreams] = useState([]);
  const [myStream, setMyStream] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showGoLive, setShowGoLive] = useState(false);
  const [liveForm, setLiveForm] = useState({ title: "", description: "", products: [] });
  const [myProducts, setMyProducts] = useState([]);
  const [liveChat, setLiveChat] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const [viewers, setViewers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [facingMode, setFacingMode] = useState("user");
  const [muted, setMuted] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const chatEndRef = useRef(null);
  const emojiId = useRef(0);

  useEffect(() => {
    const q = query(collection(db, "liveStreams"), where("status", "==", "live"), orderBy("startedAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      const streams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveStreams(streams);
      const mine = streams.find(s => s.sellerId === user?.uid);
      setMyStream(mine || null);
    }, () => {});
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid))).then(snap => {
      setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  useEffect(() => {
    if (!viewing) return;
    const q = query(collection(db, "liveStreams", viewing.id, "chat"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      setLiveChat(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    const viewerRef = doc(db, "liveStreams", viewing.id, "viewers", user?.uid || "guest_" + Date.now());
    setDoc(viewerRef, { joinedAt: serverTimestamp() }, { merge: true });
    const viewersUnsub = onSnapshot(collection(db, "liveStreams", viewing.id, "viewers"), snap => setViewers(snap.size));
    const streamUnsub = onSnapshot(doc(db, "liveStreams", viewing.id), snap => {
      if (snap.data()?.status === "ended") setStreamEnded(true);
    });
    return () => { unsub(); viewersUnsub(); streamUnsub(); };
  }, [viewing]);

  const startCamera = async (facing = "user") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Camera access denied. Please allow camera to go live."); }
  };

  const switchCamera = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setMuted(!audioTrack.enabled); }
    }
  };

  const addFloatingEmoji = (emoji) => {
    const id = emojiId.current++;
    setFloatingEmojis(prev => [...prev, { id, emoji, x: Math.random() * 60 + 20 }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2500);
  };

  const handleScreenTap = (e) => {
    const emojis = ["❤️", "🔥", "👏", "😍", "💯", "🎉", "👑", "✨"];
    addFloatingEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
  };

  const goLive = async () => {
    if (!liveForm.title) { alert("Please enter a title."); return; }
    setLoading(true);
    const streamDoc = await addDoc(collection(db, "liveStreams"), {
      title: liveForm.title, description: liveForm.description,
      sellerId: user.uid, sellerName: user.displayName,
      sellerPhoto: user.photoURL || "",
      products: liveForm.products,
      status: "live", viewerCount: 0,
      startedAt: serverTimestamp(),
    });
    // Notify all followers
    try {
      const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
      await Promise.all(followersSnap.docs.map(d =>
        sendNotification(d.id, "premium", `🔴 ${user.displayName} is now LIVE! "${liveForm.title}" — Join now!`, user.displayName)
      ));
    } catch (e) {}
    setMyStream({ id: streamDoc.id, ...liveForm, sellerId: user.uid, sellerName: user.displayName, status: "live" });
    setShowGoLive(false);
    setLoading(false);
    startCamera(facingMode);
  };

  const endStream = async () => {
    if (!myStream) return;
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    await setDoc(doc(db, "liveStreams", myStream.id), { status: "ended", endedAt: serverTimestamp() }, { merge: true });
    setMyStream(null);
  };

  const sendChat = async () => {
    if (!chatMsg.trim() || !viewing) return;
    const msg = chatMsg; setChatMsg("");
    await addDoc(collection(db, "liveStreams", viewing.id, "chat"), {
      text: msg, userId: user?.uid, userName: user?.displayName || "Guest",
      userPhoto: user?.photoURL || "",
      type: "message",
      createdAt: serverTimestamp(),
    });
  };

  const sendLiveEmoji = async (emoji) => {
    addFloatingEmoji(emoji);
    if (!viewing) return;
    await addDoc(collection(db, "liveStreams", viewing.id, "chat"), {
      text: emoji, userId: user?.uid, userName: user?.displayName || "Guest",
      type: "emoji", createdAt: serverTimestamp(),
    });
  };

  const buyFromLive = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    addFloatingEmoji("🛒");
  };

  const shareLive = async () => {
    const url = `${window.location.origin}`;
    if (navigator.share) {
      await navigator.share({ title: `${user?.displayName} is LIVE!`, text: `Join ${user?.displayName} live on E-Connect: "${myStream?.title}"`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied! Share it with your followers.");
    }
  };

  // ── VIEWER: Full Screen TikTok/IG Style Live ──────────────────
  if (viewing) return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 600, display: "flex", flexDirection: "column", fontFamily: FONT, overflow: "hidden" }}
      onClick={handleScreenTap}>

      {/* Background video area */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0f0c29, #302b63, #24243e)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: 0.15, fontSize: 80 }}>🎥</div>
      </div>

      {/* Floating emojis */}
      {floatingEmojis.map(e => (
        <div key={e.id} style={{ position: "absolute", bottom: 200, left: `${e.x}%`, fontSize: 32, animation: "none", zIndex: 20, pointerEvents: "none",
          transition: "all 2.5s ease-out", transform: "translateY(-120px)", opacity: 0 }}
          ref={el => { if (el) { setTimeout(() => { el.style.transform = "translateY(-180px)"; el.style.opacity = "1"; }, 50); setTimeout(() => { el.style.opacity = "0"; }, 2000); } }}>
          {e.emoji}
        </div>
      ))}

      {/* Gradient overlays */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)", zIndex: 2 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320, background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)", zIndex: 2 }} />

      {streamEnded ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4"/><line x1="17" y1="11" x2="17" y2="17"/><line x1="14" y1="14" x2="20" y2="14"/></svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: "white", marginBottom: 8 }}>Live Ended</div>
          <div style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>This live stream has ended.</div>
          <button style={{ ...S.btn(), padding: "12px 28px" }} onClick={() => { setViewing(null); setStreamEnded(false); }}>Back to Lives</button>
        </div>
      ) : (<>
        {/* TOP BAR */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "48px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", border: "2px solid white", background: "#333" }}>
              {viewing.sellerPhoto ? <img src={viewing.sellerPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>👤</div>}
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{viewing.sellerName}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{viewing.title}</div>
            </div>
            <div style={{ background: C.error, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 800, color: "white", marginLeft: 4 }}>🔴 LIVE</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "5px 10px", fontSize: 12, color: "white", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {viewers}
            </div>
            <button style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={e => { e.stopPropagation(); setViewing(null); setStreamEnded(false); }}>✕</button>
          </div>
        </div>

        {/* PRODUCTS SIDE */}
        {viewing.products?.length > 0 && (
          <div style={{ position: "absolute", right: 10, top: "30%", zIndex: 10 }} onClick={e => e.stopPropagation()}>
            <button style={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 20, padding: "6px 10px", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer", marginBottom: 8, width: "100%", backdropFilter: "blur(8px)" }}
              onClick={() => setShowProducts(!showProducts)}>
              🛒 {viewing.products.length}
            </button>
            {showProducts && viewing.products.slice(0, 4).map(p => (
              <div key={p.id} style={{ background: "rgba(0,0,0,0.75)", borderRadius: 12, padding: 8, width: 78, cursor: "pointer", marginBottom: 8, backdropFilter: "blur(10px)" }}
                onClick={() => buyFromLive(p)}>
                <div style={{ width: 62, height: 62, borderRadius: 8, overflow: "hidden", background: "#333", marginBottom: 4 }}>
                  {p.image ? <img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                </div>
                <div style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}>{p.name?.slice(0, 12)}</div>
                <div style={{ fontSize: 10, color: C.accent, fontWeight: 800 }}>GH₵{p.price}</div>
                <div style={{ fontSize: 9, background: C.primary, color: "white", borderRadius: 4, padding: "2px 0", textAlign: "center", marginTop: 3 }}>+ Cart</div>
              </div>
            ))}
          </div>
        )}

        {/* FLOATING CHAT */}
        <div style={{ position: "absolute", bottom: 130, left: 12, right: viewing.products?.length > 0 ? 100 : 12, zIndex: 10, maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}
          onClick={e => e.stopPropagation()}>
          {liveChat.filter(m => m.type !== "emoji").slice(-12).map(msg => (
            <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0 }}>
                {msg.userPhoto ? <img src={msg.userPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "white" }}>👤</div>}
              </div>
              <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", borderRadius: "0 12px 12px 12px", padding: "6px 12px", maxWidth: "85%" }}>
                <span style={{ fontWeight: 700, color: C.primary, fontSize: 12 }}>{msg.userName} </span>
                <span style={{ color: "white", fontSize: 13 }}>{msg.text}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* EMOJI ROW + CHAT INPUT */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "8px 12px 24px" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 10, marginBottom: 8, justifyContent: "center" }}>
            {["❤️","🔥","😍","👏","💯","🎉","👑","✨"].map(em => (
              <button key={em} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, backdropFilter: "blur(8px)" }}
                onClick={() => sendLiveEmoji(em)}>{em}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0 }}>
              {user?.photoURL ? <img src={user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14 }}>👤</div>}
            </div>
            <input style={{ flex: 1, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 24, padding: "10px 16px", color: "white", fontSize: 14, outline: "none", backdropFilter: "blur(8px)" }}
              placeholder="Say something..."
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
            />
            <button style={{ background: C.primary, border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              onClick={sendChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </>)}
    </div>
  );

  // ── SELLER: Live Broadcast View ────────────────────────────────
  if (myStream) return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 600, fontFamily: FONT, overflow: "hidden" }}
      onClick={handleScreenTap}>

      {/* Camera preview */}
      <video ref={videoRef} autoPlay muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

      {/* Gradient overlays */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160, background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 280, background: "linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)" }} />

      {/* Floating emojis */}
      {floatingEmojis.map(e => (
        <div key={e.id} style={{ position: "absolute", bottom: 200, left: `${e.x}%`, fontSize: 32, zIndex: 20, pointerEvents: "none", transition: "all 2.5s ease-out" }}
          ref={el => { if (el) { setTimeout(() => { el.style.transform = "translateY(-160px)"; el.style.opacity = "0"; }, 100); } }}>
          {e.emoji}
        </div>
      ))}

      {/* TOP CONTROLS */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "50px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: C.error, borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 800, color: "white" }}>🔴 LIVE</div>
          <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "5px 10px", fontSize: 12, color: "white", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {viewers}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Mute */}
          <button style={{ background: muted ? "rgba(255,0,0,0.5)" : "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { e.stopPropagation(); toggleMute(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              {muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></> : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}
            </svg>
          </button>
          {/* Flip camera */}
          <button style={{ background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { e.stopPropagation(); switchCamera(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </button>
          {/* Share */}
          <button style={{ background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { e.stopPropagation(); shareLive(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          {/* End */}
          <button style={{ background: C.error, border: "none", borderRadius: 20, padding: "0 16px", height: 40, color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
            onClick={e => { e.stopPropagation(); endStream(); }}>End</button>
        </div>
      </div>

      {/* Live title */}
      <div style={{ position: "absolute", top: 110, left: 16, zIndex: 10 }}>
        <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>{myStream.title}</div>
      </div>

      {/* Products on right */}
      {myStream.products?.length > 0 && (
        <div style={{ position: "absolute", right: 10, top: "35%", transform: "translateY(-50%)", zIndex: 10 }} onClick={e => e.stopPropagation()}>
          {myStream.products.slice(0, 3).map(p => (
            <div key={p.id} style={{ background: "rgba(0,0,0,0.7)", borderRadius: 12, padding: 8, width: 72, marginBottom: 8, backdropFilter: "blur(8px)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#333", marginBottom: 4 }}>
                {p.image ? <img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
              </div>
              <div style={{ fontSize: 9, color: "white", fontWeight: 700 }}>{p.name?.slice(0, 10)}</div>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 800 }}>GH₵{p.price}</div>
            </div>
          ))}
        </div>
      )}

      {/* CHAT - scrollable by finger */}
      <div style={{ position: "absolute", bottom: 70, left: 12, right: myStream.products?.length > 0 ? 95 : 12, zIndex: 10, maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}
        onClick={e => e.stopPropagation()}>
        {liveChat.filter(m => m.type !== "emoji").slice(-15).map(msg => (
          <div key={msg.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0 }}>
              {msg.userPhoto ? <img src={msg.userPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white" }}>👤</div>}
            </div>
            <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", borderRadius: "0 10px 10px 10px", padding: "5px 10px" }}>
              <span style={{ fontWeight: 700, color: C.primary, fontSize: 11 }}>{msg.userName}: </span>
              <span style={{ color: "white", fontSize: 12 }}>{msg.text}</span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* BOTTOM - hint */}
      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, zIndex: 10, display: "flex", justifyContent: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 20, padding: "6px 16px", display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>👆 Tap screen to send emojis</span>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>📜 Scroll chat above</span>
        </div>
      </div>
    </div>
  );

  // ── LIVE STREAMS LIST ──────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={S.sectionTitle}>🔴 Live</div>
        <button style={{ ...S.btn(), padding: "8px 16px", fontSize: 13 }} onClick={() => setShowGoLive(true)}>+ Go Live</button>
      </div>
      <p style={{ ...S.sectionSub, marginBottom: 20 }}>Watch sellers live · Buy directly · Ask questions</p>

      {liveStreams.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Live Streams</div>
          <div style={{ color: C.greyDark, fontSize: 14, marginBottom: 24 }}>Nobody is live right now. Be the first!</div>
          <button style={{ ...S.btn(), padding: "12px 28px" }} onClick={() => setShowGoLive(true)}>🎥 Start Live Selling</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 80 }}>
          {liveStreams.map(stream => (
            <div key={stream.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer" }} onClick={() => setViewing(stream)}>
              <div style={{ height: 130, background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", border: "3px solid white", overflow: "hidden", background: "#333" }}>
                  {stream.sellerPhoto ? <img src={stream.sellerPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24 }}>🎥</div>}
                </div>
                <div style={{ position: "absolute", top: 8, left: 8, background: C.error, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800, color: "white" }}>🔴 LIVE</div>
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "2px 7px", fontSize: 10, color: "white", display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {stream.viewerCount || 0}
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)", padding: "20px 10px 8px" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 12 }}>{stream.sellerName}</div>
                </div>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{stream.title}</div>
                {stream.products?.length > 0 && <div style={{ fontSize: 11, color: C.primary }}>🛒 {stream.products.length} item{stream.products.length > 1 ? "s" : ""} for sale</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GO LIVE MODAL */}
      {showGoLive && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: C.white, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>🎥 Go Live</div>
            <div style={{ color: C.greyDark, fontSize: 13, marginBottom: 20 }}>Your followers will be notified when you go live</div>
            <label style={S.label}>Live Title *</label>
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Weekend Fashion Sale!" value={liveForm.title} onChange={e => setLiveForm({ ...liveForm, title: e.target.value })} />
            <label style={S.label}>Description (optional)</label>
            <textarea style={{ ...S.input, marginBottom: 16, height: 70, resize: "vertical" }} placeholder="What will you be selling?" value={liveForm.description} onChange={e => setLiveForm({ ...liveForm, description: e.target.value })} />
            <label style={S.label}>Select Products to Sell</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              {myProducts.length === 0 ? (
                <div style={{ color: C.greyDark, fontSize: 13, padding: 10 }}>No products found. Add products first.</div>
              ) : myProducts.map(p => {
                const selected = liveForm.products.find(x => x.id === p.id);
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: `2px solid ${selected ? C.primary : C.border}`, background: selected ? `${C.primary}08` : "white", cursor: "pointer" }}
                    onClick={() => setLiveForm(prev => ({ ...prev, products: selected ? prev.products.filter(x => x.id !== p.id) : [...prev.products, p] }))}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: C.grey }}>
                      {p.image ? <img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>GH₵{p.price}</div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected ? C.primary : C.border}`, background: selected ? C.primary : "white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13 }}>
                      {selected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "#e8f9f7", borderRadius: 10, padding: 12, fontSize: 12, color: C.primary, fontWeight: 600, marginBottom: 20 }}>
              📢 All your followers will get a notification when you go live!
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1, opacity: loading ? 0.7 : 1 }} onClick={goLive} disabled={loading}>
                {loading ? "Starting..." : "🔴 Go Live Now"}
              </button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => setShowGoLive(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Error Boundary: catches any uncaught render error in ReelsPage
// and shows a recovery screen instead of a white crash. ──────────
class ReelsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error("Reels crash:", err); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: "100vh", background: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: 48 }}>🎬</div>
          <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>Something went wrong</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Tap below to reload Reels</div>
          <button style={{ background: "#14B8A6", border: "none", color: "white", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReelsPage({ user, setPage, setViewingUser }) {
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [reelForm, setReelForm] = useState({ description: "", category: "Entertainment" });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [following, setFollowing] = useState({});
  const [showLikes, setShowLikes] = useState(false);
  const [reelLikes, setReelLikes] = useState([]);
  const [likesReelId, setLikesReelId] = useState(null);
  const [followProcessing, setFollowProcessing] = useState({});
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const touchStartY = useRef(0);
  const videoRefs = useRef({});
  const overlayOpenRef = useRef(false);
  const REEL_CATEGORIES = ["Entertainment", "Fashion", "Food", "Tech", "Sports", "Beauty", "Business", "Music", "Comedy"];

  // Track on-screen keyboard so the Comments sheet can shrink and avoid
  // overflow/clipping when the keyboard pushes content up.
  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const baseHeight = window.innerHeight;
    const onResize = () => setKeyboardOpen(vv.height < baseHeight * 0.75);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "reels"), orderBy("createdAt", "desc")));
      setReels(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.deleted));
    } catch (err) {
      console.error("Failed to load reels:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReels(); }, []);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach(key => {
      const video = videoRefs.current[key];
      if (!video) return;
      if (parseInt(key) === currentIndex) { video.play().catch(() => {}); }
      else { video.pause(); video.currentTime = 0; }
    });
  }, [currentIndex]);

  // Keep ref in sync with any overlay being open — touch handlers read this
  // ref (not state) so they always have the current value, not a stale closure.
  useEffect(() => {
    overlayOpenRef.current = showComments || showLikes || showUpload;
  }, [showComments, showLikes, showUpload]);

  const handleTouchStart = (e) => {
    if (overlayOpenRef.current) return;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (overlayOpenRef.current) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 60 && currentIndex < reels.length - 1) setCurrentIndex(p => p + 1);
    if (diff < -60 && currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  const handleDeleteReel = async (reel) => {
    if (!user || reel.userId !== user.uid) return;
    if (!window.confirm("Delete this reel? This cannot be undone.")) return;
    try {
      await setDoc(doc(db, "reels", reel.id), { deleted: true, deletedAt: serverTimestamp() }, { merge: true });
      setReels(prev => {
        const updated = prev.filter(r => r.id !== reel.id);
        // Adjust current index if needed so we don't go out of bounds
        if (currentIndex >= updated.length && updated.length > 0) {
          setCurrentIndex(updated.length - 1);
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to delete reel:", err);
      alert("Failed to delete reel. Please try again.");
    }
  };

  const handleLike = async (reel) => {
    if (!user) return;
    const isLiked = !!liked[reel.id];
    try {
      setLiked(prev => ({ ...prev, [reel.id]: !isLiked }));
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, likes: (r.likes || 0) + (isLiked ? -1 : 1) } : r));
      // Save full user info permanently in reelLikes subcollection
      const likeRef = doc(db, "reels", reel.id, "likes", user.uid);
      if (isLiked) {
        await setDoc(likeRef, { liked: false, removedAt: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(likeRef, {
          liked: true,
          userId: user.uid,
          userName: user.displayName || "User",
          userPhoto: user.photoURL || "",
          likedAt: serverTimestamp(),
        });
      }
      await setDoc(doc(db, "reels", reel.id), { likes: (reel.likes || 0) + (isLiked ? -1 : 1) }, { merge: true });
      if (!isLiked && reel.userId && reel.userId !== user?.uid) {
        await sendNotification(reel.userId, "like", `❤️ ${user.displayName || "Someone"} liked your reel`, user.displayName, { fromUserId: user.uid, reelId: reel.id });
      }
    } catch (err) {
      console.error("Failed to update like:", err);
      // Roll back optimistic UI update if something went wrong
      setLiked(prev => ({ ...prev, [reel.id]: isLiked }));
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, likes: (r.likes || 0) + (isLiked ? 1 : -1) } : r));
    }
  };


  const loadLikes = async (reelId) => {
    setLikesReelId(reelId);
    const snap = await getDocs(query(collection(db, "reels", reelId, "likes"), where("liked", "==", true)));
    setReelLikes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setShowLikes(true);
  };


  const handleFollow = async (reel) => {
    if (!user || followProcessing[reel.userId]) return;
    setFollowProcessing(prev => ({ ...prev, [reel.userId]: true }));
    const isF = following[reel.userId];
    setFollowing(prev => ({ ...prev, [reel.userId]: !isF }));
    try {
      if (!isF) {
        await setDoc(doc(db, "users", user.uid, "following", reel.userId), { name: reel.userName, followedAt: serverTimestamp(), unfollowed: false });
        await setDoc(doc(db, "users", reel.userId, "followers", user.uid), { name: user.displayName, followedAt: serverTimestamp() });
        await sendNotification(reel.userId, "follow", `${user.displayName || "Someone"} started following you`, user.displayName, { fromUserId: user.uid });
      } else {
        await setDoc(doc(db, "users", user.uid, "following", reel.userId), { unfollowed: true }, { merge: true });
      }
    } finally {
      setFollowProcessing(prev => ({ ...prev, [reel.userId]: false }));
    }
  };

  const handleShare = (reel) => {
    try {
      if (navigator.share) navigator.share({ title: reel.description, text: `Watch on E-Connect!`, url: window.location.href });
      else navigator.clipboard?.writeText(window.location.href);
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, shares: (r.shares || 0) + 1 } : r));
    } catch (err) { console.error("Share error:", err); }
  };

  const loadComments = async (reelId) => {
    try {
      const snap = await getDocs(query(collection(db, "reels", reelId, "comments"), orderBy("createdAt")));
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load comments:", err);
      setComments([]);
    }
  };

  // Load existing follow state for current user on mount
  useEffect(() => {
    if (!user || reels.length === 0) return;
    const uniqueUserIds = [...new Set(reels.map(r => r.userId).filter(id => id && id !== user.uid))];
    uniqueUserIds.forEach(async uid => {
      const followSnap = await getDoc(doc(db, "users", user.uid, "following", uid)).catch(() => null);
      if (followSnap?.exists() && !followSnap.data().unfollowed) {
        setFollowing(prev => ({ ...prev, [uid]: true }));
      }
    });
  }, [reels.length, user?.uid]);

  // Load existing likes for current user on mount
  useEffect(() => {
    if (!user || reels.length === 0) return;
    reels.forEach(async reel => {
      const likeSnap = await getDoc(doc(db, "reels", reel.id, "likes", user.uid)).catch(() => null);
      if (likeSnap?.exists() && likeSnap.data().liked) {
        setLiked(prev => ({ ...prev, [reel.id]: true }));
      }
    });
  }, [reels.length, user?.uid]);

  const postComment = async (reelId) => {
    if (!newComment.trim() || !user) return;
    const commentText = newComment.trim();
    setNewComment("");
    try {
      await addDoc(collection(db, "reels", reelId, "comments"), {
        text: commentText,
        userId: user.uid,
        userName: user.displayName || "User",
        userPhoto: user.photoURL || "",
        createdAt: serverTimestamp(),
      });
      loadComments(reelId);
      setReels(prev => prev.map(r => r.id === reelId ? { ...r, comments: (r.comments || 0) + 1 } : r));
      await setDoc(doc(db, "reels", reelId), { comments: (reels.find(r => r.id === reelId)?.comments || 0) + 1 }, { merge: true });
      const reelData = reels.find(r => r.id === reelId);
      if (reelData?.userId && reelData.userId !== user.uid) {
        await sendNotification(reelData.userId, "comment", `💬 ${user.displayName || "Someone"} commented on your reel: "${commentText.slice(0, 40)}"`, user.displayName, { fromUserId: user.uid, reelId: reelId });
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      // Restore the text so the user doesn't lose what they typed
      setNewComment(commentText);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file); data.append("upload_preset", "Econnect"); data.append("cloud_name", "dxmmsq0gq");
      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/video/upload", { method: "POST", body: data });
      const result = await res.json();
      await addDoc(collection(db, "reels"), { videoUrl: result.secure_url, description: reelForm.description, category: reelForm.category, userName: user?.displayName || "User", userId: user?.uid, userPhoto: user?.photoURL || "", likes: 0, shares: 0, comments: 0, createdAt: serverTimestamp() });
      setShowUpload(false); setReelForm({ description: "", category: "Entertainment" }); fetchReels();
    } catch (err) { console.error(err); }
    setUploading(false);
  };

  if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.offWhite, color: C.primary, fontSize: 16, fontFamily: FONT, fontWeight: 700 }}>Loading Reels...</div>;

  if (reels.length === 0) return (
    <div style={{ height: "100vh", background: C.offWhite, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.text, fontFamily: FONT }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎬</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Reels Yet</div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 24 }}>Be the first to upload!</div>
      <button style={{ ...S.btn(), padding: "12px 24px" }} onClick={() => setShowUpload(true)}>+ Upload Reel</button>
      {showUpload && (
        <div style={S.modal} onClick={() => setShowUpload(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Upload a Reel</h3>
            <label style={S.label}>Caption</label>
            <textarea style={{ ...S.input, height: 70, resize: "vertical", marginBottom: 14 }} placeholder="Write a caption..." value={reelForm.description} onChange={e => setReelForm({ ...reelForm, description: e.target.value })} />
            <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 14, cursor: "pointer", background: C.grey }} onClick={() => document.getElementById("reelVideoInput2").click()}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: 13, color: C.greyDark }}>{uploading ? "Uploading..." : "Tap to select video"}</div>
            </div>
            <input id="reelVideoInput2" type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} />
            <button style={{ ...S.btn("outline"), width: "100%" }} onClick={() => setShowUpload(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  const reel = reels[currentIndex];

  // Safety net: if the reel at the current index is undefined (e.g. after
  // a deletion caused the list to shrink), clamp the index and render
  // nothing until React re-renders with the corrected index.
  if (!reel) {
    if (reels.length > 0) setCurrentIndex(Math.max(0, reels.length - 1));
    return <div style={{ height: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontSize: 18 }}>Loading...</span></div>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 50, fontFamily: FONT, overflow: "hidden" }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {reel.videoUrl ? (
        <video key={reel.id} ref={el => videoRefs.current[currentIndex] = el}
          src={reel.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loop muted={muted} playsInline autoPlay
          onClick={() => { const v = videoRefs.current[currentIndex]; if (v) v.paused ? v.play() : v.pause(); }}
          onError={() => console.warn("Video failed to load:", reel.videoUrl)} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 40 }}>🎬</span>
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 50%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />

      {/* Top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <img src="https://res.cloudinary.com/dxmmsq0gq/image/upload/WhatsApp_Image_2026-06-09_at_9.31.32_PM_ficnea.jpg" alt="E-Connect" style={{ height: 28, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {reel.category && <span style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "white", fontWeight: 600 }}>{reel.category}</span>}
          <button style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", color: "white", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowUpload(true)}>+</button>
        </div>
      </div>

      {/* Right Actions */}
      <div style={{ position: "absolute", right: 16, bottom: 100, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "2px solid white", background: "#333" }}>
            {reel.userPhoto ? <img src={reel.userPhoto} alt={reel.userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20 }}>👤</div>}
          </div>
          {!following[reel.userId] && reel.userId !== user?.uid && (
            <button style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: C.primary, border: "2px solid white", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 15, color: "white", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
              onClick={() => handleFollow(reel)}>+</button>
          )}
          {following[reel.userId] && (
            <button style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: "#22c55e", border: "2px solid white", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 13, color: "white", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => handleFollow(reel)}>✓</button>
          )}
        </div>

        {[
          { icon: liked[reel.id] ? "❤️" : "🤍", count: reel.likes || 0, action: () => handleLike(reel), longPressAction: reel.userId === user?.uid ? () => loadLikes(reel.id) : null },
          { icon: "💬", count: reel.comments || 0, action: () => { setShowComments(true); loadComments(reel.id); } },
          { icon: "↗️", count: reel.shares || 0, action: () => handleShare(reel) },
        ].map((btn, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }} onClick={btn.action}>{btn.icon}</button>
            <span style={{ color: "white", fontSize: 12, fontWeight: 700, textDecoration: btn.longPressAction ? "underline" : "none" }}
              onClick={e => { e.stopPropagation(); if (btn.longPressAction) btn.longPressAction(); }}>
              {btn.count}{btn.longPressAction ? " 👁" : ""}
            </span>
          </div>
        ))}

        {/* Delete button - only for reel owner */}
        {reel.userId === user?.uid && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button style={{ background: "rgba(255,0,0,0.3)", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => handleDeleteReel(reel)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
            <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>Delete</span>
          </div>
        )}

        <button style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setMuted(!muted)}>{muted ? "🔇" : "🔊"}</button>
      </div>

      {/* Bottom Info — username taps to profile */}
      <div style={{ position: "absolute", bottom: 90, left: 16, right: 80, zIndex: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, cursor: "pointer", pointerEvents: "all" }}
          onClick={(e) => {
            e.stopPropagation();
            if (reel.userId && setViewingUser) {
              setViewingUser({ uid: reel.userId, displayName: reel.userName, photoURL: reel.userPhoto });
            }
          }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid white", background: "#333", flexShrink: 0 }}>
            {reel.userPhoto
              ? <img src={reel.userPhoto} alt={reel.userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16 }}>👤</div>}
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15, textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.4)" }}>@{reel.userName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Tap to view profile</div>
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 1.5 }}>{reel.description}</div>
      </div>

      {/* Scroll dots */}
      <div style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 4 }}>
        {reels.map((_, i) => (
          <div key={i} style={{ width: 3, height: i === currentIndex ? 18 : 5, borderRadius: 3, background: i === currentIndex ? "white" : "rgba(255,255,255,0.35)", transition: "all 0.3s", cursor: "pointer" }}
            onClick={() => setCurrentIndex(i)} />
        ))}
      </div>

      {/* Swipe hint */}
      {currentIndex === 0 && reels.length > 1 && (
        <div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.5)", fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 18 }}>↑</span><span>Swipe up</span>
        </div>
      )}

      {/* Comments Panel */}
      {showComments && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15,15,15,0.97)", borderRadius: "20px 20px 0 0", height: keyboardOpen ? "85vh" : "65vh", maxHeight: keyboardOpen ? "85vh" : "65vh", zIndex: 20, display: "flex", flexDirection: "column", transition: "height 0.2s", touchAction: "pan-y" }}
          onTouchStart={e => { e.stopPropagation(); overlayOpenRef.current = true; }}
          onTouchEnd={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onMouseUp={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
          </div>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Comments · {reel.comments || 0}</span>
            <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 18, cursor: "pointer" }} onClick={() => setShowComments(false)}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {comments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>No comments yet</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 }}>Be the first to comment!</div>
              </div>
            ) : comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.15)" }}>
                  {c.userPhoto ? <img src={c.userPhoto} alt={c.userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "white" }}>👤</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 13 }}>{c.userName}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>
                      {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.4 }}>{c.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 10, alignItems: "center", background: "#111", touchAction: "none" }}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", background: "#333", flexShrink: 0 }}>
              {user?.photoURL ? <img src={user.photoURL} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white" }}>👤</div>}
            </div>
            <input
              autoFocus
              style={{ flex: 1, background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 24, padding: "10px 16px", fontSize: 14, outline: "none" }}
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); postComment(reel.id); } }}
            />
            <button style={{ background: C.primary, border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              onClick={() => postComment(reel.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={S.modal} onClick={() => setShowUpload(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Upload a Reel</h3>
            <label style={S.label}>Category</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {REEL_CATEGORIES.map(cat => (
                <button key={cat} style={{ ...S.btn(reelForm.category === cat ? "primary" : "grey"), padding: "5px 10px", fontSize: 11 }}
                  onClick={() => setReelForm({ ...reelForm, category: cat })}>{cat}</button>
              ))}
            </div>
            <label style={S.label}>Caption</label>
            <textarea style={{ ...S.input, height: 70, resize: "vertical", marginBottom: 14 }} placeholder="Write a caption for your reel..." value={reelForm.description} onChange={e => setReelForm({ ...reelForm, description: e.target.value })} />
            <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 14, cursor: "pointer", background: C.grey }} onClick={() => document.getElementById("reelVideoInput").click()}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎬</div>
              <div style={{ fontSize: 13, color: C.greyDark, fontWeight: 600 }}>{uploading ? "Uploading... please wait" : "Tap to select your video"}</div>
              <div style={{ fontSize: 11, color: C.greyDark, marginTop: 4 }}>MP4, MOV · Any length</div>
            </div>
            <input id="reelVideoInput" type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} />
            <button style={{ ...S.btn("outline"), width: "100%" }} onClick={() => setShowUpload(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Messages ───────────────────────────────────────────────────
function Messages({ user, chatSeller, onChatStarted }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const playingAudioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);
  const [contextMenuMsg, setContextMenuMsg] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [copyToast, setCopyToast] = useState(false);
  const longPressTimer = useRef(null);
  const chatEndRef = useRef(null);

  // ── Attachments (images / videos / documents) ──
  const [pendingAttachment, setPendingAttachment] = useState(null); // { type, file, previewUrl, name }
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  // ── Voice note recording: tap-to-lock & swipe-to-cancel ──
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const recordTouchStartXRef = useRef(0);
  const cancelledBySwipeRef = useRef(false);

  // ── WebRTC calls ──
  const [activeCall, setActiveCall] = useState(null); // { id, type, role: 'caller'|'callee', status }
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, snap => {
      const convos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConversations(convos);
      // Auto-open chat with seller if coming from product page or order page
      if (chatSeller && !loadingChat) {
        setLoadingChat(true);
        // If we have a direct conversationId (from a notification click), open it directly
        if (chatSeller.conversationId) {
          const direct = convos.find(c => c.id === chatSeller.conversationId);
          if (direct) {
            setSelected(direct);
          } else {
            getDoc(doc(db, "conversations", chatSeller.conversationId)).then(d => {
              if (d.exists()) setSelected({ id: d.id, ...d.data() });
            });
          }
          onChatStarted && onChatStarted();
          return;
        }
        let existing;
        if (chatSeller.orderId) {
          existing = convos.find(c => c.orderId === chatSeller.orderId && c.participants?.includes(chatSeller.id) && c.participants?.includes(user.uid));
        } else {
          existing = convos.find(c => c.participants?.includes(chatSeller.id) && c.participants?.includes(user.uid) && !c.orderId);
        }
        if (existing) {
          setSelected(existing);
          if (chatSeller.productName && !existing.lastMessage) {
            // Send automatic first message
            addDoc(collection(db, "conversations", existing.id, "messages"), {
              text: `Hi! I have a question about "${chatSeller.productName}". Is it still available?`,
              senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp(),
            });
            setDoc(doc(db, "conversations", existing.id), { lastMessage: `Hi! I have a question about "${chatSeller.productName}".`, lastMessageAt: serverTimestamp() }, { merge: true });
          }
          onChatStarted && onChatStarted();
        } else {
          startSellerChat(chatSeller, convos);
        }
      }
    });
    return unsub;
  }, [user, chatSeller]);

  const startSellerChat = async (seller, existingConvos) => {
    const existing = seller.orderId
      ? existingConvos?.find(c => c.orderId === seller.orderId && c.participants?.includes(seller.id))
      : existingConvos?.find(c => c.participants?.includes(seller.id) && !c.orderId);
    if (existing) { setSelected(existing); onChatStarted && onChatStarted(); return; }
    const convoRef = await addDoc(collection(db, "conversations"), {
      participants: [user.uid, seller.id],
      participantNames: [user.displayName, seller.name],
      lastMessage: seller.orderId ? `Order chat started` : (seller.productName ? `Hi! About "${seller.productName}"` : "Hello!"),
      lastMessageAt: serverTimestamp(),
      productId: seller.productId || null,
      productName: seller.productName || null,
      orderId: seller.orderId || null,
    });
    const firstMsg = seller.orderId
      ? `Hi! I'd like to discuss my order${seller.productName ? ` for "${seller.productName}"` : ""}.`
      : seller.productName
        ? `Hi! I have a question about "${seller.productName}". Is it still available?`
        : "Hello!";
    await addDoc(collection(db, "conversations", convoRef.id, "messages"), {
      text: firstMsg, senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp(),
    });
    await sendNotification(seller.id, "message", `💬 ${user.displayName} sent you a message${seller.orderId ? " about an order" : ""}`, user.displayName, { fromUserId: user.uid, conversationId: convoRef.id });
    setSelected({ id: convoRef.id, participants: [user.uid, seller.id], participantNames: [user.displayName, seller.name], productName: seller.productName, orderId: seller.orderId || null });
    onChatStarted && onChatStarted();
  };

  useEffect(() => {
    if (!selected) return;
    const q = query(collection(db, "conversations", selected.id, "messages"), orderBy("createdAt"));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      // Mark incoming messages as read once they're displayed
      msgs.forEach(m => {
        if (m.senderId !== user.uid && !m.read) {
          setDoc(doc(db, "conversations", selected.id, "messages", m.id), { read: true }, { merge: true }).catch(() => {});
        }
      });
    });
    return unsub;
  }, [selected]);

  // Auto-scroll to the latest message whenever the list changes or a chat is opened
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected]);

  // ── Listen for incoming calls addressed to the current user ──
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "calls"), where("calleeId", "==", user.uid), where("status", "==", "ringing"));
    const unsub = onSnapshot(q, snap => {
      const ringing = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(c => !c.declined);
      setIncomingCall(ringing || null);
    }, () => {});
    return unsub;
  }, [user]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected) return;
    const text = newMsg;
    setNewMsg("");
    const msgData = {
      text, senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp()
    };
    if (replyingTo) {
      msgData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.type === "audio" ? "🎤 Voice message" : (replyingTo.text || ""),
        senderName: replyingTo.senderId === user.uid ? "You" : (selected.participantNames?.find(n => n !== user.displayName) || "them"),
      };
      setReplyingTo(null);
    }
    await addDoc(collection(db, "conversations", selected.id, "messages"), msgData);
    await setDoc(doc(db, "conversations", selected.id), { lastMessage: text, lastMessageAt: serverTimestamp() }, { merge: true });
    // Notify the other participant
    const recipientId = selected.participants?.find(id => id !== user.uid);
    if (recipientId) {
      await sendNotification(recipientId, "message", `💬 ${user.displayName || "Someone"}: ${text.length > 40 ? text.slice(0, 40) + "…" : text}`, user.displayName, { fromUserId: user.uid, conversationId: selected.id });
    }
  };

  const copyMessage = (msg) => {
    if (msg.type === "audio") return;
    navigator.clipboard?.writeText(msg.text || "");
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 1500);
    setContextMenuMsg(null);
  };

  const deleteMessage = async (msg) => {
    if (!selected) return;
    if (!window.confirm("Delete this message?")) return;
    await setDoc(doc(db, "conversations", selected.id, "messages", msg.id), { deleted: true, text: "", audioUrl: null }, { merge: true });
    setContextMenuMsg(null);
  };

  const startReply = (msg) => {
    setReplyingTo(msg);
    setContextMenuMsg(null);
  };

  const forwardMessage = async (targetConvo) => {
    if (!forwardingMsg) return;
    const msgData = {
      senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp(),
      forwarded: true,
    };
    if (forwardingMsg.type === "audio") {
      msgData.type = "audio";
      msgData.audioUrl = forwardingMsg.audioUrl;
      msgData.audioDuration = forwardingMsg.audioDuration;
    } else {
      msgData.text = forwardingMsg.text || "";
    }
    await addDoc(collection(db, "conversations", targetConvo.id, "messages"), msgData);
    await setDoc(doc(db, "conversations", targetConvo.id), { lastMessage: forwardingMsg.type === "audio" ? "🎤 Voice message (forwarded)" : forwardingMsg.text, lastMessageAt: serverTimestamp() }, { merge: true });
    const recipientId = targetConvo.participants?.find(id => id !== user.uid);
    if (recipientId) {
      await sendNotification(recipientId, "message", `💬 ${user.displayName || "Someone"} forwarded a message`, user.displayName, { fromUserId: user.uid, conversationId: targetConvo.id });
    }
    setForwardingMsg(null);
    setContextMenuMsg(null);
  };

  // ── WebRTC: start an outgoing call (voice or video) ──
  const startCall = async (type) => {
    if (!selected) return;
    const calleeId = selected.participants?.find(id => id !== user.uid);
    if (!calleeId) return;
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" ? { facingMode: "user" } : false });
      const callRef = await addDoc(collection(db, "calls"), {
        callerId: user.uid, callerName: user.displayName, calleeId, calleeName: selected.participantNames?.find(n => n !== user.displayName) || "User",
        type, status: "ringing", createdAt: serverTimestamp(),
      });
      await sendNotification(calleeId, "call", `📞 ${user.displayName} is calling you (${type === "video" ? "video" : "voice"})`, user.displayName, { fromUserId: user.uid, conversationId: selected.id, callId: callRef.id });
      setActiveCall({ id: callRef.id, type, role: "caller", status: "ringing", localStream, remoteName: selected.participantNames?.find(n => n !== user.displayName) || "User" });
    } catch (err) {
      console.error("Call start error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        alert(`Please allow ${type === "video" ? "camera and microphone" : "microphone"} access to make a call.`);
      } else {
        alert("Couldn't start the call. Please check your camera/microphone and try again.");
      }
    }
  };

  // ── WebRTC: accept an incoming call ──
  const acceptCall = async (call) => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" ? { facingMode: "user" } : false });
      setActiveCall({ id: call.id, type: call.type, role: "callee", status: "active", localStream, remoteName: call.callerName || "User" });
      await setDoc(doc(db, "calls", call.id), { status: "active" }, { merge: true });
      setIncomingCall(null);
    } catch (err) {
      console.error("Accept call error:", err);
      alert(`Please allow ${call.type === "video" ? "camera and microphone" : "microphone"} access to answer this call.`);
    }
  };

  const declineCall = async (call) => {
    await setDoc(doc(db, "calls", call.id), { status: "ended", declined: true }, { merge: true });
    setIncomingCall(null);
  };

  const endCall = async () => {
    if (activeCall) {
      activeCall.localStream?.getTracks().forEach(t => t.stop());
      await setDoc(doc(db, "calls", activeCall.id), { status: "ended" }, { merge: true }).catch(() => {});
    }
    setActiveCall(null);
  };

  const recordSecondsRef = useRef(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recordSecondsRef.current = 0;
      cancelledBySwipeRef.current = false;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (!cancelledBySwipeRef.current && recordSecondsRef.current >= 1) uploadVoiceMessage(blob, mimeType, recordSecondsRef.current);
        setRecordSeconds(0);
        setRecordingLocked(false);
        setSwipeOffset(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingLocked(false);
      setSwipeOffset(0);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch (err) {
      console.error("Mic access error:", err);
      alert("Couldn't access microphone. Please allow microphone permission and try again.");
    }
  };

  const stopRecording = (cancel) => {
    if (!mediaRecorderRef.current) return;
    if (cancel) { audioChunksRef.current = []; cancelledBySwipeRef.current = true; }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // ── Press-and-hold to record: starts on press, sends on release
  // (unless the recording has been "locked" via the lock button, or
  // cancelled by swiping left). ──
  const handleMicPressStart = (e) => {
    if (isRecording) return;
    recordTouchStartXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
    startRecording();
  };
  const handleMicPressEnd = () => {
    if (!isRecording || recordingLocked) return; // locked recordings only stop via explicit button
    if (swipeOffset < -80) { stopRecording(true); return; } // released while swiped far enough left -> cancel
    stopRecording(false);
  };
  const handleMicTouchMove = (e) => {
    if (!isRecording || recordingLocked) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const offset = Math.min(0, x - recordTouchStartXRef.current);
    setSwipeOffset(offset);
    if (offset < -80) { stopRecording(true); } // swiped far enough left -> cancel immediately
  };

  const uploadVoiceMessage = async (blob, mimeType, durationSeconds) => {
    if (!selected) return;
    setUploadingVoice(true);
    try {
      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const data = new FormData();
      data.append("file", blob, `voice.${ext}`);
      data.append("upload_preset", "Econnect");
      data.append("cloud_name", "dxmmsq0gq");
      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/video/upload", { method: "POST", body: data });
      const result = await res.json();
      if (result.secure_url) {
        const duration = result.duration ? Math.round(result.duration) : (durationSeconds || 0);
        await addDoc(collection(db, "conversations", selected.id, "messages"), {
          audioUrl: result.secure_url, audioDuration: duration, type: "audio",
          senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp(),
        });
        await setDoc(doc(db, "conversations", selected.id), { lastMessage: "🎤 Voice message", lastMessageAt: serverTimestamp() }, { merge: true });
        const recipientId = selected.participants?.find(id => id !== user.uid);
        if (recipientId) {
          await sendNotification(recipientId, "message", `🎤 ${user.displayName || "Someone"} sent a voice message`, user.displayName, { fromUserId: user.uid, conversationId: selected.id });
        }
      }
    } catch (err) { console.error("Voice upload error:", err); alert("Failed to send voice message. Please try again."); }
    setUploadingVoice(false);
  };

  // ── Attachments: paperclip -> file picker -> preview bubble -> send ──
  const handleAttachmentSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    setPendingAttachment({
      type, file, name: file.name,
      previewUrl: type !== "file" ? URL.createObjectURL(file) : null,
    });
    e.target.value = ""; // allow re-selecting the same file later
  };

  const cancelAttachment = () => {
    if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment(null);
  };

  const sendAttachment = async () => {
    if (!pendingAttachment || !selected) return;
    setUploadingAttachment(true);
    try {
      const { type, file, name } = pendingAttachment;
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "Econnect");
      data.append("cloud_name", "dxmmsq0gq");
      // Images go through the image endpoint; videos and other documents
      // (PDF, docx, etc.) go through the video/raw-capable endpoint.
      const endpoint = type === "image" ? "image/upload" : "video/upload";
      const res = await fetch(`https://api.cloudinary.com/v1_1/dxmmsq0gq/${endpoint}`, { method: "POST", body: data });
      const result = await res.json();
      if (!result.secure_url) throw new Error(result.error?.message || "Upload failed");
      const msgData = {
        type, mediaUrl: result.secure_url, fileName: name,
        senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL || "", createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "conversations", selected.id, "messages"), msgData);
      const lastMsgLabel = type === "image" ? "📷 Photo" : type === "video" ? "🎥 Video" : `📎 ${name}`;
      await setDoc(doc(db, "conversations", selected.id), { lastMessage: lastMsgLabel, lastMessageAt: serverTimestamp() }, { merge: true });
      const recipientId = selected.participants?.find(id => id !== user.uid);
      if (recipientId) {
        await sendNotification(recipientId, "message", `${lastMsgLabel} from ${user.displayName || "Someone"}`, user.displayName, { fromUserId: user.uid, conversationId: selected.id });
      }
      cancelAttachment();
    } catch (err) {
      console.error("Attachment upload error:", err);
      alert("Failed to send attachment. Please try again.");
    }
    setUploadingAttachment(false);
  };

  const toggleAudioPlayback = (msg) => {
    if (playingId === msg.id) {
      playingAudioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    playingAudioRef.current?.pause();
    const audio = new Audio(msg.audioUrl);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
    playingAudioRef.current = audio;
    setPlayingId(msg.id);
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (ts) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Small WhatsApp-style read-receipt ticks for the current user's own messages
  const ReadReceipt = ({ msg }) => {
    if (msg.senderId !== user.uid) return null;
    const color = msg.read ? "#34B7F1" : "rgba(255,255,255,0.7)";
    return (
      <svg width="15" height="11" viewBox="0 0 16 11" fill="none" style={{ marginLeft: 4, flexShrink: 0 }}>
        <path d="M1 5.5L4.5 9L11 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 5.5L9 9L15.5 1.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  };

  const handlePressStart = (msg) => {
    longPressTimer.current = setTimeout(() => setContextMenuMsg(msg), 450);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      {!selected ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={S.sectionTitle}>Messages</div>
            <button style={{ ...S.btn(), padding: "8px 14px", fontSize: 12 }} onClick={() => setNewChat(true)}>+ New Chat</button>
          </div>
          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, opacity: 0.5 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p style={{ color: C.greyDark }}>No messages yet. Start a conversation!</p>
            </div>
          ) : conversations.map(c => (
            <div key={c.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 8, cursor: "pointer" }} onClick={() => setSelected(c)}>
              <div style={{ ...S.avatar(48), background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {c.participantNames?.filter(n => n !== user.displayName).join(", ") || "Chat"}
                  {c.orderId && <span style={{ background: `${C.primary}15`, color: C.primary, fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "2px 6px" }}>🛒 Order</span>}
                </div>
                <div style={{ color: C.greyDark, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMessage || "No messages yet"}</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }} onClick={() => setSelected(null)}>←</button>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700 }}>{selected.participantNames?.filter(n => n !== user.displayName).join(", ")}</span>
              {selected.orderId && <div style={{ fontSize: 11, color: C.primary, fontWeight: 700 }}>🛒 About order {selected.orderId.slice(0, 6)}…{selected.productName ? ` · ${selected.productName}` : ""}</div>}
            </div>
            {/* ── Voice / Video call buttons ── */}
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.primary }} title="Voice call" onClick={() => startCall("voice")}>📞</button>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.primary }} title="Video call" onClick={() => startCall("video")}>🎥</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {messages.map(m => {
              const isMine = m.senderId === user.uid;
              const footer = !m.deleted && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, marginTop: 4, fontSize: 10, opacity: 0.75 }}>
                  <span>{formatTime(m.createdAt)}</span>
                  <ReadReceipt msg={m} />
                </div>
              );
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                  {m.deleted ? (
                    <div style={{ background: C.grey, color: C.greyDark, borderRadius: 14, padding: "10px 14px", maxWidth: "70%", fontSize: 12, fontStyle: "italic" }}>🚫 This message was deleted</div>
                  ) : m.type === "audio" ? (
                    <div style={{ background: isMine ? C.primary : C.grey, color: isMine ? "white" : C.text, borderRadius: 14, padding: "10px 14px", maxWidth: "70%", userSelect: "none", cursor: "pointer" }}
                      onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}>
                      {m.forwarded && <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, fontStyle: "italic" }}>↪ Forwarded</div>}
                      {m.replyTo && (
                        <div style={{ background: "rgba(255,255,255,0.15)", borderLeft: "3px solid currentColor", borderRadius: 6, padding: "4px 8px", marginBottom: 6, fontSize: 11, opacity: 0.85 }}>
                          <div style={{ fontWeight: 700 }}>{m.replyTo.senderName}</div>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.replyTo.text}</div>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
                        <button style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "inherit", fontSize: 14, flexShrink: 0 }}
                          onClick={(e) => { e.stopPropagation(); toggleAudioPlayback(m); }}>
                          {playingId === m.id ? "⏸" : "▶"}
                        </button>
                        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2, position: "relative" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: playingId === m.id ? "100%" : "0%", background: "currentColor", borderRadius: 2, transition: playingId === m.id ? `width ${m.audioDuration || 1}s linear` : "none" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>🎤 {formatDuration(m.audioDuration || 0)}</span>
                      </div>
                      {footer}
                    </div>
                  ) : m.type === "image" ? (
                    <div style={{ background: isMine ? C.primary : C.grey, borderRadius: 14, padding: 6, maxWidth: "70%", userSelect: "none", cursor: "pointer" }}
                      onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}>
                      <img src={m.mediaUrl} alt="Photo" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, display: "block" }} />
                      <div style={{ padding: "4px 4px 0" }}>{footer}</div>
                    </div>
                  ) : m.type === "video" ? (
                    <div style={{ background: isMine ? C.primary : C.grey, borderRadius: 14, padding: 6, maxWidth: "70%", userSelect: "none", cursor: "pointer" }}
                      onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}>
                      <video src={m.mediaUrl} controls style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, display: "block" }} />
                      <div style={{ padding: "4px 4px 0" }}>{footer}</div>
                    </div>
                  ) : m.type === "file" ? (
                    <div style={{ background: isMine ? C.primary : C.grey, color: isMine ? "white" : C.text, borderRadius: 14, padding: "10px 14px", maxWidth: "70%", userSelect: "none", cursor: "pointer" }}
                      onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}>
                      <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, color: "inherit", textDecoration: "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📄</div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}>{m.fileName || "Document"}</div>
                      </a>
                      {footer}
                    </div>
                  ) : (
                    <div style={{ background: isMine ? C.primary : C.grey, color: isMine ? "white" : C.text, borderRadius: 14, padding: "10px 14px", maxWidth: "70%", fontSize: 13, userSelect: "none", cursor: "pointer" }}
                      onMouseDown={() => handlePressStart(m)} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd}
                      onTouchStart={() => handlePressStart(m)} onTouchEnd={handlePressEnd}>
                      {m.forwarded && <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, fontStyle: "italic" }}>↪ Forwarded</div>}
                      {m.replyTo && (
                        <div style={{ background: "rgba(255,255,255,0.15)", borderLeft: "3px solid currentColor", borderRadius: 6, padding: "4px 8px", marginBottom: 6, fontSize: 11, opacity: 0.85 }}>
                          <div style={{ fontWeight: 700 }}>{m.replyTo.senderName}</div>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.replyTo.text}</div>
                        </div>
                      )}
                      {m.text}
                      {footer}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Reply preview bar */}
          {replyingTo && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.grey, borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
              <div style={{ flex: 1, borderLeft: `3px solid ${C.primary}`, paddingLeft: 8, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>Replying to {replyingTo.senderId === user.uid ? "yourself" : selected.participantNames?.find(n => n !== user.displayName)}</div>
                <div style={{ fontSize: 12, color: C.greyDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyingTo.type === "audio" ? "🎤 Voice message" : replyingTo.text}</div>
              </div>
              <button style={{ background: "none", border: "none", fontSize: 16, color: C.greyDark, cursor: "pointer" }} onClick={() => setReplyingTo(null)}>✕</button>
            </div>
          )}

          {/* ── Pending attachment preview bubble (reviewable before sending) ── */}
          {pendingAttachment && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.grey, borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
              {pendingAttachment.type === "image" && <img src={pendingAttachment.previewUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
              {pendingAttachment.type === "video" && <video src={pendingAttachment.previewUrl} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} muted />}
              {pendingAttachment.type === "file" && <div style={{ width: 48, height: 48, borderRadius: 8, background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingAttachment.name}</div>
                <div style={{ fontSize: 11, color: C.greyDark }}>{pendingAttachment.type === "image" ? "Photo" : pendingAttachment.type === "video" ? "Video" : "Document"} ready to send</div>
              </div>
              <button style={{ background: "none", border: "none", fontSize: 16, color: C.greyDark, cursor: "pointer" }} onClick={cancelAttachment} disabled={uploadingAttachment}>✕</button>
              <button style={{ ...S.btn(), padding: "8px 16px", fontSize: 13, opacity: uploadingAttachment ? 0.6 : 1 }} disabled={uploadingAttachment} onClick={sendAttachment}>
                {uploadingAttachment ? "..." : "Send"}
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {isRecording ? (
              <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", gap: 10, background: C.grey, borderRadius: 24, padding: "8px 14px", overflow: "hidden" }}
                onTouchMove={handleMicTouchMove} onMouseMove={(e) => e.buttons === 1 && handleMicTouchMove(e)}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", animation: "pulse 1s infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>● REC</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{formatDuration(recordSeconds)}</span>
                {!recordingLocked && (
                  <span style={{ flex: 1, textAlign: "center", fontSize: 12, color: C.greyDark, opacity: Math.max(0, 1 + swipeOffset / 80) }}>
                    ← Slide to cancel
                  </span>
                )}
                {!recordingLocked && <div style={{ flex: 1 }} />}
                {!recordingLocked ? (
                  <button style={{ background: "none", border: "none", color: C.primary, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}
                    onClick={() => setRecordingLocked(true)}>
                    🔒 Lock
                  </button>
                ) : (
                  <>
                    <span style={{ flex: 1 }} />
                    <button style={{ background: "none", border: "none", color: C.greyDark, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }} onClick={() => stopRecording(true)}>Cancel</button>
                  </>
                )}
                <button style={{ background: C.primary, border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, fontSize: 14, cursor: "pointer", flexShrink: 0 }} onClick={() => stopRecording(false)}>✓</button>
              </div>
            ) : (
              <>
                {/* ── Paperclip: pick image / video / document ── */}
                <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" style={{ display: "none" }} onChange={handleAttachmentSelect} />
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.greyDark, padding: "6px 4px" }} onClick={() => fileInputRef.current?.click()} title="Attach file">📎</button>
                <input style={{ ...S.input, flex: 1 }} placeholder="Type a message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
                {newMsg.trim() ? (
                  <button style={{ ...S.btn(), padding: "10px 18px" }} onClick={sendMessage}>Send</button>
                ) : (
                  <button style={{ ...S.btn(), padding: "10px 14px", opacity: uploadingVoice ? 0.6 : 1 }} disabled={uploadingVoice}
                    onMouseDown={handleMicPressStart} onMouseUp={handleMicPressEnd}
                    onTouchStart={handleMicPressStart} onTouchEnd={handleMicPressEnd}>
                    {uploadingVoice ? "..." : "🎤"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Copy toast */}
      {copyToast && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: "rgba(20,20,20,0.9)", color: "white", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 600, zIndex: 500 }}>
          ✓ Copied to clipboard
        </div>
      )}

      {/* ── Incoming call banner ── */}
      {incomingCall && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 600, background: "#1a1a1a", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${C.primary}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontWeight: 700 }}>{incomingCall.callerName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{incomingCall.type === "video" ? "📹 Video call" : "📞 Voice call"} incoming...</div>
          </div>
          <button style={{ background: "#EF4444", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, cursor: "pointer" }} onClick={() => declineCall(incomingCall)}>📵</button>
          <button style={{ background: "#22C55E", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, cursor: "pointer" }} onClick={() => acceptCall(incomingCall)}>📞</button>
        </div>
      )}

      {/* ── Active call overlay (voice or video) ── */}
      {activeCall && (
        <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)", zIndex: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "60px 20px 50px", fontFamily: FONT }}>
          {/* Remote party info */}
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 90, height: 90, borderRadius: "50%", background: `${C.primary}33`, border: `3px solid ${C.primary}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 16px" }}>👤</div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 22, marginBottom: 6 }}>{activeCall.remoteName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {activeCall.status === "ringing" ? (activeCall.role === "caller" ? "Calling..." : "Connecting...") : `${activeCall.type === "video" ? "📹 Video" : "📞 Voice"} call in progress`}
            </div>
          </div>

          {/* Local video preview (inset, front-facing camera) */}
          {activeCall.type === "video" && activeCall.localStream && (
            <div style={{ position: "absolute", top: 80, right: 16, width: 100, height: 140, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
              <video ref={el => { if (el && activeCall.localStream) { el.srcObject = activeCall.localStream; el.play().catch(() => {}); } }}
                autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            </div>
          )}

          {/* Call controls */}
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <button style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>🔇</button>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Mute</div>
            </div>
            {activeCall.type === "video" && (
              <div style={{ textAlign: "center" }}>
                <button style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>🔄</button>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Flip</div>
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <button style={{ width: 60, height: 60, borderRadius: "50%", background: "#EF4444", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }} onClick={endCall}>📵</button>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>End</div>
            </div>
          </div>
        </div>
      )}

      {/* Message context menu (Reply / Forward / Copy / Delete) */}
      {contextMenuMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setContextMenuMsg(null)}>
          <div style={{ background: C.white, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, paddingBottom: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.greyMid }} />
            </div>
            {!contextMenuMsg.deleted && (
              <div style={{ padding: "0 14px 10px", color: C.greyDark, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {contextMenuMsg.type === "audio" ? "🎤 Voice message" : contextMenuMsg.text}
              </div>
            )}
            {!contextMenuMsg.deleted && (
              <>
                <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 18px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                  onClick={() => startReply(contextMenuMsg)}>
                  ↩️ Reply
                </button>
                <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 18px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                  onClick={() => { setForwardingMsg(contextMenuMsg); setContextMenuMsg(null); }}>
                  ↪️ Forward
                </button>
                {contextMenuMsg.type !== "audio" && (
                  <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 18px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderTop: `1px solid ${C.border}` }}
                    onClick={() => copyMessage(contextMenuMsg)}>
                    📋 Copy
                  </button>
                )}
              </>
            )}
            {contextMenuMsg.senderId === user.uid && !contextMenuMsg.deleted && (
              <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 18px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderTop: `1px solid ${C.border}`, color: "#EF4444" }}
                onClick={() => deleteMessage(contextMenuMsg)}>
                🗑️ Delete
              </button>
            )}
            <button style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer", borderTop: `1px solid ${C.border}`, color: C.greyDark }}
              onClick={() => setContextMenuMsg(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Forward picker modal */}
      {forwardingMsg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setForwardingMsg(null)}>
          <div style={{ background: C.white, borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "70vh", overflowY: "auto", paddingBottom: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.greyMid }} />
            </div>
            <div style={{ padding: "0 18px 14px", fontWeight: 800, fontSize: 16 }}>Forward to...</div>
            {conversations.length === 0 ? (
              <div style={{ padding: "0 18px 18px", color: C.greyDark, fontSize: 13 }}>No conversations to forward to.</div>
            ) : conversations.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", cursor: "pointer" }} onClick={() => forwardMessage(c)}>
                <div style={{ ...S.avatar(40), background: `${C.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.participantNames?.filter(n => n !== user.displayName).join(", ") || "Chat"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public Profile Page ─────────────────────────────────────────
function PublicProfile({ profileUser, currentUser, setPage, setSelectedProduct, previousPage }) {
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profileUser?.uid) { setLoading(false); return; }
    getDoc(doc(db, "users", profileUser.uid)).then(d => {
      if (d.exists()) setProfile({ uid: profileUser.uid, ...d.data() });
      setLoading(false);
    });
    getDocs(query(collection(db, "products"), where("sellerId", "==", profileUser.uid))).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted));
    });
    if (currentUser) {
      getDoc(doc(db, "users", currentUser.uid, "following", profileUser.uid)).then(d => setIsFollowing(d.exists()));
      // Record this profile view (only if viewing someone else's profile)
      if (currentUser.uid !== profileUser.uid) {
        setDoc(doc(db, "users", profileUser.uid, "profileViews", currentUser.uid), {
          uid: currentUser.uid,
          name: currentUser.displayName || "User",
          photoURL: currentUser.photoURL || "",
          viewedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  }, [profileUser?.uid]);

  const handleFollow = async () => {
    if (!currentUser) return;
    if (isFollowing) {
      await setDoc(doc(db, "users", currentUser.uid, "following", profileUser.uid), { unfollowed: true }, { merge: true });
      setIsFollowing(false);
    } else {
      await setDoc(doc(db, "users", currentUser.uid, "following", profileUser.uid), { name: profile?.name || profileUser.displayName, followedAt: serverTimestamp() });
      await sendNotification(profileUser.uid, "follow", `${currentUser.displayName} started following you`, currentUser.displayName, { fromUserId: currentUser.uid });
      setIsFollowing(true);
    }
  };

  // ── DYNAMIC IMAGE UPLOADS: banner (cover) and profile picture ──
  // Only the store owner can edit their own storefront images.
  const isOwner = currentUser?.uid === profileUser?.uid;

  const uploadStoreImage = async (file, field, setUploadingFlag) => {
    if (!file) return;
    setUploadingFlag(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "Econnect");
      data.append("cloud_name", "dxmmsq0gq");
      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload", { method: "POST", body: data });
      const result = await res.json();
      if (result.secure_url) {
        await setDoc(doc(db, "users", currentUser.uid), { [field]: result.secure_url }, { merge: true });
        setProfile(prev => ({ ...prev, [field]: result.secure_url }));
      }
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
      alert("Upload failed. Please try again.");
    }
    setUploadingFlag(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.greyDark }}>Loading...</div>;
  if (!profileUser?.uid || !profile) {
    return (
      <div style={S.page}>
        <button style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.primary, fontWeight: 700 }} onClick={() => setPage(previousPage || "home")}>
          ← Back
        </button>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Profile not available</div>
          <div style={{ color: C.greyDark, fontSize: 13 }}>{profileUser?.displayName ? `We couldn't load ${profileUser.displayName}'s profile.` : "We couldn't load this profile."}</div>
        </div>
      </div>
    );
  }

  const photoURL = profile.photoURL || profileUser?.photoURL || "";

  return (
    <div style={S.page}>
      <button style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.primary, fontWeight: 700 }} onClick={() => setPage(previousPage || "home")}>
        ← Back
      </button>
      {/* ── HEADER: wide banner (≈16:9) with overlapping circular profile picture ── */}
      <div style={{ position: "relative", marginBottom: 56 }}>
        {/* Background banner */}
        <div style={{ width: "100%", aspectRatio: "16 / 9", maxHeight: 220, borderRadius: 14, overflow: "hidden", background: `linear-gradient(135deg, ${C.primary}22, ${C.primaryDark}33)`, position: "relative" }}>
          {profile.coverUrl
            ? <img src={profile.coverUrl} alt="Store banner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, color: `${C.primary}55` }}>🏪</div>}

          {/* Camera/edit icon for banner (owner only) */}
          {isOwner && (
            <>
              <label htmlFor="storeBannerInput" style={{ position: "absolute", top: 10, right: 10, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                {uploadingCover ? <span style={{ fontSize: 11, color: "white" }}>...</span> : <span style={{ fontSize: 16 }}>📷</span>}
              </label>
              <input id="storeBannerInput" type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => uploadStoreImage(e.target.files[0], "coverUrl", setUploadingCover)} />
            </>
          )}
        </div>

        {/* Circular profile picture, overlapping bottom-left of the banner */}
        <div style={{ position: "absolute", left: 16, bottom: -40, width: 88, height: 88, borderRadius: "50%", border: `4px solid ${C.white}`, background: C.grey, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          {photoURL
            ? <img src={photoURL} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>}

          {/* Camera/edit icon for profile picture (owner only) */}
          {isOwner && (
            <>
              <label htmlFor="storeAvatarInput" style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `2px solid ${C.white}` }}>
                {uploadingAvatar ? <span style={{ fontSize: 9, color: "white" }}>...</span> : <span style={{ fontSize: 12 }}>📷</span>}
              </label>
              <input id="storeAvatarInput" type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => uploadStoreImage(e.target.files[0], "photoURL", setUploadingAvatar)} />
            </>
          )}
        </div>
      </div>

      <div style={{ ...S.card, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{profile.name || profileUser.displayName}</div>
        {profile.bio && <div style={{ color: C.greyDark, fontSize: 13, marginBottom: 12 }}>{profile.bio}</div>}
        {profile.isSeller && profile.businessName && (
          <div style={{ fontSize: 13, color: C.primary, fontWeight: 600, marginBottom: 12 }}>🏪 {profile.businessName}</div>
        )}
        {currentUser?.uid !== profileUser.uid && (
          <button style={{ ...S.btn(isFollowing ? "outline" : ""), padding: "8px 24px" }} onClick={handleFollow}>
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
      {products.length > 0 && (
        <>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>Products</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {products.map(p => (
              <div key={p.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
                <div style={{ height: 120, background: C.grey, overflow: "hidden" }}>
                  {p.image ? <img src={p.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ color: C.primary, fontWeight: 800 }}>GH₵{p.price}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ── Seller Analytics Dashboard ─────────────────────────────────
function SellerAnalytics({ user }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [views, setViews] = useState({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid))),
      getDocs(query(collection(db, "orders"))),
    ]).then(([prodSnap, orderSnap]) => {
      const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allOrders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myOrders = allOrders.filter(o => o.items?.some(i => i.sellerId === user.uid));
      setProducts(prods);
      setOrders(myOrders);
      setLoading(false);
    });
    // Track product views
    const viewsRef = collection(db, "productViews");
    getDocs(query(viewsRef, where("sellerId", "==", user.uid))).then(snap => {
      const v = {};
      snap.docs.forEach(d => { const data = d.data(); v[data.productId] = (v[data.productId] || 0) + 1; });
      setViews(v);
    }).catch(() => {});
  }, [user]);

  const now = Date.now();
  const periodMs = period === "week" ? 7 * 86400000 : period === "month" ? 30 * 86400000 : 365 * 86400000;
  const filteredOrders = orders.filter(o => {
    const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : new Date(o.createdAt || 0).getTime();
    return now - t < periodMs;
  });

  const totalRevenue = filteredOrders.reduce((s, o) => {
    const mine = o.items?.filter(i => i.sellerId === user.uid) || [];
    return s + mine.reduce((ss, i) => ss + (i.price * i.qty), 0);
  }, 0);

  const totalOrders = filteredOrders.length;
  const totalViews = Object.values(views).reduce((s, v) => s + v, 0);
  const conversionRate = totalViews > 0 ? ((totalOrders / totalViews) * 100).toFixed(1) : 0;

  // Best selling products
  const productSales = {};
  orders.forEach(o => {
    o.items?.filter(i => i.sellerId === user.uid).forEach(item => {
      productSales[item.id] = (productSales[item.id] || 0) + (item.qty || 1);
    });
  });
  const topProducts = products.sort((a, b) => (productSales[b.id] || 0) - (productSales[a.id] || 0)).slice(0, 5);

  // Revenue by day (last 7 days)
  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now - (6 - i) * 86400000);
    const label = day.toLocaleDateString("en-GB", { weekday: "short" });
    const dayRevenue = orders.filter(o => {
      const t = o.createdAt?.toMillis ? o.createdAt.toMillis() : 0;
      return Math.abs(t - day.getTime()) < 43200000;
    }).reduce((s, o) => {
      const mine = o.items?.filter(i => i.sellerId === user.uid) || [];
      return s + mine.reduce((ss, i) => ss + (i.price * i.qty), 0);
    }, 0);
    return { label, value: dayRevenue };
  });

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.value), 1);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: C.greyDark }}>Loading analytics...</div>;

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>📊 Analytics</div>
      <p style={S.sectionSub}>Your store performance</p>

      {/* Period Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["week", "month", "year"].map(p => (
          <button key={p} style={{ ...S.btn(period === p ? "primary" : "grey"), padding: "8px 16px", textTransform: "capitalize", flex: 1 }} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Revenue", value: `GH₵${totalRevenue.toFixed(2)}`, icon: "💰", color: C.primary },
          { label: "Orders", value: totalOrders, icon: "🛒", color: C.success },
          { label: "Product Views", value: totalViews, icon: "👁️", color: "#8B5CF6" },
          { label: "Conversion", value: `${conversionRate}%`, icon: "📈", color: C.accent },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, padding: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.greyDark }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart (7 days) */}
      <div style={{ ...S.card, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Revenue (Last 7 Days)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
          {dailyRevenue.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", background: d.value > 0 ? C.primary : C.grey, borderRadius: "4px 4px 0 0", height: `${Math.max((d.value / maxRevenue) * 80, d.value > 0 ? 8 : 4)}px`, transition: "height 0.3s" }} />
              <span style={{ fontSize: 9, color: C.greyDark }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Products */}
      <div style={{ ...S.card, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🏆 Top Products</div>
        {topProducts.length === 0 ? (
          <div style={{ color: C.greyDark, fontSize: 13 }}>No products yet.</div>
        ) : topProducts.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < topProducts.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
              {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p?.name} category={p?.category} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.greyDark }}>GH₵{p.price} · {productSales[p.id] || 0} sold · {views[p.id] || 0} views</div>
            </div>
            <div style={{ fontWeight: 800, color: C.primary, fontSize: 14 }}>#{i + 1}</div>
          </div>
        ))}
      </div>

      {/* All Products Performance */}
      <div style={{ ...S.card, padding: 16, marginBottom: 80 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>All Products</div>
        {products.length === 0 ? (
          <div style={{ color: C.greyDark, fontSize: 13 }}>No products listed yet.</div>
        ) : products.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < products.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
              {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p?.name} category={p?.category} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: C.greyDark }}>👁️ {views[p.id] || 0} views</span>
                <span style={{ fontSize: 11, color: C.success }}>🛒 {productSales[p.id] || 0} sold</span>
                <span style={{ fontSize: 11, color: p.stock > 0 ? C.primary : C.error }}>📦 {p.stock || 0} left</span>
              </div>
            </div>
            <div style={{ fontWeight: 800, color: C.primary, fontSize: 13 }}>GH₵{((productSales[p.id] || 0) * p.price).toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Profile Views Page ──────────────────────────────────────────
// ── Recently Viewed Page (TikTok-style history) ─────────────────
function RecentlyViewedPage({ setPage, setSelectedProduct }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const rv = JSON.parse(localStorage.getItem("econnect-recently-viewed") || "[]");
      if (rv.length === 0) { setItems([]); setLoading(false); return; }
      const results = await Promise.all(rv.map(async id => {
        try {
          const snap = await getDoc(doc(db, "products", id));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        } catch (e) { return null; }
      }));
      setItems(results.filter(p => p && !p.deleted));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clearHistory = () => {
    try { localStorage.removeItem("econnect-recently-viewed"); } catch (e) {}
    setItems([]);
  };

  const removeItem = (id) => {
    try {
      const rv = JSON.parse(localStorage.getItem("econnect-recently-viewed") || "[]");
      const updated = rv.filter(x => x !== id);
      localStorage.setItem("econnect-recently-viewed", JSON.stringify(updated));
    } catch (e) {}
    setItems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div style={S.page}>
      <button style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.primary, fontWeight: 700 }} onClick={() => setPage("profile")}>
        ← Back
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={S.sectionTitle}>Recently Viewed</div>
        {items.length > 0 && (
          <span style={{ fontSize: 13, color: C.primary, fontWeight: 700, cursor: "pointer" }} onClick={clearHistory}>Clear All</span>
        )}
      </div>
      <p style={S.sectionSub}>Products you've recently looked at</p>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🕐</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No viewing history yet</div>
          <div style={{ color: C.greyDark, fontSize: 13 }}>Products you view will show up here so you can find them again easily.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 80 }}>
          {items.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
              onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ color: C.primary, fontWeight: 800, fontSize: 14 }}>GH₵{p.price}</div>
                {p.seller && <div style={{ fontSize: 12, color: C.greyDark }}>{p.seller}</div>}
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.greyDark, padding: 6 }}
                onClick={(e) => { e.stopPropagation(); removeItem(p.id); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Profile Views Page ──────────────────────────────────────────
function ProfileViewsPage({ user, setPage, setViewingPublicProfile }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});
  const [nudged, setNudged] = useState({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "users", user.uid, "profileViews"), orderBy("viewedAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setViews(list);
      // Check following status for each viewer
      const followMap = {};
      await Promise.all(list.map(async v => {
        const fDoc = await getDoc(doc(db, "users", user.uid, "following", v.uid)).catch(() => null);
        followMap[v.uid] = fDoc?.exists() && !fDoc.data().unfollowed;
      }));
      setFollowing(followMap);
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleFollow = async (viewer) => {
    if (!user) return;
    const isF = following[viewer.uid];
    setFollowing(prev => ({ ...prev, [viewer.uid]: !isF }));
    if (!isF) {
      await setDoc(doc(db, "users", user.uid, "following", viewer.uid), { name: viewer.name, followedAt: serverTimestamp(), unfollowed: false });
      await setDoc(doc(db, "users", viewer.uid, "followers", user.uid), { name: user.displayName, followedAt: serverTimestamp() });
      await sendNotification(viewer.uid, "follow", `${user.displayName || "Someone"} started following you`, user.displayName, { fromUserId: user.uid });
    } else {
      await setDoc(doc(db, "users", user.uid, "following", viewer.uid), { unfollowed: true }, { merge: true });
    }
  };

  const nudge = async (viewer) => {
    setNudged(prev => ({ ...prev, [viewer.uid]: true }));
    await sendNotification(viewer.uid, "nudge", `👋 ${user.displayName || "Someone"} nudged you — check out their profile!`, user.displayName, { fromUserId: user.uid });
  };

  const getTimeAgo = (ts) => {
    if (!ts) return "";
    const now = Date.now();
    const time = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
    const diff = Math.floor((now - time) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div style={S.page}>
      <button style={{ background: "none", border: "none", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, color: C.primary, fontWeight: 700 }} onClick={() => setPage("profile")}>
        ← Back
      </button>
      <div style={S.sectionTitle}>Profile Views</div>
      <p style={S.sectionSub}>{views.length} {views.length === 1 ? "person" : "people"} viewed your profile</p>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>Loading...</div>
      ) : views.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>👁️</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No profile views yet</div>
          <div style={{ color: C.greyDark, fontSize: 13 }}>When someone views your profile, they'll show up here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 80 }}>
          {views.map(v => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", cursor: "pointer" }}
              onClick={() => setViewingPublicProfile && setViewingPublicProfile({ uid: v.uid, displayName: v.name, photoURL: v.photoURL })}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", overflow: "hidden", background: C.grey, flexShrink: 0, border: `2px solid ${C.border}` }}>
                {v.photoURL ? <img src={v.photoURL} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                {v.viewedAt && <div style={{ fontSize: 12, color: C.greyDark }}>Viewed {getTimeAgo(v.viewedAt)}</div>}
              </div>
              {following[v.uid] ? (
                <button style={{ ...S.btn("grey"), padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 20 }}
                  onClick={(e) => { e.stopPropagation(); toggleFollow(v); }}>Following</button>
              ) : nudged[v.uid] ? (
                <button style={{ ...S.btn("grey"), padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 20 }} disabled>👋 Nudged</button>
              ) : (
                <button style={{ ...S.btn(), padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 20 }}
                  onClick={(e) => { e.stopPropagation(); toggleFollow(v); }}>Follow</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// ── Profile ────────────────────────────────────────────────────
function Profile({ user, setPage, setUser, theme, setTheme, setViewingPublicProfile }) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("orders");
  const [myProducts, setMyProducts] = useState([]);
  const [showPremium, setShowPremium] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showStore, setShowStore] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [storeForm, setStoreForm] = useState({ businessName: "", description: "", contact: "", logoUrl: "", city: "", adType: "image", adMediaUrl: "", adTitle: "", adDescription: "", adThumbnail: "", adUploading: false, openTime: "08:00", closeTime: "18:00", shopDays: ["Mon","Tue","Wed","Thu","Fri"], shopHoursEnabled: false });
  const [storeSaved, setStoreSaved] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profileViewsCount, setProfileViewsCount] = useState(0);
  const [myReels, setMyReels] = useState([]);
  const [myAds, setMyAds] = useState([]);
  const [deletingId, setDeletingId] = useState(null); // tracks which item is being deleted

  const fetchMyContent = async () => {
    if (!user) return;
    const [reelsSnap, adsSnap] = await Promise.all([
      getDocs(query(collection(db, "reels"), where("userId", "==", user.uid), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "ads"), where("userId", "==", user.uid))),
    ]);
    setMyReels(reelsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => !r.deleted));
    setMyAds(adsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.status !== "deleted"));
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Permanently delete "${p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await deleteDoc(doc(db, "products", p.id));
      setMyProducts(prev => prev.filter(x => x.id !== p.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete product. Please try again.");
    }
    setDeletingId(null);
  };

  const handleDeleteReel = async (r) => {
    if (!window.confirm(`Permanently delete this reel? This cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await deleteDoc(doc(db, "reels", r.id));
      setMyReels(prev => prev.filter(x => x.id !== r.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete reel. Please try again.");
    }
    setDeletingId(null);
  };

  const handleDeleteAd = async (a) => {
    if (!window.confirm(`Permanently delete this promoted ad? This cannot be undone.`)) return;
    setDeletingId(a.id);
    try {
      await deleteDoc(doc(db, "ads", a.id));
      setMyAds(prev => prev.filter(x => x.id !== a.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete ad. Please try again.");
    }
    setDeletingId(null);
  };

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then(d => {
      if (d.exists()) {
        const data = d.data();
        setProfile(data);
        setStoreForm(prev => ({ ...prev, businessName: data.businessName || "", description: data.storeDescription || "", contact: data.storeContact || "", logoUrl: data.logoUrl || "", openTime: data.openTime || "08:00", closeTime: data.closeTime || "18:00", shopDays: data.shopDays || ["Mon","Tue","Wed","Thu","Fri"], shopHoursEnabled: data.shopHoursEnabled || false }));
        // Check premium expiry
        if (data.premium && data.premiumExpiry) {
          const expiry = data.premiumExpiry.toMillis ? data.premiumExpiry.toMillis() : new Date(data.premiumExpiry).getTime();
          if (Date.now() > expiry) {
            // Premium expired — revoke it
            setDoc(doc(db, "users", user.uid), { premium: false, premiumExpiry: null }, { merge: true });
            setIsPremium(false);
          } else {
            setIsPremium(true);
          }
        } else {
          setIsPremium(data.premium || false);
        }
      }
    });
    getDocs(query(collection(db, "orders"), where("userId", "==", user.uid))).then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid))).then(snap => setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted)));
    getDocs(collection(db, "users", user.uid, "followers")).then(snap => setFollowers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "users", user.uid, "following")).then(snap => setFollowing(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "users", user.uid, "friends")).then(snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "users", user.uid, "profileViews")).then(snap => setProfileViewsCount(snap.size));
    fetchMyContent();
  }, [user]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.displayName || "", phone: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Load photo from Firestore first (most reliable on Android)
  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then(d => {
      if (d.exists()) {
        const photoURL = d.data().photoURL || user?.photoURL || "";
        setProfilePhoto(photoURL);
        setEditForm(prev => ({ ...prev, phone: d.data().phone || "", bio: d.data().bio || "" }));
      } else {
        setProfilePhoto(user?.photoURL || "");
      }
    });
  }, [user?.uid]);

  const handleLogout = async () => { await signOut(auth); setUser(null); };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile(auth.currentUser, { displayName: editForm.name });
      await setDoc(doc(db, "users", user.uid), {
        name: editForm.name,
        phone: editForm.phone,
        bio: editForm.bio,
      }, { merge: true });
      setProfileSaved(true);
      setTimeout(() => { setProfileSaved(false); setShowEditProfile(false); }, 2000);
    } catch (err) { console.error(err); }
    setSavingProfile(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "Econnect");
      data.append("cloud_name", "dxmmsq0gq");
      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload", { method: "POST", body: data });
      const result = await res.json();
      if (!result.secure_url) throw new Error("Upload failed");
      const photoURL = result.secure_url;
      // 1. Update local state immediately so it shows right away
      setProfilePhoto(photoURL);
      // 2. Save to Firestore (most reliable across all devices)
      await setDoc(doc(db, "users", user.uid), { photoURL }, { merge: true });
      // 3. Update Firebase Auth profile (may be slow on Android but Firestore is source of truth)
      try { await updateProfile(auth.currentUser, { photoURL }); } catch (e) { console.log("Auth update slow, Firestore saved"); }
    } catch (err) { console.error(err); alert("Photo upload failed. Please try again."); }
    setUploadingPhoto(false);
  };

  return (
    <div style={{ ...S.page, paddingTop: 0 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, height: 100, borderRadius: "0 0 20px 20px", marginBottom: -40 }} />
      <div style={{ ...S.card, margin: "0 0 16px", padding: "50px 20px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: -30, left: 20, cursor: "pointer" }} onClick={() => document.getElementById("profilePhotoInput").click()}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.white, border: `3px solid ${C.white}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden", position: "relative" }}>
            {profilePhoto ? <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.4)", padding: "4px 0", textAlign: "center", fontSize: 10, color: "white", fontWeight: 700 }}>
              {uploadingPhoto ? "..." : "Edit"}
            </div>
          </div>
        </div>
        <input id="profilePhotoInput" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{user?.displayName || "User"}</span>
              {profile?.premium && <PremiumBadge size={24} />}
              {!profile?.premium && profile?.verified && <VerifiedBadge size={20} />}
              {profile?.premium && <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>}
            </div>
            <div style={{ color: C.greyDark, fontSize: 13, marginBottom: 8 }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[{ num: myProducts.length, label: "Products" }, { num: orders.length, label: "Orders" }, { num: followers.length, label: "Followers" }, { num: following.length, label: "Following" }, { num: friends.length, label: "Friends" }, { num: profileViewsCount, label: "Profile Views", action: () => setPage("profileViews") }, { num: "🕐", label: "History", action: () => setPage("recentlyViewed") }].map(s => (
                <div key={s.label} style={{ textAlign: "center", cursor: s.action ? "pointer" : "default" }} onClick={s.action}>
                  <div style={{ fontWeight: 800, color: C.primary }}>{s.num}</div>
                  <div style={{ fontSize: 11, color: C.greyDark }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
            <button style={{ ...S.btn("outline"), padding: "8px 14px", fontSize: 12 }} onClick={() => setShowEditProfile(true)}>Edit Profile</button>
            <button style={{ ...S.btn("grey"), padding: "8px 14px", fontSize: 12, color: C.error }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
        {/* Action Buttons - 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <button style={{ background: `linear-gradient(135deg, ${C.accent}, #FFA500)`, border: "none", borderRadius: 12, padding: "12px 10px", fontWeight: 800, fontSize: 13, color: "#333", cursor: "pointer", textAlign: "center" }}
            onClick={() => !isPremium && setShowPremium(true)}>
            ⭐ {isPremium
              ? `Premium · Exp ${profile?.premiumExpiry ? new Date(profile.premiumExpiry?.toMillis ? profile.premiumExpiry.toMillis() : profile.premiumExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}`
              : "Go Premium · GH₵20/mo"}
          </button>
          <button style={{ ...S.btn("outline"), padding: "12px 10px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setShowStore(true)}>
            🏪 My Store
          </button>
          <button style={{ ...S.btn("outline"), padding: "12px 10px", fontSize: 13, fontWeight: 700, borderRadius: 12 }} onClick={() => setPage("analytics")}>
            📊 Analytics
          </button>
          <button style={{ ...S.btn("outline"), padding: "12px 10px", fontSize: 13, fontWeight: 700, borderRadius: 12 }}
            onClick={() => setViewingPublicProfile && setViewingPublicProfile({ uid: user.uid, displayName: user.displayName, photoURL: user.photoURL })}>
            👁️ View Storefront
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["orders", "products", "reels", "ads", "followers", "following", "friends"].map(t => (
          <button key={t} style={{ ...S.btn(tab === t ? "primary" : "grey"), padding: "8px 14px", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => setTab(t)}>{t === "ads" ? "My Ads" : t === "reels" ? "Reels" : t}</button>
        ))}
      </div>

      <div style={{ ...S.card, padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Appearance</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {["system", "light", "dark"].map(t => {
            const isActive = theme === t || (t === "system" && !["light", "dark"].includes(theme));
            return (
              <div key={t} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => {
                if (t === "system") {
                  const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                  setTheme(sys);
                } else { setTheme(t); }
              }}>
                <div style={{ width: 72, height: 100, borderRadius: 12, background: t === "dark" ? "#1A1A1A" : t === "light" ? "#F8F9FA" : "linear-gradient(135deg, #1A1A1A 50%, #F8F9FA 50%)", border: isActive ? `2px solid ${C.primary}` : `2px solid ${C.border}`, marginBottom: 8, overflow: "hidden", display: "flex", flexDirection: "column", gap: 4, padding: 8 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 8, borderRadius: 4, background: t === "dark" ? "#333" : "#E0E0E0" }} />)}
                </div>
                <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? C.primary : C.greyDark, textTransform: "capitalize" }}>{t}</div>
                {isActive && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.primary, margin: "4px auto 0" }} />}
              </div>
            );
          })}
        </div>
      </div>

      {tab === "orders" && (
        orders.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No orders yet.</div> :
        orders.map(o => (
          <div key={o.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Order · GH₵{o.total}</div>
            <div style={{ fontSize: 13, color: C.greyDark }}>{o.items?.length} items · {o.delivery} · {o.status}</div>
          </div>
        ))
      )}

      {tab === "products" && (
        myProducts.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No products yet. Add one from the home page!</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {myProducts.map(p => (
            <div key={p.id} style={{ ...S.card, overflow: "hidden" }}>
              <div style={{ height: 120, background: C.grey, overflow: "hidden", position: "relative" }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                  <button style={{ background: C.white, border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: C.primary, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}
                    onClick={() => setEditingProduct(p)}>Edit</button>
                  <button style={{ background: "#EF4444", border: "none", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", opacity: deletingId === p.id ? 0.5 : 1 }}
                    disabled={deletingId === p.id} onClick={() => handleDeleteProduct(p)}>
                    {deletingId === p.id ? "..." : "🗑️"}
                  </button>
                </div>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ color: C.primary, fontWeight: 700 }}>GH₵{p.price}</div>
                {!p.image && <div style={{ fontSize: 10, color: C.error, marginTop: 2 }}>⚠️ No photo added</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reels" && (
        myReels.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No reels yet. Upload one from the Reels tab!</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {myReels.map(r => (
              <div key={r.id} style={{ ...S.card, overflow: "hidden", position: "relative" }}>
                <div style={{ height: 180, background: "#000", overflow: "hidden", position: "relative" }}>
                  <video src={r.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted preload="metadata" />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity="0.85"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "white", fontSize: 11, fontWeight: 600 }}>❤️ {r.likes || 0}</span>
                    <button style={{ background: "#EF4444", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "white", opacity: deletingId === r.id ? 0.5 : 1 }}
                      disabled={deletingId === r.id} onClick={() => handleDeleteReel(r)}>
                      {deletingId === r.id ? "..." : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
                <div style={{ padding: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.caption || "No caption"}</div>
                  <div style={{ fontSize: 11, color: C.greyDark }}>{r.category}</div>
                </div>
              </div>
            ))}
          </div>
      )}

      {tab === "ads" && (
        myAds.length === 0
          ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No promoted ads yet. Create one from My Store!</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {myAds.map(a => (
              <div key={a.id} style={{ ...S.card, overflow: "hidden", display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                  {a.imageUrl
                    ? <img src={a.imageUrl} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📢</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title || a.businessName}</div>
                  <div style={{ fontSize: 12, color: C.greyDark, marginTop: 2 }}>{a.adType === "video" ? "🎥 Video ad" : "🖼️ Image ad"}</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ background: a.status === "approved" ? "#dcfce7" : a.status === "pending" ? "#fef9c3" : "#fee2e2", color: a.status === "approved" ? "#16a34a" : a.status === "pending" ? "#ca8a04" : "#dc2626", fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px" }}>
                      {a.status === "approved" ? "✅ Live" : a.status === "pending" ? "⏳ Pending" : a.status}
                    </span>
                  </div>
                </div>
                <button style={{ background: "#EF4444", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "white", flexShrink: 0, opacity: deletingId === a.id ? 0.5 : 1 }}
                  disabled={deletingId === a.id} onClick={() => handleDeleteAd(a)}>
                  {deletingId === a.id ? "..." : "🗑️ Delete"}
                </button>
              </div>
            ))}
          </div>
      )}

      {tab === "followers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {followers.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No followers yet.</div> :
          followers.map(f => (
            <div key={f.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={S.avatar(44)}>👤</div>
              <div style={{ fontWeight: 600 }}>{f.name || "User"}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "following" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {following.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>Not following anyone yet.</div> :
          following.map(f => (
            <div key={f.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={S.avatar(44)}>👤</div>
              <div style={{ fontWeight: 600 }}>{f.name || "User"}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "friends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {friends.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No friends yet. Go to Discover to add friends!</div> :
          friends.map(f => (
            <div key={f.id} style={{ ...S.card, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={S.avatar(44)}>👤</div>
              <div style={{ fontWeight: 600 }}>{f.name || "User"}</div>
            </div>
          ))}
        </div>
      )}

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          user={user}
          onClose={() => setEditingProduct(null)}
          onUpdated={() => {
            getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid))).then(snap => setMyProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted)));
            setEditingProduct(null);
          }}
        />
      )}

      {showStore && (
        <div style={S.modal} onClick={() => setShowStore(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>My Store</h3>
            <p style={{ color: C.greyDark, fontSize: 13, marginBottom: 16 }}>Set up your online store on E-Connect</p>
            {storeSaved && <div style={S.alert("success")}>✅ Store saved successfully!</div>}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => document.getElementById("logoUpload").click()}>
                <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", background: C.grey, border: `2px dashed ${C.primary}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {storeForm.logoUrl ? <img src={storeForm.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", fontSize: 12, color: C.greyDark }}>🏪<br/>Logo</div>}
                </div>
              </div>
              <input id="logoUpload" type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return;
                setUploadingLogo(true);
                const data = new FormData(); data.append("file", file); data.append("upload_preset", "Econnect"); data.append("cloud_name", "dxmmsq0gq");
                const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload", { method: "POST", body: data });
                const result = await res.json();
                setStoreForm(prev => ({ ...prev, logoUrl: result.secure_url }));
                setUploadingLogo(false);
              }} />
            </div>

            <label style={S.label}>Business Name</label>
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="e.g. Ama's Fashion" value={storeForm.businessName} onChange={e => setStoreForm({ ...storeForm, businessName: e.target.value })} />
            <label style={S.label}>Store Description</label>
            <textarea style={{ ...S.input, marginBottom: 12, height: 80, resize: "vertical" }} placeholder="What do you sell?" value={storeForm.description} onChange={e => setStoreForm({ ...storeForm, description: e.target.value })} />
            <label style={S.label}>Contact (Phone or WhatsApp)</label>
            <input style={{ ...S.input, marginBottom: 16 }} placeholder="+233..." value={storeForm.contact} onChange={e => setStoreForm({ ...storeForm, contact: e.target.value })} />

            {/* Shop Hours */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>🕐 Shop Hours</div>
                  <div style={{ fontSize: 12, color: C.greyDark }}>Show open/closed status to buyers</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: storeForm.shopHoursEnabled ? C.primary : C.grey, cursor: "pointer", position: "relative", transition: "background 0.2s" }}
                  onClick={() => setStoreForm(prev => ({ ...prev, shopHoursEnabled: !prev.shopHoursEnabled }))}>
                  <div style={{ position: "absolute", top: 2, left: storeForm.shopHoursEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
              {storeForm.shopHoursEnabled && (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={S.label}>Opens at</label>
                      <input type="time" style={{ ...S.input }} value={storeForm.openTime} onChange={e => setStoreForm({ ...storeForm, openTime: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={S.label}>Closes at</label>
                      <input type="time" style={{ ...S.input }} value={storeForm.closeTime} onChange={e => setStoreForm({ ...storeForm, closeTime: e.target.value })} />
                    </div>
                  </div>
                  <label style={S.label}>Open Days</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => (
                      <button key={day} style={{ padding: "6px 10px", borderRadius: 8, border: `1.5px solid ${storeForm.shopDays?.includes(day) ? C.primary : C.border}`, background: storeForm.shopDays?.includes(day) ? `${C.primary}15` : "white", color: storeForm.shopDays?.includes(day) ? C.primary : C.greyDark, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                        onClick={() => {
                          const days = storeForm.shopDays || [];
                          setStoreForm(prev => ({ ...prev, shopDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] }));
                        }}>{day}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <label style={S.label}>City / Location</label>
            <select style={{ ...S.input, marginBottom: 16 }} value={storeForm.city} onChange={e => setStoreForm({ ...storeForm, city: e.target.value })}>
              <option value="">Select your city</option>
              {["Cape Coast","Accra","Kumasi","Takoradi","Tamale","Sunyani","Ho","Koforidua","Wa","Bolgatanga"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {isPremium && profile?.premiumExpiry && (() => {
    const expiry = profile.premiumExpiry?.toMillis ? profile.premiumExpiry.toMillis() : new Date(profile.premiumExpiry).getTime();
    const daysLeft = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 5) return (
      <div style={{ ...S.card, padding: 14, marginBottom: 12, background: "#FFF3CD", border: "1px solid #FFD700", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Premium expiring soon!</div>
          <div style={{ fontSize: 12, color: C.greyDark }}>{daysLeft <= 0 ? "Your premium has expired." : `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left.`} Re-subscribe to keep your ⭐ badge.</div>
        </div>
      </div>
    );
    return null;
  })()}
  {isPremium && (
              <div style={{ background: "#FFF8E1", border: "2px solid #FFD700", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                  Run a Promotional Ad
                </div>
                <p style={{ fontSize: 12, color: C.greyDark, marginBottom: 10 }}>Submit an ad banner. Admin will review and approve within 24 hours. Approved ads show on the Home and Discover pages.</p>
                <label style={S.label}>Ad Type</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["image", "video"].map(t => (
                    <button key={t} style={{ ...S.btn(storeForm.adType === t ? "primary" : "grey"), flex: 1, textTransform: "capitalize", fontSize: 12 }}
                      onClick={() => setStoreForm(prev => ({ ...prev, adType: t, adMediaUrl: "", adThumbnail: "" }))}>
                      {t === "image" ? "📸 Image Ad" : "🎬 Video Ad (30s - 1min)"}
                    </button>
                  ))}
                </div>

                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 10, cursor: "pointer", background: C.grey }}
                  onClick={() => document.getElementById("adMediaUpload").click()}>
                  {storeForm.adMediaUrl ? (
                    storeForm.adType === "video"
                      ? <video src={storeForm.adMediaUrl} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} controls />
                      : <img src={storeForm.adMediaUrl} alt="Ad" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{storeForm.adType === "video" ? "🎬" : "📸"}</div>
                      <div style={{ fontSize: 12, color: C.greyDark, fontWeight: 600 }}>
                        {storeForm.adType === "video" ? "Tap to upload video (30 seconds to 1 minute)" : "Tap to upload ad image"}
                      </div>
                      {storeForm.adType === "video" && <div style={{ fontSize: 11, color: C.greyDark, marginTop: 4 }}>MP4, MOV · Max 1 minute</div>}
                      {storeForm.adUploading && <div style={{ fontSize: 12, color: C.primary, marginTop: 6, fontWeight: 700 }}>Uploading... please wait</div>}
                    </div>
                  )}
                </div>

                <input id="adMediaUpload" type="file" accept={storeForm.adType === "video" ? "video/*" : "image/*"} style={{ display: "none" }} onChange={async (e) => {
                  const file = e.target.files[0]; if (!file) return;
                  if (storeForm.adType === "video") {
                    const video = document.createElement("video");
                    video.preload = "metadata";
                    video.onloadedmetadata = async () => {
                      window.URL.revokeObjectURL(video.src);
                      if (video.duration > 65) { alert("Video must be 30 seconds to 1 minute long. Please trim your video and try again."); return; }
                      if (video.duration < 20) { alert("Video must be at least 30 seconds long."); return; }
                      setStoreForm(prev => ({ ...prev, adUploading: true }));
                      const data = new FormData(); data.append("file", file); data.append("upload_preset", "Econnect"); data.append("cloud_name", "dxmmsq0gq"); data.append("resource_type", "video");
                      const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/video/upload", { method: "POST", body: data });
                      const result = await res.json();
                      setStoreForm(prev => ({ ...prev, adMediaUrl: result.secure_url, adThumbnail: result.secure_url.replace("/upload/", "/upload/so_0/").replace(/\.(mp4|mov|avi)$/i, ".jpg"), adUploading: false }));
                    };
                    video.src = URL.createObjectURL(file);
                  } else {
                    setStoreForm(prev => ({ ...prev, adUploading: true }));
                    const data = new FormData(); data.append("file", file); data.append("upload_preset", "Econnect"); data.append("cloud_name", "dxmmsq0gq");
                    const res = await fetch("https://api.cloudinary.com/v1_1/dxmmsq0gq/image/upload", { method: "POST", body: data });
                    const result = await res.json();
                    setStoreForm(prev => ({ ...prev, adMediaUrl: result.secure_url, adUploading: false }));
                  }
                }} />

                <label style={S.label}>Ad Title</label>
                <input style={{ ...S.input, marginBottom: 8 }} placeholder="e.g. Weekend Sale - 50% Off!" value={storeForm.adTitle || ""} onChange={e => setStoreForm({ ...storeForm, adTitle: e.target.value })} />

                <label style={S.label}>Ad Description</label>
                <textarea style={{ ...S.input, marginBottom: 10, height: 60, resize: "vertical" }} placeholder="e.g. Shop the biggest sale of the season. Limited time only!" value={storeForm.adDescription || ""} onChange={e => setStoreForm({ ...storeForm, adDescription: e.target.value })} />

                <button style={{ ...S.btn(), width: "100%", fontSize: 13, opacity: storeForm.adUploading ? 0.6 : 1 }}
                  disabled={storeForm.adUploading}
                  onClick={async () => {
                    if (!storeForm.adMediaUrl) { alert("Please upload an image or video first."); return; }
                    if (!storeForm.adTitle) { alert("Please add an ad title."); return; }
                    await addDoc(collection(db, "ads"), {
                      mediaUrl: storeForm.adMediaUrl,
                      imageUrl: storeForm.adType === "image" ? storeForm.adMediaUrl : storeForm.adThumbnail || storeForm.adMediaUrl,
                      adType: storeForm.adType || "image",
                      title: storeForm.adTitle || "",
                      description: storeForm.adDescription || "",
                      businessName: storeForm.businessName || user.displayName,
                      userId: user.uid, status: "pending", createdAt: serverTimestamp(),
                    });
                    setStoreForm(prev => ({ ...prev, adMediaUrl: "", adTitle: "", adDescription: "", adThumbnail: "", adType: "image" }));
                    alert("Ad submitted! Admin will review within 24 hours.");
                  }}>
                  {storeForm.adUploading ? "Uploading..." : "Submit Ad for Review"}
                </button>
              </div>
            )}

            {!isPremium && (
              <div style={{ background: C.grey, borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 12, color: C.greyDark, textAlign: "center" }}>
                🔒 Upgrade to Premium (GH₵20/month) to run promotional advertisements
              </div>
            )}

            <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={C.primary}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
              Seller Verification
            </div>
            {profile?.verified ? (
              <div style={{ background: `${C.success}15`, border: `1px solid ${C.success}30`, borderRadius: 10, padding: 12, fontSize: 13, color: C.success, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={C.success}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={C.success} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                Your account is verified! Blue badge is active.
              </div>
            ) : profile?.verificationStatus === "pending" ? (
              <div style={{ background: "#FEF3C715", border: "1px solid #F59E0B30", borderRadius: 10, padding: 12, fontSize: 13, color: "#D97706", display: "flex", alignItems: "center", gap: 8 }}>
                ⏳ Verification request pending. Admin will review within 24 hours.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: C.greyDark, marginBottom: 10 }}>Get a blue verified badge on your profile and products. Build trust with buyers.</p>
                <button style={{ ...S.btn(), width: "100%", fontSize: 13 }} onClick={async () => {
                  await setDoc(doc(db, "users", user.uid), { verificationStatus: "pending", verificationRequestedAt: serverTimestamp() }, { merge: true });
                  await sendNotification("admin", "verification", `${user.displayName || "A seller"} has requested verification`, user.displayName);
                  alert("Verification request submitted! Admin will review within 24 hours.");
                }}>
                  Request Verification Badge
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ ...S.btn(), flex: 1 }} onClick={async () => {
                await setDoc(doc(db, "users", user.uid), { businessName: storeForm.businessName, storeDescription: storeForm.description, storeContact: storeForm.contact, logoUrl: storeForm.logoUrl, isSeller: true, city: storeForm.city || "", openTime: storeForm.openTime, closeTime: storeForm.closeTime, shopDays: storeForm.shopDays, shopHoursEnabled: storeForm.shopHoursEnabled }, { merge: true });
                // Also update all seller's products with shop hours so cards can show status
                const myProdsSnap = await getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid)));
                await Promise.all(myProdsSnap.docs.map(d => setDoc(doc(db, "products", d.id), { openTime: storeForm.openTime, closeTime: storeForm.closeTime, shopDays: storeForm.shopDays, shopHoursEnabled: storeForm.shopHoursEnabled }, { merge: true })));
                setStoreSaved(true); setTimeout(() => { setStoreSaved(false); setShowStore(false); }, 2000);
              }}>Save Store</button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => setShowStore(false)}>Close</button>
            </div>
            <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
            <button style={{ ...S.btn("outline"), width: "100%", color: C.error, borderColor: C.error, fontSize: 13 }}
              onClick={async () => {
                const confirm = window.confirm("Are you sure you want to delete your store and all your products? This cannot be undone.");
                if (!confirm) return;
                await setDoc(doc(db, "users", user.uid), { businessName: "", storeDescription: "", storeContact: "", logoUrl: "", isSeller: false }, { merge: true });
                const productsSnap = await getDocs(query(collection(db, "products"), where("sellerId", "==", user.uid)));
                const deletePromises = productsSnap.docs.map(d => setDoc(doc(db, "products", d.id), { deleted: true }, { merge: true }));
                await Promise.all(deletePromises);
                const adsSnap = await getDocs(query(collection(db, "ads"), where("userId", "==", user.uid)));
                const deleteAds = adsSnap.docs.map(d => setDoc(doc(db, "ads", d.id), { status: "deleted" }, { merge: true }));
                await Promise.all(deleteAds);
                setStoreForm({ businessName: "", description: "", contact: "", logoUrl: "", adType: "image", adMediaUrl: "", adTitle: "", adDescription: "", adThumbnail: "", adUploading: false });
                setMyProducts([]);
                setStoreSaved(false);
                setShowStore(false);
                alert("Your store and all products have been deleted successfully.");
              }}>
              🗑️ Delete Store
            </button>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div style={S.modal} onClick={() => setShowEditProfile(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Edit Profile</h3>
            {profileSaved && <div style={S.alert("success")}>✅ Profile updated successfully!</div>}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => document.getElementById("editProfilePhoto").click()}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", background: C.grey, border: `3px solid ${C.primary}` }}>
                  {profilePhoto ? <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>}
                </div>
                <div style={{ position: "absolute", bottom: 0, right: 0, background: C.primary, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
              </div>
              <input id="editProfilePhoto" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
            </div>

            <label style={S.label}>Full Name</label>
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="Your full name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />

            <label style={S.label}>Phone Number</label>
            <input style={{ ...S.input, marginBottom: 12 }} placeholder="+233..." value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />

            <label style={S.label}>Bio</label>
            <textarea style={{ ...S.input, marginBottom: 16, height: 80, resize: "vertical" }} placeholder="Tell people about yourself or your business..." value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn(), flex: 1, opacity: savingProfile ? 0.7 : 1 }} onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
              <button style={{ ...S.btn("outline"), flex: 1 }} onClick={() => setShowEditProfile(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPremium && (
        <div style={S.modal} onClick={() => setShowPremium(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
              <h3 style={{ fontWeight: 800, fontSize: 22 }}>Go Premium</h3>
              <p style={{ color: C.greyDark, fontSize: 13 }}>GH₵20/month · Exclusive benefits for subscribers only</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              {[
                "Gold ⭐ star badge displayed beside your business name",
                "Higher visibility across the platform",
                "Products and stores appear more in search and recommendations",
                "Ability to run promotional advertisements",
                "Priority placement on homepage and discovery pages",
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: C.success, fontSize: 16, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, lineHeight: 1.4, color: C.text }}>{b}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#FFF8E1", border: "2px solid #FFD700", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#333", marginBottom: 12, textAlign: "center" }}>💛 Pay with MTN Mobile Money</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "MoMo Number", value: "0541940967" },
                  { label: "Account Name", value: "Ebenezer Boateng" },
                  { label: "Amount", value: "GH₵20.00" },
                  { label: "Reference", value: "PREMIUM-SUB" },
                ].map(item => (
                  <div key={item.label} style={{ background: "white", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.greyDark, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "#333" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: "#FFF3CD", borderRadius: 10, padding: 12, marginTop: 12, fontSize: 12, color: "#856404", lineHeight: 1.8 }}>
                📱 How to pay via MTN MoMo:
                <br />1. Dial *170# on your MTN phone
                <br />2. Select Transfer Money
                <br />3. Enter number: 0541940967
                <br />4. Enter amount: 20
                <br />5. Enter reference: PREMIUM-SUB
                <br />6. Enter your PIN to confirm
                <br />7. Send payment screenshot to +233 54 194 0967 on WhatsApp
              </div>
            </div>

            <div style={{ background: `${C.primary}10`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12, color: C.greyDark, textAlign: "center", lineHeight: 1.6 }}>
              After payment, send your screenshot to <strong>+233 54 194 0967</strong> on WhatsApp. Your Premium ⭐ badge will be activated within 24 hours.
            </div>

            <a href="tel:*170%23" style={{ display: "block", textDecoration: "none" }}>
              <button style={{ ...S.btn(), width: "100%", background: "#FFD700", color: "#333", fontWeight: 800, fontSize: 15, padding: 14, marginBottom: 10 }}>
                📱 Dial *170# to Pay Now
              </button>
            </a>
            <button style={{ ...S.btn("outline"), width: "100%" }} onClick={() => setShowPremium(false)}>Maybe Later</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin ──────────────────────────────────────────────────────
function Admin() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [ads, setAds] = useState([]);

  const [tab, setTab] = useState("overview");

  useEffect(() => {
    getDocs(collection(db, "orders")).then(snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "users")).then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "products")).then(snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted)));
    getDocs(collection(db, "ads")).then(snap => setAds(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Admin Dashboard</div>
      <p style={S.sectionSub}>Manage E-Connect platform</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["overview", "orders", "users", "products", "ads", ].map(t => (
          <button key={t} style={{ ...S.btn(tab === t ? "primary" : "grey"), padding: "8px 16px", textTransform: "capitalize", position: "relative" }} onClick={() => setTab(t)}>
            {t}
            {t === "ads" && ads.filter(a => a.status === "pending").length > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: C.error, color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ads.filter(a => a.status === "pending").length}
              </span>
            )}

          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
          {[{ num: users.length, label: "Total Users", icon: "👥" }, { num: products.length, label: "Products", icon: "📦" }, { num: orders.length, label: "Total Orders", icon: "🛒" }, { num: `GH₵${totalRevenue}`, label: "Total Revenue", icon: "💰" }, { num: ads.filter(a => a.status === "pending").length, label: "Pending Ads", icon: "📢" }].map(s => (
            <div key={s.label} style={{ ...S.card, padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: C.primary }}>{s.num}</div>
              <div style={{ fontSize: 12, color: C.greyDark }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {tab === "orders" && orders.map(o => (
        <div key={o.id} style={{ ...S.card, padding: 14, marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>{o.customerName} · GH₵{o.total}</div>
          <div style={{ fontSize: 13, color: C.greyDark }}>{o.customerPhone} · {o.delivery} · {o.status}</div>
        </div>
      ))}
      {tab === "users" && users.map(u => (
        <div key={u.id} style={{ ...S.card, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{u.name} {u.premium && <span style={{ color: "#FFD700" }}>⭐</span>}</div>
            <div style={{ fontSize: 13, color: C.greyDark }}>{u.email} · {u.role || "user"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={{ ...S.btn(u.premium ? "grey" : "primary"), padding: "6px 12px", fontSize: 11 }}
                onClick={async () => {
                  const newPremium = !u.premium;
                  const expiry = newPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
                  await setDoc(doc(db, "users", u.id), { premium: newPremium, premiumExpiry: expiry }, { merge: true });
                  if (newPremium) {
                    await sendNotification(u.id, "premium", "🌟 Your Premium subscription is now active! It expires in 30 days.", "E-Connect");
                  } else {
                    await sendNotification(u.id, "premium", "Your Premium subscription has been removed.", "E-Connect");
                  }
                  setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, premium: !usr.premium } : usr));
                }}>
                {u.premium ? "Remove Premium" : "⭐ Premium"}
              </button>
              <button style={{ ...S.btn(u.verified ? "grey" : "outline"), padding: "6px 12px", fontSize: 11, color: u.verified ? C.text : "#1DA1F2", borderColor: "#1DA1F2" }}
                onClick={async () => {
                  const newVerified = !u.verified;
                  await setDoc(doc(db, "users", u.id), { verified: newVerified, verificationStatus: newVerified ? "approved" : "none" }, { merge: true });
                  setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, verified: newVerified } : usr));
                  if (newVerified) await sendNotification(u.id, "verification", "Congratulations! Your account has been verified. Your blue badge is now active.", "E-Connect Admin");
                }}>
                {u.verified ? "✓ Verified" : "Verify"}
              </button>
              {u.verificationStatus === "pending" && !u.verified && (
                <span style={{ fontSize: 10, color: "#D97706", fontWeight: 700, padding: "6px 0", display: "flex", alignItems: "center" }}>⏳ Pending</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {tab === "products" && products.map(p => (
        <div key={p.id} style={{ ...S.card, padding: 14, marginBottom: 10, display: "flex", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", background: C.grey }}>
            {p.image && <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: C.greyDark }}>GH₵{p.price} · {p.seller} · {p.category}</div>
          </div>
        </div>
      ))}

      {tab === "ads" && (
        <div>
          <p style={{ color: C.greyDark, fontSize: 13, marginBottom: 16 }}>Review and approve promotional ads from premium subscribers.</p>
          {ads.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: C.greyDark }}>No ads submitted yet.</div> :
          ads.map(a => (
            <div key={a.id} style={{ ...S.card, marginBottom: 12, overflow: "hidden" }}>
              {a.adType === "video" ? (
                <video src={a.mediaUrl} style={{ width: "100%", height: 120, objectFit: "cover" }} controls poster={a.imageUrl} />
              ) : (
                a.imageUrl && <img src={a.imageUrl} alt={a.businessName} style={{ width: "100%", height: 120, objectFit: "cover" }} />
              )}
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{a.businessName}</div>
                <div style={{ fontSize: 12, color: C.primary, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 13, color: C.greyDark, marginBottom: 10 }}>{a.description}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.status === "approved" ? C.success : a.status === "rejected" ? C.error : "#F59E0B", background: a.status === "approved" ? `${C.success}20` : a.status === "rejected" ? `${C.error}20` : "#FEF3C720", padding: "3px 10px", borderRadius: 20 }}>
                    {a.status}
                  </span>
                  {a.status === "pending" && (
                    <>
                      <button style={{ ...S.btn(), padding: "6px 14px", fontSize: 12 }} onClick={async () => {
                        await setDoc(doc(db, "ads", a.id), { status: "approved" }, { merge: true });
                        setAds(prev => prev.map(ad => ad.id === a.id ? { ...ad, status: "approved" } : ad));
                        await sendNotification(a.userId, "ad_approved", `Your ad "${a.title || a.businessName}" has been approved and is now live!`, "E-Connect Admin");
                      }}>Approve</button>
                      <button style={{ ...S.btn("outline"), padding: "6px 14px", fontSize: 12, color: C.error, borderColor: C.error }} onClick={async () => {
                        await setDoc(doc(db, "ads", a.id), { status: "rejected" }, { merge: true });
                        setAds(prev => prev.map(ad => ad.id === a.id ? { ...ad, status: "rejected" } : ad));
                        await sendNotification(a.userId, "ad_rejected", `Your ad "${a.title || a.businessName}" was not approved. Please review and resubmit.`, "E-Connect Admin");
                      }}>Reject</button>
                    </>
                  )}
                  {a.status === "approved" && (
                    <button style={{ ...S.btn("outline"), padding: "6px 14px", fontSize: 12, color: C.error, borderColor: C.error }} onClick={async () => {
                      await setDoc(doc(db, "ads", a.id), { status: "pending" }, { merge: true });
                      setAds(prev => prev.map(ad => ad.id === a.id ? { ...ad, status: "pending" } : ad));
                    }}>Remove</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Discover ───────────────────────────────────────────────────
function Discover({ setPage, setSelectedProduct, setSelectedProductGroup, user }) {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("products");
  const [following, setFollowing] = useState({});
  const [friends, setFriends] = useState({});

  useEffect(() => {
    getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))).then(snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted)));
    getDocs(collection(db, "users")).then(snap => setSellers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.isSeller && s.businessName)));
    if (user) {
      getDocs(collection(db, "users", user.uid, "following")).then(snap => {
        const f = {}; snap.docs.forEach(d => f[d.id] = true); setFollowing(f);
      });
      getDocs(collection(db, "users", user.uid, "friends")).then(snap => {
        const f = {}; snap.docs.forEach(d => f[d.id] = true); setFriends(f);
      });
    }
  }, [user]);

  const handleFollow = async (sellerId, sellerName) => {
    if (!user) return;
    const isFollowing = following[sellerId];
    const newFollowing = { ...following };
    if (isFollowing) {
      delete newFollowing[sellerId];
      await setDoc(doc(db, "users", user.uid, "following", sellerId), { deleted: true });
    } else {
      newFollowing[sellerId] = true;
      await setDoc(doc(db, "users", user.uid, "following", sellerId), { name: sellerName, followedAt: serverTimestamp() });
      await setDoc(doc(db, "users", sellerId, "followers", user.uid), { name: user.displayName, followedAt: serverTimestamp() });
      await sendNotification(sellerId, "follow", `${user.displayName || "Someone"} started following you`, user.displayName, { fromUserId: user.uid });
    }
    setFollowing(newFollowing);
  };

  const handleAddFriend = async (userId, userName) => {
    if (!user) return;
    const isFriend = friends[userId];
    const newFriends = { ...friends };
    if (isFriend) {
      delete newFriends[userId];
    } else {
      newFriends[userId] = true;
      await setDoc(doc(db, "users", user.uid, "friends", userId), { name: userName, addedAt: serverTimestamp() });
      await setDoc(doc(db, "users", userId, "friends", user.uid), { name: user.displayName, addedAt: serverTimestamp() });
    }
    setFriends(newFriends);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.seller?.toLowerCase().includes(search.toLowerCase()));
  const filteredSellers = sellers.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())).filter(s => s.id !== user?.uid);

  return (
    <div style={S.page}>
      <div style={S.sectionTitle}>Discover</div>
      <p style={S.sectionSub}>Find products, sellers and connect with people</p>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>🔍</span>
        <input style={{ ...S.input, paddingLeft: 38 }} placeholder="Search products and sellers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["products", "sellers", "people"].map(t => (
          <button key={t} style={{ ...S.btn(tab === t ? "primary" : "grey"), padding: "8px 16px", textTransform: "capitalize" }} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "products" && (
        <div>
          {filteredProducts.some(p => p.premium) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Premium Products</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {filteredProducts.filter(p => p.premium).map(p => (
                  <div key={"prem-" + p.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer", border: `2px solid #FFD700` }} onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
                    <div style={{ height: 120, background: C.grey, overflow: "hidden", position: "relative" }}>
                      {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
                      <div style={{ position: "absolute", top: 6, right: 6, background: "#FFD700", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#333"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                      </div>
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ color: C.primary, fontWeight: 800, fontSize: 14 }}>GH₵{p.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: C.text }}>All Products</div>
        </div>
      )}
      {tab === "products" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {filteredProducts.map(p => (
            <div key={p.id} style={{ ...S.card, overflow: "hidden", cursor: "pointer" }} onClick={() => { setSelectedProduct(p); setSelectedProductGroup(null); setPage("product"); }}>
              <div style={{ height: 140, background: C.grey, overflow: "hidden" }}>
                {p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProductPlaceholder name={p.name} category={p.category} />}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ color: C.greyDark, fontSize: 12, marginBottom: 4 }}>{p.seller}</div>
                <div style={{ color: C.primary, fontWeight: 800 }}>GH₵{p.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "sellers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredSellers.filter(s => s.role !== "admin").map(s => (
            <div key={s.id} style={{ ...S.card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name || "User"}</span>
                  {s.verified && <VerifiedBadge size={16} />}
                  {s.premium && <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>}
                </div>
                <div style={{ fontSize: 12, color: C.greyDark }}>{s.bio || "E-Connect member"}</div>
              </div>
              <button style={{ ...S.btn(following[s.id] ? "grey" : "primary"), padding: "7px 14px", fontSize: 12 }}
                onClick={() => handleFollow(s.id, s.name)}>
                {following[s.id] ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "people" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredSellers.map(s => (
            <div key={s.id} style={{ ...S.card, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: C.grey, flexShrink: 0 }}>
                {s.photoURL ? <img src={s.photoURL} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>👤</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name || "User"}</div>
                <div style={{ fontSize: 12, color: C.greyDark }}>{s.email}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn(following[s.id] ? "grey" : "primary"), padding: "7px 12px", fontSize: 11 }}
                  onClick={() => handleFollow(s.id, s.name)}>
                  {following[s.id] ? "Following" : "Follow"}
                </button>
                <button style={{ ...S.btn(friends[s.id] ? "grey" : "outline"), padding: "7px 12px", fontSize: 11 }}
                  onClick={() => handleAddFriend(s.id, s.name)}>
                  {friends[s.id] ? "Friends ✓" : "+ Friend"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState(null); // the full group array when opened from RotatingProductCard
  const [chatSeller, setChatSeller] = useState(null);
  const [viewingPublicProfile, setViewingPublicProfile] = useState(null);
  const [previousPage, setPreviousPage] = useState("home");
  const [currentUserPhoto, setCurrentUserPhoto] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [inAppBanner, setInAppBanner] = useState(null); // { type, message, meta }
  const bannerTimerRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("econnect-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    localStorage.setItem("econnect-theme", theme);
    document.body.style.background = THEMES[theme]?.offWhite || C.offWhite;
    document.body.style.color = THEMES[theme]?.text || C.text;
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      if (u) {
        getDoc(doc(db, "users", u.uid)).then(d => {
          if (d.exists()) setCurrentUserPhoto(d.data().photoURL || u.photoURL || "");
          else setCurrentUserPhoto(u.photoURL || "");
        }).catch(() => setCurrentUserPhoto(u.photoURL || ""));
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
    }
    // Request push notification permission
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        Notification.requestPermission().then(permission => {
          console.log("Notification permission:", permission);
        });
      }, 3000);
    }
  }, []);

  const ADMIN_EMAILS = ["admin@econnect.gh", "asantegideon060@gmail.com", "selormatsubonuedie@gmail.com", "akowuahisaac686@gmail.com", "nyarkomatthew925491@gmail.com", "ebenezer.boateng009@stu.ucc.edu.gh"];
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid), where("read", "==", false));
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size));
    // Listen for profile photo changes in Firestore
    const userUnsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists() && snap.data().photoURL) setCurrentUserPhoto(snap.data().photoURL);
    });
    return () => { unsub(); userUnsub(); };
  }, [user]);

  // Show both an in-app banner AND a native OS notification whenever
  // a NEW notification arrives for this user after the app loaded.
  useEffect(() => {
    if (!user) return;
    const mountedAt = Date.now();
    const q = query(collection(db, "notifications"), where("toUserId", "==", user.uid), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, snap => {
      snap.docChanges().forEach(change => {
        if (change.type !== "added") return;
        const n = change.doc.data();
        const created = n.createdAt?.toMillis ? n.createdAt.toMillis() : null;
        if (!created || created < mountedAt - 5000) return; // ignore pre-existing ones on load
        // ── In-app banner (always works, no permission required) ──
        clearTimeout(bannerTimerRef.current);
        setInAppBanner({ type: n.type, message: n.message, meta: n });
        bannerTimerRef.current = setTimeout(() => setInAppBanner(null), 4000);
        // ── OS push notification (requires Notification permission) ──
        showLocalNotification(n.type, n.message);
      });
    });
    return () => { unsub(); clearTimeout(bannerTimerRef.current); };
  }, [user]);

  if (loading) return <SplashScreen />;
  if (!user) return <Auth setUser={setUser} />;

  const NavIcon = ({ id, active }) => {
    const color = active ? C.primary : C.greyDark;
    const icons = {
      home: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3L21 9.5V20C21 20.6 20.6 21 20 21H15V15H9V21H4C3.4 21 3 20.6 3 20V9.5Z" fill={active ? C.primary : "none"} stroke={color} strokeWidth="1.8"/></svg>,
      discover: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8"/><path d="M20 20L17 17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
      cart: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6L18 2H6Z" stroke={color} strokeWidth="1.8"/><path d="M3 6H21" stroke={color} strokeWidth="1.8"/><path d="M16 10C16 12.2 14.2 14 12 14C9.8 14 8 12.2 8 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
      messages: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.5 20.8 16 20.4 16.4C20 16.8 19.5 17 19 17H7L3 21V5C3 4.5 3.2 4 3.6 3.6C4 3.2 4.5 3 5 3H19C19.5 3 20 3.2 20.4 3.6C20.8 4 21 4.5 21 5V15Z" stroke={color} strokeWidth="1.8" fill={active ? `${C.primary}20` : "none"}/></svg>,
      reels: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" stroke={color} strokeWidth="1.8"/><path d="M10 8L16 12L10 16V8Z" fill={active ? C.primary : "none"} stroke={color} strokeWidth="1.8" strokeLinejoin="round"/></svg>,
      orders: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke={color} strokeWidth="1.8"/><path d="M9 12h6M9 16h4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
      location: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={color} strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth="1.8"/></svg>,
      profile: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8"/><path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    };
    return icons[id] || null;
  };

  const navItems = [
    { id: "home", label: "Home" },
    { id: "discover", label: "Discover" },
    { id: "reels", label: "Reels" },
    { id: "live", label: "Live" },
    { id: "orders", label: "Orders" },
    { id: "cart", label: "Cart", badge: cart.length },
  ];

  const goToPublicProfile = (u) => {
    if (!u || !u.uid) {
      // No identifying info available - let the user know instead of silently doing nothing
      alert("This profile isn't available.");
      return;
    }
    setPreviousPage(page);
    setViewingPublicProfile(u);
    setPage("publicProfile");
  };

  const renderPage = () => {
    switch (page) {
      case "home": return <Home user={user} cart={cart} setCart={setCart} setPage={setPage} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} setViewingPublicProfile={goToPublicProfile} setChatSeller={setChatSeller} />;
      case "discover": return <Discover setPage={setPage} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} user={user} />;
      case "product": return <ProductDetail product={selectedProduct} productGroup={selectedProductGroup} setCart={setCart} setPage={setPage} user={user} startChat={(seller) => { setChatSeller(seller); setPage("messages"); }} />;
      case "cart": return <Cart cart={cart} setCart={setCart} setPage={setPage} user={user} />;
      case "reels": return <ReelsErrorBoundary><ReelsPage user={user} setPage={setPage} setViewingUser={goToPublicProfile} /></ReelsErrorBoundary>;
      case "live": return <LivePage user={user} setPage={setPage} setCart={setCart} />;
      case "notifications": return <NotificationsPage user={user} setPage={setPage} setChatSeller={setChatSeller} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} setViewingPublicProfile={goToPublicProfile} />;
      case "orders": return <OrderTrackingPage user={user} startChat={(seller) => { setChatSeller(seller); setPage("messages"); }} />;
      case "location": return <LocationPage user={user} setPage={setPage} setSelectedProduct={setSelectedProduct} />;
      case "messages": return <Messages user={user} chatSeller={chatSeller} onChatStarted={() => setChatSeller(null)} />;
      case "profile": return <Profile user={user} setPage={setPage} setUser={setUser} theme={theme} setTheme={setTheme} setViewingPublicProfile={goToPublicProfile} />;
      case "profileViews": return <ProfileViewsPage user={user} setPage={setPage} setViewingPublicProfile={goToPublicProfile} />;
      case "recentlyViewed": return <RecentlyViewedPage setPage={setPage} setSelectedProduct={setSelectedProduct} />;
      case "analytics": return <SellerAnalytics user={user} />;
      case "publicProfile": return <PublicProfile profileUser={viewingPublicProfile} currentUser={user} setPage={setPage} setSelectedProduct={setSelectedProduct} previousPage={previousPage} />;
      case "admin": return isAdmin ? <Admin /> : <Home user={user} cart={cart} setCart={setCart} setPage={setPage} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} setViewingPublicProfile={goToPublicProfile} setChatSeller={setChatSeller} />;
      default: return <Home user={user} cart={cart} setCart={setCart} setPage={setPage} setSelectedProduct={setSelectedProduct} setSelectedProductGroup={setSelectedProductGroup} setViewingPublicProfile={goToPublicProfile} setChatSeller={setChatSeller} />;
    }
  };

  return (
    <div style={{ ...S.app, background: THEMES[theme]?.offWhite || C.offWhite, color: THEMES[theme]?.text || C.text, fontFamily: FONT }}>
      <nav style={S.nav}>
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center" }} onClick={() => setPage("home")}><img src="https://res.cloudinary.com/dxmmsq0gq/image/upload/WhatsApp_Image_2026-06-09_at_9.31.32_PM_ficnea.jpg" alt="E-Connect" style={{ height: 36, width: "auto", objectFit: "contain" }} /></div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {isAdmin && <button style={{ ...S.btn("grey"), padding: "7px 12px", fontSize: 12, color: C.text }} onClick={() => setPage("admin")}>Admin</button>}
          {/* Notifications */}
          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6 }} onClick={() => setPage("notifications")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={page === "notifications" ? C.primary : C.greyDark} strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 2, right: 2, background: C.error, color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {/* Messages */}
          <button style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6 }} onClick={() => setPage("messages")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={page === "messages" ? C.primary : C.greyDark} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          {/* Profile with photo */}
          <button onClick={() => setPage("profile")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "2px 4px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: `2px solid ${page === "profile" ? C.primary : C.border}`, background: C.grey, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentUserPhoto
                ? <img src={currentUserPhoto} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.greyDark} strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: page === "profile" ? C.primary : C.greyDark }}>Profile</span>
          </button>
        </div>
      </nav>
      {renderPage()}

      {/* ── In-app notification banner ──────────────────────────────
          Pops up at the top of the screen whenever a new notification
          arrives. Works without OS notification permission. Tapping it
          opens the relevant page; the ✕ dismisses it early.           */}
      {inAppBanner && (() => {
        const icons = { like: "❤️", follow: "👤", order: "🛒", comment: "💬", message: "💬", nudge: "👋", premium: "⭐", ad_approved: "✅" };
        const icon = icons[inAppBanner.type] || "🔔";
        return (
          <div style={{ position: "fixed", top: 12, left: 12, right: 12, zIndex: 9999, background: "rgba(20,20,20,0.95)", borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", cursor: "pointer", animation: "slideDown 0.3s ease-out" }}
            onClick={() => {
              setInAppBanner(null);
              clearTimeout(bannerTimerRef.current);
              const meta = inAppBanner.meta || {};
              if (inAppBanner.type === "message" && meta.conversationId) {
                setChatSeller({ id: meta.fromUserId, name: meta.fromUserName, conversationId: meta.conversationId });
                setPage("messages");
              } else if (["follow", "nudge"].includes(inAppBanner.type) && meta.fromUserId) {
                goToPublicProfile({ uid: meta.fromUserId, displayName: meta.fromUserName });
              } else if (inAppBanner.type === "order") {
                setPage("orders");
              } else {
                setPage("notifications");
              }
            }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${C.primary}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 2 }}>E-Connect</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inAppBanner.message}</div>
            </div>
            <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 16, cursor: "pointer", padding: 4, flexShrink: 0 }}
              onClick={e => { e.stopPropagation(); setInAppBanner(null); clearTimeout(bannerTimerRef.current); }}>✕</button>
          </div>
        );
      })()}
      <style>{`@keyframes slideDown { from { transform: translateY(-80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

      <div style={S.bottomNav}>
        {navItems.map(item => (
          <button key={item.id} style={S.bottomBtn(page === item.id)} onClick={() => setPage(item.id)}>
            <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <NavIcon id={item.id} active={page === item.id} />
              {item.badge > 0 && <span style={{ position: "absolute", top: -4, right: -6, background: C.primary, color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.badge}</span>}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

