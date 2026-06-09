import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBar from "@/components/TrustBar";
import RealitySection from "@/components/RealitySection";
import OfferSection from "@/components/OfferSection";
import RiskReversal from "@/components/RiskReversal";
import PreCloseSection from "@/components/PreCloseSection";
import EligibilityForm from "@/components/EligibilityForm";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. Trust Bar */}
        <TrustBar />

        {/* 3. Reality / Problem */}
        <RealitySection />

        {/* 4. Offer / What you get */}
        <OfferSection />

        {/* 5. Risk Reversal / Commitment */}
        <RiskReversal />

        {/* 6. Pre-Close / Qualification */}
        <PreCloseSection />

        {/* 7. Eligibility Form — the conversion point */}
        <EligibilityForm />
      </main>

      <Footer />

      {/* Sticky bottom CTA bar */}
      <StickyBottomCTA />

      {/* Spacer so content isn't hidden behind sticky bar */}
      <div className="sticky-spacer" aria-hidden />
    </>
  );
}
