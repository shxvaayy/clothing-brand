import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/seo";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a85b44",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {/* Browser extensions (Bitdefender etc.) inject bis_ / __processed_
            attributes into the server HTML before React hydrates, causing
            noisy hydration warnings. Strip them so hydration stays clean. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var re=/^(bis_|__processed_)/;function strip(el){if(!el||!el.attributes)return;for(var i=el.attributes.length-1;i>=0;i--){var n=el.attributes[i].name;if(re.test(n))el.removeAttribute(n);}}function sweep(){strip(document.documentElement);strip(document.body);var all=document.querySelectorAll('*');for(var i=0;i<all.length;i++)strip(all[i]);}try{sweep();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sweep);new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==='attributes'&&re.test(m.attributeName))m.target.removeAttribute(m.attributeName);}}).observe(document.documentElement,{attributes:true,subtree:true});}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
