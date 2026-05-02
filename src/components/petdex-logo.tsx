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
      <rect
        fill="url(#petdex-mark-bg)"
        height="56"
        rx="18"
        width="56"
        x="4"
        y="4"
      />
      <path
        d="M20.5 45.5V19h15.25c6.45 0 10.75 4.12 10.75 10.18S42.2 39.4 35.75 39.4H29v6.1h-8.5Zm8.5-13.02h5.55c2.16 0 3.48-1.22 3.48-3.3 0-2.03-1.32-3.24-3.48-3.24H29v6.54Z"
        fill="white"
      />
      <circle cx="23" cy="16" fill="white" r="4.4" />
      <circle cx="41" cy="16" fill="white" r="4.4" />
      <circle cx="25.5" cy="17.2" fill="#4456ff" r="1.15" />
      <circle cx="39.5" cy="17.2" fill="#4456ff" r="1.15" />
      <path
        d="M48 41.2h4.8v4.8H48v-4.8Zm-5.8 5.8H47v4.8h-4.8V47Z"
        fill="#B9D8FF"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="petdex-mark-bg"
          x1="12"
          x2="54"
          y1="9"
          y2="58"
        >
          <stop stopColor="#111111" />
          <stop offset="0.58" stopColor="#3847F5" />
          <stop offset="1" stopColor="#8DAAFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
