import React, { useState, useEffect, useRef } from 'react';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const GOOGLE_CLIENT_ID = "114822666541-8ja92po8tuk4en1k8lr0ojoe4dm1r4u8.apps.googleusercontent.com"; 
const AIRCALL_API_ID = "b4acecdc63a5a18d9145c38cdd0f5f04";

// --- ELEVENLABS CONFIGURATION (STRICT RULES) ---
const ELEVENLABS_VOICE_ID = "IKne3meq5aSn9XLyUdCD"; // Charlie
const ELEVENLABS_MODEL = "eleven_multilingual_v2"; 
const ELEVENLABS_VOICE_SETTINGS = {
  stability: 1.0,       // 100%
  similarity_boost: 1.0, // 100%
  style: 0.3,           // 30%
  use_speaker_boost: true,
};
const ELEVENLABS_SPEED = 0.87; // 0.87

// -----------------------------------------------------------------------------
// INLINE ICONS (Self-contained, no external dependencies)
// -----------------------------------------------------------------------------
const IconBase = ({ size = 24, color = "currentColor", children, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

const LoaderIcon = (props) => <IconBase {...props} className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></IconBase>;
const BarChartIcon = (props) => <IconBase {...props}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></IconBase>;
const AlertCircleIcon = (props) => <IconBase {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></IconBase>;
const PlayIcon = (props) => <IconBase {...props}><polygon points="5 3 19 12 5 21 5 3" /></IconBase>;
const LogOutIcon = (props) => <IconBase {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></IconBase>;
const WifiOffIcon = (props) => <IconBase {...props}><line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /></IconBase>;
const ShieldCheckIcon = (props) => <IconBase {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></IconBase>;
const ZapIcon = (props) => <IconBase {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></IconBase>;
const TrophyIcon = (props) => <IconBase {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17" /><path d="M14 14.66V17" /><path d="M18 2h-4" /><path d="M6 2H2" /><path d="M12 2v7" /></IconBase>;
const DatabaseIcon = (props) => <IconBase {...props}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></IconBase>;
const RefreshCwIcon = (props) => <IconBase {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></IconBase>;
const CalendarIcon = (props) => <IconBase {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></IconBase>;
const CheckCircleIcon = (props) => <IconBase {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></IconBase>;
const LogInIcon = (props) => <IconBase {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></IconBase>;
const UserIcon = (props) => <IconBase {...props}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></IconBase>;
const XCircleIcon = (props) => <IconBase {...props}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></IconBase>;
const Volume2Icon = (props) => <IconBase {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></IconBase>;
const XIcon = (props) => <IconBase {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></IconBase>;
const SunIcon = (props) => <IconBase {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></IconBase>;
const MoonIcon = (props) => <IconBase {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></IconBase>;
const AlertTriangleIcon = (props) => <IconBase {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></IconBase>;

/**
 * CUSTOM CSS STYLES
 */
const styles = `
  :root {
    /* DARK MODE DEFAULTS */
    --bg-dark: #0a0a0a;
    --bg-card: #171717;
    --bg-header: #000000;
    --bg-input: #000000;
    --border-color: #262626;
    --text-primary: #ffffff;
    --text-secondary: #737373;
    --text-time: #a3a3a3;
    
    --accent-orange: #ea580c;
    --accent-yellow: #ca8a04;
    --accent-green: #16a34a;
    
    --bg-booking-card: linear-gradient(145deg, #2a1b12 0%, #0a0a0a 100%);
    --bg-agent-row: rgba(23, 23, 23, 0.8);
    --bg-agent-row-hover: rgba(255, 255, 255, 0.02);
    
    --font-impact: 'Impact', sans-serif;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  [data-theme='light'] {
    --bg-dark: #f8fafc;
    --bg-card: #ffffff;
    --bg-header: #ffffff;
    --bg-input: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #0f172a;
    --text-secondary: #64748b;
    --text-time: #475569;
    
    /* Keep accents similar but slightly adjusted for contrast if needed */
    --accent-orange: #ea580c; 
    
    --bg-booking-card: linear-gradient(145deg, #fff7ed 0%, #ffffff 100%);
    --bg-agent-row: rgba(255, 255, 255, 0.8);
    --bg-agent-row-hover: rgba(0, 0, 0, 0.02);
  }

  /* RESET & FULL WIDTH LAYOUT FIXES */
  * { box-sizing: border-box; }

  html, body, #root {
    margin: 0; padding: 0; width: 100%; height: 100%;
    max-width: none !important;
    background-color: var(--bg-dark);
    font-family: var(--font-sans);
    overflow: hidden; /* Prevent body scroll, handle inside app-container */
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* MAIN CONTAINER - FLEX COLUMN FOR FIXED HEADER/FOOTER */
  .app-container {
    height: 100vh; width: 100%;
    background-color: var(--bg-dark); color: var(--text-primary);
    display: flex; flex-direction: column;
    overflow: hidden;
    padding-top: 0.5rem; /* Tiny gap at the top */
    transition: background-color 0.3s ease;
  }

  /* TOAST NOTIFICATIONS */
  .toast-container {
    position: fixed; top: 1rem; right: 1rem; z-index: 9999;
    display: flex; flex-direction: column; gap: 0.5rem;
    pointer-events: none; /* Allow clicks through empty space */
  }
  .toast {
    background-color: var(--bg-card);
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--accent-orange);
    color: var(--text-primary);
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    display: flex; align-items: flex-start; gap: 0.75rem;
    width: 320px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
  }
  .toast.error { border-left-color: #ef4444; }
  .toast.success { border-left-color: #22c55e; }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }

  /* LOADING OVERLAY */
  .loading-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--bg-dark);
    z-index: 100;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    animation: fadeIn 0.3s ease-in-out;
    transition: background-color 0.3s ease;
  }

  .loading-card {
    background: var(--bg-card); padding: 3rem;
    border-radius: 1rem; border: 1px solid var(--border-color);
    text-align: center;
    box-shadow: 0 0 50px -10px rgba(234, 88, 12, 0.15);
    display: flex; flex-direction: column; align-items: center;
    gap: 1.5rem; max-width: 400px; width: 90%;
  }

  .loading-pulse { animation: pulse-orange 2s infinite; }

  @keyframes pulse-orange {
    0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(234, 88, 12, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
  }

  /* Green Pulse for Live Dot */
  .pulse-green { animation: pulse-green 2s infinite; }

  @keyframes pulse-green {
    0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
    70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
    100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
  }

  /* Winner Row Pulse */
  @keyframes winner-pulse {
    0% { 
      box-shadow: 0 0 40px -10px rgba(249, 115, 22, 0.4); 
      border-color: rgba(249, 115, 22, 0.5); 
    }
    50% { 
      box-shadow: 0 0 60px -5px rgba(249, 115, 22, 0.6); 
      border-color: rgba(249, 115, 22, 0.8); 
    }
    100% { 
      box-shadow: 0 0 40px -10px rgba(249, 115, 22, 0.4); 
      border-color: rgba(249, 115, 22, 0.5); 
    }
  }

  /* Spinner Animation Fix */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  /* LOGIN & AUTH SCREENS */
  .login-container {
    width: 100vw; height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background-color: var(--bg-dark); padding: 1rem;
    overflow-y: auto; 
    transition: background-color 0.3s ease;
  }

  .login-card {
    width: 100%; max-width: 440px;
    background-color: var(--bg-card);
    border: 1px solid var(--border-color); border-radius: 1rem;
    padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .icon-box {
    width: 4rem; height: 4rem;
    background: var(--bg-dark); /* Match footer logo background */
    border-radius: 0.75rem; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 2rem auto; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
  }

  .input-group { margin-bottom: 1rem; }
  .input-label {
    display: block; font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--text-time); margin-bottom: 0.5rem;
  }

  .input-field {
    width: 100%; background-color: var(--bg-input);
    border: 1px solid var(--border-color); border-radius: 0.5rem;
    padding: 0.75rem 1rem; color: var(--text-primary);
    font-size: 0.875rem; outline: none; transition: border-color 0.2s;
  }
  .input-field:focus { border-color: var(--accent-orange); }

  .section-divider {
    display: flex; align-items: center; gap: 1rem; margin: 1.5rem 0;
    color: var(--text-secondary); font-size: 0.75rem; font-weight: bold; text-transform: uppercase;
  }
  .section-divider::before, .section-divider::after {
    content: ''; flex: 1; height: 1px; background-color: var(--border-color);
  }

  .btn-primary {
    width: 100%; background-color: var(--accent-orange);
    color: white; font-weight: bold; padding: 0.875rem;
    border-radius: 0.5rem; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    gap: 0.5rem; margin-top: 1rem;
    transition: background-color 0.2s, transform 0.1s;
  }
  .btn-primary:hover { background-color: #c2410c; }
  .btn-primary:active { transform: scale(0.98); }

  .btn-google {
    background-color: var(--bg-card); color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
  .btn-google:hover { background-color: var(--bg-dark); }

  /* DASHBOARD SPLIT VIEW */
  .main-split-view {
    display: flex; flex: 1; overflow: hidden; width: 100%;
  }

  /* PANEL SWAP: Leaderboard (Right) / Bookings (Left) */
  .leaderboard-panel {
    flex: 3; display: flex; flex-direction: column; overflow: hidden;
    /* No border right since it's on the right now */
  }

  .bookings-panel {
    flex: 1.2; display: flex; flex-direction: column; overflow: hidden;
    background-color: var(--bg-header); min-width: 320px;
    border-right: 1px solid var(--border-color); /* Separator line on the right of bookings */
    transition: background-color 0.3s ease;
  }

  /* DASHBOARD HEADER */
  .dashboard-header {
    background-color: var(--bg-header);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 2rem;
    display: flex; align-items: flex-end; justify-content: space-between;
    flex-shrink: 0;
    z-index: 50;
    min-height: 100px;
    transition: background-color 0.3s ease;
  }

  .main-title {
    font-family: var(--font-sans); font-weight: 900; font-size: 3rem;
    text-transform: uppercase; letter-spacing: 0.02em; line-height: 1;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
  }

  .legend-box {
    display: flex; gap: 2rem;
    background-color: var(--bg-card); padding: 1rem 1.5rem;
    border-radius: 0.75rem; border: 1px solid var(--border-color);
  }

  .legend-item { text-align: right; }
  .legend-label { font-size: 0.65rem; font-weight: bold; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.25rem; }
  .legend-value { font-size: 1.125rem; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); }
  .dot { width: 0.75rem; height: 0.75rem; border-radius: 50%; }

  /* SCROLLABLE CONTENT AREA */
  .dashboard-content {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    scrollbar-width: thin;
    scrollbar-color: #262626 var(--bg-dark);
  }
  .dashboard-content::-webkit-scrollbar { width: 8px; }
  .dashboard-content::-webkit-scrollbar-track { background: var(--bg-dark); }
  .dashboard-content::-webkit-scrollbar-thumb { background-color: var(--border-color); border-radius: 4px; }

  /* BOOKINGS PANEL STYLES */
  .bookings-header {
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; align-items: center; justify-content: space-between;
    min-height: 100px;
    background-color: var(--bg-header);
    transition: background-color 0.3s ease;
  }

  .bookings-title {
    font-family: var(--font-sans); font-weight: 900; font-size: 2.5rem;
    text-transform: uppercase; color: var(--text-primary); margin: 0; line-height: 1;
  }

  .bookings-stats { text-align: right; }
  .bookings-count { font-size: 2.5rem; font-weight: 900; line-height: 1; color: var(--text-primary); }
  .bookings-label { font-size: 1rem; color: var(--text-secondary); text-transform: uppercase; font-weight: bold; }

  .bookings-list {
    flex: 1; overflow-y: auto; padding: 1.5rem;
    display: flex; flex-direction: column; gap: 1rem;
    scrollbar-width: thin; scrollbar-color: #262626 var(--bg-header);
  }

  .booking-card {
    border-radius: 0.75rem;
    padding: 1.25rem; 
    background: var(--bg-booking-card); 
    border: 1px solid #333;
    border-left: 6px solid var(--accent-orange); 
    min-height: auto; 
    height: auto;
    display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5);
    transition: transform 0.2s;
  }
  [data-theme='light'] .booking-card { border-color: #e2e8f0; }

  .booking-card:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(234, 88, 12, 0.2); }

  .booking-meta { 
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; 
  }
  .booking-time { 
    font-size: 1.75rem; color: var(--text-time); font-weight: 900;
    display: flex; align-items: center; gap: 0.5rem; 
  }
  .booking-status {
    font-size: 0.85rem; font-weight: 900; color: #16a34a; 
    background: rgba(22, 163, 74, 0.1); padding: 0.4rem 0.8rem; 
    border-radius: 1rem; text-transform: uppercase;
  }
  .booking-summary { 
    font-size: 1.75rem; 
    font-weight: 900; color: var(--text-primary); 
    line-height: 1.2;
    white-space: normal; 
    word-break: break-word;
    margin: 0.25rem 0 1rem 0;
  }

  /* AGENT ROWS - SCALED UP BY 20% */
  .agent-row {
    display: flex; align-items: center; 
    gap: 2.7rem; 
    background-color: var(--bg-agent-row);
    border: 1px solid var(--border-color); border-radius: 1rem;
    padding: 0.9rem 1.8rem;
    margin-bottom: 0.5rem;
    transition: all 0.5s ease; width: 100%;
  }
  .agent-row:hover { background-color: var(--bg-agent-row-hover); }

  .agent-row.winner {
    background-color: rgba(67, 20, 7, 0.4);
    transform: scale(1.01);
    animation: winner-pulse 3s infinite ease-in-out;
  }
  .winner .rank-badge { background-color: var(--accent-orange); color: black; border-color: #fb923c; box-shadow: 0 0 20px rgba(249, 115, 22, 0.6); }
  .winner .agent-name { color: #fb923c; text-shadow: 0 0 10px rgba(249, 115, 22, 0.5); }
  .winner .total-score { color: #fb923c; }

  .agent-row.target {
    background-color: rgba(5, 46, 22, 0.2);
    border-color: rgba(34, 197, 94, 0.3);
  }
  .target .rank-badge { background-color: #16a34a; color: black; border-color: #16a34a; }
  .target .agent-name { color: #22c55e; }
  .target .total-score { color: #22c55e; }

  .rank-badge {
    width: 4.5rem; height: 4.5rem; 
    border-radius: 50%;
    background-color: #262626; border: 1px solid #404040;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.8rem; 
    font-weight: 900; flex-shrink: 0;
    color: white;
  }

  .agent-info { width: 14.4rem; flex-shrink: 0; overflow: hidden; }
  .agent-name { 
    font-size: 2rem; font-weight: 900; /* EXTRA BOLD */
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    color: var(--text-primary); 
    text-transform: uppercase; /* ALL CAPS */
  }

  .progress-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
  
  .progress-track {
    height: 4.95rem; 
    border-radius: 1.2rem; 
    background-color: #171717; position: relative;
    display: flex; align-items: center; overflow: hidden;
    min-width: fit-content; 
    padding: 0.45rem 0.9rem; 
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-fill {
    position: absolute; top: 0; left: 0; bottom: 0; right: 0;
    z-index: 0; border-radius: 1.2rem; 
  }

  .fill-gradient-default { background: linear-gradient(90deg, #facc15, #ff5d00); }
  .fill-gradient-target { background-color: #16a34a; }

  .bar-content {
    position: relative; z-index: 10;
    display: flex; align-items: center;
    width: 100%; height: 100%; gap: 0.5rem;
  }

  .stat-segment {
    height: 100%; display: flex; align-items: center;
    justify-content: flex-start; /* DIALS LEFT ALIGNED */
    min-width: fit-content; 
    transition: width 1s ease;
  }
  .stat-segment.talk { justify-content: flex-end; } /* TALK RIGHT ALIGNED */
  .separator { width: 2px; height: 2.7rem; background-color: rgba(0,0,0,0.8); flex-shrink: 0; }

  .stat-badge {
    background-color: rgba(0, 0, 0, 0.3);
    padding: 0.6rem 0; 
    border-radius: 0.5rem; 
    font-size: 1.8rem; 
    font-weight: 900; 
    color: white; 
    text-shadow: 0 2px 4px rgba(0,0,0,0.9);
    white-space: nowrap;
    width: 4.8rem; 
    display: flex; justify-content: center; align-items: center;
  }

  .score-box {
    width: 10.8rem; 
    flex-shrink: 0; text-align: right;
    padding-left: 1.8rem; 
    border-left: 1px solid var(--border-color);
  }
  .total-score { font-size: 3.15rem; font-weight: 900; line-height: 1; letter-spacing: -0.05em; color: var(--text-primary); }

  /* FOOTER STYLES */
  .footer {
    background-color: var(--bg-header); 
    border-top: 1px solid var(--border-color);
    padding: 1rem 2rem; /* Reduced back to original */
    display: flex; justify-content: space-between;
    align-items: center; 
    z-index: 50;
    flex-shrink: 0;
    transition: background-color 0.3s ease;
  }
  .footer-left { display: flex; align-items: center; gap: 1.15rem; /* 15% larger gap */ }
  .footer-logo-box {
    width: 3.74rem; height: 3.74rem; /* 15% LARGER LOGO BOX */
    background: var(--bg-dark);
    border-radius: 0.575rem; display: flex; align-items: center; justify-content: center;
  }
  .footer-text-group { display: flex; flex-direction: column; }
  .footer-brand { font-size: 1.61rem; /* 15% LARGER */ font-weight: bold; color: var(--text-primary); line-height: 1.2; }
  .footer-sub { font-size: 1.265rem; /* 15% LARGER */ color: var(--text-secondary); line-height: 1.2; }
  .footer-right { text-align: right; display: flex; align-items: center; gap: 2.3rem; /* 15% larger gap */ }
  
  .footer-label { 
    font-size: 1.8rem; /* 50% LARGER */
    font-weight: bold; color: var(--text-primary); display: block; margin-bottom: 0.23rem; 
  }
  .footer-time { 
    font-size: 2.1rem; /* 50% LARGER */
    color: var(--text-primary); font-family: var(--font-sans); 
  }

  /* DISCONNECT BUTTON STYLES */
  .btn-disconnect {
    display: flex; alignItems: center; justify-content: center;
    background: #171717;
    border: 1px solid #262626;
    color: #737373;
    padding: 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 1.125rem;
    transition: all 0.2s;
  }
  .btn-disconnect:hover {
    color: var(--text-primary);
    border-color: #404040;
  }
  .btn-disconnect:active {
    border-color: var(--accent-orange) !important;
    color: var(--accent-orange);
  }
  [data-theme='light'] .btn-disconnect {
     background: white;
     border-color: var(--border-color);
  }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .main-split-view { 
      flex-direction: column; 
      height: 100%; /* Ensure container fill */
    }
    
    /* MOBILE BOOKINGS - 40% HEIGHT */
    .bookings-panel { 
      flex: 0 0 45%; /* slightly increased from 40% to give breathing room */
      height: 45%;
      min-height: 0; 
      width: 100%;
      border-right: none; 
      border-bottom: 1px solid var(--border-color); 
      overflow: hidden; /* Constrain panel */
    }

    /* MOBILE LEADERBOARD - 55% HEIGHT */
    .leaderboard-panel { 
      flex: 1; /* Takes remaining space */
      height: 55%;
      min-height: 0;
      width: 100%;
      border-right: none; 
      overflow: hidden; /* Constrain panel */
    }

    /* COMPACT HEADERS */
    .dashboard-header, .bookings-header {
      padding: 0.75rem 1rem;
      min-height: auto;
    }
    
    .bookings-list {
       padding: 1rem;
    }

    .dashboard-content {
      padding: 1rem;
    }

    /* FONT ADJUSTMENTS FOR MOBILE */
    .main-title, .bookings-title { font-size: 1.75rem; }
    .booking-summary { font-size: 1.4rem; }
    .booking-time { font-size: 1.4rem; }
    
    /* HIDE LEGEND ON MOBILE IF TOO CRAMPED */
    .legend-box { display: none; }
    .table-header { display: none; } /* Hide heavy table headers */
    
    /* ADJUST CARDS */
    .agent-row {
      gap: 1rem; 
      padding: 0.75rem;
    }
    .rank-badge { width: 3rem; height: 3rem; font-size: 1.25rem; }
    .agent-info { width: 8rem; }
    .agent-name { font-size: 1.2rem; }
    .score-box { width: 5rem; padding-left: 0.5rem; }
    .total-score { font-size: 1.75rem; }
    .stat-badge { font-size: 1rem; width: 3rem; padding: 0.25rem; }
    .separator { height: 2rem; }
    .progress-track { height: 3.5rem; padding: 0.25rem 0.5rem; }
  }
`;

/**
 * UTILITIES
 */
const calculateScore = (dials, talkTimeSeconds) => {
  const talkMinutes = Math.floor(talkTimeSeconds / 60);
  return dials + talkMinutes;
};

// Reusable Brisbane Time object (returns Date object)
const getBrisbaneTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
};

const calculateTargetPace = () => {
  const now = getBrisbaneTime();
  const startOfDay = new Date(now).setHours(8, 0, 0, 0); 
  const lunchTime = new Date(now).setHours(12, 0, 0, 0); 
  const endTime = new Date(now).setHours(17, 0, 0, 0);   
  const currentTime = now.getTime();

  let targetDials = 0;
  let targetTalkMinutes = 0;

  if (currentTime < startOfDay) {
    targetDials = 0;
    targetTalkMinutes = 0;
  } else if (currentTime <= lunchTime) {
    const totalDuration = lunchTime - startOfDay;
    const elapsed = currentTime - startOfDay;
    const progress = elapsed / totalDuration;
    targetDials = Math.floor(progress * 75);
    targetTalkMinutes = Math.floor(progress * 125);
  } else if (currentTime <= endTime) {
    const totalDuration = endTime - lunchTime;
    const elapsed = currentTime - lunchTime;
    const progress = elapsed / totalDuration;
    targetDials = 75 + Math.floor(progress * 75);
    targetTalkMinutes = 125 + Math.floor(progress * 125);
  } else {
    targetDials = 150;
    targetTalkMinutes = 250;
  }
  const targetTalkSeconds = targetTalkMinutes * 60;
  return { id: 'target-pace', name: 'TARGET PACE', dials: targetDials, talkTime: targetTalkSeconds, isTarget: true };
};

/**
 * COMPONENTS
 */

// NOTIFICATION COMPONENT
const ToastNotification = ({ toasts, removeToast }) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`toast ${toast.type}`}>
        {toast.type === 'error' ? <AlertCircleIcon size={20} /> : <CheckCircleIcon size={20} />}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{toast.type === 'error' ? 'Error' : 'Success'}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>{toast.message}</p>
        </div>
        <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', opacity: 0.5 }}>
          <XIcon size={16} />
        </button>
      </div>
    ))}
  </div>
);

// SCREEN 1: UNIFIED LOGIN SCREEN
const UnifiedLoginScreen = ({ onConnect, onDemo, notify }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const tokenClient = useRef(null);
  const credentialsRef = useRef({ token: '', key: '', elKey: '' }); // Store parsed creds here

  // Load Google Scripts on Mount
  useEffect(() => {
    const loadGis = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => initTokenClient();
      document.body.appendChild(script);
    };

    const initTokenClient = () => {
      tokenClient.current = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
        redirect_uri: 'http://localhost:5174/',
        callback: (resp) => {
          if (resp.error !== undefined) {
            const errorMsg = "Google Sign-In Failed: " + resp.error;
            setError(errorMsg);
            notify(errorMsg);
            return;
          }
          // Success! Pass all credentials up to App using values stored in Ref
          onConnect(
            AIRCALL_API_ID, 
            credentialsRef.current.token, 
            credentialsRef.current.key, 
            resp.access_token,
            credentialsRef.current.elKey // Passed 11Labs Key
          );
        },
      });
      setIsGoogleReady(true);
    };

    loadGis();
  }, [onConnect, notify]); 

  const handleUnifiedLogin = (e) => {
    e.preventDefault();
    setError(null);

    const lines = inputText.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Validate we have at least 3 lines (Token + Google Key + ElevenLabs Key)
    if (lines.length < 3) {
      const msg = "Please paste credentials:\nLine 1: Aircall API Token\nLine 2: Google API Key\nLine 3: ElevenLabs API Key";
      setError(msg);
      notify("Missing Credentials. Check input.", 'error');
      return;
    }

    if (!isGoogleReady || !tokenClient.current) {
      const msg = "Google services not ready. Please refresh.";
      setError(msg);
      notify(msg, 'error');
      return;
    }

    // Store for callback
    credentialsRef.current = { token: lines[0], key: lines[1], elKey: lines[2] };

    // Trigger Google Auth Popup
    try {
      tokenClient.current.requestAccessToken({prompt: ''});
    } catch (e) {
      notify("Failed to open Google Auth window.", 'error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="icon-box">
          <img src="https://i.imgur.com/QjjDjuU.png" alt="Purge Digital" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.75rem' }} />
        </div>
        <h2 className="text-center" style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Sales Dashboard</h2>
        <p className="text-center" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '2rem' }}>Authenticate to Begin</p>

        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem' }}>
            <AlertCircleIcon size={20} className="text-red-500" style={{ color: '#ef4444' }} />
            <div style={{ whiteSpace: 'pre-line' }}>
              <p style={{ fontWeight: 'bold', color: '#f87171', fontSize: '0.875rem', margin: 0 }}>Connection Failed</p>
              <p style={{ color: '#fca5a5', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUnifiedLogin}>
          <div className="input-group">
            <label className="input-label">Paste Credentials (One per line)</label>
            <textarea 
              required 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              className="input-field" 
              placeholder={`Aircall API Token\nGoogle API Key\nElevenLabs API Key`}
              style={{ height: '8rem', resize: 'none', fontFamily: 'monospace', lineHeight: '1.5' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
             <LogInIcon size={18} /> Connect & Sign in with Google
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <button onClick={onDemo} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0 auto' }}>
            <PlayIcon size={16} /> Launch Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
};

const AgentRow = ({ rank, agent, maxDials, maxTalk }) => {
  const isTarget = agent.isTarget;
  const isWinner = rank === 1 && !isTarget;
  let rowClass = 'agent-row';
  if (isWinner) rowClass += ' winner';
  if (isTarget) rowClass += ' target';

  const dialScore = agent.dials;
  const talkScore = Math.floor(agent.talkTime / 60);
  const totalScore = dialScore + talkScore;
  const maxScore = calculateScore(maxDials, maxTalk);
  const scorePercent = maxScore > 0 ? (Math.sqrt(totalScore) / Math.sqrt(maxScore)) * 100 : 0;
  const dialShare = totalScore > 0 ? (dialScore / totalScore) * 100 : 0;
  const talkShare = totalScore > 0 ? (talkScore / totalScore) * 100 : 0;
  const firstName = agent.name.split(' ')[0];

  return (
    <div className={rowClass}>
      <div className="rank-badge">
        {isWinner ? <TrophyIcon size={20} fill="currentColor" /> : (isTarget ? <ZapIcon size={20} fill="currentColor" /> : rank)}
      </div>
      <div className="agent-info">
        <div className="agent-name">{firstName}</div>
        {isTarget && <span style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#16a34a' }}>Goal</span>}
      </div>
      <div className="progress-wrapper">
        <div className="progress-track" style={{ width: `${Math.max(scorePercent, 0)}%`, minWidth: totalScore > 0 ? 'fit-content' : '0' }}>
          <div className={`progress-fill ${isTarget ? 'fill-gradient-target' : 'fill-gradient-default'}`}></div>
          <div className="bar-content">
             {totalScore > 0 && <div className="stat-segment" style={{ width: `${dialShare}%`, minWidth: 'fit-content' }}><span className="stat-badge">{dialScore}</span></div>}
             {totalScore > 0 && <div className="separator"></div>}
             {totalScore > 0 && <div className="stat-segment talk" style={{ width: `${talkShare}%`, minWidth: 'fit-content' }}><span className="stat-badge">{talkScore}</span></div>}
          </div>
          {isWinner && <div style={{ position: 'absolute', inset: 0, backgroundColor: '#f97316', filter: 'blur(20px)', opacity: 0.3, zIndex: 5 }}></div>}
        </div>
      </div>
      <div className="score-box">
        <div className="total-score">{totalScore}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Pts</div>
      </div>
    </div>
  );
};

// ADDED: Cancel button support
const LoadingScreen = ({ status, error, onRetry, onCancel }) => (
  <div className="loading-overlay">
    <div className="loading-card loading-pulse" style={error ? { animation: 'none', borderColor: '#ef4444' } : {}}>
      <div className="icon-box" style={{ marginBottom: '1.5rem', background: 'transparent', boxShadow: 'none' }}>
        {error ? <AlertCircleIcon size={64} color="#ef4444" /> : <LoaderIcon className="animate-spin" size={64} color="#ea580c" />}
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
        {error ? 'Sync Failed' : 'Loading Data'}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.5rem' }}>
        {error ? 'Could not retrieve data.' : 'Establishing connections...'}
      </p>
      
      {error ? (
        <div style={{ width: '100%', marginTop: '1rem' }}>
           <p style={{ color: '#fca5a5', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>{error}</p>
           <button onClick={onRetry} className="btn-primary" style={{ marginTop: 0 }}>
             <RefreshCwIcon size={16} /> Retry Connection
           </button>
        </div>
      ) : (
        <div style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#262626', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <DatabaseIcon size={16} color="#f97316" />
          <span style={{ fontSize: '0.85rem', color: '#d4d4d4', fontFamily: 'monospace' }}>
            STATUS: {status || 'Initializing handshake...'}
          </span>
        </div>
      )}

      {/* ADDED: Cancel Button */}
      <button 
        onClick={onCancel} 
        style={{ 
          marginTop: '2rem', 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem', 
          cursor: 'pointer',
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem' 
        }}
      >
        <XCircleIcon size={16} /> Cancel
      </button>
    </div>
  </div>
);

// SCREEN 3: DASHBOARD (Data Loading -> Display)
const Dashboard = ({ apiId, apiToken, googleToken, apiKey, elevenLabsApiKey, onLogout, notify, toggleTheme, theme }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchStatus, setFetchStatus] = useState('Initializing...');
  const [errorState, setErrorState] = useState(null); 
  const [currentTime, setCurrentTime] = useState(new Date());
  // Added refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const manualRefresh = useRef(false);

  // New Booking State
  const [bookings, setBookings] = useState([]);
  
  // ElevenLabs State
  const announcedEventIds = useRef(new Set());

  const callsCache = useRef(new Map()); 
   
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    manualRefresh.current = true;
    setRefreshTrigger(prev => prev + 1);
  };

  const generateMockData = () => {
    const names = ['Oscar Wilde', 'Declan Rice', 'Adam Smith', 'Alex Morgan', 'Mike Ross'];
    return names.map(name => ({
      id: name, name: name, dials: Math.floor(Math.random() * 80) + 20, talkTime: Math.floor(Math.random() * 8000) + 1200, isTarget: false
    }));
  };

  const generateMockBookings = () => {
     // Generate random bookings for demo
     const count = Math.floor(Math.random() * 5) + 5;
     const mocks = [];
     const summaries = ["OP - Initial Consultation - Client - 0400", "OP - Follow-up Call - Client - 0400", "OP - Product Demo - Client - 0400"];
     const creators = ["john.doe@company.com", "jane.smith@company.com", "alex.williams@company.com"];
     for(let i=0; i<count; i++) {
        const time = new Date();
        time.setHours(9 + i, Math.random() > 0.5 ? 30 : 0);
        mocks.push({
           id: i,
           summary: summaries[Math.floor(Math.random() * summaries.length)],
           creator: { email: creators[Math.floor(Math.random() * creators.length)] },
           start: { dateTime: time.toISOString() }
        });
     }
     return mocks;
  };

  // --- HELPER: EXTRACT REP NAME ---
  const getRepName = (email) => {
    if (!email) return "Unknown";
    const rawName = email.split('@')[0].split('.')[0]; 
    return rawName.charAt(0).toUpperCase() + rawName.slice(1);
  };

  // --- ELEVENLABS ANNOUNCEMENT FUNCTION ---
  // UPDATED: Now uses passed 'elevenLabsApiKey' prop
  const playAnnouncement = async (text) => {
    if (!elevenLabsApiKey || !ELEVENLABS_VOICE_ID) {
      notify("ElevenLabs configuration missing.", 'error');
      return;
    }
    
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey, // Use dynamic key
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: ELEVENLABS_VOICE_SETTINGS
        }),
      });

      if (!response.ok) {
        throw new Error('Speech generation failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = ELEVENLABS_SPEED; // APPLY SPEED SETTING
      audio.play();
    } catch (e) {
      console.error("ElevenLabs Error:", e);
      notify("Failed to generate speech. Check API Key.", 'error');
    }
  };

  const fetchPage = async (page, fromDate, headers, baseUrl) => {
    const url = `${baseUrl}/calls?from=${fromDate}&order=desc&per_page=50&page=${page}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
         if (res.status === 429) {
           console.warn("Rate limit hit");
           notify("Aircall Rate Limit Reached.", 'error');
           return null;
         }
         throw new Error(`API Error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      throw err;
    }
  };

  // LOAD GAPI (Authorization Client)
  useEffect(() => {
    if(apiId === 'demo') return;

    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => gapi.load('client', initGapiClient);
      document.body.appendChild(script);
    };

    const initGapiClient = async () => {
      await gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });
      // GAPI is ready, and we have token from Login screen, so set it
      if (googleToken) {
          gapi.client.setToken({ access_token: googleToken });
          listUpcomingEvents();
      }
    };

    loadGapi();
  }, [apiKey, googleToken, refreshTrigger]); // Added refreshTrigger to reload calendar

  // FETCH EVENTS (Authenticated)
  const listUpcomingEvents = async () => {
     const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
     const start = new Date(now);
     start.setHours(0, 0, 0, 0);
     const end = new Date(now);
     end.setHours(23, 59, 59, 999);

     try {
       const request = {
         'calendarId': 'primary', 
         'timeMin': start.toISOString(),
         'timeMax': end.toISOString(),
         'showDeleted': false,
         'singleEvents': true,
         'orderBy': 'startTime',
       };
       const response = await gapi.client.calendar.events.list(request);
       
       // BACKEND FILTER: Only start with "OP"
       const allEvents = response.result.items || [];
       const filteredEvents = allEvents.filter(event => 
         event.summary && event.summary.trim().toLowerCase().startsWith('op')
       );

       setBookings(filteredEvents);
     } catch (err) {
       console.error("Error fetching events", err);
       notify("Failed to fetch Google Calendar events.", 'error');
     }
  };

  // --- TRIGGER LOGIC FOR ELEVENLABS (AUTOMATIC) ---
  useEffect(() => {
    if (bookings.length === 0) return;

    const checkAnnouncements = () => {
      const nowTime = currentTime.getTime();
      const currentMinute = currentTime.getMinutes();
      
      // Determine which trigger type we are checking for
      let triggerType = null;
      // 5-minute pre-start warning (existing)
      // Check window: 4m 50s to 5m 00s BEFORE start
      // Note: original logic used raw timeDiff. 
      // The new request added "5 minutes after every hour" and "15 minutes after every hour".
      
      // 1. Pre-start warning (5 mins before op)
      const preStartEvents = [];
      bookings.forEach(booking => {
        if (!booking.start?.dateTime) return;
        const eventTime = new Date(booking.start.dateTime).getTime();
        const timeDiff = eventTime - nowTime;
        const eventId = booking.id;

        // Approx 5 mins before start (300000ms)
        if (timeDiff <= 300000 && timeDiff > 290000) {
           if (!announcedEventIds.current.has('pre-5-' + eventId)) {
              preStartEvents.push(booking);
              announcedEventIds.current.add('pre-5-' + eventId);
           }
        }
      });
      
      if (preStartEvents.length > 0) {
          const reps = preStartEvents.map(b => getRepName(b.creator?.email || ""));
          const uniqueReps = [...new Set(reps)];
          const namesString = uniqueReps.join(', ');
          const count = preStartEvents.length;
          const opWord = count === 1 ? "op" : "ops";
          const verb = count === 1 ? "is" : "are";
          // RULE: Team, there {is/are} [total_upcoming_ops] op(s) in 5 minutes. [rep name(s)], please prepare.
          const text = `Team, there ${verb} ${count} ${opWord} in 5 minutes. ${namesString}, please prepare.`;
          playAnnouncement(text);
      }

      // 2. Post-start warning (5 mins after hour) - ONLY if ops started at top of hour
      if (currentMinute === 5) {
         const post5Events = bookings.filter(booking => {
             if (!booking.start?.dateTime) return false;
             const eventDate = new Date(booking.start.dateTime);
             // Check if event started at top of current hour (approx 5 mins ago)
             const diff = nowTime - eventDate.getTime();
             // 5 mins = 300000ms. Allow slight buffer.
             return diff >= 290000 && diff <= 310000;
         });
         
         if (post5Events.length > 0) {
             const batchKey = `post-5-${currentTime.getHours()}`;
             if (!announcedEventIds.current.has(batchKey)) {
                 const reps = post5Events.map(b => getRepName(b.creator?.email || ""));
                 const uniqueReps = [...new Set(reps)];
                 const namesString = uniqueReps.join(', ');
                 const text = `${namesString}, please call any ops that did not show again`;
                 playAnnouncement(text);
                 announcedEventIds.current.add(batchKey);
             }
         }
      }

      // 3. Post-start warning (15 mins after hour)
      if (currentMinute === 15) {
         const post15Events = bookings.filter(booking => {
             if (!booking.start?.dateTime) return false;
             const eventDate = new Date(booking.start.dateTime);
             const diff = nowTime - eventDate.getTime();
             // 15 mins = 900000ms.
             return diff >= 890000 && diff <= 910000;
         });
         
         if (post15Events.length > 0) {
             const batchKey = `post-15-${currentTime.getHours()}`;
             if (!announcedEventIds.current.has(batchKey)) {
                 const reps = post15Events.map(b => getRepName(b.creator?.email || ""));
                 const uniqueReps = [...new Set(reps)];
                 const namesString = uniqueReps.join(', ');
                 const text = `${namesString}, please call any ops that did not show one last time.`;
                 playAnnouncement(text);
                 announcedEventIds.current.add(batchKey);
             }
         }
      }
    };

    checkAnnouncements();
  }, [currentTime, bookings]); 

  useEffect(() => {
    let isMounted = true;
    const isDemo = apiId === 'demo';

    if (isDemo) {
      setTimeout(() => {
        const runDemo = () => {
          const mocks = generateMockData();
          const activeMocks = mocks.filter(agent => agent.dials > 0 || agent.talkTime > 0);
          const target = calculateTargetPace();
          const combined = [...activeMocks, target].sort((a,b) => calculateScore(b.dials, b.talkTime) - calculateScore(a.dials, a.talkTime));
          setAgents(combined);
          setBookings(generateMockBookings());
          setLoading(false); 
        };
        runDemo();
        const interval = setInterval(runDemo, 5000); 
        return () => clearInterval(interval);
      }, 2000);
      return;
    } 

    const headers = { 'Authorization': 'Basic ' + btoa(`${apiId}:${apiToken}`), 'Content-Type': 'application/json' };
    const baseUrl = 'https://api.aircall.io/v1';
    const startOfDay = Math.floor(new Date().setHours(0,0,0,0) / 1000);

    const fetchUsers = async () => {
      const res = await fetch(`${baseUrl}/users?per_page=50`, { headers });
      if (!res.ok) throw new Error(`Users Fetch: ${res.status}`);
      const data = await res.json();
      const map = {};
      data.users.forEach(u => map[u.id] = u.name);
      return map;
    };

    const syncCalls = async (fullSync = false) => {
      try {
        if (!isMounted) return;
        setFetchStatus(fullSync ? 'Fetching daily history...' : 'Updating live feed...');
        
        // REFRESH CALENDAR - handled by dependency array now
        
        if (!loading) setErrorState(null); 
        
        const userMap = await fetchUsers(); 
        
        let allowedUserIds = null;
        try {
           const teamsRes = await fetch(`${baseUrl}/teams`, { headers });
           if (teamsRes.ok) {
             const teamsData = await teamsRes.json();
             const salesTeam = teamsData.teams.find(t => t.name.toLowerCase().includes('sales'));
             if (salesTeam && salesTeam.users) {
               allowedUserIds = new Set(salesTeam.users.map(u => String(u.id)));
             }
           }
        } catch (e) {
           console.warn("Could not fetch teams for filtering", e);
        }
        
        let page = 1;
        let keepFetching = true;

        while (keepFetching) {
          if (!isMounted) break;
          if (loading && fullSync) setFetchStatus(`Retrieving page ${page}...`);

          const data = await fetchPage(page, startOfDay, headers, baseUrl);
          
          if (!data && loading && fullSync) {
            throw new Error("Rate Limit Exceeded during initial load. Please wait.");
          }
          if (!data) break; 

          data.calls.forEach(call => { callsCache.current.set(call.id, call); });

          if (fullSync) {
            if (data.meta && data.meta.next_page_link) {
               page++;
               await new Promise(r => setTimeout(r, 200)); 
            } else {
               keepFetching = false;
            }
          } else {
            keepFetching = false; 
          }
        }

        const stats = {};
        Object.keys(userMap).forEach(uid => {
          if (allowedUserIds) {
            if (!allowedUserIds.has(uid)) {
              return; 
            }
          }
          stats[uid] = { id: uid, name: userMap[uid], dials: 0, talkTime: 0, isTarget: false };
        });

        callsCache.current.forEach(call => {
            if (call.user && stats[call.user.id] && (call.direction === 'inbound' || call.direction === 'outbound')) {
              stats[call.user.id].dials += 1;
              stats[call.user.id].talkTime += (call.duration || 0);
            }
        });

        const activeAgents = Object.values(stats).filter(agent => agent.dials > 0 || agent.talkTime > 0);
        const targetPaceAgent = calculateTargetPace();
        const finalList = [ ...activeAgents, targetPaceAgent ].sort((a,b) => calculateScore(b.dials, b.talkTime) - calculateScore(a.dials, a.talkTime));

        if (isMounted) {
          setAgents(finalList);
          setFetchStatus('Live');
          setLoading(false);
          setErrorState(null);

          if (manualRefresh.current) {
             notify("Dashboard refreshed successfully.", 'success');
             manualRefresh.current = false;
          }
        }

      } catch (err) {
        console.error("Sync Error", err);
        setFetchStatus('Error');
        const errMsg = err.message.includes('Failed to fetch') 
          ? 'CORS/Network Error. Browser blocked request.' 
          : (err.message || 'Unknown Error');
        setErrorState(errMsg);
        notify(`Sync Failed: ${errMsg}`, 'error');
      }
    };

    syncCalls(true);
    const intervalId = setInterval(() => { syncCalls(false); }, 30000);

    return () => { isMounted = false; clearInterval(intervalId); };
  }, [apiId, apiToken, googleToken, refreshTrigger]); // Trigger refresh on refreshTrigger change

  const maxDials = Math.max(...agents.map(a => a.dials), 1);
  const maxTalk = Math.max(...agents.map(a => a.talkTime), 1);

  const formattedDate = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', day: '2-digit', month: '2-digit', year: 'numeric' }).format(currentTime);
  const formattedTime = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(currentTime);
  
  // FILTER: UPCOMING BOOKINGS ONLY (With 20 min grace period)
  const upcomingBookings = bookings.filter(booking => {
      // Keep if no time defined (safe default)
      if (!booking.start?.dateTime) return true;
      
      const eventTime = new Date(booking.start.dateTime).getTime();
      const nowTime = currentTime.getTime();
      const buffer = 20 * 60 * 1000; // 20 minutes (changed from 10)
      
      // Keep if event start + 10 mins is still in the future relative to now
      return (eventTime + buffer) > nowTime;
  });

  const totalBookings = upcomingBookings.length;

  // NEW: Speak Next Hour Button Handler
  const handleSpeakNextHour = () => {
    notify("Generating audio announcement...", 'success');
    const nowTime = currentTime.getTime();
    
    // 1. Find the earliest future (or very recent) booking
    const sortedUpcoming = bookings
      .filter(b => b.start?.dateTime)
      .map(b => ({ ...b, time: new Date(b.start.dateTime).getTime() }))
      .filter(b => b.time > (nowTime - 60000)) // Only future or very recent
      .sort((a, b) => a.time - b.time);

    if (sortedUpcoming.length === 0) {
        playAnnouncement("There are no upcoming bookings scheduled.");
        return;
    }

    // 2. Group all bookings that start at that SAME earliest time
    const nextSlotTime = sortedUpcoming[0].time;
    const batch = sortedUpcoming.filter(b => Math.abs(b.time - nextSlotTime) < 60000); // within 1 min

    // 3. Calculate Minutes Away
    const minutesAway = Math.max(1, Math.round((nextSlotTime - nowTime) / 60000));
    const minWord = minutesAway === 1 ? "minute" : "minutes"; // New rule for minute/minutes

    // 4. Construct Text
    const reps = batch.map(b => getRepName(b.creator?.email || ""));
    const uniqueReps = [...new Set(reps)];
    const namesString = uniqueReps.join(', ');
    const count = batch.length;
    const opWord = count === 1 ? "op" : "ops";
    const verb = count === 1 ? "is" : "are";

    // RULE: Team, there {is/are} [total_upcoming_ops] op(s) in [minutes] minute(s). [rep name(s)], please prepare.
    const speechText = `Team, there ${verb} ${count} ${opWord} in ${minutesAway} ${minWord}. ${namesString}, please prepare.`;

    playAnnouncement(speechText);
  };

  if (loading) {
    return <LoadingScreen status={fetchStatus} error={errorState} onRetry={() => window.location.reload()} onCancel={onLogout} />;
  }

  return (
    <div className="app-container">
      {/* SPLIT VIEW WRAPPER */}
      <div className="main-split-view">
        
        {/* LEFT PANEL: BOOKINGS (Swapped) */}
        <div className="bookings-panel">
          <div className="bookings-header">
             <div>
                 <h2 className="bookings-title">Bookings</h2>
                 <div className="bookings-label" style={{ marginTop: '0.25rem' }}>UPCOMING</div>
             </div>
             
             {/* STATS + SPEECH BUTTON */}
             <div className="bookings-stats" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button 
                  onClick={handleSpeakNextHour} 
                  title="Speak next hour's schedule"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem' }}
                >
                    <Volume2Icon size={28} color="#ea580c" />
                </button>
                <div style={{ textAlign: 'right' }}>
                    <div className="bookings-count">{totalBookings}</div>
                    <div className="bookings-label">Total</div>
                </div>
             </div>
          </div>
          <div className="bookings-list">
             {upcomingBookings.length > 0 ? (
                upcomingBookings.map((booking, idx) => {
                  const startTime = new Date(booking.start.dateTime || booking.start.date);
                  const timeStr = startTime.toLocaleTimeString('en-AU', { 
                    timeZone: 'Australia/Brisbane', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

                  // EXTRACT SCHEDULER NAME
                  const schedulerName = getRepName(booking.creator?.email || booking.organizer?.email);

                  // CLEAN TITLE LOGIC
                  const rawParts = (booking.summary || "").split('-');
                  const cleanParts = rawParts.map(p => p.trim());
                  
                  // Filter out parts that look like phone numbers
                  const filteredParts = cleanParts.filter(part => {
                      // Remove if starts with 04, +61, or 61 (optionally with spaces)
                      return !/^(\+?61|04)/.test(part.replace(/\s/g, ''));
                  });

                  let displaySummary = booking.summary;
                  if (filteredParts.length > 0) {
                      displaySummary = filteredParts.join(' - ');
                  }

                  return (
                    <div key={idx} className="booking-card">
                       <div className="booking-meta">
                          <span className="booking-time"><CalendarIcon size={20} /> {timeStr}</span>
                          <span className="booking-status">Confirmed</span>
                       </div>
                       <div className="booking-summary">{displaySummary}</div>
                       
                       {/* SCHEDULED BY UPDATE */}
                       <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px dashed #444', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ 
                              background: '#262626', 
                              color: 'white', 
                              padding: '0.5rem 1.25rem', /* Bigger padding */
                              borderRadius: '2rem', 
                              fontWeight: '900', /* Bolder */
                              fontSize: '1.5rem', /* Bigger font for name */
                              border: '1px solid #404040'
                          }}>
                            {schedulerName}
                          </span>
                       </div>
                    </div>
                  );
                })
             ) : (
                <div style={{ textAlign: 'center', color: '#333', marginTop: '2rem' }}>
                    <CheckCircleIcon size={48} color="#262626" />
                    <p>No bookings yet today.</p>
                </div>
             )}
          </div>
        </div>

        {/* RIGHT PANEL: LEADERBOARD (Swapped) */}
        <div className="leaderboard-panel">
          {/* LEADERBOARD HEADER */}
          <div className="dashboard-header">
            <div>
              <h1 className="main-title">Sales Leaderboard</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                <span style={{ color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>COMBINED METRICS</span>
                <span style={{ color: '#737373' }}>INBOUND + OUTBOUND</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}><div className="pulse-green" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div>LIVE</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <button 
                  onClick={handleRefresh} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.5rem' }}
                  title="Global Refresh"
                 >
                    <RefreshCwIcon size={24} />
                 </button>
                 <div className="legend-box">
                    <div className="legend-item"><div className="legend-label">Dials (1 pt)</div><div className="legend-value"><div className="dot" style={{ background: '#facc15' }}></div> Dials</div></div>
                    <div style={{ width: '1px', background: '#262626' }}></div>
                    <div className="legend-item"><div className="legend-label">Talk Time (1 pt/min)</div><div className="legend-value"><div className="dot" style={{ background: '#ea580c' }}></div> Minutes</div></div>
                 </div>
              </div>
            </div>
          </div>

          {/* LEADERBOARD CONTENT */}
          <div className="dashboard-content">
            {errorState && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <WifiOffIcon size={20} color="#ef4444" />
                    <div>
                      <h3 style={{ margin: 0, color: '#ef4444', fontSize: '0.875rem' }}>Connection Interrupted</h3>
                      <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.75rem' }}>{errorState}</p>
                    </div>
                  </div>
                  <button onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem' }}>Fix Settings</button>
              </div>
            )}

            <div className="table-header" style={{ display: 'flex', gap: '2.7rem', padding: '0 1.8rem', marginBottom: '1rem', fontSize: '1.3rem', fontWeight: 'bold', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div style={{ width: '4.5rem', textAlign: 'center', flexShrink: 0 }}>Rank</div>
              <div style={{ width: '14.4rem', flexShrink: 0 }}>Agent</div>
              <div style={{ flex: 1, textAlign: 'center' }}>Performance Breakdown</div>
              <div style={{ width: '10.8rem', textAlign: 'right', flexShrink: 0 }}>Total</div>
            </div>

            <div>
              {agents.map((agent, index) => (
                <AgentRow key={agent.id} rank={index + 1} agent={agent} maxDials={maxDials} maxTalk={maxTalk} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SECTION */}
      <div className="footer">
        <div className="footer-left">
          <div className="footer-logo-box">
             <img src="https://i.imgur.com/QjjDjuU.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }} />
          </div>
          <div className="footer-text-group"><div className="footer-brand">Purge Digital</div><div className="footer-sub">Leaderboard - Today</div></div>
          {/* THEME TOGGLE BUTTON */}
          <button 
            onClick={toggleTheme}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', padding: '0.5rem', marginLeft: '0.5rem' 
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
             {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
        </div>
        <div className="footer-right">
          <button onClick={onLogout} className="btn-disconnect">
             <LogOutIcon size={16} />
          </button>
          <div>
              <div className="footer-time">{formattedDate}, {formattedTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [credentials, setCredentials] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'

  // Toast Handler
  const notify = (message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto remove after 5s
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // UPDATED: Accept elevenLabsApiKey
  const handleConnect = (id, token, apiKey, googleToken, elevenLabsApiKey) => { 
    setCredentials({ id, token, apiKey, googleToken, elevenLabsApiKey }); 
  };
  
  const handleDemo = () => {
    setCredentials({ id: 'demo', token: 'demo', apiKey: 'demo', googleToken: null, elevenLabsApiKey: null });
  }
  
  const handleLogout = () => { 
      setCredentials(null); 
  };

  return (
    <>
      <style>{styles}</style>
      
      {/* Apply Data Theme Attribute to Wrapper */}
      <div data-theme={theme} style={{ width: '100%', height: '100%' }}>
        <ToastNotification toasts={toasts} removeToast={removeToast} />

        {!credentials ? (
          <UnifiedLoginScreen onConnect={handleConnect} onDemo={handleDemo} notify={notify} />
        ) : (
          <Dashboard 
             apiId={credentials.id} 
             apiToken={credentials.token} 
             apiKey={credentials.apiKey}
             googleToken={credentials.googleToken}
             elevenLabsApiKey={credentials.elevenLabsApiKey}
             onLogout={handleLogout}
             notify={notify}
             toggleTheme={toggleTheme}
             theme={theme}
          />
        )}
      </div>
    </>
  );
}