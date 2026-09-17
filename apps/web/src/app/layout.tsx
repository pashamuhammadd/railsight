import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import styles from "./layout.module.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RailSight",
  description: "Solana-native analytics and trust layer for the x402 payment protocol.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${plusJakartaSans.variable}`}>
      <body>
        <div className={styles.shell}>
          <div className={styles.glowOne} />
          <div className={styles.glowTwo} />
          <Sidebar />
          <div className={styles.main}>{children}</div>
        </div>
      </body>
    </html>
  );
}
