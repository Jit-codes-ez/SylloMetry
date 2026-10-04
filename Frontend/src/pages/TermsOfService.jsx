import React from 'react';
import { motion } from 'motion/react';
import {
  Scale,
  FileText,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Printer,
  Shield,
  HelpCircle
} from 'lucide-react';
import { TextAnimate } from '@/components/TextAnimation';
import { Card } from '@/components/Card1';
import { Button1 } from '@/components/Button1';
import { Button2 } from '@/components/Button2';

export default function TermsOfService() {
  const handlePrint = () => {
    window.print();
  };

  const HIGHLIGHTS = [
    {
      icon: Award,
      title: 'Academic Advisory',
      description: 'SylloMetry provides quantitative, evidence-grounded insights for curriculum benchmarking and BoS committees.',
    },
    {
      icon: Scale,
      title: 'Syllabus Copyright',
      description: 'Universities and authoring professors retain 100% intellectual property ownership over their course materials.',
    },
    {
      icon: Shield,
      title: 'Fair Research Use',
      description: 'Platform access is intended for academic evaluation, department enhancements, and curriculum intelligence research.',
    },
  ];

  const SECTIONS = [
    {
      title: '1. Acceptance of Terms',
      content:
        'By accessing or utilizing the SylloMetry platform ("Service"), institutional users, faculty members, academic administrators, and students agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a university, college, or academic department, you represent that you hold the authority to bind that entity to these terms.',
    },
    {
      title: '2. Educational Advisory & Non-Statutory Disclaimer',
      content:
        'SylloMetry computes empirical vector similarity scores between academic syllabi and current industrial competency distributions. All similarity indexes, percentage ratings, and curriculum recommendations are informational research outputs designed to empower Boards of Study (BoS) and academic leadership. SylloMetry is not a statutory accreditation body, and its reports do not substitute for official university senate or national regulatory accreditation filings.',
    },
    {
      title: '3. Intellectual Property Rights & Syllabus Ownership',
      content:
        'You retain all copyright, authorship rights, and intellectual property ownership in any syllabus, curriculum outline, or course documentation you submit to the Service. By uploading content, you grant SylloMetry a limited, non-exclusive, worldwide, royalty-free license solely to parse, vectorize, compute mathematical similarities, and generate institutional analytics requested by your account.',
    },
    {
      title: '4. Acceptable Use & Account Integrity',
      content:
        'Users agree not to: (a) attempt to reverse-engineer, decompile, or extract the underlying model weights or dense embedding matrix; (b) conduct automated denial-of-service or scraping attacks against SylloMetry APIs; (c) upload malicious, defamatory, or unlawful documentation; or (d) impersonate other academic institutions or accreditation officers.',
    },
    {
      title: '5. Platform Availability & Service Levels',
      content:
        'While we strive for 99.9% uptime across all analytical endpoints, SylloMetry is provided on an "as is" and "as available" research basis. Periodic maintenance windows, model updates, and dataset recalculations may be scheduled with advance notice provided via institutional dashboards.',
    },
    {
      title: '6. Limitation of Liability',
      content:
        'To the maximum extent permitted by applicable law, SylloMetry, its researchers, and partner institutions shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from decisions made during curriculum revisions, hiring outcomes, or university accreditation audits.',
    },
    {
      title: '7. Modifications to Service & Terms',
      content:
        'We reserve the right to modify or replace these Terms of Service to reflect algorithmic advancements, new regulatory standards, or research protocol revisions. Updated versions will be posted on this page with an updated "Effective Date." Continued use of the platform after modifications constitutes agreement to the amended terms.',
    },
    {
      title: '8. Institutional Inquiries & Governing Jurisdiction',
      content:
        'These terms shall be governed by and construed in accordance with the laws governing higher educational research institutions. For customized university memoranda of understanding (MoUs) or institutional licensing questions, please contact our research board at legal.research@syllometry.edu.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-28 pb-20 selection:bg-[#E36A6A]/25 selection:text-[#850E35]">
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[380px] bg-gradient-to-b from-[#FFF5E4]/80 to-transparent pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 mb-3 shadow-2xs"
            >
              <Scale className="w-3.5 h-3.5 text-[#E36A6A]" />
              <TextAnimate
                as="span"
                animation="fadeIn"
                by="character"
                delay={0.1}
                duration={0.3}
              >
                Academic Governance & Terms
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
              Terms of Service
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

        {/* 3 Key Highlights with Card1 & Cursor Glow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12" data-reveal>
          {HIGHLIGHTS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} data-reveal="" className="h-full p-5 sm:p-6 flex flex-col justify-between group cursor-pointer">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#FFF5E4] border border-[#850E35]/20 flex items-center justify-center text-[#850E35] group-hover:scale-105 group-hover:bg-[#850E35] group-hover:text-[#FFFBF1] transition-all mb-3.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#850E35] mb-1.5 group-hover:text-[#E36A6A] transition-colors">{item.title}</h3>
                  <p className="text-xs text-[#850E35]/70 leading-relaxed">{item.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Comprehensive Terms Card */}
        <div className="p-6 sm:p-10 rounded-2xl border border-[#850E35]/15 bg-white/95 shadow-sm space-y-8" data-reveal>
          <div className="pb-6 border-b border-[#850E35]/15">
            <h2 className="text-lg font-bold text-[#850E35] mb-2">Preamble & Agreement</h2>
            <p className="text-xs sm:text-sm text-[#850E35]/80 leading-relaxed">
              These Terms of Service govern your access to and use of the SylloMetry software application, analytical vector indexes, and curriculum comparison tools. Please read these terms carefully before utilizing our platform for institutional syllabus reviews or accreditation assessments.
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
              Questions regarding institutional academic licensing or MoUs?
            </div>
            <Button1
              href="mailto:legal.research@syllometry.edu"
              className="px-6 py-4 rounded-xl text-xs font-semibold bg-[#850E35] text-[#FFFBF1] hover:bg-[#6F0A2B] transition-all shadow-xs"
            >
              Contact Legal Office
            </Button1>
          </div>
        </div>
      </div>
    </div>
  );
}
