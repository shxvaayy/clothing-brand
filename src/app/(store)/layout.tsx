import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import Tracker from "@/components/store/Tracker";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <Tracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
    </div>
  );
}
