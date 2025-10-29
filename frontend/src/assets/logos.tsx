import React from 'react';

/**
 * Main Logo (Large)
 * Used in splash screen, documentation
 */
export const LogoLarge: React.FC<{ size?: number; className?: string }> = ({
  size = 120,
  className = '',
}) => (
  <svg
    viewBox="0 0 200 200"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Blue rounded square background */}
    <rect x="20" y="20" width="160" height="160" rx="32" fill="none" stroke="#3b82f6" strokeWidth="3" />
    
    {/* Top circle (node) */}
    <circle cx="100" cy="55" r="12" fill="#3b82f6" />
    
    {/* Left square (node) */}
    <rect x="50" y="85" width="24" height="24" rx="4" fill="none" stroke="#3b82f6" strokeWidth="2" />
    
    {/* Right diamond (node) */}
    <path d="M 150 97 L 162 109 L 150 121 L 138 109 Z" fill="none" stroke="#3b82f6" strokeWidth="2" />
    
    {/* Connections */}
    <line x1="100" y1="67" x2="62" y2="85" stroke="#3b82f6" strokeWidth="2" />
    <line x1="100" y1="67" x2="150" y2="97" stroke="#3b82f6" strokeWidth="2" />
    <line x1="62" y1="109" x2="138" y2="109" stroke="#3b82f6" strokeWidth="2" />
  </svg>
);

/**
 * Icon Logo (Small, for favicon/header)
 * Used in top nav, tabs
 */
export const IconLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Blue rounded square background */}
    <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#gradientBg)" />
    
    {/* Top circle (node) */}
    <circle cx="20" cy="10" r="2.4" fill="#fff" />
    
    {/* Left square (node) */}
    <rect x="10" y="17" width="4.8" height="4.8" rx="1" fill="none" stroke="#fff" strokeWidth="0.8" />
    
    {/* Right diamond (node) */}
    <path d="M 30 19.4 L 32.4 21.8 L 30 24.2 L 27.6 21.8 Z" fill="none" stroke="#fff" strokeWidth="0.8" />
    
    {/* Connections */}
    <line x1="20" y1="12.4" x2="12.4" y2="17" stroke="#fff" strokeWidth="0.8" />
    <line x1="20" y1="12.4" x2="30" y2="19.4" stroke="#fff" strokeWidth="0.8" />
    <line x1="12.4" y1="21.8" x2="27.6" y2="21.8" stroke="#fff" strokeWidth="0.8" />
    
    <defs>
      <linearGradient id="gradientBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Wordmark (Logo + Text)
 * Used in sidebar, welcome screens
 */
export const Wordmark: React.FC<{ size?: number; className?: string }> = ({
  size = 24,
  className = '',
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <IconLogo size={size + 8} />
    <div>
      <div style={{ fontSize: `${size}px`, fontWeight: 700, lineHeight: 1.1, color: '#0f172a' }}>
        Viscept
      </div>
      <div style={{ fontSize: `${size * 0.4}px`, fontWeight: 500, opacity: 0.7, color: '#64748b' }}>
        AI Diagram Studio
      </div>
    </div>
  </div>
);