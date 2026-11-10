import type { Metadata } from "next";
import { Montserrat, Urbanist } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Longhorn Racing Recruitment",
    template: "%s · Longhorn Racing Recruitment",
  },
  description: "Longhorn Racing's Partners find engineers from the Solar, Electric and Combustion teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${urbanist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
