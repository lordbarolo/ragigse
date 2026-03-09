import { useEffect, useState } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps {
  variant?: LogoVariant;
  className?: string;
}

const CompcareLogo = ({ variant = "wordmark", className = "" }: CompcareLogoProps) => {
  // Wordmark only — mobile default (< 768px)
  if (variant === "wordmark") {
    return (
      <svg
        viewBox="0 0 160 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-7 w-auto ${className}`}
        aria-label="Compcare"
        role="img"
      >
        <text
          x="0"
          y="22"
          fontFamily="'Sora', sans-serif"
          fontSize="24"
          fontWeight="600"
          letterSpacing="0.02em"
        >
          <tspan fill="white">comp</tspan>
          <tspan fill="#00D2E6">care</tspan>
        </text>
      </svg>
    );
  }

  // Icon + wordmark — tablet/desktop (≥ 768px)
  if (variant === "full") {
    return (
      <svg
        viewBox="0 0 204 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`h-8 w-auto ${className}`}
        aria-label="Compcare"
        role="img"
      >
        <rect x="0" y="5" width="20" height="7" rx="2" fill="#A0AABE" />
        <rect x="0" y="17" width="33" height="7" rx="2" fill="#00D2E6" />
        <text
          x="43"
          y="24"
          fontFamily="'Sora', sans-serif"
          fontSize="24"
          fontWeight="600"
          letterSpacing="0.02em"
        >
          <tspan fill="white">comp</tspan>
          <tspan fill="#00D2E6">care</tspan>
        </text>
      </svg>
    );
  }

  // Icon only — for very small contexts
  return (
    <svg
      viewBox="0 0 33 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-6 w-auto ${className}`}
      aria-label="Compcare"
      role="img"
    >
      <rect x="0" y="0" width="20" height="7" rx="2" fill="#A0AABE" />
      <rect x="0" y="12" width="33" height="7" rx="2" fill="#00D2E6" />
    </svg>
  );
};

export default CompcareLogo;
