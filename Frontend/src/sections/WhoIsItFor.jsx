import React from 'react';
import { Building2, BookOpen, Workflow, FlaskConical, ArrowRight } from 'lucide-react';
import Card1 from '../components/Card1';
import TextAnimate from '@/components/TextAnimation';
const AUDIENCES = [
  {
    title: 'Universities & Institutional Leadership',
    short: 'Universities',
    icon: Building2,
    description:
      'Audit degree curricula against rapidly evolving industry requirements to protect accreditation standing and graduate placement rates.',
    badge: 'Institution-Wide',
  },
  {
    title: 'Academic Departments & Faculty',
    short: 'Academic Departments',
    icon: BookOpen,
    description:
      'Identify specific missing, outdated, or redundant skills within course sequences to modernize syllabi with minimal faculty friction.',
    badge: 'Departmental',
  },
  {
    title: 'Curriculum Designers & Boards',
    short: 'Curriculum Designers',
    icon: Workflow,
    description:
      'Make evidence-based curriculum decisions backed by retrieved industry specifications rather than subjective faculty debates.',
    badge: 'Accreditation Ready',
  },
  {
    title: 'Educational & AI Researchers',
    short: 'Researchers',
    icon: FlaskConical,
    description:
      'Study curriculum–industry alignment, technological drift, and competency obsolescence using measurable, reproducible AI/ML techniques.',
    badge: 'MCA & PhD Research',
  },
];

export default function WhoIsItFor() {
  return (
    <section id="about" className="min-h-screen flex flex-col justify-center py-20 bg-[#FFF5E4] border-b border-[#850E35]/15 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 mb-4">
            <Building2 className="w-3.5 h-3.5 text-[#E36A6A]" />
            Target Stakeholders
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#850E35] tracking-tight leading-tight">
            <TextAnimate animation='slideLeft' by='character'>
              Who is  
            </TextAnimate> {' '}
            <TextAnimate animation='slideLeft' by='character' delay = {0.2}>
              <span className="text-[#E36A6A]"> SylloMetry</span> for?
            </TextAnimate>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#850E35]/80 leading-relaxed">
            Tailored specifically for educational leaders and researchers dedicated to bridging pedagogical rigor with modern production engineering reality.
          </p>
        </div>

        {/* 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {AUDIENCES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card1
                key={idx}
                className="bg-white rounded-2xl border border-[#850E35]/15 p-6 flex flex-col justify-between card-interactive group h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-[#FFF5E4] border border-[#850E35]/15 flex items-center justify-center text-[#850E35] group-hover:bg-[#850E35] group-hover:text-[#FFFBF1] transition-colors shadow-2xs">
                      <Icon className="w-5 h-5 card-icon" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFF5E4] border border-[#850E35]/20 text-[#850E35]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#850E35] mb-2 leading-snug group-hover:text-[#E36A6A] transition-colors">
                    {item.short}
                  </h3>

                  <p className="text-xs text-[#850E35]/80 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-[#850E35]/10 flex items-center justify-between text-xs text-[#850E35]/60 font-medium">
                  <span>Stakeholder 0{idx + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#850E35]/30 group-hover:text-[#850E35] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card1>
            );
          })}
        </div>
      </div>
    </section>
  );
}
