import React from 'react';
import Hero from '../sections/Hero';
import ProblemSection from '../sections/ProblemSection';
import Workflow from '../sections/Workflow';
import AIPipeline from '../sections/AIPipeline';
import WhoIsItFor from '../sections/WhoIsItFor';
import CTA from '../sections/CTA';

export default function Home() {
  return (
    <>
      {/* 1. Hero Section with Signature SylloMetry Network Visualizer */}
      <Hero />

      {/* 2. Problem Section: Education evolves. Industry evolves faster. */}
      <ProblemSection />

      {/* 3. Workflow Section: 8-Stage End-to-End Timeline */}
      <Workflow />

      {/* 4. Target Audiences: Who is it for? */}
      <WhoIsItFor />

      {/* 5. AI Pipeline Section: Behind the Intelligence */}
      <AIPipeline />

      {/* 6. Closing Institutional Call to Action */}
      <CTA />
    </>
  );
}
