import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
}

/**
 * Visual phone mockup wrapper used in /demo/hero-tailwind.
 * Renders children inside a dark phone chassis with notch + side buttons,
 * clipped to a rounded screen surface.
 */
export function PhoneMockup({ children, className = "" }: PhoneMockupProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Side buttons */}
      <div className="absolute left-[-3px] top-[110px] h-8 w-[3px] rounded-l bg-slate-800" />
      <div className="absolute left-[-3px] top-[160px] h-14 w-[3px] rounded-l bg-slate-800" />
      <div className="absolute left-[-3px] top-[230px] h-14 w-[3px] rounded-l bg-slate-800" />
      <div className="absolute right-[-3px] top-[180px] h-20 w-[3px] rounded-r bg-slate-800" />

      {/* Chassis */}
      <div className="relative h-[640px] w-[320px] rounded-[3rem] bg-[#0f172a] p-3 shadow-2xl ring-1 ring-slate-900/10">
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[2.25rem] bg-white">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-20 h-6 w-32 -translate-x-1/2 rounded-full bg-[#0f172a]" />
          {/* Content */}
          <div className="h-full w-full overflow-hidden pt-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
