import Image from "next/image";

// The brand book's logo-descriptor lockup: LHR over CAREERS.
export function Lockup({ tone = "color", height = 40 }: { tone?: "color" | "white"; height?: number }) {
  const src = tone === "white" ? "/brand/lhr-careers-lockup-white.svg" : "/brand/lhr-careers-lockup.svg";
  // The artwork is 585 × 193.
  const width = Math.round((height * 585.08) / 193.41);
  return <Image src={src} alt="LHR Careers" width={width} height={height} priority unoptimized />;
}

// The primary logo alone, for tight spaces such as the app bar.
export function Logo({ height = 22 }: { height?: number }) {
  const width = Math.round((height * 585.08) / 120.48);
  return <Image src="/brand/lhr-logo.svg" alt="Longhorn Racing" width={width} height={height} priority unoptimized />;
}
