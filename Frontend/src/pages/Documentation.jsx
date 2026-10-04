import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Cpu,
  Layers,
  Database,
  GitBranch,
  CheckCircle2,
  ArrowRight,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TextAnimate } from '@/components/TextAnimation';
import { Card } from '@/components/Card1';
import { Button1 } from '@/components/Button1';
import { Button2 } from '@/components/Button2';


const DOC_SECTIONS = [
  {
    id: 'overview',
    title: 'System Architecture',
    badge: 'Core Engine',
    icon: Cpu,
    description:
      'SylloMetry is built on an empirical natural language processing and dense vector embedding pipeline that measures the semantic delta between academic curricula and live industry job competencies.',
    details: [
      'Pretrained SentenceTransformers (all-MiniLM-L6-v2) for contextual semantic encoding.',
      '384-dimensional dense vector embeddings representing syllabus topics and industry skills.',
      'Cosine similarity metric Delta = 1 - cos(u, v) for empirical gap quantification.',
      'PostgreSQL with pgvector for fast vector indexing and sub-millisecond similarity searches.',
    ],
  },
  {
    id: 'ingestion',
    title: 'Curriculum Ingestion Engine',
    badge: 'NLP Parser',
    icon: Layers,
    description:
      'Extracts structured competence hierarchies from unstructured academic syllabi, course outcomes (COs), and program educational objectives (PEOs).',
    details: [
      'Document parsing supporting PDF, DOCX, and syllabus markdown structures.',
      'Bloom taxonomy keyword extraction and cognitive depth mapping.',
      'Hierarchical course decomposition: Unit -> Topic -> Skill Vector.',
      'Automated deduplication and normalization of terminology across academic boards.',
    ],
  },
  {
    id: 'industry-matching',
    title: 'Semantic Alignment & Gap Detection',
    badge: 'Vector Mathematics',
    icon: Database,
    description:
      'Evaluates curriculum coverage against a real-time vector database of industry demands, categorizing each competency into Full Match, Partial Match, or Skill Gap.',
    details: [
      'Full Match (similarity >= 0.78): Core competencies solidly fulfilled by the curriculum.',
      'Partial Match (0.55 <= similarity < 0.78): Foundational theory taught, but lacking modern frameworks.',
      'Skill Gap (similarity < 0.55): Emergent industry demands completely unaddressed by the current syllabus.',
      'Graph-based bipartite alignment guaranteeing zero orphan curriculum nodes in visual reports.',
    ],
  },
  {
    id: 'recommendations',
    title: 'Curriculum Recommendation Engine',
    badge: 'Advisory ML',
    icon: GitBranch,
    description:
      'Generates evidence-backed upgrade proposals, recommended elective modules, and hands-on lab specifications for University Boards of Study (BoS).',
    details: [
      'Identifies the exact minimum syllabus modification required to bridge critical skill gaps.',
      'Proposes prerequisite-compatible elective units (e.g., LLM Systems, Kubernetes).',
      'Provides empirical citation of market demand data backing every suggested course amendment.',
      'Automated executive PDF reports formatted for academic accreditation audits.',
    ],
  },
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');

  const filteredSections = DOC_SECTIONS.filter((sec) => {
    const matchesSearch =
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedSection === 'all' || sec.id === selectedSection;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-28 pb-20 selection:bg-[#E36A6A]/25 selection:text-[#850E35]">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[380px] bg-gradient-to-b from-[#FFF5E4]/80 to-transparent pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Badge & Title */}
          <div className="max-w-3xl mb-12">
            {/* Badge container animated in first */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 mb-4 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#E36A6A]" />
              <TextAnimate
                as="span"
                animation="fadeIn"
                by="character"
                delay={0.1}
                duration={0.3}
              >
                Platform Documentation
              </TextAnimate>
            </motion.div>

            {/* Main heading */}
            <TextAnimate
              as="h1"
              animation="slideUp"
              by="word"
              delay={0.2}
              duration={0.45}
              className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#850E35] mb-4"
            >
              System Architecture & Technical Reference
            </TextAnimate>

            {/* Description paragraph */}
            <TextAnimate
              as="p"
              animation="fadeIn"
              by="word"
              delay={0.4}
              duration={0.5}
              className="text-base sm:text-lg text-[#850E35]/75 leading-relaxed"
            >
              Comprehensive documentation for the SylloMetry curriculum intelligence platform, dense vector embedding pipeline, and semantic matching algorithms.
            </TextAnimate>
          </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#850E35]/15" data-reveal>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#850E35]/45" />
            <input
              type="text"
              placeholder="Search architecture, algorithms, vector metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#850E35]/20 bg-white/90 text-xs sm:text-sm text-[#850E35] placeholder:text-[#850E35]/40 outline-none focus:border-[#850E35] focus:ring-2 focus:ring-[#850E35]/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Button2
              onClick={() => setSelectedSection('all')}
              variant={selectedSection === 'all' ? 'primary' : 'white'}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                selectedSection === 'all'
                  ? 'bg-[#850E35] text-[#FFFBF1] shadow-xs border-[#850E35]'
                  : 'bg-white/90 text-[#850E35]/70 hover:bg-[#FFF5E4] hover:text-[#850E35] border-[#850E35]/15'
              }`}
            >
              All Modules
            </Button2>
            {DOC_SECTIONS.map((sec) => (
              <Button2
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                variant={selectedSection === sec.id ? 'primary' : 'white'}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedSection === sec.id
                    ? 'bg-[#850E35] text-[#FFFBF1] shadow-xs border-[#850E35]'
                    : 'bg-white/90 text-[#850E35]/70 hover:bg-[#FFF5E4] hover:text-[#850E35] border-[#850E35]/15'
                }`}
              >
                {sec.title}
              </Button2>
            ))}
          </div>
        </div>

        {/* Documentation Module Cards Grid with Card1 & Cursor Glow */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Card
                key={sec.id}
                data-reveal=""
                className="h-full p-6 sm:p-7 flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF5E4] border border-[#850E35]/20 flex items-center justify-center text-[#850E35] group-hover:scale-105 group-hover:bg-[#850E35] group-hover:text-[#FFFBF1] transition-all duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20">
                      {sec.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#850E35] mb-2 group-hover:text-[#E36A6A] transition-colors">
                    {sec.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#850E35]/75 leading-relaxed mb-5">
                    {sec.description}
                  </p>

                  <div className="space-y-2 pt-4 border-t border-[#850E35]/10">
                    {sec.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#850E35]/85">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E36A6A] shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 flex items-center text-xs font-semibold text-[#850E35] group-hover:translate-x-1 transition-transform">
                  <span>Explore module specifications</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Links & CTA Bar */}
        <div className="p-8 rounded-2xl border border-[#850E35]/15 bg-[#FFF5E4] flex flex-col sm:flex-row items-center justify-between gap-6" data-reveal>
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg font-bold text-[#850E35]">Need help with implementation?</h4>
            <p className="text-xs sm:text-sm text-[#850E35]/70">
              Check our FAQ for frequently asked questions or connect with our research engineering team.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to = "/faq">
            <Button1
              variant="default"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#FFFBF1] bg-[#850E35] hover:bg-[#6F0A2B] shadow-xs cursor-pointer"
            >
              <span>Visit FAQ & Support</span>
            </Button1>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
