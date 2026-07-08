import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBar from "@/components/TrustBar";
import RealitySection from "@/components/RealitySection";
import ProcessSection from "@/components/ProcessSection";
import OfferSection from "@/components/OfferSection";
import RiskReversal from "@/components/RiskReversal";
import PreCloseSection from "@/components/PreCloseSection";
import EligibilityForm from "@/components/EligibilityForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        {/* 1. Hero */}
        <HeroSection />

        {/* 2. Trust Bar */}
        {/* <TrustBar /> */}

        {/* 3. Reality / Problem */}
        <RealitySection />

        {/* 4. Process Blueprint / How it works */}
        <ProcessSection />

        {/* 5. Offer / What you get */}
        <OfferSection />

        {/* 6. Risk Reversal / Commitment */}
        <RiskReversal />

        {/* 7. Pre-Close / Qualification */}
        <PreCloseSection />

        {/* 8. Eligibility Form — the conversion point */}
        <EligibilityForm />
      </main>

      <Footer />
    </>
  );
}

