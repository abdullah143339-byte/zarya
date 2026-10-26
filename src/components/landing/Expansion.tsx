"use client";

import Atmosphere from "@/components/landing/Atmosphere";
import SectionIntro from "@/components/landing/SectionIntro";
import GrowthVisual from "@/components/landing/GrowthVisual";

export default function Expansion() {
  return (
    <section id="expansion" className="relative py-28 sm:py-36 overflow-hidden">
      <Atmosphere variant="expansion" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionIntro
          index="05"
          label="Expansion"
          title="One ecosystem, expanding outward."
          highlightWords={["expanding"]}
          sub="Communities, projects, learning, reels, marketplace — each part of NOVAX grows into the others. The platform is designed to widen in every direction."
        />

        <GrowthVisual />
      </div>
    </section>
  );
}
