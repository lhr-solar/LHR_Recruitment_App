import type { Metadata } from "next";
import { Montserrat, Urbanist } from "next/font/google";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const PREVIEW_ALT = "The LHR Careers logo over the Longhorn Racing solar car on track";

export const metadata: Metadata = {
  // Link previews (WhatsApp, Slack, Discord, iMessage) need absolute URLs for the image.
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "LHR Careers",
    template: "%s · LHR Careers",
  },
  description: "Longhorn Racing members find internships and jobs with the team's Partner companies.",
  // The preview card for any shared link. Apps crop previews differently (Slack and WhatsApp
  // thumbnails take a center square), so the logo sits in the middle of both images, and the square
  // one is offered for apps that prefer it.
  openGraph: {
    type: "website",
    siteName: "LHR Careers",
    title: "LHR Careers: hire the engineers behind Longhorn Racing",
    description: "Meet the UT Austin students who design, build and race Longhorn Racing's Solar, Electric and Combustion cars.",
    images: [
      { url: "/brand/og-wide.jpg", width: 1200, height: 630, alt: PREVIEW_ALT },
      { url: "/brand/og-square.jpg", width: 1200, height: 1200, alt: PREVIEW_ALT },
    ],
  },
  twitter: { card: "summary_large_image", images: [{ url: "/brand/og-wide.jpg", alt: PREVIEW_ALT }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${urbanist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
