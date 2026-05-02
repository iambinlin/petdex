import Link from "next/link";

type PetdexLogoProps = {
  href?: string;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
};

export function PetdexLogo({
  href,
  showWordmark = true,
  className = "",
  markClassName = "size-10",
}: PetdexLogoProps) {
  const content = (
    <>
      <PetdexMark className={markClassName} />
      {showWordmark ? (
        <span className="text-xl font-semibold tracking-normal">Petdex</span>
      ) : null}
    </>
  );

  const classes = `inline-flex items-center gap-3 text-black ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="Petdex home">
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}

function PetdexMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="petdex-body"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1a1d2e" />
          <stop offset="0.55" stopColor="#3847f5" />
          <stop offset="1" stopColor="#7a8dff" />
        </linearGradient>
        <linearGradient
          id="petdex-screen"
          x1="14"
          y1="20"
          x2="50"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#dde6ff" />
          <stop offset="1" stopColor="#aebcff" />
        </linearGradient>
        <linearGradient
          id="petdex-led"
          x1="46"
          y1="11"
          x2="58"
          y2="17"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7a8dff" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#petdex-body)" />
      <rect
        x="6"
        y="6"
        width="52"
        height="6"
        rx="3"
        fill="#ffffff"
        fillOpacity="0.06"
      />

      <circle cx="14" cy="14" r="3" fill="#ff5e5e" />
      <circle cx="14" cy="14" r="1.1" fill="#ffffff" fillOpacity="0.85" />
      <rect x="46" y="11" width="12" height="6" rx="3" fill="url(#petdex-led)" />

      <rect
        x="10"
        y="20"
        width="44"
        height="28"
        rx="5"
        fill="url(#petdex-screen)"
      />
      <rect
        x="10"
        y="20"
        width="44"
        height="28"
        rx="5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="0.8"
      />

      <g fill="#1a1d2e">
        <rect x="22" y="26" width="3" height="3" />
        <rect x="39" y="26" width="3" height="3" />
        <rect x="20" y="36" width="3" height="3" />
        <rect x="41" y="36" width="3" height="3" />
        <rect x="24" y="38" width="16" height="3" />
        <rect x="22" y="35" width="3" height="3" />
        <rect x="39" y="35" width="3" height="3" />
      </g>
      <g fill="#3847f5">
        <rect x="27" y="30" width="3" height="3" />
        <rect x="34" y="30" width="3" height="3" />
      </g>

      <g fill="#ffffff" fillOpacity="0.85">
        <rect x="14" y="51" width="6" height="2" rx="1" />
        <rect x="16" y="49" width="2" height="6" rx="1" />
      </g>

      <circle cx="44" cy="52" r="2.4" fill="#ffd166" />
      <circle cx="51" cy="52" r="2.4" fill="#ff5e5e" />
    </svg>
  );
}
