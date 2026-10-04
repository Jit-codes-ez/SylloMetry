import React, { useState } from 'react';
import {
  Upload,
  FileText,
  BrainCircuit,
  Network,
  DatabaseZap,
  ScanSearch,
  FileCheck2,
  Lightbulb,
  ArrowRight,
  Workflow as WorkflowIcon
} from 'lucide-react';
import Card1 from '../components/Card1';
import Card2 from '../components/Card2';
import { TextAnimate } from '@/components/TextAnimation';
import { Button2 } from '@/components/Button2';

const STEPS = [
  {
    num: '01',
    title: 'Upload Curriculum',
    icon: Upload,
    description: 'Ingest institutional syllabi, course schedules, and accreditation documents in PDF or DOCX formats.',
    detail: 'Layout-aware parsing parses lecture outlines, textbook citations, and prerequisites.',
  },
  {
    num: '02',
    title: 'Extract Content',
    icon: FileText,
    description: 'Deconstruct curriculum files into granular learning modules, weekly lectures, and lab assignments.',
    detail: 'Semantic chunking partitions course content into discrete pedagogical units.',
  },
  {
    num: '03',
    title: 'Identify Skills',
    icon: BrainCircuit,
    description: 'Extract technical primitives, programming paradigms, tooling systems, and conceptual skills.',
    detail: 'Named Entity Recognition (NER) identifies both explicit and implicit CS concepts.',
  },
  {
    num: '04',
    title: 'Normalize Skills',
    icon: Network,
    description: 'Project extracted skill entities into standardized canonical terminology and vector taxonomies.',
    detail: 'Maps diverse lexical naming variations to unified ontology nodes.',
  },
  {
    num: '05',
    title: 'Compare with Industry',
    icon: DatabaseZap,
    description: 'Execute high-dimensional semantic search against thousands of active engineering job requirements.',
    detail: 'Cosine similarity computes manifold distance to production industry clusters.',
  },
  {
    num: '06',
    title: 'Detect Gaps',
    icon: ScanSearch,
    description: 'Identify absent foundational prerequisites, outdated frameworks, and emerging industry gaps.',
    detail: 'Threshold scoring flags areas where market demand drastically exceeds syllabus coverage.',
  },
  {
    num: '07',
    title: 'Retrieve Evidence',
    icon: FileCheck2,
    description: 'Retrieve real-world industry evidence, job specifications, and technological adoption indices.',
    detail: 'RAG architecture grounds all findings in verified hiring criteria.',
  },
  {
    num: '08',
    title: 'Generate Recommendations',
    icon: Lightbulb,
    description: 'Synthesize actionable, credit-aligned module updates and laboratory exercises for faculty committees.',
    detail: 'Produces accredited curriculum recommendations ready for board evaluation.',
  },
];

export default function Workflow() {
  const [selectedStep, setSelectedStep] = useState(0);

  return (
    <section id="workflow" className="min-h-screen flex flex-col justify-center py-20 bg-[#FFFBF1] border-b border-[#850E35]/15 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 mb-4">
            <WorkflowIcon className="w-3.5 h-3.5" />
            System Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#850E35] tracking-tight leading-tight">
          <TextAnimate animation="slideLeft" by="character">
            How SylloMetry works,
          </TextAnimate>{' '}
            <span className="text-[#E36A6A]">
            <TextAnimate animation="slideLeft" by="character" delay={0.2}>step by step</TextAnimate>
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#850E35]/80 leading-relaxed">
            An 8-stage end-to-end data intelligence process that converts unstructured academic syllabi into evidence-backed, actionable curriculum enhancements.
          </p>
        </div>

        {/* 8-Step Process Grid (Horizontal desktop, vertical mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = selectedStep === idx;
            return (
              <Card2
                key={idx}
                onClick={() => setSelectedStep(idx)}
                className={`bg-white rounded-2xl border border-[#850E35]/15 p-5 flex flex-col justify-between group relative overflow-visible cursor-pointer h-full ${
                  isSelected ? 'border-l-[#850E35] shadow-md' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[#850E35] text-[#FFFBF1]'
                          : 'bg-[#FFFBF1] text-[#850E35]/70 group-hover:bg-[#850E35] group-hover:text-[#FFFBF1]'
                      }`}
                    >
                      {step.num}
                    </span>
                    <Icon
                      className={`w-5 h-5 card-icon ${
                        isSelected ? 'text-[#850E35]' : 'text-[#850E35]/50 group-hover:text-[#850E35]'
                      }`}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-[#850E35] mb-2 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-xs text-[#850E35]/80 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#850E35]/10 flex items-center justify-between text-[11px] text-[#850E35]/50 font-medium">
                  <span>Phase {idx + 1}</span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-[#850E35] translate-x-0.5' : 'text-[#850E35]/30'
                    }`}
                  />
                </div>
              </Card2>
            );
          })}
        </div>

        {/* Active Step Drilldown Telemetry Box */}
        <Card1 className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#850E35]/25 p-6 sm:p-8 shadow-xs card-interactive">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 w-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#850E35] text-[#FFFBF1] flex items-center justify-center shrink-0 shadow-xs shadow-[#850E35]/20">
                {React.createElement(STEPS[selectedStep].icon, { className: 'w-6 h-6' })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20">
                    STAGE {STEPS[selectedStep].num}
                  </span>
                  <span className="text-xs font-medium text-[#850E35]/60">Methodology Detail</span>
                </div>
                <h4 className="text-lg font-bold text-[#850E35] mt-1">
                  {STEPS[selectedStep].title}
                </h4>
                <p className="text-xs sm:text-sm text-[#850E35]/85 mt-1 leading-relaxed">
                  {STEPS[selectedStep].detail}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2.5 shrink-0">
              <Button2
                type="button"
                onClick={() => setSelectedStep((selectedStep + 1) % STEPS.length)}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#850E35] hover:bg-[#6F0A2B] active:scale-95 text-[#FFFBF1] text-xs font-semibold shadow-xs shadow-[#850E35]/25 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button2>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium text-[#850E35]/60">
                  Stage {selectedStep + 1} of {STEPS.length}
                </span>
                <div className="flex items-center gap-1">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedStep(i)}
                      aria-label={`Go to stage ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                        selectedStep === i
                          ? 'w-3.5 bg-[#850E35]'
                          : 'w-1.5 bg-[#850E35]/20 hover:bg-[#850E35]/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card1>
      </div>
    </section>
  );
}
