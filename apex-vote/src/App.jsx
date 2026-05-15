import { useState, useEffect, useRef } from "react";

// ─── Firebase SDK (CDN via importmap) ────────────────────────────────────────
// NOTE: In production, install firebase npm package and initialise in firebase.js
// Here we inline everything for a single-file deliverable.
import { db as firestore } from "./firebase";
import {
  collection, getDocs, doc, updateDoc, increment,
  setDoc, deleteDoc, getDoc
} from "firebase/firestore";

const db = {
 getCandidates: async () => {
  const snap = await getDocs(collection(firestore, "candidates"));
  console.log("Total docs found:", snap.size);         // should say 3
  snap.docs.forEach(d => console.log(d.id, d.data())); // should show c1, c2, c3
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
},
  vote: async (candidateId) => {
    await updateDoc(doc(firestore, "candidates", candidateId), {
      votes: increment(1)
    });
  },
  getCategories: async () => {
    const snap = await getDocs(collection(firestore, "categories"));
    return snap.docs.map(d => d.data().name);
  },
  addCategory: async (name) => {
    await setDoc(doc(firestore, "categories", name), { name });
  },
  removeCategory: async (name) => {
    await deleteDoc(doc(firestore, "categories", name));
  },
  getJudgesScores: async () => {
    const snap = await getDocs(collection(firestore, "judges_scores"));
    const result = {};
    snap.docs.forEach(d => { result[d.id] = d.data(); });
    return result;
  },
  setScore: async (candidateId, category, score) => {
    await setDoc(doc(firestore, "judges_scores", candidateId),
      { [category]: score }, { merge: true });
  },
};
// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ADMIN_PIN = "2810";
const JUDGE_PIN = "2026";
const VOTE_WEIGHT = 0.7;
const JUDGE_WEIGHT = 0.3;

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black: #080808;
    --deep: #0d0d0f;
    --surface: #111115;
    --card: #16161c;
    --border: rgba(255,255,255,0.07);
    --blue: #2563eb;
    --blue-glow: rgba(37,99,235,0.35);
    --blue-light: #60a5fa;
    --red: #dc2626;
    --red-glow: rgba(220,38,38,0.35);
    --red-light: #f87171;
    --gold: #f59e0b;
    --text: #f0f0f0;
    --muted: #666;
    --subtle: #333;
    --glass: rgba(255,255,255,0.04);
    --glass-border: rgba(255,255,255,0.1);
  }

  html, body, #root { height: 100%; }

  body {
    background: var(--black);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    overflow-x: hidden;
  }

  /* NOISE TEXTURE */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
    opacity: 0.4;
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--black); }
  ::-webkit-scrollbar-thumb { background: var(--subtle); border-radius: 2px; }

  /* ANIMATIONS */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulse-blue {
    0%, 100% { box-shadow: 0 0 0 0 var(--blue-glow); }
    50% { box-shadow: 0 0 0 8px transparent; }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes barGrow {
    from { width: 0; }
    to { width: var(--target-width); }
  }
  @keyframes numberCount {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pinShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
  @keyframes crownDrop {
    0% { transform: translateY(-30px) rotate(-15deg); opacity: 0; }
    60% { transform: translateY(4px) rotate(3deg); opacity: 1; }
    100% { transform: translateY(0) rotate(0deg); opacity: 1; }
  }
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  /* LAYOUT */
  .app { min-height: 100vh; display: flex; flex-direction: column; animation: fadeIn 0.4s ease; }

  /* HEADER */
  .header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 32px;
    background: rgba(8,8,8,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .header-logo {
    font-family: 'Instrument Serif', serif;
    font-size: 22px;
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, var(--text) 0%, var(--blue-light) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header-logo span { color: var(--red); -webkit-text-fill-color: var(--red); }
  .header-actions { display: flex; gap: 10px; }
  .btn-nav {
    padding: 8px 18px;
    border-radius: 6px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--glass);
    color: var(--text);
    transition: all 0.2s ease;
    letter-spacing: 0.3px;
  }
  .btn-nav:hover { background: var(--glass-border); border-color: var(--blue); color: var(--blue-light); transform: translateY(-1px); }
  .btn-nav.active { background: var(--blue); border-color: var(--blue); color: #fff; }

  /* PAGE */
  .page { flex: 1; padding: 110px 32px 60px; max-width: 1200px; margin: 0 auto; width: 100%; }

  /* HERO */
  .hero { text-align: center; margin-bottom: 60px; animation: fadeUp 0.6s ease; }
  .hero-eyebrow {
    display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 3px;
    text-transform: uppercase; color: var(--blue-light); margin-bottom: 16px;
    padding: 6px 14px; border: 1px solid rgba(96,165,250,0.25); border-radius: 100px;
    background: rgba(37,99,235,0.1);
  }
  .hero-title {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(42px, 7vw, 80px);
    line-height: 1.05;
    letter-spacing: -2px;
    margin-bottom: 16px;
  }
  .hero-title .accent { color: var(--red); font-style: italic; }
  .hero-subtitle { color: var(--muted); font-size: 16px; max-width: 420px; margin: 0 auto; }

  /* CANDIDATE CARDS */
  .candidates-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-bottom: 40px;
  }
  @media (max-width: 768px) {
    .candidates-grid { grid-template-columns: 1fr; }
    .header { padding: 14px 16px; }
    .page { padding: 90px 16px 60px; }
    .header-logo { font-size: 18px; }
    .btn-nav { padding: 7px 12px; font-size: 12px; }
  }

  .candidate-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    animation: fadeUp 0.6s ease both;
    cursor: default;
    position: relative;
  }
  .candidate-card:nth-child(1) { animation-delay: 0.1s; }
  .candidate-card:nth-child(2) { animation-delay: 0.2s; }
  .candidate-card:nth-child(3) { animation-delay: 0.3s; }
  .candidate-card:hover {
    transform: translateY(-6px);
    border-color: rgba(37,99,235,0.4);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.15);
  }
  .candidate-card.voted {
    border-color: var(--blue);
    box-shadow: 0 0 30px var(--blue-glow);
  }

  .card-image-wrap {
    position: relative; height: 280px; overflow: hidden;
  }
  .card-image-wrap img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.5s ease;
    filter: brightness(0.9);
  }
  .candidate-card:hover .card-image-wrap img { transform: scale(1.05); }

  .card-image-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, var(--card) 0%, transparent 60%);
  }
  .card-rank {
    position: absolute; top: 12px; left: 12px;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    border: 1px solid var(--glass-border);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: var(--muted);
  }

  .card-body { padding: 20px 22px 22px; }
  .card-name {
    font-family: 'Instrument Serif', serif;
    font-size: 26px; letter-spacing: -0.5px; margin-bottom: 8px;
  }
  .card-votes {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--muted); margin-bottom: 20px;
  }
  .card-votes-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); }
  .card-votes strong { color: var(--blue-light); font-weight: 600; }

  .btn-vote {
    width: 100%; padding: 13px;
    background: linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%);
    color: #fff; border: none; border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase;
    transition: all 0.2s ease; position: relative; overflow: hidden;
  }
  .btn-vote::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  .btn-vote:hover { transform: translateY(-2px); box-shadow: 0 8px 25px var(--blue-glow); }
  .btn-vote:active { transform: translateY(0); }
  .btn-vote:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* VOTED BADGE */
  .voted-badge {
    width: 100%; padding: 13px;
    background: rgba(37,99,235,0.12);
    color: var(--blue-light); border: 1px solid rgba(37,99,235,0.3);
    border-radius: 8px; font-size: 14px; font-weight: 600;
    text-align: center; letter-spacing: 0.5px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }

  /* OVERLAY / MODAL */
  .overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.2s ease;
    padding: 20px;
  }

  .modal {
    background: var(--card);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 40px;
    width: 100%; max-width: 420px;
    box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06);
    animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
  }
  .modal-close {
    position: absolute; top: 16px; right: 16px;
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--glass); border: 1px solid var(--border);
    color: var(--muted); cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s ease;
  }
  .modal-close:hover { background: var(--red); color: #fff; border-color: var(--red); }

  .modal-icon {
    width: 56px; height: 56px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; margin-bottom: 20px;
  }
  .modal-icon.blue { background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.3); }
  .modal-icon.red { background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3); }

  .modal-title {
    font-family: 'Instrument Serif', serif;
    font-size: 26px; letter-spacing: -0.5px; margin-bottom: 8px;
  }
  .modal-desc { color: var(--muted); font-size: 14px; margin-bottom: 28px; line-height: 1.6; }
  .modal-candidate-name { color: var(--blue-light); font-weight: 600; }

  /* PIN INPUT */
  .pin-dots { display: flex; gap: 12px; margin-bottom: 28px; justify-content: center; }
  .pin-dot {
    width: 48px; height: 56px; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 700; transition: all 0.2s ease;
    color: var(--text);
  }
  .pin-dot.filled { border-color: var(--blue); background: rgba(37,99,235,0.1); }
  .pin-dot.error { border-color: var(--red); background: rgba(220,38,38,0.1); animation: pinShake 0.4s ease; }

  .pin-numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .pin-key {
    padding: 16px; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text); font-size: 18px; font-weight: 500;
    cursor: pointer; transition: all 0.15s ease;
    font-family: 'DM Sans', sans-serif;
  }
  .pin-key:hover { background: var(--glass-border); border-color: var(--blue); color: var(--blue-light); transform: scale(1.04); }
  .pin-key:active { transform: scale(0.97); }
  .pin-key.delete { color: var(--red-light); }
  .pin-key.zero { grid-column: 2; }

  .pin-error-msg { color: var(--red-light); font-size: 13px; text-align: center; margin-top: 10px; }

  /* MODAL ACTIONS */
  .modal-actions { display: flex; gap: 10px; margin-top: 8px; }
  .btn-primary {
    flex: 1; padding: 13px 20px;
    background: var(--blue); color: #fff;
    border: none; border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease;
  }
  .btn-primary:hover { background: #1d4ed8; box-shadow: 0 6px 20px var(--blue-glow); }
  .btn-secondary {
    padding: 13px 20px;
    background: transparent; color: var(--muted);
    border: 1px solid var(--border); border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    cursor: pointer; transition: all 0.2s ease;
  }
  .btn-secondary:hover { background: var(--glass); color: var(--text); }
  .btn-danger {
    flex: 1; padding: 13px 20px;
    background: var(--red); color: #fff;
    border: none; border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.2s ease;
  }
  .btn-danger:hover { background: #b91c1c; box-shadow: 0 6px 20px var(--red-glow); }

  /* SPINNER */
  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  /* JUDGES DASHBOARD */
  .dashboard-header { margin-bottom: 40px; animation: fadeUp 0.5s ease; }
  .dashboard-title {
    font-family: 'Instrument Serif', serif;
    font-size: 42px; letter-spacing: -1.5px; margin-bottom: 8px;
  }
  .dashboard-title span { color: var(--blue-light); font-style: italic; }
  .dashboard-subtitle { color: var(--muted); font-size: 15px; }

  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 16px;
  }

  /* CATEGORIES */
  .categories-section {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; padding: 28px; margin-bottom: 32px;
    animation: fadeUp 0.5s ease 0.1s both;
  }
  .categories-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .category-tag {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 100px; font-size: 13px; color: var(--blue-light);
    transition: all 0.2s ease;
  }
  .category-tag:hover { border-color: var(--red); }
  .tag-remove {
    background: none; border: none; color: var(--muted);
    cursor: pointer; font-size: 14px; padding: 0;
    transition: color 0.2s; line-height: 1;
  }
  .tag-remove:hover { color: var(--red-light); }

  .add-category-row { display: flex; gap: 10px; }
  .input-field {
    flex: 1; padding: 11px 16px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text);
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    outline: none; transition: border-color 0.2s ease;
  }
  .input-field:focus { border-color: var(--blue); }
  .input-field::placeholder { color: var(--muted); }
  .btn-add {
    padding: 11px 20px;
    background: rgba(37,99,235,0.2); color: var(--blue-light);
    border: 1px solid rgba(37,99,235,0.3); border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: all 0.2s ease; white-space: nowrap;
  }
  .btn-add:hover { background: var(--blue); color: #fff; }

  /* SCORING TABLE */
  .scoring-section { animation: fadeUp 0.5s ease 0.2s both; }
  .scoring-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 16px; overflow: hidden; margin-bottom: 20px;
  }
  .scoring-card-header {
    display: flex; align-items: center; gap: 16px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.02);
  }
  .scoring-avatar {
    width: 44px; height: 44px; border-radius: 10px;
    object-fit: cover; border: 1px solid var(--border);
  }
  .scoring-name {
    font-family: 'Instrument Serif', serif;
    font-size: 20px; letter-spacing: -0.3px;
  }

  .scoring-rows { padding: 16px 24px; display: flex; flex-direction: column; gap: 16px; }
  .score-row { display: flex; align-items: center; gap: 16px; }
  .score-label { width: 140px; font-size: 13px; color: var(--muted); flex-shrink: 0; }
  .score-slider-wrap { flex: 1; display: flex; align-items: center; gap: 12px; }
  .score-slider {
    flex: 1; -webkit-appearance: none; appearance: none;
    height: 4px; border-radius: 2px; outline: none; cursor: pointer;
    background: linear-gradient(to right, var(--blue) 0%, var(--blue) var(--fill), var(--subtle) var(--fill), var(--subtle) 100%);
  }
  .score-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 16px; height: 16px;
    border-radius: 50%; background: var(--blue-light);
    border: 2px solid var(--black); cursor: pointer;
    box-shadow: 0 0 8px var(--blue-glow);
    transition: transform 0.15s ease;
  }
  .score-slider::-webkit-slider-thumb:hover { transform: scale(1.3); }
  .score-value {
    width: 48px; text-align: right;
    font-size: 15px; font-weight: 600; color: var(--blue-light);
    font-variant-numeric: tabular-nums;
  }

  /* ADMIN PANEL */
  .leaderboard-section { animation: fadeUp 0.5s ease 0.1s both; }

  .weight-info {
    display: flex; gap: 12px; margin-bottom: 32px;
    animation: fadeUp 0.5s ease;
  }
  .weight-pill {
    flex: 1; padding: 16px 20px;
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    display: flex; align-items: center; gap: 12px;
  }
  .weight-dot { width: 10px; height: 10px; border-radius: 50%; }
  .weight-dot.blue { background: var(--blue); box-shadow: 0 0 8px var(--blue-glow); }
  .weight-dot.red { background: var(--red); box-shadow: 0 0 8px var(--red-glow); }
  .weight-label { font-size: 12px; color: var(--muted); }
  .weight-val { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .weight-val.blue { color: var(--blue-light); }
  .weight-val.red { color: var(--red-light); }

  /* LEADERBOARD */
  .leaderboard { display: flex; flex-direction: column; gap: 14px; }

  .leaderboard-item {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px 24px;
    display: flex; align-items: center; gap: 20px;
    transition: all 0.3s ease;
    animation: fadeUp 0.5s ease both;
    position: relative; overflow: hidden;
  }
  .leaderboard-item:nth-child(1) { animation-delay: 0.1s; }
  .leaderboard-item:nth-child(2) { animation-delay: 0.2s; }
  .leaderboard-item:nth-child(3) { animation-delay: 0.3s; }
  .leaderboard-item.winner {
    border-color: var(--gold);
    box-shadow: 0 0 30px rgba(245,158,11,0.2), inset 0 1px 0 rgba(245,158,11,0.1);
  }
  .leaderboard-item.winner::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }

  .lb-rank {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .lb-rank.gold { background: rgba(245,158,11,0.2); color: var(--gold); border: 1px solid rgba(245,158,11,0.4); }
  .lb-rank.silver { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
  .lb-rank.bronze { background: rgba(180,100,60,0.15); color: #cd7f4a; border: 1px solid rgba(180,100,60,0.3); }

  .lb-avatar {
    width: 48px; height: 48px; border-radius: 10px;
    object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;
  }
  .lb-info { flex: 1; min-width: 0; }
  .lb-name {
    font-family: 'Instrument Serif', serif;
    font-size: 20px; letter-spacing: -0.3px; margin-bottom: 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .crown { font-size: 16px; animation: crownDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; display: inline-block; }
  .lb-breakdown { display: flex; gap: 16px; }
  .lb-stat { font-size: 12px; color: var(--muted); }
  .lb-stat strong { font-weight: 600; }
  .lb-stat.blue strong { color: var(--blue-light); }
  .lb-stat.red strong { color: var(--red-light); }

  .lb-score-section { text-align: right; flex-shrink: 0; }
  .lb-score {
    font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums;
    line-height: 1; margin-bottom: 4px;
    animation: numberCount 0.5s ease both;
  }
  .lb-score.gold { color: var(--gold); }
  .lb-score.silver { color: #94a3b8; }
  .lb-score.bronze { color: #cd7f4a; }
  .lb-score-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

  /* SCORE BAR */
  .score-bar-wrap { margin-top: 10px; }
  .score-bar-bg { height: 3px; background: var(--subtle); border-radius: 2px; overflow: hidden; }
  .score-bar-fill {
    height: 100%; border-radius: 2px;
    animation: barGrow 1s cubic-bezier(0.34,1.56,0.64,1) 0.4s both;
    width: var(--target-width);
  }
  .score-bar-fill.gold { background: linear-gradient(90deg, var(--gold), #fbbf24); }
  .score-bar-fill.silver { background: linear-gradient(90deg, #64748b, #94a3b8); }
  .score-bar-fill.bronze { background: linear-gradient(90deg, #92400e, #cd7f4a); }

  /* REFRESH */
  .refresh-row { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .btn-refresh {
    display: flex; align-items: center; gap: 8px;
    padding: 9px 16px;
    background: var(--glass); border: 1px solid var(--border);
    border-radius: 8px; color: var(--muted);
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    cursor: pointer; transition: all 0.2s ease;
  }
  .btn-refresh:hover { color: var(--text); border-color: var(--blue); background: rgba(37,99,235,0.1); }
  .btn-refresh.spinning svg { animation: spin 0.7s linear infinite; }

  /* LOADING STATE */
  .loading-screen {
    display: flex; align-items: center; justify-content: center;
    min-height: 300px; flex-direction: column; gap: 16px;
  }
  .loading-screen .spinner { width: 32px; height: 32px; }
  .loading-text { color: var(--muted); font-size: 14px; }

  /* EMPTY STATE */
  .empty-state {
    text-align: center; padding: 40px;
    color: var(--muted); font-size: 14px;
  }

  /* TOAST */
  .toast-wrap {
    position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
    z-index: 300;
  }
  .toast {
    padding: 12px 24px;
    border-radius: 100px;
    font-size: 14px; font-weight: 500;
    animation: fadeUp 0.3s ease;
    white-space: nowrap;
  }
  .toast.success { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #6ee7b7; }
  .toast.error { background: rgba(220,38,38,0.15); border: 1px solid rgba(220,38,38,0.3); color: var(--red-light); }

  /* DIVIDER */
  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* SIGN OUT ROW */
  .signout-row { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .btn-signout {
    padding: 8px 16px;
    background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25);
    border-radius: 8px; color: var(--red-light);
    font-family: 'DM Sans', sans-serif; font-size: 13px;
    cursor: pointer; transition: all 0.2s ease;
  }
  .btn-signout:hover { background: var(--red); color: #fff; }
`;

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className="toast-wrap">
      <div className={`toast ${type}`}>{msg}</div>
    </div>
  );
}

// ─── PIN OVERLAY ──────────────────────────────────────────────────────────────
function PinOverlay({ targetPin, onSuccess, onClose, label }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === targetPin) { onSuccess(); }
        else { setError(true); setTimeout(() => { setPin(""); setError(false); }, 700); }
      }, 150);
    }
  };
  const del = () => { setPin((p) => p.slice(0, -1)); setError(false); };

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 360 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-icon blue">🔐</div>
        <div className="modal-title">Enter PIN</div>
        <div className="modal-desc">Require Access to <strong>{label}</strong></div>
        <div className="pin-dots">
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot${pin.length > i ? " filled" : ""}${error ? " error" : ""}`}>
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>
        <div className="pin-numpad">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="pin-key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <div />
          <button className="pin-key zero" onClick={() => press("0")}>0</button>
          <button className="pin-key delete" onClick={del}>⌫</button>
        </div>
        {error && <div className="pin-error-msg">Incorrect PIN. Try again.</div>}
      </div>
    </div>
  );
}

// ─── VOTE CONFIRM MODAL ───────────────────────────────────────────────────────
function VoteModal({ candidate, onConfirm, onClose, loading }) {
  return (
    <div className="overlay">
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-icon blue">🗳️</div>
        <div className="modal-title">Confirm Your Vote</div>
        <div className="modal-desc">
          You're casting your vote for{" "}
          <span className="modal-candidate-name">{candidate.name}</span>.
          This action cannot be undone.
        </div>
     
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm} disabled={loading}
            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            {loading ? <><span className="spinner" /> Voting…</> : "✓ Cast Vote"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VOTING PAGE ──────────────────────────────────────────────────────────────
function VotingPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null); // candidateId being voted
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [voted, setVoted] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    db.getCandidates().then((data) => { setCandidates(data); setLoading(false); });
  }, []);

// REPLACE the old handleVote with this:
const handleVote = async () => {
  const c = confirmTarget;
  setConfirmTarget(null);
  setVoting(c.id);
  await db.vote(c.id);
  setVoting(null);
  setVoted(null);        // ← reset so all buttons re-enable
  showToast(`Vote cast for ${c.name}!`, "success");
};

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-text">Loading candidates…</div>
    </div>
  );

  return (
    <div>
      <div className="hero">
        <div className="hero-eyebrow">Student Council Election</div>
        <h1 className="hero-title">Cast Your <span className="accent">Vote</span></h1>
        <p className="hero-subtitle">Choose wisely.</p>
      </div>
      <div className="candidates-grid">
        {candidates.map((c, i) => (
          <div key={c.id} className={`candidate-card${voted === c.id ? " voted" : ""}`}>
            <div className="card-image-wrap">
              <img src={c.image} alt={c.name} />
              <div className="card-image-overlay" />
              <div className="card-rank">#{i + 1}</div>
            </div>
            <div className="card-body">
              <div className="card-name">{c.name}</div>
         
              {voted === c.id ? (
                <div className="voted-badge">✓ Voted</div>
              ) : (
                <button className="btn-vote"
                  disabled={!!voting || !!voted}
                  onClick={() => setConfirmTarget(c)}>
                  {voting === c.id ? <span className="spinner" /> : "Vote Now"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {confirmTarget && (
        <VoteModal
          candidate={confirmTarget}
          onConfirm={handleVote}
          onClose={() => setConfirmTarget(null)}
          loading={!!voting}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── JUDGES DASHBOARD ─────────────────────────────────────────────────────────
function JudgesDashboard({ onSignOut }) {
  const [candidates, setCandidates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState("");
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    Promise.all([db.getCandidates(), db.getCategories(), db.getJudgesScores()])
      .then(([c, cat, s]) => { setCandidates(c); setCategories(cat); setScores(s); setLoading(false); });
  }, []);

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name || categories.includes(name)) return;
    await db.addCategory(name);
    setCategories((p) => [...p, name]);
    setNewCat("");
    showToast(`Category "${name}" added`);
  };

  const removeCategory = async (name) => {
    await db.removeCategory(name);
    setCategories((p) => p.filter((c) => c !== name));
    showToast(`Category "${name}" removed`, "error");
  };

  const updateScore = async (candId, cat, val) => {
    setScores((prev) => ({
      ...prev,
      [candId]: { ...(prev[candId] || {}), [cat]: val },
    }));
    const key = `${candId}-${cat}`;
    setSaving((p) => ({ ...p, [key]: true }));
    await db.setScore(candId, cat, val);
    setSaving((p) => ({ ...p, [key]: false }));
  };

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><div className="loading-text">Loading dashboard…</div></div>
  );

  return (
    <div>
      <div className="signout-row">
        <button className="btn-signout" onClick={onSignOut}>← Exit Dashboard</button>
      </div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Judges <span>Dashboard</span></h1>
        <p className="dashboard-subtitle">Assign scores per category for each candidate. Changes save automatically.</p>
      </div>

      <div className="categories-section">
        <div className="section-label">Scoring Categories</div>
        <div className="categories-list">
          {categories.map((c) => (
            <div key={c} className="category-tag">
              {c}
              <button className="tag-remove" onClick={() => removeCategory(c)}>✕</button>
            </div>
          ))}
          {categories.length === 0 && <span style={{color:"var(--muted)",fontSize:13}}>No categories yet</span>}
        </div>
        <div className="add-category-row">
          <input className="input-field" placeholder="e.g. Stage Presence"
            value={newCat} onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          <button className="btn-add" onClick={addCategory}>+ Add</button>
        </div>
      </div>

      <div className="section-label">Candidate Scores</div>
      <div className="scoring-section">
        {candidates.map((cand) => (
          <div key={cand.id} className="scoring-card">
            <div className="scoring-card-header">
              <img src={cand.image} alt={cand.name} className="scoring-avatar" />
              <div className="scoring-name">{cand.name}</div>
              {categories.length > 0 && (
                <div style={{marginLeft:"auto", fontSize:13, color:"var(--muted)"}}>
                  Avg:{" "}
                  <strong style={{color:"var(--blue-light)"}}>
                    {(categories.reduce((s, c) => s + (scores[cand.id]?.[c] ?? 50), 0) / categories.length).toFixed(1)}
                  </strong>
                </div>
              )}
            </div>
            <div className="scoring-rows">
              {categories.length === 0 && <div className="empty-state">Add categories above to start scoring</div>}
              {categories.map((cat) => {
                const val = scores[cand.id]?.[cat] ?? 50;
                const key = `${cand.id}-${cat}`;
                return (
                  <div key={cat} className="score-row">
                    <div className="score-label">{cat}</div>
                    <div className="score-slider-wrap">
                      <input type="range" min={1} max={100} value={val}
                        className="score-slider"
                        style={{"--fill": `${val}%`}}
                        onChange={(e) => updateScore(cand.id, cat, Number(e.target.value))} />
                    </div>
                    <div className="score-value" style={{display:"flex",alignItems:"center",gap:4}}>
                      {saving[key] ? <span className="spinner" style={{width:12,height:12}} /> : val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onSignOut }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [candidates, categories, judgesScores] = await Promise.all([
      db.getCandidates(), db.getCategories(), db.getJudgesScores(),
    ]);
    const totalVotes = candidates.reduce((s, c) => s + c.votes, 0);

    const results = candidates.map((c) => {
      // Normalised vote score (0–100)
      const voteScore = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
      // Average judge score
      const catScores = categories.map((cat) => judgesScores[c.id]?.[cat] ?? 50);
      const judgeAvg = catScores.length > 0
        ? catScores.reduce((s, v) => s + v, 0) / catScores.length
        : 50;
      const finalScore = voteScore * VOTE_WEIGHT + judgeAvg * JUDGE_WEIGHT;
      return { ...c, voteScore, judgeAvg, finalScore };
    }).sort((a, b) => b.finalScore - a.finalScore);

    setData(results);
  };

  useEffect(() => { load().then(() => setLoading(false)); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const rankStyle = (i) => i === 0 ? "gold" : i === 1 ? "silver" : "bronze";
  const maxScore = data?.[0]?.finalScore || 100;

  if (loading) return (
    <div className="loading-screen"><div className="spinner" /><div className="loading-text">Calculating results…</div></div>
  );

  return (
    <div>
      <div className="signout-row">
        <button className="btn-signout" onClick={onSignOut}>← Exit Panel</button>
      </div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin <span>Analytics</span></h1>
        <p className="dashboard-subtitle">Real-time leaderboard with weighted scoring engine.</p>
      </div>

      <div className="weight-info">
        <div className="weight-pill">
          <div className="weight-dot blue" />
          <div>
            <div className="weight-label">Public Votes</div>
            <div className="weight-val blue">70%</div>
          </div>
        </div>
        <div className="weight-pill">
          <div className="weight-dot red" />
          <div>
            <div className="weight-label">Judges' Average</div>
            <div className="weight-val red">30%</div>
          </div>
        </div>
        <div className="weight-pill" style={{flex:2}}>
          <div style={{fontSize:12,color:"var(--muted)"}}>
            <strong style={{display:"block",marginBottom:4,color:"var(--text)"}}>Formula</strong>
            Final = (Votes/Total × 100 × 0.7) + (JudgeAvg × 0.3)
          </div>
        </div>
      </div>

      <div className="refresh-row">
        <button className={`btn-refresh${refreshing ? " spinning" : ""}`} onClick={refresh}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="section-label">Live Leaderboard</div>
      <div className="leaderboard">
        {data?.map((c, i) => {
          const r = rankStyle(i);
          const barPct = `${(c.finalScore / maxScore) * 100}%`;
          return (
            <div key={c.id} className={`leaderboard-item${i === 0 ? " winner" : ""}`}>
              <div className={`lb-rank ${r}`}>{i === 0 ? "👑" : i + 1}</div>
              <img src={c.image} alt={c.name} className="lb-avatar" />
              <div className="lb-info">
                <div className="lb-name">
                  {c.name}
                  {i === 0 && <span className="crown">✦</span>}
                </div>
                <div className="lb-breakdown">
                  <div className="lb-stat blue">Votes <strong>{c.votes.toLocaleString()}</strong></div>
                  <div className="lb-stat blue">Vote Score <strong>{c.voteScore.toFixed(1)}</strong></div>
                  <div className="lb-stat red">Judge Avg <strong>{c.judgeAvg.toFixed(1)}</strong></div>
                </div>
                <div className="score-bar-wrap" style={{marginTop:8}}>
                  <div className="score-bar-bg">
                    <div className={`score-bar-fill ${r}`} style={{"--target-width": barPct}} />
                  </div>
                </div>
              </div>
              <div className="lb-score-section">
                <div className={`lb-score ${r}`}>{c.finalScore.toFixed(1)}</div>
                <div className="lb-score-label">Final Score</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("vote"); // vote | judges | admin
  const [pinTarget, setPinTarget] = useState(null); // "judges" | "admin"
  const [judgesAuth, setJudgesAuth] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);

  const handleNavClick = (target) => {
    if (target === "judges") {
      if (judgesAuth) { setView("judges"); return; }
      setPinTarget("judges");
    } else if (target === "admin") {
      if (adminAuth) { setView("admin"); return; }
      setPinTarget("admin");
    } else {
      setView("vote");
    }
  };

  const handlePinSuccess = () => {
    if (pinTarget === "judges") { setJudgesAuth(true); setView("judges"); }
    if (pinTarget === "admin") { setAdminAuth(true); setView("admin"); }
    setPinTarget(null);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">ISC<span>.</span>VOTE</div>
          <nav className="header-actions">
            <button className={`btn-nav${view === "vote" ? " active" : ""}`}
              onClick={() => handleNavClick("vote")}>Voting Panel</button>
            <button className={`btn-nav${view === "judges" ? " active" : ""}`}
              onClick={() => handleNavClick("judges")}>Judges</button>
            <button className={`btn-nav${view === "admin" ? " active" : ""}`}
              onClick={() => handleNavClick("admin")}>Admin Panel</button>
          </nav>
        </header>

        <main className="page">
          {view === "vote" && <VotingPage />}
          {view === "judges" && judgesAuth && (
            <JudgesDashboard onSignOut={() => { setJudgesAuth(false); setView("vote"); }} />
          )}
          {view === "admin" && adminAuth && (
            <AdminPanel onSignOut={() => { setAdminAuth(false); setView("vote"); }} />
          )}
        </main>

         <footer style={{
          textAlign: "center",
          padding: "24px 32px",
          borderTop: "1px solid var(--border)",
          color: "var(--muted)",
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.3px",
        }}>
          Website developed by <span style={{color:"var(--blue-light)", fontWeight:600}}>ISC Presidency 25/26</span>
        </footer>

        {pinTarget && (
          <PinOverlay
            targetPin={pinTarget === "judges" ? JUDGE_PIN : ADMIN_PIN}
            label={pinTarget === "judges" ? "Judges Dashboard" : "Admin Panel"}
            onSuccess={handlePinSuccess}
            onClose={() => setPinTarget(null)}
          />
        )}
      </div>
    </>
  );
}