import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { io } from 'socket.io-client';

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
  style: 0.49,          // 49%
  use_speaker_boost: true,
};
const ELEVENLABS_SPEED = 0.87; // 0.87
const BOOKINGS_CALENDAR_ID = 'meta.bookings@purgedigital.com.au';

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
const TrophyIcon = ({ size = 24, color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    {...props}
  >
    <path d="M7 2a1 1 0 0 0-1 1v2H3.5A1.5 1.5 0 0 0 2 6.5V8a5.5 5.5 0 0 0 5.5 5.5h.09A5.98 5.98 0 0 0 11 15.92V18H8a1 1 0 0 0 0 2h8a1 1 0 1 0 0-2h-3v-2.08a5.98 5.98 0 0 0 3.41-2.42h.09A5.5 5.5 0 0 0 22 8V6.5A1.5 1.5 0 0 0 20.5 5H18V3a1 1 0 0 0-1-1H7Zm-3 5h2v2.06A3.5 3.5 0 0 1 4 8V7Zm14 0h2v1a3.5 3.5 0 0 1-2 3.06V7Z" />
  </svg>
);
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
const ExternalLinkIcon = (props) => <IconBase {...props}><path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></IconBase>;
const PhoneIcon = (props) => <IconBase {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></IconBase>;

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

  .service-warnings-banner {
    position: fixed; top: 1rem; right: 1rem; z-index: 9998;
    display: flex; flex-direction: column; gap: 0.4rem;
    max-width: 340px;
  }
  .service-warning {
    display: flex; align-items: center; gap: 0.6rem;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    border-left: 4px solid #ef4444;
    color: var(--text-primary);
    padding: 0.6rem 0.8rem;
    border-radius: 0.4rem;
    font-size: 0.78rem;
    line-height: 1.3;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .service-warning .warning-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ef4444; flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .service-warning button {
    background: none; border: none; color: var(--text-primary);
    cursor: pointer; opacity: 0.5; margin-left: auto; flex-shrink: 0;
  }
  .service-warning button:hover { opacity: 1; }

  .sale-popup-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 15, 18, 0.38);
    backdrop-filter: saturate(115%) blur(2px);
    -webkit-backdrop-filter: saturate(115%) blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: salePopupOverlayFade 260ms ease-out;
  }

  @keyframes salePopupOverlayFade {
    from { background: rgba(15, 15, 18, 0); }
    to { background: rgba(15, 15, 18, 0.38); }
  }

  .sale-popup-ambient {
    position: absolute;
    width: 80%;
    max-width: 1600px;
    height: 800px;
    background: linear-gradient(to right, rgba(234, 88, 12, 0.2), rgba(245, 158, 11, 0.1), rgba(154, 52, 18, 0.2));
    filter: blur(100px);
    border-radius: 9999px;
    pointer-events: none;
  }

  .sale-popup-card {
    position: relative;
    font-family: var(--font-sans);
    font-weight: 900;
    width: 100%;
    max-width: 1280px;
    background: #1a1b1f;
    border: 1px solid #2d2e35;
    border-radius: 0.75rem;
    padding: 4rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    z-index: 10;
    overflow: hidden;
  }

  .sale-popup-card-glow {
    position: absolute;
    top: -100px;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 600px;
    background: rgba(249, 115, 22, 0.15);
    filter: blur(60px);
    border-radius: 9999px;
    pointer-events: none;
    z-index: 0;
  }

  .sale-popup-pulse {
    position: absolute;
    border-radius: 9999px;
    pointer-events: none;
    z-index: 0;
    animation: softPulse 3.5s ease-in-out infinite;
  }

  .sale-popup-pulse.one { top: 20%; right: 15%; width: 5rem; height: 5rem; background: #4c3a51; }
  .sale-popup-pulse.two { top: 50%; left: 10%; width: 3rem; height: 3rem; background: #2f855a; animation-duration: 4s; animation-delay: 1.5s; }
  .sale-popup-pulse.three { top: 10%; left: 25%; width: 4rem; height: 4rem; background: rgba(45, 55, 72, 0.5); }
  .sale-popup-pulse.four { bottom: 25%; right: 25%; width: 1.25rem; height: 1.25rem; background: #ec4899; animation-duration: 4s; animation-delay: 1.5s; }
  .sale-popup-pulse.five {
    position: static;
    width: 1.5rem;
    height: 1.5rem;
    background: rgba(96, 165, 250, 0.6);
    margin: 0 0.75rem;
    flex-shrink: 0;
    animation-duration: 4s;
    animation-delay: 0.8s;
  }

  @keyframes softPulse {
    0%, 100% { transform: scale(0.85); opacity: 0.4; }
    50% { transform: scale(1.15); opacity: 1; }
  }

  .sale-popup-confetti-canvas {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    border-radius: 0.75rem;
  }

  .sale-popup-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sale-popup-heading {
    margin: 0 0 4rem;
    font-size: 4rem;
    white-space: nowrap;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .sale-popup-heading-icon {
    font-size: 3.75rem;
  }

  .sale-popup-details {
    display: grid;
    gap: 2rem;
    text-align: center;
    font-size: 30px;
    margin-bottom: 5rem;
    width: 100%;
  }

  .sale-popup-content.simulation .sale-popup-heading {
    margin-bottom: 2.8rem;
  }

  .sale-popup-content.simulation .sale-popup-details {
    margin-bottom: 3.25rem;
  }

  .sale-popup-content.simulation .sale-popup-confetti-line {
    margin-top: -0.35rem;
    margin-bottom: -0.15rem;
  }

  .sale-popup-content.simulation .sale-popup-contact-line {
    gap: 0.45rem;
  }

  .sale-popup-text {
    margin: 0;
    color: #c5c5d1;
  }

  .sale-popup-text strong {
    color: #e1e1e8;
    font-weight: 900;
  }

  .sale-popup-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: auto;
    height: auto;
    border: none;
    border-radius: 0;
    background: transparent;
    color: #c5c5d1;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    z-index: 20;
    display: block;
    padding: 0;
  }

  .sale-popup-close:hover {
    background: transparent;
    color: #ffffff;
  }

  .sale-popup-button {
    width: 50%;
    padding: 1.5rem 1.5rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 900;
    color: #ffffff;
    font-size: 1.125rem;
    letter-spacing: 0.025em;
    background: #ea580c;
    transition: all 300ms ease-in-out;
    box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.39);
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }

  .sale-popup-button:hover {
    background: #f97316;
    box-shadow: 0 6px 20px rgba(234, 88, 12, 0.23);
  }

  .sale-popup-button:active {
    transform: scale(0.98);
    background: #c2410c;
  }

  .sale-popup-button-shine {
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: transform 700ms ease-in-out;
  }

  .sale-popup-button-shine.active {
    transform: translateX(100%);
  }

  @media (max-width: 640px) {
    .sale-popup-card {
      padding: 2rem 1.5rem;
      max-width: 100%;
    }

    .sale-popup-heading {
      font-size: 1.5rem;
      white-space: normal;
      text-align: center;
    }

    .sale-popup-heading-icon {
      font-size: 1.875rem;
    }

    .sale-popup-details {
      gap: 1rem;
      font-size: 15px;
      margin-bottom: 2.5rem;
    }

    .sale-popup-button {
      width: 100%;
      padding: 1.5rem 1.5rem;
      font-size: 1.125rem;
    }
  }

  .simulate-sale-button {
    border: 1px solid rgba(249, 115, 22, 0.6);
    background: rgba(249, 115, 22, 0.16);
    color: #fb923c;
    border-radius: 0.5rem;
    padding: 0.4rem 0.7rem;
    font-weight: 700;
    cursor: pointer;
  }


  .simulate-sale-button {
    transition: transform 220ms ease, box-shadow 280ms ease, background-color 280ms ease, border-color 280ms ease;
    box-shadow: 0 8px 16px -12px rgba(249, 115, 22, 0.7);
  }

  .simulate-sale-button:hover {
    transform: translateY(-2px) scale(1.02);
    border-color: rgba(249, 115, 22, 0.95);
    background: rgba(249, 115, 22, 0.26);
    box-shadow: 0 16px 26px -14px rgba(249, 115, 22, 0.85);
  }

  .simulate-sale-button:active {
    transform: translateY(0) scale(0.98);
  }

  .dashboard-header,
  .bookings-header,
  .footer {
    animation: fade-slide-up 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .table-header {
    animation: fade-slide-up 720ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .upcoming-summary-card {
    animation: upcoming-card-background-pulse 2s infinite, fade-slide-up 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .upcoming-summary-title {
    position: relative;
  }

  .booking-card {
    animation: fade-slide-up 480ms cubic-bezier(0.22, 1, 0.36, 1);
    transform-origin: center top;
  }

  .booking-card:nth-child(2) { animation-delay: 45ms; }
  .booking-card:nth-child(3) { animation-delay: 85ms; }
  .booking-card:nth-child(4) { animation-delay: 120ms; }
  .booking-card:nth-child(5) { animation-delay: 160ms; }

  .agent-row {
    animation: fade-slide-up 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .agent-row.lead-change {
    animation: winner-pulse 3s infinite ease-in-out, lead-change-glow 1100ms ease;
  }

  .summary-title-transition {
    display: inline-block;
    animation: summary-title-swap 420ms ease;
  }

  @keyframes fade-slide-up {
    from { opacity: 0; transform: translateY(14px) scale(0.992); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes summary-title-swap {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes lead-change-glow {
    0% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
    25% { box-shadow: 0 0 0 6px rgba(251, 146, 60, 0.38); }
    100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); }
  }

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
    gap: 1.5rem; max-width: 460px; width: 90%;
  }

  .loading-pulse { animation: pulse-orange 2s infinite; }

  @keyframes pulse-orange {
    0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(234, 88, 12, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
  }

  .loading-steps {
    width: 100%; display: flex; flex-direction: column; gap: 0;
    margin-top: 0.5rem;
  }
  .loading-step {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.7rem 1rem; border-radius: 0.5rem;
    transition: all 0.4s ease;
    opacity: 0; max-height: 0; overflow: hidden;
    margin: 0;
  }
  .loading-step.visible {
    opacity: 1; max-height: 60px; margin-bottom: 0.35rem;
  }
  .loading-step-icon {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.3s ease;
  }
  .loading-step.pending .loading-step-icon { background: #333; }
  .loading-step.active .loading-step-icon { background: rgba(234, 88, 12, 0.25); }
  .loading-step.done .loading-step-icon { background: rgba(34, 197, 94, 0.2); }
  .loading-step.failed .loading-step-icon { background: rgba(239, 68, 68, 0.2); }
  .loading-step.skipped .loading-step-icon { background: rgba(250, 204, 21, 0.15); }

  .loading-step-text {
    display: flex; flex-direction: column; align-items: flex-start; text-align: left;
  }
  .loading-step-label {
    font-size: 0.85rem; font-weight: 600; color: var(--text-primary);
    transition: color 0.3s ease;
  }
  .loading-step.done .loading-step-label { color: #22c55e; }
  .loading-step.failed .loading-step-label { color: #ef4444; }
  .loading-step.skipped .loading-step-label { color: #facc15; }
  .loading-step-detail {
    font-size: 0.72rem; color: var(--text-secondary);
    margin-top: 0.1rem; font-family: monospace;
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
    font-family: var(--font-sans); font-weight: 900; font-size: 3rem;
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

  .upcoming-summary-card {
    position: relative;
    isolation: isolate;
    overflow: visible;
    border-radius: 0.75rem;
    padding: 1.25rem;
    background: linear-gradient(145deg, rgba(53, 26, 12, 0.95) 0%, rgba(23, 23, 23, 0.95) 55%, rgba(12, 12, 12, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.45);
    animation: upcoming-card-background-pulse 2s infinite, fade-slide-up 600ms cubic-bezier(0.22, 1, 0.36, 1);
    height: auto;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  [data-theme='light'] .upcoming-summary-card {
    background: linear-gradient(145deg, #fff4e8 0%, #fff8f2 58%, #ffffff 100%);
    border-color: rgba(234, 88, 12, 0.35);
    box-shadow: 0 18px 30px -24px rgba(234, 88, 12, 0.35), 0 10px 16px -14px rgba(15, 23, 42, 0.2);
  }

  @keyframes upcoming-card-background-pulse {
    0% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.45); }
    70% { box-shadow: 0 0 0 14px rgba(234, 88, 12, 0); }
    100% { box-shadow: 0 0 0 0 rgba(234, 88, 12, 0); }
  }

  .upcoming-summary-content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.3rem;
  }

  .upcoming-summary-title {
    font-size: 1.65rem;
    color: var(--text-primary);
    font-weight: 800;
    margin: 0;
    line-height: 1.1;
    letter-spacing: 0.02em;
  }

  .upcoming-summary-reps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
  }

  .upcoming-summary-rep-pill {
    background: linear-gradient(135deg, rgba(65, 33, 17, 0.92), rgba(37, 37, 37, 0.88));
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    font-weight: 800;
    font-size: 1rem;
    border: 1px solid rgba(251, 146, 60, 0.35);
    line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 12px -10px rgba(0, 0, 0, 0.75);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  [data-theme='light'] .upcoming-summary-rep-pill {
    background: linear-gradient(135deg, #fff5ea, #fff);
    color: #9a3412;
    border-color: rgba(234, 88, 12, 0.35);
  }

  .upcoming-summary-rep-pill:hover {
    transform: translateY(-1px);
    border-color: var(--accent-orange);
  }

  .upcoming-summary-total {
    text-align: right;
    flex-shrink: 0;
  }

  .upcoming-summary-total-number {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--accent-orange);
    line-height: 1;
  }

  .upcoming-summary-total-label {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
    font-weight: 800;
  }

  .booking-card {
    position: relative;
    isolation: isolate;
    overflow: visible;
    border-radius: 0.75rem;
    padding: 1.25rem;
    background: linear-gradient(145deg, rgba(53, 26, 12, 0.95) 0%, rgba(23, 23, 23, 0.95) 55%, rgba(12, 12, 12, 0.96) 100%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    height: auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.75rem;
    box-shadow: 0 20px 40px -28px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .booking-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(130deg, rgba(12, 12, 12, 0.22) 0%, rgba(12, 12, 12, 0.08) 45%, rgba(12, 12, 12, 0) 100%);
    pointer-events: none;
    opacity: 0.55;
    z-index: 0;
  }

  .booking-card > * {
    position: relative;
    z-index: 1;
  }

  [data-theme='light'] .booking-card {
    background: linear-gradient(145deg, rgba(255, 250, 245, 0.84) 0%, rgba(255, 255, 255, 0.88) 65%, rgba(255, 255, 255, 0.92) 100%);
    border-color: rgba(148, 163, 184, 0.35);
    box-shadow: 0 18px 32px -24px rgba(15, 23, 42, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  }

  .booking-card:hover {
    transform: translateY(-2px);
    border-color: rgba(251, 146, 60, 0.45);
    box-shadow: 0 22px 36px -22px rgba(234, 88, 12, 0.34), 0 8px 20px -16px rgba(15, 23, 42, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  }

  /* DIAL ICON TOOLTIP */
  .dial-icon-wrapper { position: relative; }
  .dial-tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.92);
    color: #e5e5e5;
    font-size: 0.72rem;
    line-height: 1.5;
    padding: 0.65rem 1rem;
    border-radius: 0.4rem;
    min-width: 200px;
    max-width: 300px;
    width: max-content;
    white-space: normal;
    word-wrap: break-word;
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }
  .dial-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.92);
  }
  .dial-icon-wrapper:hover .dial-tooltip { display: block; }

  .booking-meta {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; 
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
    margin: 0.15rem 0 0.45rem 0;
  }

  .booking-rep-row {
    margin-top: 0.1rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
    z-index: 1;
  }

  .booking-rep-chip {
    background: linear-gradient(135deg, rgba(65, 33, 17, 0.92), rgba(37, 37, 37, 0.88));
    color: #fff;
    padding: 0.5rem 1.25rem;
    border-radius: 2rem;
    font-weight: 900;
    font-size: 1.5rem;
    border: 1px solid rgba(251, 146, 60, 0.35);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 12px -10px rgba(0, 0, 0, 0.75);
    line-height: 1;
  }

  .icon-action-button,
  .booking-open-event-button {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(251, 146, 60, 0.45);
    background: linear-gradient(135deg, rgba(72, 33, 17, 0.9), rgba(35, 35, 35, 0.9));
    color: #fb923c;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 10px 16px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .booking-open-event-button { margin-left: auto; }

  .icon-action-button svg,
  .booking-open-event-button svg {
    width: 1.2rem;
    height: 1.2rem;
    display: block;
    stroke: currentColor;
    flex-shrink: 0;
  }

  .icon-action-button:hover,
  .booking-open-event-button:hover {
    transform: translateY(-1px);
    border-color: rgba(251, 146, 60, 0.85);
    color: #fdba74;
    box-shadow: 0 14px 24px -14px rgba(234, 88, 12, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  [data-theme='light'] .icon-action-button,
  [data-theme='light'] .booking-open-event-button {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 244, 234, 0.88));
    border-color: rgba(234, 88, 12, 0.35);
    color: #ea580c;
    box-shadow: 0 10px 16px -14px rgba(15, 23, 42, 0.35), inset 0 1px 0 rgba(255, 255, 255, 1);
  }

  [data-theme='light'] .booking-rep-chip {
    color: #9a3412;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 244, 234, 0.82));
    border-color: rgba(251, 146, 60, 0.35);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 10px 20px -16px rgba(15, 23, 42, 0.3);
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

  .agent-info { width: 14.4rem; flex-shrink: 0; overflow: visible; display: flex; flex-direction: column; gap: 0.35rem; padding-left: 0.4rem; margin-left: -0.4rem; }
  .agent-name {
    font-size: 2rem; font-weight: 900;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    color: var(--text-primary);
    text-transform: uppercase;
  }

  .agent-name-editable {
    cursor: text;
    border-radius: 0.3rem;
    padding: 0.1rem 0.45rem;
    margin: -0.1rem -0.45rem;
    border: 1.5px solid transparent;
    transition: border-color 0.15s ease;
  }
  .agent-name-editable.agent-name-hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  input.agent-name-input {
    font-size: 2rem; font-weight: 900;
    text-transform: uppercase;
    color: var(--text-primary);
    background: transparent;
    border: 1.5px solid #f97316;
    border-radius: 0.3rem;
    padding: 0.1rem 0.45rem;
    margin: -0.1rem -0.45rem;
    outline: none;
    width: 100%;
    font-family: inherit;
    line-height: inherit;
    box-sizing: content-box;
  }

  .agent-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .status-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-dot.available {
    background: #22c55e;
    animation: pulse-status-green 1.8s infinite;
  }

  .status-dot.in-call {
    background: #f97316;
    animation: pulse-status-orange 1.8s infinite;
  }

  .status-dot.unavailable {
    background: #ef4444;
    animation: pulse-status-red 1.8s infinite;
  }

  .agent-status.available { color: #22c55e; }
  .agent-status.in-call { color: #f97316; }
  .agent-status.unavailable { color: #ef4444; }

  @keyframes pulse-status-green {
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.65); }
    70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  @keyframes pulse-status-orange {
    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.65); }
    70% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }

  @keyframes pulse-status-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.65); }
    70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
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
    border: none;
    padding: 0;
  }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .main-split-view { 
      flex-direction: column; 
      height: 100%; /* Ensure container fill */
    }
    
    /* MOBILE BOOKINGS - GIVE CARDS MORE ROOM */
    .bookings-panel { 
      flex: 0 0 56%;
      height: 56%;
      min-height: 0; 
      width: 100%;
      border-right: none; 
      border-bottom: 1px solid var(--border-color); 
      overflow: hidden; /* Constrain panel */
    }

    /* MOBILE LEADERBOARD - REMAINING SPACE */
    .leaderboard-panel { 
      flex: 1; /* Takes remaining space */
      height: 44%;
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
       padding: 1.25rem;
    }

    .dashboard-content {
      padding: 1rem;
    }

    /* FONT ADJUSTMENTS FOR MOBILE */
    .main-title, .bookings-title { font-size: 1.75rem; }
    .booking-summary { font-size: 1.4rem; }
    .booking-time { font-size: 1.4rem; }
    .booking-rep-chip { font-size: 1.25rem; }
    
    /* HIDE LEGEND ON MOBILE IF TOO CRAMPED */
    .legend-box { display: none; }
    .table-header { display: none; } /* Hide heavy table headers */
    
    /* ADJUST CARDS */
    .agent-row {
      gap: 1rem; 
      padding: 0.75rem;
    }
    .rank-badge { width: 3rem; height: 3rem; font-size: 1.25rem; }
    .agent-info { width: 8rem; gap: 0.2rem; }
    .agent-name { font-size: 1.2rem; }
    input.agent-name-input { font-size: 1.2rem; }

    .status-dot { width: 10px; height: 10px; }
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
  const dayOfWeek = now.getDay(); // 0=Sun ... 5=Fri
  const startOfDay = new Date(now).setHours(8, 0, 0, 0); 
  const lunchStart = new Date(now).setHours(12, 0, 0, 0); 
  const lunchEnd = new Date(now).setHours(13, 0, 0, 0); 
  const endTime = new Date(now).setHours(17, 0, 0, 0);   
  const currentTime = now.getTime();

  const isMondayToThursday = dayOfWeek >= 1 && dayOfWeek <= 4;
  const isFriday = dayOfWeek === 5;

  const fullDayDialsTarget = isMondayToThursday ? 200 : (isFriday ? 150 : 0);
  const fullDayTalkMinutesTarget = isMondayToThursday ? 300 : (isFriday ? 250 : 0);

  const morningActiveDuration = lunchStart - startOfDay;
  const afternoonActiveDuration = endTime - lunchEnd;
  const totalActiveDuration = morningActiveDuration + afternoonActiveDuration;
  const middayProgress = totalActiveDuration > 0 ? morningActiveDuration / totalActiveDuration : 0;

  const middayDialsTarget = Math.floor(fullDayDialsTarget * middayProgress);
  const middayTalkMinutesTarget = Math.floor(fullDayTalkMinutesTarget * middayProgress);

  let targetDials = 0;
  let targetTalkMinutes = 0;

  if (currentTime < startOfDay) {
    targetDials = 0;
    targetTalkMinutes = 0;
  } else if (currentTime <= lunchStart) {
    const totalDuration = lunchStart - startOfDay;
    const elapsed = currentTime - startOfDay;
    const progress = elapsed / totalDuration;
    targetDials = Math.floor(progress * middayDialsTarget);
    targetTalkMinutes = Math.floor(progress * middayTalkMinutesTarget);
  } else if (currentTime <= lunchEnd) {
    targetDials = middayDialsTarget;
    targetTalkMinutes = middayTalkMinutesTarget;
  } else if (currentTime <= endTime) {
    const totalDuration = endTime - lunchEnd;
    const elapsed = currentTime - lunchEnd;
    const progress = elapsed / totalDuration;
    targetDials = middayDialsTarget + Math.floor(progress * (fullDayDialsTarget - middayDialsTarget));
    targetTalkMinutes = middayTalkMinutesTarget + Math.floor(progress * (fullDayTalkMinutesTarget - middayTalkMinutesTarget));
  } else {
    targetDials = fullDayDialsTarget;
    targetTalkMinutes = fullDayTalkMinutesTarget;
  }
  const targetTalkSeconds = targetTalkMinutes * 60;
  return { id: 'target-pace', name: 'TARGET PACE', dials: targetDials, talkTime: targetTalkSeconds, isTarget: true };
};


const AGENT_STATUS_META = {
  available: { label: 'Available', className: 'available' },
  in_call: { label: 'In call', className: 'in-call' },
  unavailable: { label: 'Unavailable', className: 'unavailable' },
};

const normalizeAircallStatus = (rawStatus) => {
  if (!rawStatus) return 'unavailable';
  const value = String(rawStatus).toLowerCase();
  if (
    value.includes('in_call') ||
    value.includes('incall') ||
    value.includes('on_call') ||
    value.includes('busy') ||
    value.includes('dial') ||
    value.includes('ring')
  ) return 'in_call';
  if (value.includes('available') && !value.includes('unavailable')) return 'available';
  return 'unavailable';
};

const isActiveCall = (call) => {
  if (!call || typeof call !== 'object') return false;
  if (call.ended_at) return false;

  const lower = (value) => String(value || '').toLowerCase();
  const callStatus = lower(call.status);
  const callState = lower(call.state);

  const activeFlags = ['answered', 'active', 'ongoing', 'connected', 'in_call', 'talking', 'dial', 'ring'];
  if (activeFlags.some((flag) => callStatus.includes(flag) || callState.includes(flag))) {
    return true;
  }

  const startedAt = Number(call.started_at || 0);
  if (startedAt > 0 && !call.ended_at) return true;

  return false;
};


const resolveAgentStatus = (agent, statusMap) => {
  if (agent.isTarget) return null;
  const idKey = String(agent.id || '').toLowerCase();
  const nameKey = String(agent.name || '').toLowerCase();
  const status = statusMap[idKey] || statusMap[nameKey] || 'unavailable';
  return AGENT_STATUS_META[status] || AGENT_STATUS_META.unavailable;
};


const useFlipListAnimation = (items) => {
  const containerRef = useRef(null);
  const previousRectsRef = useRef(new Map());
  const canAnimateRef = useRef(typeof Element !== 'undefined' && typeof Element.prototype?.animate === 'function');

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !canAnimateRef.current) return;

    const nodes = Array.from(container.querySelectorAll('[data-flip-key]'));
    const currentRects = new Map();

    nodes.forEach((node) => {
      const key = node.getAttribute('data-flip-key');
      if (!key) return;
      const rect = node.getBoundingClientRect();
      currentRects.set(key, rect);
      const previousRect = previousRectsRef.current.get(key);

      if (previousRect) {
        const deltaX = previousRect.left - rect.left;
        const deltaY = previousRect.top - rect.top;

        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          node.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: 'translate(0, 0)' },
            ],
            {
              duration: 650,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }
          );
        }
      }
    });

    previousRectsRef.current = currentRects;
  }, [items]);

  return containerRef;
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
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [stripeCLIStatus, setStripeCLIStatus] = useState('checking'); // 'checking' | 'active' | 'inactive'
  const tokenClient = useRef(null);
  const credentialsRef = useRef({ token: '', key: '', elKey: '', stripeKey: '', anthropicKey: '' });

  // Poll server health + Stripe CLI status
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const resp = await fetch('http://localhost:8787/health', { signal: AbortSignal.timeout(3000) });
        if (cancelled) return;
        if (resp.ok) {
          setServerStatus('online');
          const data = await resp.json();
          // If a webhook was received in the last 5 minutes, CLI is active
          if (data.lastWebhookReceivedAt && (Date.now() - data.lastWebhookReceivedAt) < 300000) {
            setStripeCLIStatus('active');
          } else {
            setStripeCLIStatus('inactive');
          }
        } else {
          setServerStatus('offline');
          setStripeCLIStatus('inactive');
        }
      } catch {
        if (!cancelled) {
          setServerStatus('offline');
          setStripeCLIStatus('inactive');
        }
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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
        scope: 'https://www.googleapis.com/auth/calendar.events',
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
            credentialsRef.current.elKey,
            credentialsRef.current.stripeKey,
            credentialsRef.current.anthropicKey
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

    // Validate we have at least 5 lines
    if (lines.length < 5) {
      const msg = "Please paste credentials:\nLine 1: Aircall API Token\nLine 2: Google API Key\nLine 3: ElevenLabs API Key\nLine 4: Stripe Live Secret Key\nLine 5: Anthropic API Key";
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
    credentialsRef.current = { token: lines[0], key: lines[1], elKey: lines[2], stripeKey: lines[3], anthropicKey: lines[4] };

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
        <p className="text-center" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Authenticate to Begin</p>

        {/* Service Status Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
            backgroundColor: serverStatus === 'online' ? 'rgba(34, 197, 94, 0.08)' : serverStatus === 'offline' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(161, 161, 170, 0.08)',
            border: `1px solid ${serverStatus === 'online' ? 'rgba(34, 197, 94, 0.2)' : serverStatus === 'offline' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(161, 161, 170, 0.2)'}`,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              backgroundColor: serverStatus === 'online' ? '#22c55e' : serverStatus === 'offline' ? '#ef4444' : '#a1a1aa',
              boxShadow: serverStatus === 'online' ? '0 0 6px rgba(34, 197, 94, 0.5)' : serverStatus === 'offline' ? '0 0 6px rgba(239, 68, 68, 0.5)' : 'none',
            }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Express Server</span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: serverStatus === 'online' ? '#22c55e' : serverStatus === 'offline' ? '#ef4444' : 'var(--text-secondary)',
            }}>
              {serverStatus === 'checking' ? 'Checking...' : serverStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.625rem 0.875rem', borderRadius: '0.5rem',
            backgroundColor: stripeCLIStatus === 'active' ? 'rgba(34, 197, 94, 0.08)' : stripeCLIStatus === 'inactive' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(161, 161, 170, 0.08)',
            border: `1px solid ${stripeCLIStatus === 'active' ? 'rgba(34, 197, 94, 0.2)' : stripeCLIStatus === 'inactive' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(161, 161, 170, 0.2)'}`,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              backgroundColor: stripeCLIStatus === 'active' ? '#22c55e' : stripeCLIStatus === 'inactive' ? '#ef4444' : '#a1a1aa',
              boxShadow: stripeCLIStatus === 'active' ? '0 0 6px rgba(34, 197, 94, 0.5)' : stripeCLIStatus === 'inactive' ? '0 0 6px rgba(239, 68, 68, 0.5)' : 'none',
            }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Stripe CLI</span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: stripeCLIStatus === 'active' ? '#22c55e' : stripeCLIStatus === 'inactive' ? '#ef4444' : 'var(--text-secondary)',
            }}>
              {stripeCLIStatus === 'checking' ? 'Checking...' : stripeCLIStatus === 'active' ? 'Active' : 'No Events'}
            </span>
          </div>
        </div>

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
              placeholder={`Aircall API Token\nGoogle API Key\nElevenLabs API Key\nStripe Live Secret Key\nAnthropic API Key`}
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

const AgentRow = ({ rank, agent, maxDials, maxTalk, statusMap, hasLeadChange, nickname, onSaveNickname }) => {
  const isTarget = agent.isTarget;
  const isWinner = rank === 1 && !isTarget;
  let rowClass = 'agent-row';
  if (isWinner) rowClass += ' winner';
  if (hasLeadChange && isWinner) rowClass += ' lead-change';
  if (isTarget) rowClass += ' target';

  const dialScore = agent.dials;
  const talkScore = Math.floor(agent.talkTime / 60);
  const totalScore = dialScore + talkScore;
  const maxScore = calculateScore(maxDials, maxTalk);
  const scorePercent = maxScore > 0 ? (Math.sqrt(totalScore) / Math.sqrt(maxScore)) * 100 : 0;
  const dialShare = totalScore > 0 ? (dialScore / totalScore) * 100 : 0;
  const talkShare = totalScore > 0 ? (talkScore / totalScore) * 100 : 0;
  const defaultName = agent.name.split(' ')[0];
  const displayName = nickname || defaultName;
  const statusMeta = resolveAgentStatus(agent, statusMap);

  // Inline editable name state
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const inputRef = useRef(null);
  const committedRef = useRef(false);

  useEffect(() => { setEditValue(displayName); }, [displayName]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); committedRef.current = false; } }, [editing]);

  const commitEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = editValue.trim();
    setEditing(false);
    setHovered(false);
    if (!isTarget && trimmed) {
      onSaveNickname(agent.id, trimmed);
    } else {
      setEditValue(displayName);
    }
  };

  const cancelEdit = () => {
    committedRef.current = true;
    setEditing(false);
    setEditValue(displayName);
  };

  return (
    <div className={rowClass} data-flip-key={String(agent.id)}>
      <div className="rank-badge">
        {isWinner ? <TrophyIcon size={30} fill="currentColor" /> : (isTarget ? <ZapIcon size={20} fill="currentColor" /> : rank)}
      </div>
      <div className="agent-info">
        {isTarget ? (
          <div className="agent-name">{displayName}</div>
        ) : editing ? (
          <input
            ref={inputRef}
            className="agent-name agent-name-input"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
            onBlur={commitEdit}
            maxLength={24}
          />
        ) : (
          <div
            className={`agent-name agent-name-editable${hovered ? ' agent-name-hover' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => { setEditing(true); setEditValue(displayName); }}
          >
            {displayName}
          </div>
        )}
        {isTarget && <span style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#16a34a' }}>Goal</span>}
        {!isTarget && statusMeta && (
          <div className={`agent-status ${statusMeta.className}`}>
            <span className={`status-dot ${statusMeta.className}`}></span>
            <span>{statusMeta.label}</span>
          </div>
        )}
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
const LOADING_STEP_ICONS = {
  pending: (sz) => <div style={{ width: sz, height: sz, borderRadius: '50%', border: '2px solid #555' }} />,
  active: (sz) => <LoaderIcon size={sz} color="#ea580c" />,
  done: (sz) => <CheckCircleIcon size={sz} color="#22c55e" />,
  failed: (sz) => <AlertCircleIcon size={sz} color="#ef4444" />,
  skipped: (sz) => <AlertCircleIcon size={sz} color="#facc15" />,
};

const LoadingScreen = ({ steps, onRetry, onCancel }) => {
  const hasError = steps.some((s) => s.status === 'failed');
  const activeStep = steps.find((s) => s.status === 'active');
  const allDone = steps.every((s) => s.status === 'done' || s.status === 'skipped');
  const heading = hasError ? 'Connection Issue' : allDone ? 'Finalizing...' : (activeStep?.heading || 'Loading Data');
  const subtitle = hasError ? 'Some services could not connect.' : allDone ? 'Preparing dashboard...' : (activeStep?.detail || 'Establishing connections...');

  return (
    <div className="loading-overlay">
      <div className="loading-card loading-pulse" style={hasError ? { animation: 'none', borderColor: '#ef4444' } : {}}>
        <div className="icon-box" style={{ marginBottom: '0.5rem', background: 'transparent', boxShadow: 'none' }}>
          {hasError ? <AlertCircleIcon size={56} color="#ef4444" /> : <LoaderIcon className="animate-spin" size={56} color="#ea580c" />}
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
          {heading}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {subtitle}
        </p>

        <div className="loading-steps">
          {steps.map((step) => (
            <div key={step.id} className={`loading-step ${step.status} visible`}>
              <div className="loading-step-icon">
                {LOADING_STEP_ICONS[step.status]?.(16) || LOADING_STEP_ICONS.pending(16)}
              </div>
              <div className="loading-step-text">
                <span className="loading-step-label">{step.label}</span>
                {step.detail && <span className="loading-step-detail">{step.detail}</span>}
              </div>
            </div>
          ))}
        </div>

        {hasError && (
          <button onClick={onRetry} className="btn-primary" style={{ marginTop: '0.5rem' }}>
            <RefreshCwIcon size={16} /> Retry Connection
          </button>
        )}

        <button
          onClick={onCancel}
          style={{
            marginTop: '1rem', background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
        >
          <XCircleIcon size={16} /> Cancel
        </button>
      </div>
    </div>
  );
};

// SCREEN 3: DASHBOARD (Data Loading -> Display)
const Dashboard = ({ apiId, apiToken, googleToken, apiKey, elevenLabsApiKey, onLogout, notify, toggleTheme, theme, onSimulateSale }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Added refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const manualRefresh = useRef(false);

  // Step-by-step loading status for each service
  const [loadingSteps, setLoadingSteps] = useState([
    { id: 'aircall', label: 'AirCall Sync', heading: 'Syncing AirCall', detail: 'Fetching agents & call data...', status: 'pending' },
    { id: 'calendar', label: 'Google Calendar', heading: 'Loading Calendar', detail: 'Fetching today\'s bookings...', status: 'pending' },
  ]);

  const updateStep = (id, updates) => {
    setLoadingSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  // New Booking State
  const [bookings, setBookings] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [serviceWarnings, setServiceWarnings] = useState([]);

  // Agent Nicknames
  const [agentNicknames, setAgentNicknames] = useState({});
  useEffect(() => {
    fetch('http://localhost:8787/api/agent-nicknames')
      .then(r => r.ok ? r.json() : {})
      .then(data => setAgentNicknames(data))
      .catch(() => {});
  }, []);

  const saveAgentNickname = (agentId, newName) => {
    // Update state immediately so UI reflects the change
    setAgentNicknames(prev => ({ ...prev, [String(agentId)]: newName }));
    // Persist to server in background
    fetch(`http://localhost:8787/api/agent-nicknames/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch(() => {});
  };

  // ElevenLabs State
  const announcedEventIds = useRef(new Set());

  const callsCache = useRef(new Map());
  // Map<bookingId, Array<{ callId, active, summary }>>
  // summary: null = not fetched yet, 'loading' = in progress, string = result
  const dialedBookingsRef = useRef(new Map());
  const transcriptCacheRef = useRef(new Map()); // Map<callId, summary string>
  const syncInFlight = useRef(false);
  const latestSyncRequestId = useRef(0);
  const latestAppliedSyncId = useRef(0);

  const latestCallTimestampSeen = useRef(0);
  const previousLeaderRef = useRef(null);
  const [leaderChangedAt, setLeaderChangedAt] = useState(0);


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
      id: name,
      name: name,
      dials: Math.floor(Math.random() * 80) + 20,
      talkTime: Math.floor(Math.random() * 8000) + 1200,
      isTarget: false,
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

  // --- HELPER: EXTRACT PHONE NUMBER FROM BOOKING TITLE ---
  const extractPhoneFromBooking = (summary) => {
    if (!summary) return null;
    const parts = summary.split('-').map(p => p.trim());
    for (const part of parts) {
      const digits = part.replace(/[\s\-()]/g, '');
      // Match Australian mobile: 04xx, +614xx, 614xx
      if (/^(\+?61|0)4\d{8}$/.test(digits)) return digits;
      // Also match if it's just digits that look like a phone number (8+ digits)
      if (/^\+?\d{8,}$/.test(digits)) return digits;
    }
    return null;
  };

  // --- CONVERT TO E.164 FORMAT (AirCall requires +countrycode + number) ---
  const toE164 = (phone) => {
    if (!phone) return '';
    let d = phone.replace(/[\s\-()]/g, '');
    // Already E.164
    if (d.startsWith('+')) return d;
    // Australian local: 04xx -> +614xx
    if (d.startsWith('0')) return '+61' + d.slice(1);
    // Already has country code but no +
    if (d.startsWith('61')) return '+' + d;
    // Fallback: prepend +
    return '+' + d;
  };

  // --- FETCH TRANSCRIPT FROM AIRCALL + SUMMARIZE VIA SERVER ---
  const fetchTranscriptSummary = async (callId, aircallHeaders) => {
    // Check cache first
    if (transcriptCacheRef.current.has(callId)) {
      return transcriptCacheRef.current.get(callId);
    }

    try {
      // Fetch individual call detail from AirCall for transcript
      const callRes = await fetch(`https://api.aircall.io/v1/calls/${callId}`, { headers: aircallHeaders });
      if (!callRes.ok) return null;
      const callData = await callRes.json();
      const call = callData.call;

      // Call still active
      if (!call.ended_at) {
        return '__active__';
      }

      // Check for transcript in comments/tags or use recording transcript
      // AirCall stores transcripts in the call's `transcription` or via insight cards
      const transcript = call.transcription?.text || call.transcription || null;

      if (!transcript) {
        const summary = 'No transcript recorded';
        transcriptCacheRef.current.set(callId, summary);
        return summary;
      }

      // Send to server for Haiku summarization
      const sumRes = await fetch('http://localhost:8787/api/summarize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: typeof transcript === 'string' ? transcript : JSON.stringify(transcript) }),
      });

      if (sumRes.ok) {
        const { summary } = await sumRes.json();
        transcriptCacheRef.current.set(callId, summary);
        return summary;
      }
    } catch {
      // Silently fail
    }
    return null;
  };

  // --- DIAL CHECK: Every 30s, match calls from cache to booking phone numbers ---
  // Zero API calls — uses callsCache populated by syncCalls.
  useEffect(() => {
    if (!bookings.length || apiId === 'demo') return;

    const aircallHeaders = { 'Authorization': 'Basic ' + btoa(`${apiId}:${apiToken}`), 'Content-Type': 'application/json' };

    const getCallOutcome = (call) => {
      if (!call.ended_at) return 'in_progress';
      if (call.answered_at && Number(call.answered_at) > 0) return 'answered';
      if (call.voicemail) return 'voicemail';
      return 'no_answer';
    };

    const outcomeLabel = (outcome) => {
      if (outcome === 'in_progress') return 'Call in progress';
      if (outcome === 'answered') return 'Answered';
      if (outcome === 'voicemail') return 'Went to voicemail';
      return 'No answer';
    };

    const phoneDigits = (phone) => (phone || '').replace(/[^\d]/g, '');

    const checkDials = () => {
      const nowTime = Date.now();
      const dialData = new Map(dialedBookingsRef.current);

      for (const booking of bookings) {
        if (!booking.start?.dateTime) continue;
        const eventTime = new Date(booking.start.dateTime).getTime();
        if (nowTime < eventTime) continue;

        const rawPhone = extractPhoneFromBooking(booking.summary);
        if (!rawPhone) continue;
        const normalizedDigits = phoneDigits(toE164(rawPhone));

        const callMap = new Map();
        const fromTs = Math.floor(eventTime / 1000);

        // Match calls from cache only — no API calls
        callsCache.current.forEach((call) => {
          if (call.direction !== 'outbound') return;
          const callPhone = phoneDigits(call.raw_digits || call.number?.digits || '');
          if (!callPhone || !normalizedDigits) return;
          if (!callPhone.endsWith(normalizedDigits.slice(-9)) && !normalizedDigits.endsWith(callPhone.slice(-9))) return;
          const callTime = Number(call.started_at || call.created_at || 0);
          if (callTime >= fromTs) {
            callMap.set(call.id, call);
          }
        });

        const callEntries = Array.from(callMap.values())
          .sort((a, b) => (Number(a.started_at || a.created_at || 0)) - (Number(b.started_at || b.created_at || 0)))
          .map(c => {
            const outcome = getCallOutcome(c);
            return {
              callId: c.id,
              active: outcome === 'in_progress',
              outcome,
              outcomeLabel: outcomeLabel(outcome),
              summary: transcriptCacheRef.current.get(c.id) || null,
            };
          });

        dialData.set(booking.id, callEntries);

        for (const entry of callEntries) {
          if (!entry.active && !entry.summary) {
            fetchTranscriptSummary(entry.callId, aircallHeaders).then(summary => {
              if (summary) {
                entry.summary = summary;
                transcriptCacheRef.current.set(entry.callId, summary);
              }
            });
          }
        }
      }

      dialedBookingsRef.current = dialData;
    };

    checkDials();
    const interval = setInterval(checkDials, 30000);
    return () => clearInterval(interval);
  }, [bookings, apiId, apiToken]);

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

  const getUniqueRepNames = (bookingsBatch) => {
    const names = bookingsBatch
      .map((b) => getRepName(b.creator?.email || b.organizer?.email || ""))
      .filter(Boolean);

    return [...new Set(names)];
  };


  // LOAD GAPI (Authorization Client)
  useEffect(() => {
    if(apiId === 'demo') return;

    updateStep('calendar', { status: 'active', detail: 'Loading Google API...' });

    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => gapi.load('client', initGapiClient);
      script.onerror = () => {
        updateStep('calendar', { status: 'failed', detail: 'Could not load Google API script' });
        checkAllStepsDone();
      };
      document.body.appendChild(script);
    };

    const initGapiClient = async () => {
      try {
        await gapi.client.init({
          apiKey: apiKey,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        updateStep('calendar', { status: 'active', detail: 'Authenticating...' });
        // GAPI is ready, and we have token from Login screen, so set it
        if (googleToken) {
            gapi.client.setToken({ access_token: googleToken });
            await listUpcomingEvents();
        } else {
            updateStep('calendar', { status: 'failed', detail: 'No Google token available' });
            checkAllStepsDone();
        }
      } catch (err) {
        console.error('GAPI init error:', err);
        updateStep('calendar', { status: 'failed', detail: 'Google API init failed' });
        checkAllStepsDone();
      }
    };

    loadGapi();
  }, [apiKey, googleToken, refreshTrigger]); // Added refreshTrigger to reload calendar

  // Check if all steps are resolved → clear loading
  const checkAllStepsDone = () => {
    setLoadingSteps((prev) => {
      const allResolved = prev.every((s) => s.status === 'done' || s.status === 'failed' || s.status === 'skipped');
      if (allResolved) setLoading(false);
      return prev;
    });
  };

  // FETCH EVENTS (Authenticated)
  const listUpcomingEvents = async () => {
     updateStep('calendar', { status: 'active', detail: 'Fetching today\'s bookings...' });

     const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
     const start = new Date(now);
     start.setHours(0, 0, 0, 0);
     const end = new Date(now);
     end.setHours(23, 59, 59, 999);

     try {
       const request = {
         'calendarId': BOOKINGS_CALENDAR_ID,
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
         event.summary && event.summary.toLowerCase().includes('op')
       );

       setBookings(filteredEvents);
       updateStep('calendar', { status: 'done', detail: `${filteredEvents.length} bookings loaded` });
       checkAllStepsDone();
     } catch (err) {
       console.error("Error fetching events", err);
       updateStep('calendar', { status: 'failed', detail: 'Failed to fetch calendar events' });
       notify("Failed to fetch Google Calendar events.", 'error');
       checkAllStepsDone();
     }
  };

  // --- TRIGGER LOGIC FOR ELEVENLABS (AUTOMATIC) ---
  useEffect(() => {
    // If no bookings, announce once and return
    if (bookings.length === 0) {
      if (!loading && elevenLabsApiKey && !announcedEventIds.current.has('no-bookings-today')) {
        announcedEventIds.current.add('no-bookings-today');
        playAnnouncement("There are no upcoming bookings scheduled.");
      }
      return;
    }

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
          const uniqueReps = getUniqueRepNames(preStartEvents);
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
                 const uniqueReps = getUniqueRepNames(post5Events);
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
                 const uniqueReps = getUniqueRepNames(post15Events);
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
    let demoTimeout;
    let demoInterval;

    if (isDemo) {
      demoTimeout = setTimeout(() => {
        const runDemo = () => {
          const mocks = generateMockData();
          const activeMocks = mocks.filter(agent => agent.dials > 0 || agent.talkTime > 0);
          const target = calculateTargetPace();
          const combined = [...activeMocks, target].sort((a,b) => calculateScore(b.dials, b.talkTime) - calculateScore(a.dials, a.talkTime));
          const choices = ['available', 'in_call', 'unavailable'];
          const demoStatuses = {};
          activeMocks.forEach((agent) => {
            const value = choices[Math.floor(Math.random() * choices.length)];
            demoStatuses[String(agent.id).toLowerCase()] = value;
            demoStatuses[String(agent.name).toLowerCase()] = value;
          });
          setAgentStatuses(demoStatuses);
          setAgents(combined);
          setBookings(generateMockBookings());
          setLoading(false); 
        };
        runDemo();
        demoInterval = setInterval(runDemo, 5000);
      }, 2000);
      return () => {
        if (demoTimeout) {
          clearTimeout(demoTimeout);
        }
        if (demoInterval) {
          clearInterval(demoInterval);
        }
      };
    } 

    // -----------------------------------------------------------------------
    // AIRCALL: Reads from server-side cache (server handles all Aircall API calls)
    // Frontend makes ZERO direct Aircall API requests.
    // -----------------------------------------------------------------------
    updateStep('aircall', { status: 'active', detail: 'Connecting to server...' });

    const syncFromServer = async (isInitial = false) => {
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      const requestId = ++latestSyncRequestId.current;

      try {
        if (!isMounted) return;
        if (isInitial) updateStep('aircall', { status: 'active', detail: 'Loading call data...' });

        const res = await fetch('http://localhost:8787/api/aircall/data');
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const { calls, users, allowedUserIds } = await res.json();

        // Apply normalizeAircallStatus to user statuses
        const userMap = {};
        Object.entries(users).forEach(([uid, u]) => {
          userMap[uid] = { ...u, status: normalizeAircallStatus(u.status) };
        });
        const allowedSet = allowedUserIds ? new Set(allowedUserIds.map(String)) : null;

        // Update callsCache for dial-check useEffect
        callsCache.current.clear();
        calls.forEach(call => callsCache.current.set(call.id, call));

        const stats = {};
        Object.keys(userMap).forEach(uid => {
          if (allowedSet && !allowedSet.has(String(uid))) return;
          stats[uid] = { id: uid, name: userMap[uid]?.name || 'Unknown', dials: 0, talkTime: 0, isTarget: false };
        });

        calls.forEach(call => {
          if (!call.user) return;
          if (!stats[call.user.id]) return;
          stats[call.user.id].dials += 1;
          stats[call.user.id].talkTime += (call.duration || 0);
        });

        const statusSeed = {};
        const activeCallUsers = new Set();
        calls.forEach((call) => {
          if (isActiveCall(call) && call?.user?.id !== undefined && call?.user?.id !== null) {
            activeCallUsers.add(String(call.user.id));
          }
        });

        Object.values(stats).forEach((agent) => {
          const userStatus = activeCallUsers.has(String(agent.id))
            ? 'in_call'
            : (userMap[agent.id]?.status || 'unavailable');
          statusSeed[String(agent.id).toLowerCase()] = userStatus;
          statusSeed[String(agent.name).toLowerCase()] = userStatus;
        });
        if (isMounted) setAgentStatuses(statusSeed);

        const activeAgents = Object.values(stats).filter(agent => agent.dials > 0 || agent.talkTime > 0);
        const targetPaceAgent = calculateTargetPace();
        const finalList = [ ...activeAgents, targetPaceAgent ].sort((a,b) => calculateScore(b.dials, b.talkTime) - calculateScore(a.dials, a.talkTime));

        if (requestId < latestAppliedSyncId.current) return;
        latestAppliedSyncId.current = requestId;

        if (isMounted) {
          setAgents(finalList);
          updateStep('aircall', { status: 'done', detail: `${activeAgents.length} agents loaded (${calls.length} calls)` });
          setLoading(false);
          setErrorState(null);
          checkAllStepsDone();

          if (manualRefresh.current) {
             notify("Dashboard refreshed successfully.", 'success');
             manualRefresh.current = false;
          }
        }

      } catch (err) {
        console.error("Sync Error", err);
        updateStep('aircall', { status: 'failed', detail: err.message || 'Unknown error' });
        const errMsg = err.message?.includes?.('Failed to fetch')
          ? 'Cannot reach server. Is it running on port 8787?'
          : (err.message || 'Unknown Error');
        setErrorState(errMsg);
        if (isInitial) notify(`Sync Failed: ${errMsg}`, 'error');
        checkAllStepsDone();
      } finally {
        syncInFlight.current = false;
      }
    };

    // Initial fetch after short delay to let server receive credentials
    const initTimeout = setTimeout(() => syncFromServer(true), 2000);
    const intervalId = setInterval(() => { syncFromServer(false); }, 30000);

    return () => { isMounted = false; clearTimeout(initTimeout); clearInterval(intervalId); };
  }, [apiId, apiToken, refreshTrigger]);

  const maxDials = Math.max(...agents.map(a => a.dials), 1);
  const maxTalk = Math.max(...agents.map(a => a.talkTime), 1);

  useEffect(() => {
    const currentLeader = agents.find((agent) => !agent.isTarget)?.id ?? null;
    if (previousLeaderRef.current && currentLeader && previousLeaderRef.current !== currentLeader) {
      setLeaderChangedAt(Date.now());
    }
    previousLeaderRef.current = currentLeader;
  }, [agents]);


  const formattedDay = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long' }).format(currentTime);
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

  const agentsListRef = useFlipListAnimation(agents);
  // Use a stable key derived from booking IDs only — NOT the full upcomingBookings
  // array (which changes every second due to currentTime filtering), to prevent
  // FLIP animations from firing on scroll/hover and causing jumps.
  const bookingsIdKey = upcomingBookings.map((b) => b.id || '').join(',');
  const stableBookingsKey = React.useMemo(() => bookingsIdKey, [bookingsIdKey]);
  const bookingsListRef = useFlipListAnimation(stableBookingsKey);


  const brisbaneHourKeyFormatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const datedUpcomingBookings = upcomingBookings
    .filter((booking) => booking.start?.dateTime)
    .map((booking) => ({
      booking,
      eventTime: new Date(booking.start.dateTime).getTime(),
    }))
    .sort((a, b) => a.eventTime - b.eventTime);

  const currentSummarySlot = datedUpcomingBookings[0] || null;
  const currentSummaryHourKey = currentSummarySlot
    ? brisbaneHourKeyFormatter.format(new Date(currentSummarySlot.eventTime))
    : null;

  const upcomingHourBookings = currentSummaryHourKey
    ? datedUpcomingBookings
        .filter(({ eventTime }) => brisbaneHourKeyFormatter.format(new Date(eventTime)) === currentSummaryHourKey)
        .map(({ booking }) => booking)
    : [];

  const isOngoingWindow = currentSummarySlot
    ? currentTime.getTime() >= currentSummarySlot.eventTime && currentTime.getTime() < (currentSummarySlot.eventTime + (20 * 60 * 1000))
    : false;

  const summaryCardTitle = isOngoingWindow ? 'ONGOING' : 'UPCOMING';

  const upcomingHourRepBookingCounts = upcomingHourBookings.reduce((acc, booking) => {
    const repName = getRepName(booking.creator?.email || booking.organizer?.email);
    if (!repName) return acc;
    acc[repName] = (acc[repName] || 0) + 1;
    return acc;
  }, {});

  const upcomingHourRepNames = Object.keys(upcomingHourRepBookingCounts);

  // Speak button handler: announces upcoming ops for the next hour window
  const handleSpeakNextHour = () => {
    notify("Generating audio announcement...", 'success');
    const nowTime = currentTime.getTime();
    const nextHourTime = nowTime + (60 * 60 * 1000);
    
    const nextHourBookings = bookings
      .filter(b => b.start?.dateTime)
      .map(b => ({ ...b, time: new Date(b.start.dateTime).getTime() }))
      .filter(b => b.time >= nowTime && b.time <= nextHourTime)
      .sort((a, b) => a.time - b.time);

    if (nextHourBookings.length === 0) {
        playAnnouncement("There are no upcoming bookings scheduled.");
        return;
    }

    const nextSlotTime = nextHourBookings[0].time;

    // Minutes until earliest event in the upcoming one-hour window
    const minutesAway = Math.max(1, Math.round((nextSlotTime - nowTime) / 60000));
    const minWord = minutesAway === 1 ? "minute" : "minutes";

    // Construct speech with total upcoming ops in next hour and unique rep names
    const uniqueReps = getUniqueRepNames(nextHourBookings);
    const namesString = uniqueReps.join(', ');
    const count = nextHourBookings.length;
    const opWord = count === 1 ? "op" : "ops";
    const verb = count === 1 ? "is" : "are";

    // RULE: Team, there {is/are} [total_upcoming_ops] op(s) in [minutes] minute(s). [rep name(s)], please prepare.
    const speechText = `Team, there ${verb} ${count} ${opWord} in ${minutesAway} ${minWord}. ${namesString}, please prepare.`;

    playAnnouncement(speechText);
  };

  if (loading) {
    return <LoadingScreen steps={loadingSteps} onRetry={() => window.location.reload()} onCancel={onLogout} />;
  }

  return (
    <div className="app-container">
      {/* SERVICE WARNINGS BANNER (top-right persistent) */}
      {serviceWarnings.length > 0 && (
        <div className="service-warnings-banner">
          {serviceWarnings.map((warning, idx) => (
            <div key={warning} className="service-warning">
              <span className="warning-dot" />
              <span>{warning}</span>
              <button onClick={() => setServiceWarnings((prev) => prev.filter((_, i) => i !== idx))}>
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SPLIT VIEW WRAPPER */}
      <div className="main-split-view">

        {/* LEFT PANEL: BOOKINGS (Swapped) */}
        <div className="bookings-panel">
          <div className="bookings-header">
             <div>
                 <h2 className="bookings-title">Bookings</h2>
             </div>
             
             {/* STATS + SPEECH BUTTON */}
             <div className="bookings-stats" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button 
                  onClick={handleSpeakNextHour} 
                  title="Speak next hour's schedule"
                  className="icon-action-button"
                >
                    <Volume2Icon size={20} />
                </button>
                <div style={{ textAlign: 'right' }}>
                    <div className="bookings-count">{totalBookings}</div>
                    <div className="bookings-label">Total</div>
                </div>
             </div>
          </div>
          <div className="bookings-list" ref={bookingsListRef}>
             <div className="upcoming-summary-card">
                <div className="upcoming-summary-content">
                  <h3 key={summaryCardTitle} className="upcoming-summary-title"><span className="summary-title-transition">{summaryCardTitle}</span></h3>
                  {upcomingHourRepNames.length > 0 && (
                    <div className="upcoming-summary-reps">
                      {upcomingHourRepNames.map((repName) => (
                        <span key={repName} className="upcoming-summary-rep-pill">
                          {repName} ({upcomingHourRepBookingCounts[repName]})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="upcoming-summary-total">
                  <div className="upcoming-summary-total-number">{upcomingHourBookings.length}</div>
                  <div className="upcoming-summary-total-label">Total</div>
                </div>
             </div>
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

                  const bookingStarted = currentTime.getTime() >= startTime.getTime();
                  const callEntries = bookingStarted ? (dialedBookingsRef.current.get(booking.id) || []) : [];

                  return (
                    <div key={booking.id || idx} className="booking-card" data-flip-key={String(booking.id || idx)}>
                       <div className="booking-meta">
                          <span className="booking-time"><CalendarIcon size={20} /> {timeStr}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {callEntries.map((entry, ci) => {
                              // Color by outcome: green=answered, amber=voicemail/no-answer, blue=in progress
                              const iconColor = entry.active ? '#3b82f6'
                                : entry.outcome === 'answered' ? '#22c55e'
                                : '#f59e0b';
                              const bgColor = entry.active ? 'rgba(59, 130, 246, 0.15)'
                                : entry.outcome === 'answered' ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)';
                              return (
                              <span key={entry.callId || ci} className="dial-icon-wrapper" style={{
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 22, height: 22, borderRadius: '50%',
                                backgroundColor: bgColor,
                                cursor: 'pointer',
                              }}>
                                <PhoneIcon size={13} color={iconColor} />
                                <span className="dial-tooltip">
                                  {entry.active
                                    ? 'Call in progress'
                                    : (entry.summary || transcriptCacheRef.current.get(entry.callId) || entry.outcomeLabel || 'Loading summary...')}
                                </span>
                              </span>
                              );
                            })}
                            <span className="booking-status">Confirmed</span>
                          </div>
                       </div>
                       <div className="booking-summary">{displaySummary}</div>
                       
                       <div className="booking-rep-row">
                          <span className="booking-rep-chip">
                            {schedulerName}
                          </span>
                          {booking.htmlLink && (
                            <a
                              href={booking.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="booking-open-event-button"
                              title="Open this event in Google Calendar"
                              aria-label="Open this event in Google Calendar"
                            >
                              <ExternalLinkIcon size={16} />
                            </a>
                          )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 className="main-title">Sales Leaderboard</h1>
                <button className="simulate-sale-button" onClick={onSimulateSale}>🎉 Simulate Sale</button>
              </div>
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
                  className="icon-action-button"
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

            <div ref={agentsListRef}>
              {agents.map((agent, index) => (
                <AgentRow key={agent.id} rank={index + 1} agent={agent} maxDials={maxDials} maxTalk={maxTalk} statusMap={agentStatuses} hasLeadChange={currentTime.getTime() - leaderChangedAt < 1200} nickname={agentNicknames[String(agent.id)]} onSaveNickname={saveAgentNickname} />
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
            className="icon-action-button"
            style={{ marginLeft: '0.5rem' }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
             {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
        </div>
        <div className="footer-right">
          <button onClick={onLogout} className="btn-disconnect icon-action-button">
             <LogOutIcon size={16} />
          </button>
          <div>
              <div className="footer-time">{formattedDay}, {formattedDate}, {formattedTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
};


const PopupConfetti = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const colors = [
      '#4ade80',
      '#60a5fa',
      '#f472b6',
      '#c084fc',
      '#fbbf24',
      '#ea580c',
      '#38bdf8',
    ];
    const shapes = ['square', 'rect'];
    const particles = [];

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.size = Math.random() * 8 + 4;
        this.vy = (Math.random() * 1.5 + 0.8) * 2.25;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.shape = shapes[Math.floor(Math.random() * shapes.length)];
        this.opacity = Math.random() * 0.4 + 0.15;
        this.swayOffset = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.03 + 0.01;
      }

      update() {
        this.y += this.vy;
        this.angle += this.spin;
        this.x += Math.sin(Date.now() * this.swaySpeed * 0.1 + this.swayOffset) * 0.4;

        const dx = this.x - mouseRef.current.x;
        const dy = this.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100;
          this.x += (dx / dist) * force * 4;
          this.y += (dy / dist) * force * 4;
        }

        if (this.y > canvas.height + 20) {
          this.y = -20;
          this.x = Math.random() * canvas.width;
        }
        if (this.x > canvas.width + 20) this.x = -20;
        if (this.x < -20) this.x = canvas.width + 20;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.angle * Math.PI) / 180);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        if (this.shape === 'square') {
          ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        } else {
          ctx.fillRect(-this.size * 1.5, -this.size / 2, this.size * 3, this.size);
        }
        ctx.restore();
      }
    }

    const resizeCanvas = () => {
      if (!canvas?.parentElement) return;
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };

    resizeCanvas();

    for (let i = 0; i < 50; i += 1) {
      particles.push(new Particle());
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.parentElement?.addEventListener('mouseleave', handleMouseLeave);

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="sale-popup-confetti-canvas" />;
};

const SaleClearedPopup = ({ saleData, onClose }) => {
  const [isHovering, setIsHovering] = useState(false);

  if (!saleData) return null;

  return (
    <div className="sale-popup-overlay" onClick={onClose}>
      <div className="sale-popup-ambient" />
      <div className="sale-popup-card" onClick={(event) => event.stopPropagation()}>
        <button className="sale-popup-close" onClick={onClose} aria-label="Close pop-up">✕</button>
        <div className="sale-popup-card-glow" />
        <div className="sale-popup-pulse one" />
        <div className="sale-popup-pulse two" />
        <div className="sale-popup-pulse three" />
        <div className="sale-popup-pulse four" />

        <PopupConfetti />

        <div className={`sale-popup-content ${saleData.isSimulation ? 'simulation' : ''}`}>
          <h2 className="sale-popup-heading"><span className="sale-popup-heading-icon" role="img" aria-label="confetti">🎉</span>NEW CLIENT ONBOARDING<span className="sale-popup-heading-icon" role="img" aria-label="confetti">🎉</span></h2>

          <div className="sale-popup-details">
            <p className="sale-popup-text sale-popup-confetti-line" style={{ display: 'flex', justifyContent: 'center' }}>
              <span role="img" aria-label="confetti">🎉</span>
            </p>

            <p className="sale-popup-text">
              Payment Successful: <strong style={{ color: '#ffffff' }}>{saleData.businessName}</strong>
            </p>

            {saleData.packageName ? (
              <p className="sale-popup-text">
                Package: <strong style={{ color: '#ffffff' }}>{saleData.packageName}</strong>
              </p>
            ) : null}

            <p className="sale-popup-text sale-popup-contact-line" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}>
              Contact: <strong style={{ color: '#ffffff' }}>{saleData.customerName}</strong>
              <span className="sale-popup-pulse five" />
            </p>
          </div>

          <button
            className="sale-popup-button"
            onClick={onClose}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            Awesome — Keep Going
            <span className={`sale-popup-button-shine ${isHovering ? 'active' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [credentials, setCredentials] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'
  const [salePopupData, setSalePopupData] = useState(null);
  const salePopupTimeoutRef = useRef(null);
  const onboardingDingUrlRef = useRef(null);

  const playOnboardingDing = async () => {
    if (!credentials?.elevenLabsApiKey) return;

    try {
      let soundUrl = onboardingDingUrlRef.current;

      if (!soundUrl) {
        const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST',
          headers: {
            'xi-api-key': credentials.elevenLabsApiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: 'Clean, short, single text-message style ding in the spirit of a modern smartphone notification. Bright and pleasant, no cash register or coin sounds, no buzz, alarm, or harsh synthetic beeps.',
            duration_seconds: 1.5,
            prompt_influence: 1,
          }),
        });

        if (!response.ok) return;

        const audioBlob = await response.blob();
        soundUrl = URL.createObjectURL(audioBlob);
        onboardingDingUrlRef.current = soundUrl;
      }

      const audio = new Audio(soundUrl);
      audio.play().catch(() => {});
    } catch {
      // Intentionally silent when sound generation is unavailable.
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const closeSalePopup = () => {
    setSalePopupData(null);
    if (salePopupTimeoutRef.current) {
      clearTimeout(salePopupTimeoutRef.current);
      salePopupTimeoutRef.current = null;
    }
  };

  const triggerSalePopup = (payload) => {
    playOnboardingDing();

    setSalePopupData({
      customerName: payload?.customerName || 'Test Customer',
      businessName: payload?.businessName || payload?.customerName || 'Test Business',
      paymentAmount: payload?.paymentAmount || 0,
      packageName: payload?.packageName || '',
      isSimulation: Boolean(payload?.isSimulation),
    });

    if (salePopupTimeoutRef.current) {
      clearTimeout(salePopupTimeoutRef.current);
    }

    salePopupTimeoutRef.current = setTimeout(() => {
      setSalePopupData(null);
      salePopupTimeoutRef.current = null;
    }, 180000);
  };

  useEffect(() => {
    const socket = io('http://localhost:8787');

    if (credentials?.stripeKey) {
      socket.emit('set_stripe_key', credentials.stripeKey);
    }
    if (credentials?.anthropicKey) {
      socket.emit('set_anthropic_key', credentials.anthropicKey);
    }
    if (credentials?.id && credentials?.token && credentials.id !== 'demo') {
      socket.emit('set_aircall_credentials', { apiId: credentials.id, apiToken: credentials.token });
    }

    socket.on('sale_cleared', (payload) => {
      triggerSalePopup(payload);
    });

    return () => {
      socket.disconnect();
      if (salePopupTimeoutRef.current) {
        clearTimeout(salePopupTimeoutRef.current);
      }
    };
  }, [credentials?.stripeKey, credentials?.id, credentials?.token]);

  useEffect(() => {
    return () => {
      if (onboardingDingUrlRef.current) {
        URL.revokeObjectURL(onboardingDingUrlRef.current);
      }
    };
  }, []);

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
  
  const handleConnect = (id, token, apiKey, googleToken, elevenLabsApiKey, stripeKey, anthropicKey) => {
    setCredentials({ id, token, apiKey, googleToken, elevenLabsApiKey, stripeKey, anthropicKey });
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
        {salePopupData && <SaleClearedPopup saleData={salePopupData} onClose={closeSalePopup} />}

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
             onSimulateSale={() => {
               triggerSalePopup({ customerName: 'Test Customer', businessName: 'Demo Business', paymentAmount: 497, packageName: 'Growth Package', isSimulation: true });
               const simCusId = 'cus_simulated_' + Date.now();
               // Step 1: customer.created (adds to newlyCreatedCustomerIds on server)
               fetch('http://localhost:8787/webhook', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   type: 'customer.created',
                   data: {
                     object: {
                       id: simCusId,
                       name: 'Test Customer',
                       email: 'test@example.com',
                     },
                   },
                 }),
               }).then(() => {
                 // Step 2: checkout.session.completed (triggers sale email with package)
                 fetch('http://localhost:8787/webhook', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     type: 'checkout.session.completed',
                     data: {
                       object: {
                         customer: simCusId,
                         amount_total: 49700,
                         customer_details: { name: 'Test Customer' },
                         metadata: { business_name: 'Demo Business', package_name: 'Growth Package' },
                       },
                     },
                   }),
                 }).catch(() => {});
               }).catch(() => {});
             }}
           />
        )}
      </div>
    </>
  );
}
