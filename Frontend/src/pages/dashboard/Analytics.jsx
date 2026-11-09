import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  CircleCheck,
  Code2,
  Download,
  FileText,
  Flame,
  Gauge,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button2 } from "@/components/Button2";
import { DashboardSkeleton } from "@/components/ClassicSkeleton";

const growthData = [
  { month: "Apr", score: 54 },
  { month: "May", score: 59 },
  { month: "Jun", score: 63 },
  { month: "Jul", score: 67 },
  { month: "Aug", score: 72 },
  { month: "Sep", score: 78 },
];

const skills = [
  { name: "Java", score: 88 },
  { name: "SQL", score: 84 },
  { name: "React", score: 78 },
  { name: "Python", score: 74 },
  { name: "Spring Boot", score: 67 },
  { name: "Machine Learning", score: 54 },
];

const gaps = [
  {
    name: "Spring Security",
    level: "High Priority",
    score: 42,
    description: "Authentication, authorization and JWT security",
  },
  {
    name: "Docker",
    level: "Medium Priority",
    score: 58,
    description: "Containers, images and Docker Compose",
  },
  {
    name: "AWS",
    level: "Low Priority",
    score: 71,
    description: "Cloud deployment and basic AWS services",
  },
];

const recommendations = [
  {
    title: "Spring Security",
    category: "Backend",
    progress: 35,
    lessons: "8 lessons",
    time: "3h 20m",
  },
  {
    title: "Docker Fundamentals",
    category: "DevOps",
    progress: 20,
    lessons: "6 lessons",
    time: "2h 40m",
  },
  {
    title: "AWS Essentials",
    category: "Cloud",
    progress: 0,
    lessons: "10 lessons",
    time: "4h 10m",
  },
];

const simulationRoles = {
  "Full Stack Developer": {
    description: "Build production-ready web applications across frontend and backend.",
    baseScore: 76,
    skills: {
      "Spring Security": { current: 42, projected: 70, impact: 5 },
      Docker: { current: 58, projected: 76, impact: 4 },
      AWS: { current: 71, projected: 82, impact: 2 },
      "Machine Learning": { current: 54, projected: 65, impact: 2 },
    },
    roadmap: [
      "Spring Security",
      "Docker",
      "AWS",
      "Production Deployment",
    ],
  },

  "Java Backend Developer": {
    description: "Focus on scalable Java services, APIs, security and deployment.",
    baseScore: 76,
    skills: {
      "Spring Security": { current: 42, projected: 74, impact: 6 },
      Docker: { current: 58, projected: 78, impact: 4 },
      AWS: { current: 71, projected: 84, impact: 3 },
      SQL: { current: 84, projected: 91, impact: 2 },
    },
    roadmap: [
      "Spring Security",
      "REST API Design",
      "Docker",
      "AWS",
    ],
  },

  "AI / ML Engineer": {
    description: "Develop intelligent systems using machine learning and production AI.",
    baseScore: 76,
    skills: {
      "Machine Learning": { current: 54, projected: 78, impact: 7 },
      Python: { current: 74, projected: 86, impact: 4 },
      Docker: { current: 58, projected: 72, impact: 3 },
      AWS: { current: 71, projected: 82, impact: 3 },
    },
    roadmap: [
      "Machine Learning",
      "Model Deployment",
      "Docker",
      "Cloud AI",
    ],
  },

  "Frontend Developer": {
    description: "Create modern, responsive and scalable user experiences.",
    baseScore: 76,
    skills: {
      React: { current: 78, projected: 90, impact: 5 },
      JavaScript: { current: 72, projected: 86, impact: 4 },
      Docker: { current: 58, projected: 70, impact: 2 },
      AWS: { current: 71, projected: 80, impact: 2 },
    },
    roadmap: [
      "Advanced React",
      "Performance Optimization",
      "Docker",
      "Cloud Deployment",
    ],
  },
};

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFF5E4]">
      <div
        className="h-full rounded-full bg-[#850E35] transition-all duration-700"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, description }) {
  return (
    <div className="group rounded-2xl border border-[#850E35]/10 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#850E35]/25 hover:shadow-md card-interactive">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#850E35]/10 bg-[#FFF5E4] text-[#850E35] transition-colors group-hover:bg-[#850E35] group-hover:text-white">
          <Icon size={19} />
        </div>

        {change && (
          <span className="flex items-center gap-1 rounded-full border border-[#E36A6A]/20 bg-[#FFF5E4] px-2.5 py-1 text-[11px] font-semibold text-[#850E35]">
            <TrendingUp size={12} />
            {change}
          </span>
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-[#850E35]/50">
        {label}
      </p>

      <h3 className="mt-1 text-3xl font-bold tracking-tight text-[#850E35]">
        {value}
      </h3>

      <p className="mt-2 text-xs text-[#850E35]/55">
        {description}
      </p>
    </div>
  );
}

function CareerSimulationLab() {
  const [targetRole, setTargetRole] = useState("Full Stack Developer");
  const [selectedSkills, setSelectedSkills] = useState([
    "Spring Security",
    "Docker",
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationRun, setSimulationRun] = useState(false);
  const [addedToRoadmap, setAddedToRoadmap] = useState(false);

  const role = simulationRoles[targetRole];

  const simulatedScore = useMemo(() => {
    if (!simulationRun) {
      return role.baseScore;
    }

    const improvement = selectedSkills.reduce((total, skill) => {
      return total + (role.skills[skill]?.impact || 0);
    }, 0);

    return Math.min(100, role.baseScore + improvement);
  }, [role, selectedSkills, simulationRun]);

  const toggleSkill = (skill) => {
    setAddedToRoadmap(false);

    setSelectedSkills((current) => {
      if (current.includes(skill)) {
        return current.filter((item) => item !== skill);
      }

      return [...current, skill];
    });

    setSimulationRun(false);
  };

  const runSimulation = () => {
    if (selectedSkills.length === 0) {
      return;
    }

    setIsSimulating(true);
    setSimulationRun(false);
    setAddedToRoadmap(false);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationRun(true);
    }, 900);
  };

  const handleRoleChange = (roleName) => {
    setTargetRole(roleName);
    setSimulationRun(false);
    setAddedToRoadmap(false);

    const firstTwoSkills = Object.keys(
      simulationRoles[roleName].skills
    ).slice(0, 2);

    setSelectedSkills(firstTwoSkills);
  };

  const improvement = simulatedScore - role.baseScore;

  return (
    <section
      id="career-simulation"
      data-reveal
      className="mb-7 scroll-mt-24 overflow-hidden rounded-2xl border border-[#850E35]/10 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="border-b border-[#850E35]/8 bg-[#FFFBF1] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#850E35] text-white">
                <Sparkles size={15} />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E36A6A]">
                Experimental Feature
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-[#850E35]">
              Career Simulation Lab
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#850E35]/50">
              What happens to your career readiness if you strengthen specific
              skills? Build a scenario and simulate your next step.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#850E35]/10 bg-white px-3 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E36A6A]" />

            <span className="text-[9px] font-bold uppercase tracking-wider text-[#850E35]/55">
              Frontend Simulation
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        {/* Controls */}
        <div className="border-b border-[#850E35]/8 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-6">
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[#850E35]/45">
              Target Career
            </label>

            <select
              value={targetRole}
              onChange={(event) => handleRoleChange(event.target.value)}
              className="w-full rounded-xl border border-[#850E35]/12 bg-[#FFFBF1] px-3 py-3 text-xs font-bold text-[#850E35] outline-none transition focus:border-[#850E35]/35"
            >
              {Object.keys(simulationRoles).map((roleName) => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>

            <p className="mt-2 text-[10px] leading-4 text-[#850E35]/45">
              {role.description}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#850E35]/45">
                Skills to Improve
              </label>

              <span className="text-[9px] font-bold text-[#E36A6A]">
                {selectedSkills.length} selected
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(role.skills).map(([skill, data]) => {
                const selected = selectedSkills.includes(skill);

                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-[#850E35]/25 bg-[#FFF5E4]"
                        : "border-[#850E35]/8 bg-[#FFFBF1] hover:border-[#850E35]/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                          selected
                            ? "border-[#850E35] bg-[#850E35] text-white"
                            : "border-[#850E35]/15 bg-white text-transparent"
                        }`}
                      >
                        <CircleCheck size={14} />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-[#850E35]">
                          {skill}
                        </p>

                        <p className="mt-0.5 text-[9px] text-[#850E35]/45">
                          Current {data.current}% → Projected {data.projected}%
                        </p>
                      </div>
                    </div>

                    <span className="text-[9px] font-bold text-[#E36A6A]">
                      +{data.impact}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating || selectedSkills.length === 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#850E35] px-4 py-3.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#6e092c] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isSimulating ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Running Simulation...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Run Simulation</span>
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="p-5 sm:p-6">
          {isSimulating ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center p-6 animate-in fade-in duration-200">
              <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF5E4] text-[#850E35] shadow-xs">
                <Loader2 size={28} className="animate-spin text-[#850E35]" />
              </div>

              <span className="mb-2 inline-block rounded-full border border-[#850E35]/15 bg-[#FFF5E4] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#850E35]">
                Computing Career Trajectory
              </span>

              <h3 className="text-base font-bold text-[#850E35]">
                Simulating Skill Impact...
              </h3>

              <p className="mt-2 max-w-sm text-xs leading-5 text-[#850E35]/55">
                Calculating vector distance adjustments, weight redistributions, and readiness percentile shifts for {targetRole}.
              </p>

              <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-[#850E35]/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-[#850E35] via-[#E36A6A] to-[#850E35] animate-pulse" />
              </div>
            </div>
          ) : !simulationRun ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF5E4] text-[#850E35]">
                <Target size={26} />
              </div>

              <h3 className="text-base font-bold text-[#850E35]">
                Build your career scenario
              </h3>

              <p className="mt-2 max-w-xs text-xs leading-5 text-[#850E35]/50">
                Choose skills to strengthen and simulate how it increases your
                readiness for {targetRole}.
              </p>

              <div className="mt-6 rounded-xl border border-[#850E35]/10 bg-[#FFFBF1] px-4 py-3 text-xs text-[#850E35]/70">
                Current baseline: <strong className="font-bold text-[#850E35]">{role.baseScore}%</strong> ready
              </div>
            </div>
          ) : (
            <div className="flex min-h-[350px] flex-col justify-between">
              <div>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#850E35]/50">
                      Simulation Result
                    </span>

                    <h3 className="mt-1 text-lg font-bold text-[#850E35]">
                      {targetRole}
                    </h3>
                  </div>

                  <span className="rounded-full bg-[#FFF5E4] px-3 py-1 text-xs font-bold text-[#E36A6A]">
                    +{improvement}% Projected Gain
                  </span>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#850E35]/8 bg-[#FFFBF1] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#850E35]/50">
                      Current Readiness
                    </p>

                    <p className="mt-1 text-2xl font-bold text-[#850E35]">
                      {role.baseScore}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#850E35]/20 bg-[#FFF5E4] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#E36A6A]">
                      Projected Readiness
                    </p>

                    <p className="mt-1 text-2xl font-bold text-[#850E35]">
                      {simulatedScore}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#850E35]/45">
                    Recommended Learning Order
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {role.roadmap.map((step, idx) => (
                      <span
                        key={step}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#850E35]/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#850E35]"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFF5E4] text-[9px] font-bold text-[#E36A6A]">
                          {idx + 1}
                        </span>
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#850E35]/8 pt-4">
                <button
                  type="button"
                  onClick={() => setAddedToRoadmap(true)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition ${
                    addedToRoadmap
                      ? "bg-emerald-600 text-white"
                      : "border border-[#850E35]/20 bg-white text-[#850E35] hover:bg-[#FFF5E4]"
                  }`}
                >
                  {addedToRoadmap ? (
                    <>
                      <CircleCheck size={14} />
                      Added to My Roadmap
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={14} />
                      Add Simulation to My Roadmap
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Analytics({ isLoading = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const savedCurriculumState = useMemo(() => {
    try {
      const raw = localStorage.getItem("syllometry_curriculum_state");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const isAnalyzed = Boolean(
    savedCurriculumState?.analysisComplete && savedCurriculumState?.files?.length > 0
  );

  const curriculumDocName = savedCurriculumState?.files?.[0]?.name || null;

  useEffect(() => {
    if (!isAnalyzed) {
      // Direct access without analyzed curriculum redirects to dashboard with warning modal
      navigate("/dashboard?warn=no_curriculum", { replace: true });
    }
  }, [isAnalyzed, navigate]);

  if (isLoading || !isAnalyzed) {
    return <DashboardSkeleton theme="syllometry" shimmer={true} />;
  }

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-24 pb-16">
      <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">

        {/* =========================================================
            DECORATED ANALYTICS HEADER
        ========================================================== */}
        <section className="mb-8 rounded-3xl border border-[#850E35]/15 bg-white p-6 sm:p-8 shadow-sm">

          {/* Header Title & Badges */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#850E35] text-white shadow-md shadow-[#850E35]/20">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#850E35]">
                    Academic Curriculum & Skill Analytics
                  </h1>
                </div>
              </div>

              <p className="mt-2 text-xs sm:text-sm text-[#850E35]/65 leading-relaxed">
                Comprehensive AI intelligence extracted from your course curriculum. Analyzed against
                real-time software industry competency benchmarks for{" "}
                <strong className="text-[#850E35] font-bold">
                  {user?.full_name || "Scholar"}
                </strong>.
              </p>

              {/* Status Chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                  <CircleCheck size={13} />
                  <span>AI Benchmarking Complete</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/15 text-[11px] font-semibold">
                  <Code2 size={13} />
                  <span>18 Skills Extracted</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/15 text-[11px] font-semibold">
                  <Target size={13} />
                  <span>Target: Full Stack Developer</span>
                </span>
              </div>
            </div>

            {/* Quick Readiness Scorecard Widget in Header */}
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-[#850E35]/15 bg-[#FFFBF1] p-4 sm:p-5 shadow-2xs">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#850E35] bg-white text-[#850E35]">
                <span className="text-xl font-extrabold">76%</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#850E35]/50">
                  Readiness Score
                </p>
                <h3 className="text-sm font-bold text-[#850E35]">
                  Full Stack Readiness
                </h3>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  High Industry Alignment
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SUCCESS / NOTICE BANNER
        ========================================================== */}
        <section className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CircleCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950 flex flex-wrap items-center gap-2">
                <span>Curriculum Analysis Active</span>
                {curriculumDocName && (
                  <span className="font-semibold text-xs px-2.5 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 border border-emerald-300/60 truncate max-w-[240px] sm:max-w-md">
                    {curriculumDocName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-emerald-700/80">
                18 technical skills tracked and benchmarked against current hiring standards.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="text-xs font-bold text-emerald-800 hover:underline shrink-0 text-left sm:text-right flex items-center gap-1"
          >
            <span>Change or re-upload curriculum</span>
            <ArrowUpRight size={13} />
          </Link>
        </section>

        {/* =========================================================
            KEY STAT METRICS
        ========================================================== */}
        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Gauge}
            label="Overall Skill Score"
            value="78"
            change="+6.4%"
            description="Compared with last month"
          />

          <StatCard
            icon={Code2}
            label="Skills Tracked"
            value="18"
            change="+3"
            description="Across 4 technology areas"
          />

          <StatCard
            icon={Target}
            label="Skill Gaps"
            value="5"
            change="-2"
            description="2 high-priority gaps remaining"
          />

          <StatCard
            icon={Flame}
            label="Learning Streak"
            value="12"
            description="Days of continuous progress"
          />
        </section>

        {/* =========================================================
            SKILL PROFILE & CAREER READINESS
        ========================================================== */}
        <section className="mb-7 grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          {/* Skill Profile */}
          <div
            id="skill-profile"
            className="rounded-2xl border border-[#850E35]/10 bg-white p-5 shadow-sm sm:p-6 card-interactive"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
                    <Code2 size={15} />
                  </div>

                  <h2 className="text-base font-bold text-[#850E35]">
                    Your Skill Profile
                  </h2>
                </div>

                <p className="mt-2 text-xs text-[#850E35]/50">
                  Current proficiency across your tracked technologies
                </p>
              </div>

              <button
                type="button"
                onClick={() => scrollToSection("skill-profile")}
                className="hidden items-center gap-1 text-[11px] font-bold text-[#850E35] transition hover:text-[#E36A6A] sm:flex"
              >
                View all
                <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  className="rounded-xl border border-[#850E35]/8 bg-[#FFFBF1] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#850E35]">
                      {skill.name}
                    </span>

                    <span className="text-xs font-bold text-[#E36A6A]">
                      {skill.score}%
                    </span>
                  </div>

                  <ProgressBar value={skill.score} />
                </div>
              ))}
            </div>
          </div>

          {/* Career Readiness */}
          <div
            className="relative overflow-hidden rounded-2xl border border-[#850E35]/10 bg-[#850E35] p-6 text-white shadow-sm card-interactive"
          >
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full border border-white/10" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />

            <div className="relative z-10">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                    Career Readiness
                  </p>

                  <h2 className="mt-1 text-lg font-bold">
                    Full Stack Developer
                  </h2>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <BriefcaseBusiness size={17} />
                </div>
              </div>

              <div className="mb-7 flex items-center gap-5">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[7px] border-[#E36A6A]/40">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      76
                    </div>

                    <div className="text-[9px] uppercase tracking-wider text-white/50">
                      Ready
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-xs leading-5 text-white/65">
                    You're getting close. Complete your priority gaps to
                    improve your job readiness.
                  </p>

                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[10px]">
                      <span className="text-white/50">
                        Readiness
                      </span>

                      <span className="font-bold">
                        76%
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#E36A6A]"
                        style={{ width: "76%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <CircleCheck
                    size={14}
                    className="text-[#E36A6A]"
                  />
                  Java
                </div>

                <div className="flex items-center gap-2 text-xs text-white/80">
                  <CircleCheck
                    size={14}
                    className="text-[#E36A6A]"
                  />
                  React
                </div>

                <div className="flex items-center gap-2 text-xs text-white/80">
                  <CircleCheck
                    size={14}
                    className="text-[#E36A6A]"
                  />
                  SQL
                </div>
              </div>

              <button
                type="button"
                onClick={() => scrollToSection("skill-gaps")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-[#850E35] transition hover:bg-[#FFF5E4] active:scale-[0.99] cursor-pointer"
              >
                <span>View Career Roadmap</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================
            CAREER SIMULATION LAB
        ========================================================== */}
        <CareerSimulationLab />

        {/* =========================================================
            SKILL GAPS
        ========================================================== */}
        <section
          id="skill-gaps"
          className="mb-7 scroll-mt-24 rounded-2xl border border-[#850E35]/10 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
                  <Target size={15} />
                </div>

                <h2 className="text-base font-bold text-[#850E35]">
                  Priority Skill Gaps
                </h2>
              </div>

              <p className="mt-2 text-xs text-[#850E35]/50">
                Skills that will have the biggest impact on your target career
              </p>
            </div>

            <button
              type="button"
              onClick={() => scrollToSection("learning")}
              className="hidden items-center gap-1 text-[11px] font-bold text-[#850E35] transition hover:text-[#E36A6A] sm:flex"
            >
              <span>Explore gaps</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <div
                key={gap.name}
                className="group grid gap-4 rounded-xl border border-[#850E35]/8 bg-[#FFFBF1] p-4 transition hover:border-[#850E35]/20 md:grid-cols-[35px_1fr_150px_110px]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-[#850E35]/45">
                  0{index + 1}
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#850E35]">
                      {gap.name}
                    </h3>

                    <span className="rounded-full bg-[#FFF5E4] px-2 py-0.5 text-[9px] font-bold text-[#E36A6A]">
                      {gap.level}
                    </span>
                  </div>

                  <p className="text-xs text-[#850E35]/50">
                    {gap.description}
                  </p>
                </div>

                <div className="self-center">
                  <div className="mb-1.5 flex justify-between text-[9px] font-semibold text-[#850E35]/50">
                    <span>Current level</span>
                    <span>{gap.score}%</span>
                  </div>

                  <ProgressBar value={gap.score} />
                </div>

                <button
                  type="button"
                  onClick={() => scrollToSection("learning")}
                  className="flex items-center justify-center gap-1 self-center rounded-lg border border-[#850E35]/15 bg-white px-3 py-2 text-[10px] font-bold text-[#850E35] transition hover:bg-[#850E35] hover:text-white cursor-pointer"
                >
                  <span>Improve</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            GROWTH & RECOMMENDED LEARNING
        ========================================================== */}
        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          {/* Growth Chart */}
          <div
            id="growth"
            className="scroll-mt-24 rounded-2xl border border-[#850E35]/10 bg-white p-5 shadow-sm sm:p-6 card-interactive"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
                    <TrendingUp size={15} />
                  </div>

                  <h2 className="text-base font-bold text-[#850E35]">
                    Skill Growth
                  </h2>
                </div>

                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold text-[#850E35]">
                    +24
                  </span>

                  <span className="pb-1 text-[10px] font-semibold text-[#E36A6A]">
                    points in 6 months
                  </span>
                </div>
              </div>

              <span className="rounded-full border border-[#850E35]/10 bg-[#FFF5E4] px-2.5 py-1 text-[9px] font-bold text-[#850E35]/60">
                6 MONTHS
              </span>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient
                      id="skillFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#850E35"
                        stopOpacity={0.22}
                      />

                      <stop
                        offset="100%"
                        stopColor="#850E35"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#850E35"
                    strokeOpacity={0.07}
                    vertical={false}
                  />

                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#850E35",
                      opacity: 0.45,
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    domain={[40, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#850E35",
                      opacity: 0.4,
                      fontSize: 9,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(133,14,53,.1)",
                      background: "#FFFBF1",
                      color: "#850E35",
                      fontSize: "11px",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#850E35"
                    strokeWidth={2.5}
                    fill="url(#skillFill)"
                    dot={{
                      r: 3,
                      fill: "#850E35",
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 5,
                      fill: "#E36A6A",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommended Learning */}
          <div
            id="learning"
            className="scroll-mt-24 rounded-2xl border border-[#850E35]/10 bg-white p-5 shadow-sm sm:p-6 card-interactive"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
                    <Sparkles size={15} />
                  </div>

                  <h2 className="text-base font-bold text-[#850E35]">
                    Recommended Learning
                  </h2>
                </div>

                <p className="mt-2 text-xs text-[#850E35]/50">
                  Personalized for your current skill gaps
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {recommendations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#850E35]/8 bg-[#FFFBF1] p-4 transition hover:border-[#850E35]/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
                        <GraduationCap size={16} />
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-[#850E35]">
                          {item.title}
                        </h3>

                        <p className="mt-0.5 text-[9px] text-[#850E35]/45">
                          {item.category} · {item.lessons} · {item.time}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-[#E36A6A]">
                      {item.progress}%
                    </span>
                  </div>

                  <ProgressBar value={item.progress} />

                  <button
                    type="button"
                    onClick={() => scrollToSection("learning")}
                    className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#850E35] transition hover:text-[#E36A6A] cursor-pointer"
                  >
                    <span>
                      {item.progress > 0
                        ? "Continue learning"
                        : "Start learning"}
                    </span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

