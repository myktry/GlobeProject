import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Shared UI Button used across the site (except Admin page)
// Props: to (optional) - Link target, onClick, variant: primary|secondary|danger|neutral|dark, size: sm|md|lg
export default function Button({ to, children, onClick, variant = 'primary', size = 'md', className = '', ...rest }) {
  const [hovered, setHovered] = useState(false);
  const variants = {
    primary: { base: '#7c3aed', hover: '#a78bfa', border: '#4c1d95', borderHover: '#5b21b6', text: '#fff' },
    secondary: { base: '#fff', hover: '#fff', border: '#d1d5db', borderHover: '#cbd5e1', text: '#0b1224' },
    danger: { base: '#ef4444', hover: '#f87171', border: '#b91c1c', borderHover: '#991b1b', text: '#fff' },
    neutral: { base: '#0b1224', hover: '#0f1724', border: '#213148', borderHover: '#2b3448', text: '#cbd5e1' },
    dark: { base: '#374151', hover: '#111827', border: '#111827', borderHover: '#000', text: '#fff' }
  };
  const v = variants[variant] || variants.primary;

  const sizes = {
    sm: { padding: '6px 10px', radius: 8, fontSize: 14 },
    md: { padding: '10px 16px', radius: 12, fontSize: 16 },
    lg: { padding: '14px 28px', radius: 16, fontSize: 18 }
  };
  const s = sizes[size] || sizes.md;

  const style = {
    padding: s.padding,
    borderRadius: s.radius,
    fontWeight: 800,
    fontSize: s.fontSize,
    letterSpacing: 0.3,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    background: hovered ? v.hover : v.base,
    color: v.text,
    border: `2px solid ${hovered ? v.borderHover : v.border}`,
    boxShadow: hovered ? `0 0 16px 4px ${v.hover}55, 0 0 32px 8px ${v.hover}33` : `0 0 8px 2px ${v.base}33`,
    outline: 'none',
    transition: 'background 0.18s, transform 0.12s, box-shadow 0.18s',
    transform: hovered ? 'scale(1.03)' : 'scale(1)'
  };

  const content = (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }
  return content;
}

// small circular icon button
export function IconButton({ children, ariaLabel = '', onClick, className = '', size = 40, style: userStyle = {}, ...rest }) {
  const [hovered, setHovered] = useState(false);
  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'transform 0.12s, background 0.12s',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)'
  };
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
      style={{ ...baseStyle, ...(userStyle || {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
    >
      {children}
    </button>
  );
}
