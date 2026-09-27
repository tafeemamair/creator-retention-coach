import { PublicNavbar } from "@/components/marketing/PublicNavbar";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { InteractiveDemo } from "@/components/marketing/InteractiveDemo";
import { SignalGrid } from "@/components/marketing/SignalGrid";
import { RiskShowcase } from "@/components/marketing/RiskShowcase";
import { RewriteShowcase } from "@/components/marketing/RewriteShowcase";
import { PricingSection } from "@/components/marketing/PricingSection";
import { TrustSection } from "@/components/marketing/TrustSection";
import { MarketingFaq } from "@/components/marketing/MarketingFaq";
import { MarketingFinalCta } from "@/components/marketing/MarketingFinalCta";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />
      <main>
        <MarketingHero />
        <InteractiveDemo />
        <SignalGrid />
        <RiskShowcase />
        <RewriteShowcase />
        <PricingSection />
        <TrustSection />
        <MarketingFaq />
        <MarketingFinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
