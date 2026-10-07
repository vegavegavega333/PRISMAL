import React from 'react';

export interface PrismalMarkProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  isDarkBg?: boolean;
}

// Pure SVG Geometric Mark of PRISMAL (Dispersive Prism + Molar)
export const PrismalMark: React.FC<PrismalMarkProps> = ({
  className = 'w-10 h-10',
  width,
  height,
  isDarkBg = false,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform duration-300 hover:scale-105 select-none ${className}`}
    >
      <defs>
        {/* Left Incident Beam Gradient */}
        <linearGradient id="prismal-in-beam-comp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isDarkBg ? '#FFFFFF' : '#0F172A'} stopOpacity="0.0" />
          <stop offset="35%" stopColor={isDarkBg ? '#94A3B8' : '#334155'} stopOpacity="0.5" />
          <stop offset="75%" stopColor={isDarkBg ? '#E2E8F0' : '#475569'} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1.0" />
        </linearGradient>

        {/* Dispersion Beam 1: Royal / Electric Blue */}
        <linearGradient id="prismal-beam-blue-comp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0077FF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#93C5FD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.0" />
        </linearGradient>

        {/* Dispersion Beam 2: Cyan / Aquamarine / Mint Teal */}
        <linearGradient id="prismal-beam-teal-comp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00BFA5" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#14B8A6" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#5EEAD4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#99F6E4" stopOpacity="0.0" />
        </linearGradient>

        {/* Dispersion Beam 3: Violet / Lilac Purple */}
        <linearGradient id="prismal-beam-purple-comp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#A855F7" stopOpacity="0.85" />
          <stop offset="80%" stopColor="#C084FC" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.0" />
        </linearGradient>

        {/* Facet Left Specular Gradient */}
        <linearGradient id="prismal-facet-left-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#24272D" />
          <stop offset="45%" stopColor="#17191F" />
          <stop offset="100%" stopColor="#0A0B0E" />
        </linearGradient>

        {/* Facet Right Gloss Gradient */}
        <linearGradient id="prismal-facet-right-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#121316" />
          <stop offset="60%" stopColor="#050506" />
          <stop offset="100%" stopColor="#1A1C20" />
        </linearGradient>
      </defs>

      {/* 1. LEFT INCIDENT LIGHT RAY */}
      <polygon
        points="8,68 8,82 92,62 90,60"
        fill="url(#prismal-in-beam-comp)"
      />
      <line
        x1="6"
        y1="75"
        x2="95"
        y2="61"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* 2. RIGHT DISPERSED SPECTRAL BEAMS */}
      {/* Top Blue Beam */}
      <polygon
        points="137,63 139,69 232,46 230,22"
        fill="url(#prismal-beam-blue-comp)"
      />

      {/* Middle Cyan/Teal Beam */}
      <polygon
        points="140,71 143,77 232,70 232,50"
        fill="url(#prismal-beam-teal-comp)"
      />

      {/* Bottom Purple/Violet Beam */}
      <polygon
        points="144,79 148,87 232,98 232,74"
        fill="url(#prismal-beam-purple-comp)"
      />

      {/* 3. THE 3D FACETED PRISM TRIANGLE */}
      <polygon
        points="120,22 120,102 78,102"
        fill="url(#prismal-facet-left-comp)"
      />
      <polygon
        points="120,22 162,102 120,102"
        fill="url(#prismal-facet-right-comp)"
      />

      {/* Ridge Line */}
      <line
        x1="120"
        y1="22"
        x2="120"
        y2="102"
        stroke="#334155"
        strokeWidth="0.8"
      />

      {/* Left Apex Bevel */}
      <line
        x1="120"
        y1="22"
        x2="78"
        y2="102"
        stroke="#475569"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="120"
        y1="22"
        x2="105"
        y2="50"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* 4. CENTRAL WHITE MOLAR TOOTH OUTLINE */}
      <path
        d="M 120,49
           C 114,47 107,46 103,50
           C 98,55 98,62 101,69
           C 103,74 105,82 107,91
           C 108,96 112,96 113,91
           C 115,84 117,76 120,73
           C 123,76 125,84 127,91
           C 128,96 132,96 133,91
           C 135,82 137,74 139,69
           C 142,62 142,55 137,50
           C 133,46 126,47 120,49 Z"
        fill="#08090C"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Tooth Cusp Arch */}
      <path
        d="M 112,53 C 117,55 123,55 128,53"
        fill="none"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Optical Contact Point */}
      <circle
        cx="101"
        cy="62"
        r="2.2"
        fill="#FFFFFF"
      />
    </svg>
  );
};

// Mathematically aligned inverted-V Lambda (stylized Letter A in PRISMAL):
// - Height is exactly cap-height: 0.72em
// - Width is proportional to capital A: 0.66em
// - Explicit inline styles guarantee width & height are ALWAYS rendered and NEVER collapse
// - Stroke width is ~13-14/100, perfectly matching font-bold / font-extrabold stems
// - Sits flush on the typographic baseline with zero vertical protrusion ("mai fuori sezione")
export const PrismalLambda: React.FC<{
  className?: string;
  strokeWidth?: number;
  width?: string;
  height?: string;
}> = ({
  className = '',
  strokeWidth = 13,
  width = '0.66em',
  height = '0.72em',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center select-none flex-shrink-0 relative ${className}`}
      style={{
        width,
        height,
        display: 'inline-flex',
        verticalAlign: '-0.01em',
        marginLeft: '0.04em',
        marginRight: '0.04em',
      }}
      aria-label="A"
    >
      <span className="sr-only">A</span>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        aria-hidden="true"
      >
        <polyline
          points="14,92 50,10 86,92"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

// Wordmark reproducing the exact typography from the official PRISMAL logo:
// - Geometric bold/extrabold sans with balanced optical letter spacing
// - Negative margin compensation on the right (-mr-[...]) to guarantee mathematical and optical centering
// - Proportional sizing: hero is clean, refined, and never oversized
export interface PrismalWordmarkProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  isDark?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export const PrismalWordmark: React.FC<PrismalWordmarkProps> = ({
  size = 'md',
  isDark = false,
  showSubtitle = false,
  className = '',
}) => {
  const sizeStyles = {
    xs: { text: 'text-xs sm:text-[13px]', weight: 'font-bold', spacing: 'tracking-[0.16em] -mr-[0.16em]', strokeWidth: 13, subSize: 'text-[7px]', ruleW: 'w-4' },
    sm: { text: 'text-sm sm:text-base', weight: 'font-bold', spacing: 'tracking-[0.16em] -mr-[0.16em]', strokeWidth: 13, subSize: 'text-[8px]', ruleW: 'w-5' },
    md: { text: 'text-base sm:text-lg', weight: 'font-extrabold', spacing: 'tracking-[0.18em] -mr-[0.18em]', strokeWidth: 13.5, subSize: 'text-[8.5px]', ruleW: 'w-6' },
    lg: { text: 'text-lg sm:text-xl', weight: 'font-extrabold', spacing: 'tracking-[0.18em] -mr-[0.18em]', strokeWidth: 13.5, subSize: 'text-[9px]', ruleW: 'w-8' },
    xl: { text: 'text-xl sm:text-2xl', weight: 'font-extrabold', spacing: 'tracking-[0.18em] -mr-[0.18em]', strokeWidth: 14, subSize: 'text-[10px]', ruleW: 'w-10' },
    hero: { text: 'text-xl sm:text-2xl md:text-[26px]', weight: 'font-extrabold', spacing: 'tracking-[0.18em] -mr-[0.18em]', strokeWidth: 13.5, subSize: 'text-[9px] sm:text-[10px]', ruleW: 'w-6 sm:w-10' },
  };

  const current = sizeStyles[size] || sizeStyles.md;
  const textColor = isDark ? 'text-white' : 'text-slate-950';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Official PRISMAL Wordmark with standard matching geometric 'A' */}
      <div className={`inline-flex items-center justify-center font-sans ${current.weight} ${current.text} ${current.spacing} ${textColor} uppercase leading-none`}>
        <span>PRISMAL</span>
      </div>

      {/* Official Subtitle with framing rules */}
      {showSubtitle && (
        <div className="flex flex-col items-center mt-2 sm:mt-2.5 text-center">
          <div className={`flex items-center gap-2 sm:gap-2.5 ${current.subSize} font-semibold text-slate-700 tracking-[0.20em] uppercase`}>
            <span className={`${current.ruleW} h-px bg-slate-300`}></span>
            <span>TRIAGE E PRENOTAZIONE INTELLIGENTE</span>
            <span className={`${current.ruleW} h-px bg-slate-300`}></span>
          </div>
          <div className="text-[7.5px] sm:text-[8.5px] font-medium text-slate-500 tracking-[0.30em] uppercase mt-0.5">
            ODONTOIATRICA
          </div>
        </div>
      )}
    </div>
  );
};

// Full Hero Lockup matching official artwork
export const PrismalHeroBrand: React.FC<{
  showSubtitle?: boolean;
  className?: string;
}> = ({
  showSubtitle = true,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
      {/* 1. Crisp, balanced Dispersive Prism Mark */}
      <PrismalMark width={110} height={64} className="w-24 sm:w-28 md:w-32 h-auto mb-2 sm:mb-2.5" />

      {/* 2. Official Wordmark with Inverted-V Lambda and Optical Centering */}
      <PrismalWordmark
        size="hero"
        showSubtitle={showSubtitle}
      />
    </div>
  );
};

export interface PrismalLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'light' | 'dark' | 'brand';
  layout?: 'stacked' | 'inline' | 'mark-only';
  showSubtitle?: boolean;
  showText?: boolean;
  className?: string;
}

export const PrismalLogo: React.FC<PrismalLogoProps> = ({
  size = 'md',
  variant = 'light',
  layout,
  showText = false,
  showSubtitle = false,
  className = '',
}) => {
  const sizeMap = {
    xs: { width: 34, height: 20, wordmarkSize: 'xs' as const },
    sm: { width: 44, height: 26, wordmarkSize: 'sm' as const },
    md: { width: 56, height: 33, wordmarkSize: 'md' as const },
    lg: { width: 72, height: 42, wordmarkSize: 'lg' as const },
    xl: { width: 88, height: 51, wordmarkSize: 'xl' as const },
    hero: { width: 110, height: 64, wordmarkSize: 'hero' as const },
  };

  const isDarkBg = variant === 'dark';
  const resolvedLayout = layout || (showText ? 'inline' : 'mark-only');

  if (resolvedLayout === 'mark-only' || !showText) {
    return (
      <PrismalMark
        width={sizeMap[size].width}
        height={sizeMap[size].height}
        isDarkBg={isDarkBg}
        className={className}
      />
    );
  }

  if (resolvedLayout === 'stacked') {
    return (
      <div className={`flex flex-col items-center justify-center select-none text-center ${className}`}>
        <PrismalMark
          width={sizeMap[size].width}
          height={sizeMap[size].height}
          isDarkBg={isDarkBg}
          className="mb-1.5 sm:mb-2"
        />
        <PrismalWordmark
          size={sizeMap[size].wordmarkSize}
          isDark={isDarkBg}
          showSubtitle={showSubtitle}
        />
      </div>
    );
  }

  // Inline layout (side-by-side)
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <PrismalMark
        width={sizeMap[size].width}
        height={sizeMap[size].height}
        isDarkBg={isDarkBg}
        className="flex-shrink-0"
      />
      <PrismalWordmark
        size={sizeMap[size].wordmarkSize}
        isDark={isDarkBg}
        showSubtitle={showSubtitle}
      />
    </div>
  );
};
