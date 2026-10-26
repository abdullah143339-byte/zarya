import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/layout/Footer";
import NovaxBackground from "@/components/NovaxBackground/NovaxBackground";

export default function Home() {
  return (
    <main className="relative bg-[#040405]">
      <NovaxBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Stats />
        <Features />
        <CTA />
        <Footer />
      </div>
    </main>
  );
}
