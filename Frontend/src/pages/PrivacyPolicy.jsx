import React from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Server,
  FileCheck,
  Building,
  CheckCircle2,
  Calendar,
  Printer
} from 'lucide-react';
import { TextAnimate } from '@/components/TextAnimation';
import { Card } from '@/components/Card1';
import { Button1 } from '@/components/Button1';
import { Button2 } from '@/components/Button2';

export default function PrivacyPolicy() {
  const handlePrint = () => {
    window.print();
  };

  const KEY_PILLARS = [
    {
      icon: EyeOff,
      title: 'Zero Data Resale',
      description: 'We do not monetize, license, or sell institutional syllabus files to advertisers or commercial brokers.',
    },
    {
      icon: Lock,
      title: 'Encrypted Vector Latency',
      description: 'Competencies are encoded into 384-dim mathematical vectors. Raw text is isolated in secure, tenant-scoped storage.',
    },
    {
      icon: Building,
      title: 'Institutional Sovereignty',
      description: 'Universities and authoring professors retain 100% intellectual property ownership over all uploaded curriculum documents.',
    },
  ];

  const SECTIONS = [
    {
      title: '1. Information We Collect',
      content:
        'When academic institutions, faculty, or students use SylloMetry, we collect curriculum data including Course Outlines, Unit breakdowns, Course Outcomes (COs), and Program Outcomes (PEOs). For account access, we collect basic administrative information (name, institutional email address, department affiliation). We do not collect student personal records, grades, or sensitive private personal identifiers.',
    },
    {
      title: '2. How Information is Processed',
      content:
        'Uploaded syllabi are parsed solely for the purpose of vector embedding generation using SentenceTransformers and pgvector. These embeddings are mathematically compared against open and aggregated market skill distributions to produce quantitative gap assessments and Board of Studies recommendations. Syllabi are not used to train generative frontier models without explicit written institutional consent.',
    },
    {
      title: '3. Data Security & Storage Architecture',
      content:
        'All data is encrypted in transit using TLS 1.3 and at rest utilizing AES-256 encryption. Institutional datasets reside in partitioned PostgreSQL schemas with strict row-level security (RLS). Access to production databases is restricted to verified research engineers with multi-factor authentication and continuous audit logging.',
    },
    {
      title: '4. Third-Party Services & Hosting',
      content:
        'SylloMetry operates on enterprise cloud infrastructure complying with ISO/IEC 27001 and SOC 2 standards. We do not embed commercial advertising tracking pixels, third-party behavioral profiling cookies, or invasive analytics on university dashboards.',
    },
    {
      title: '5. Retention & Permanent Deletion Protocols',
      content:
        'Institutions maintain the unrestricted right to request complete erasure of their curriculum files and derived vector indexes at any time. Upon receiving a formal deletion request from an authorized department email, all associated database records are irreversibly purged within 72 hours.',
    },
    {
      title: '6. Academic Research Disclosures',
      content:
        'As part of the MCA Academic Research Initiative, anonymized high-level curriculum alignment trends (e.g., "72% of modern computer networks courses lack hands-on Docker deployment labs") may be published in empirical academic peer-reviewed papers. In all instances, institutional names, faculty authors, and proprietary course titles are rigorously scrubbed and anonymized.',
    },
    {
      title: '7. Contact Our Data Governance Team',
      content:
        'For inquiries regarding institutional data agreements, Data Processing Addendums (DPAs), or custom privacy compliance requirements, please email us at research.privacy@syllometry.edu or contact the Department of Computer Applications research office.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-28 pb-20 selection:bg-[#E36A6A]/25 selection:text-[#850E35]">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[380px] bg-gradient-to-b from-[#FFF5E4]/80 to-transparent pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Badge & Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 mb-3 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E36A6A]" />
              <TextAnimate
                as="span"
                animation="fadeIn"
                by="character"
                delay={0.1}
                duration={0.3}
              >
                Institutional Trust & Governance
              </TextAnimate>
            </motion.div>

            {/* Title */}
            <TextAnimate
              as="h1"
              animation="slideUp"
              by="word"
              delay={0.2}
              duration={0.4}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#850E35]"
            >
              Privacy Policy
            </TextAnimate>
          </div>

        <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#850E35]/65 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Effective: September 2026</span>
            </span>
            <Button2
              onClick={handlePrint}
              variant="white"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#850E35]/20 bg-white hover:bg-[#FFF5E4] text-xs font-semibold text-[#850E35] shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </Button2>
          </div>
        </div>

        {/* 3 Key Trust Pillars Grid with Card1 & Cursor Glow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12" data-reveal>
          {KEY_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Card key={i} data-reveal="" className="h-full p-5 sm:p-6 flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#FFF5E4] border border-[#850E35]/20 flex items-center justify-center text-[#850E35] group-hover:scale-105 group-hover:bg-[#850E35] group-hover:text-[#FFFBF1] transition-all mb-3.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#850E35] mb-1.5 group-hover:text-[#E36A6A] transition-colors">{pillar.title}</h3>
                  <p className="text-xs text-[#850E35]/70 leading-relaxed">{pillar.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Comprehensive Policy Document Card */}
        <div className="p-6 sm:p-10 rounded-2xl border border-[#850E35]/15 bg-white/95 shadow-sm space-y-8" data-reveal>
          <div className="pb-6 border-b border-[#850E35]/15">
            <h2 className="text-lg font-bold text-[#850E35] mb-2">Introduction & Scope</h2>
            <p className="text-xs sm:text-sm text-[#850E35]/80 leading-relaxed">
              SylloMetry (&quot;we,&quot; &quot;our,&quot; or &quot;the Platform&quot;) is an academic curriculum intelligence research initiative dedicated to evaluating higher education syllabi against current industrial competency standards. This Privacy Policy describes our practices regarding the collection, processing, and protection of syllabus files, institutional accounts, and derived vector metadata.
            </p>
          </div>

          <div className="space-y-7">
            {SECTIONS.map((sec, idx) => (
              <div key={idx} data-reveal="" className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-[#850E35] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#E36A6A] shrink-0" />
                  <span>{sec.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-[#850E35]/80 leading-relaxed pl-6">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-[#850E35]/15 bg-[#FFF5E4]/50 -mx-6 sm:-mx-10 -mb-6 sm:-mb-10 p-6 sm:p-8 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#850E35]/75 text-center sm:text-left">
              Questions regarding our research data governance protocol?
            </div>
            <Button1
              href="mailto:research.privacy@syllometry.edu"
              className="px-6 py-4 rounded-xl text-xs font-semibold bg-[#850E35] text-[#FFFBF1] hover:bg-[#6F0A2B] transition-all shadow-xs"
            >
              Contact Data Protection
            </Button1>
          </div>
        </div>
      </div>
    </div>
  );
}
