import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  ChevronDown,
  Mail,
  User,
  MessageSquare,
  Search,
  Sparkles,
  BookOpen,
  Send,
  CheckCircle2,
  FileQuestion,
  Clock,
  Loader2,
} from 'lucide-react';
import { TextAnimate } from '@/components/TextAnimation';
import { AnimatedInput } from '@/components/AnimatedInput';
import { Button2 } from '@/components/Button2';

const FAQS = [
  {
    id: '1',
    category: 'AI & Methodology',
    question: 'How does SkillDelta calculate the semantic delta between academic curricula and industry skills?',
    answer:
      'SkillDelta utilizes SentenceTransformers (all-MiniLM-L6-v2) to map both academic course syllabi and industry competency descriptions into dense 384-dimensional vector spaces. It then computes directional cosine distance Delta = 1 - cos(u, v). If the distance is low (similarity >= 0.78), the competence is marked as Matched; if intermediate, Partial Match; and if distant (similarity < 0.55), a critical Skill Gap is flagged.',
  },
  {
    id: '2',
    category: 'AI & Methodology',
    question: 'What AI models and vector databases are powering the live evaluation?',
    answer:
      'The semantic pipeline is anchored on lightweight transformer embeddings combined with a PostgreSQL pgvector datastore using Hierarchical Navigable Small World (HNSW) indexing. This enables real-time vector queries across thousands of competency definitions in under 5 milliseconds.',
  },
  {
    id: '3',
    category: 'Curriculum & Academics',
    question: 'Can academic institutions and universities analyze custom syllabi?',
    answer:
      'Yes. SkillDelta accepts university syllabus files in PDF, Word, and structured Markdown. The parsing subsystem extracts Course Outcomes (COs), Program Educational Objectives (PEOs), unit breakdown, and lab modules before vectorizing.',
  },
  {
    id: '4',
    category: 'Curriculum & Academics',
    question: 'What is the precise difference between a "Partial Match" and a "Skill Gap"?',
    answer:
      'A "Partial Match" occurs when foundational theory is present (for instance, teaching Relational Algebra and basic SQL) but lacks modern applied industry counterparts (such as distributed query optimization, sharding, or real-world data pipelines). A "Skill Gap" occurs when an emergent high-demand capability (such as Vector DBs, RAG Architectures, or Kubernetes) is completely missing from the curriculum.',
  },
  {
    id: '5',
    category: 'Data & Privacy',
    question: 'Is institutional syllabus data shared or exposed to external models?',
    answer:
      'No. Institutional syllabus data is isolated and processed in strict multi-tenant silos. Mathematical embeddings generated from syllabi are strictly used for evaluation against public industry taxonomies and are never used to train public models or shared with third parties.',
  },
  {
    id: '6',
    category: 'Academic Research',
    question: 'How can our university collaborate with the MCA Academic Research Initiative?',
    answer:
      'We welcome academic departments and Boards of Study to participate as benchmark partners. Partner institutions receive priority evaluation runs, automated BoS accreditation report exports, and custom industry taxonomy tailoring. Contact our research team through the form below.',
  },
];

const CATEGORIES = ['All', 'AI & Methodology', 'Curriculum & Academics', 'Data & Privacy', 'Academic Research'];

export default function FAQSupport() {
  const [openId, setOpenId] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const toggleAccordion = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.message.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
      setTimeout(() => {
        setFormSubmitted(false);
        setFormData({ name: '', email: '', message: '' });
      }, 4000);
    }, 750);
  };

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
            <HelpCircle className="w-3.5 h-3.5 text-[#E36A6A]" />
            <TextAnimate
              as="span"
              animation="fadeIn"
              by="character"
              delay={0.1}
              duration={0.3}
            >
              Assistance & Guidance
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
            Frequently Asked Questions & Support
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
            Find quick answers about SkillDelta's AI/ML methodology, syllabus vector evaluation, institutional privacy, and academic research collaborations.
          </TextAnimate>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-[#850E35]/15" data-reveal>
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#850E35]/45" />
            <input
              type="text"
              placeholder="Search questions or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#850E35]/20 bg-white/90 text-xs sm:text-sm text-[#850E35] placeholder:text-[#850E35]/40 outline-none focus:border-[#850E35] focus:ring-2 focus:ring-[#850E35]/15 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <Button2
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? 'primary' : 'white'}
                className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#850E35] text-[#FFFBF1] shadow-xs border-[#850E35]'
                    : 'bg-white/90 text-[#850E35]/70 hover:bg-[#FFF5E4] hover:text-[#850E35] border-[#850E35]/15'
                }`}
              >
                {cat}
              </Button2>
            ))}
          </div>
        </div>

        {/* 2-Column Grid: Left FAQ Accordions, Right Contact / Support Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-16">
          {/* FAQ Accordion Cards */}
          <div className="lg:col-span-7 space-y-3.5">
            {filteredFaqs.length === 0 ? (
              <div className="p-8 rounded-2xl border border-[#850E35]/15 bg-white text-center" data-reveal>
                <FileQuestion className="w-8 h-8 text-[#850E35]/40 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-[#850E35]">No matching questions found</h4>
                <p className="text-xs text-[#850E35]/60 mt-1">
                  Try adjusting your search terms or send us a message directly using the inquiry form.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openId === faq.id;
                return (
                  <div
                    key={faq.id}
                    data-reveal=""
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden card-interactive ${
                      isOpen
                        ? 'border-[#850E35] bg-white shadow-md shadow-[#850E35]/10 ring-2 ring-[#850E35]/10'
                        : 'border-[#850E35]/15 bg-white/85 hover:border-[#850E35]/35 hover:bg-white'
                    }`}
                  >
                    <button
                      onClick={() => toggleAccordion(faq.id)}
                      className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E36A6A]">
                          {faq.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#850E35] leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                      <div
                        className={`w-7 h-7 rounded-full bg-[#FFF5E4] flex items-center justify-center text-[#850E35] shrink-0 transition-transform duration-300 ${
                          isOpen ? 'rotate-180 bg-[#850E35] text-[#FFFBF1]' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        >
                          <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#850E35]/80 leading-relaxed border-t border-[#850E35]/10">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Simple Institutional Inquiry Card with CardGlare & AnimatedInput */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl p-[2px] overflow-hidden shadow-lg group">
              {/* Rotating Glare Beam (CardGlare effect) */}
              <div
                style={{
                  background:
                    'conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 50deg, #850E35 110deg, #E36A6A 150deg, #FFF5E4 175deg, #E36A6A 200deg, #850E35 240deg, transparent 290deg, transparent 360deg)',
                }}
                className="animate-spin-glare pointer-events-none absolute -inset-[150%] opacity-80 will-change-transform"
                aria-hidden="true"
              />

              {/* Simple Clean Inner Card Surface */}
              <div className="relative z-10 w-full rounded-[14px] bg-white p-6 sm:p-7 space-y-5 border border-[#850E35]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5E4] border border-[#850E35]/20 flex items-center justify-center text-[#850E35]">
                    <MessageSquare className="w-5 h-5 text-[#850E35]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#850E35]">Institutional Inquiry</h3>
                    <p className="text-xs text-[#850E35]/65">Research initiative and technical helpdesk</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#850E35]/70 bg-[#FFF5E4]/80 p-3 rounded-xl border border-[#850E35]/10">
                  <Clock className="w-4 h-4 text-[#E36A6A] shrink-0" />
                  <span>Academic inquiries answered within 24 business hours.</span>
                </div>

                {formSubmitted ? (
                  <div className="p-6 rounded-xl bg-[#FFF5E4] border border-[#850E35]/20 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#850E35] mx-auto" />
                    <h4 className="text-sm font-bold text-[#850E35]">Inquiry Received</h4>
                    <p className="text-xs text-[#850E35]/75">
                      Thank you. Our curriculum research coordinator will reach out to your institutional email shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
                    <AnimatedInput
                      label="Your Name"
                      type="text"
                      icon={<User className="w-3.5 h-3.5" />}
                      required
                      placeholder="Dr. Jane Doe / Prof. John Smith"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />

                    <AnimatedInput
                      label="Institutional Email"
                      type="email"
                      icon={<Mail className="w-3.5 h-3.5" />}
                      required
                      placeholder="dean.cs@university.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />

                    <div>
                      <label className="block text-[11px] font-bold text-[#850E35] uppercase tracking-wider mb-1">
                        Message / Query
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Specify syllabus analysis requirements, accreditation audit dates, or API queries..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#850E35]/20 bg-white text-xs sm:text-sm text-[#850E35] placeholder:text-[#850E35]/35 outline-none transition focus:border-[#850E35] focus:ring-2 focus:ring-[#850E35]/15 resize-none"
                      />
                    </div>

                    <Button2
                      type="submit"
                      variant="default"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-[#FFFBF1] bg-[#850E35] hover:bg-[#6F0A2B] shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-white" />
                          <span>Submitting Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Inquiry</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button2>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
