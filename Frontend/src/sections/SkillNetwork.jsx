import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';

const ACADEMIC_CATALOG = [
  {
    id: 'dsa',
    label: 'Data Structures & Algorithms',
    mobileLabel: 'Data Structures',
    category: 'Core CS',
    skills: ['python-dev', 'system-design', 'data-pipelines'],
  },
  {
    id: 'dbms',
    label: 'Database Management (DBMS)',
    mobileLabel: 'DBMS Systems',
    category: 'Databases',
    skills: ['sql-databases', 'data-pipelines', 'microservices'],
  },
  {
    id: 'networks',
    label: 'Computer Networks',
    mobileLabel: 'Comp Networks',
    category: 'Networking',
    skills: ['cloud-aws', 'network-protocols', 'microservices'],
  },
  {
    id: 'os',
    label: 'Operating Systems',
    mobileLabel: 'Operating Sys',
    category: 'Core Systems',
    skills: ['linux-concurrency', 'docker-devops', 'low-level-systems'],
  },
  {
    id: 'se',
    label: 'Software Engineering',
    mobileLabel: 'Software Eng',
    category: 'Methodology',
    skills: ['python-dev', 'system-design', 'microservices'],
  },
  {
    id: 'web-dev',
    label: 'Web Technologies & Architecture',
    mobileLabel: 'Web Tech',
    category: 'Web Systems',
    skills: ['react-frontend', 'microservices', 'python-dev'],
  },
  {
    id: 'ai-ml',
    label: 'AI & Applied Machine Learning',
    mobileLabel: 'AI & ML',
    category: 'AI & Data',
    skills: ['applied-ml', 'python-dev', 'data-pipelines'],
  },
  {
    id: 'cloud',
    label: 'Cloud & Distributed Systems',
    mobileLabel: 'Cloud Systems',
    category: 'Distributed',
    skills: ['cloud-aws', 'docker-devops', 'system-design'],
  },
  {
    id: 'security',
    label: 'Information & Network Security',
    mobileLabel: 'Info Security',
    category: 'Security',
    skills: ['app-security', 'network-protocols', 'linux-concurrency'],
  },
  {
    id: 'oop',
    label: 'OOP & Clean Architecture',
    mobileLabel: 'OOP Design',
    category: 'Design',
    skills: ['system-design', 'python-dev', 'react-frontend'],
  },
];

const INDUSTRY_CATALOG = [
  // Core Matched Industry Demands
  { id: 'python-dev', label: 'Python & Fast Prototyping', mobileLabel: 'Python Dev', category: 'Languages' },
  { id: 'cloud-aws', label: 'Cloud Computing & AWS', mobileLabel: 'Cloud & AWS', category: 'Cloud' },
  { id: 'docker-devops', label: 'Docker & Containerization', mobileLabel: 'Docker DevOps', category: 'DevOps' },
  { id: 'sql-databases', label: 'PostgreSQL & Relational SQL', mobileLabel: 'Postgres SQL', category: 'Databases' },
  { id: 'system-design', label: 'System Design & Scalability', mobileLabel: 'System Design', category: 'Architecture' },
  { id: 'applied-ml', label: 'Machine Learning & PyTorch', mobileLabel: 'Applied ML', category: 'Applied AI' },
  { id: 'microservices', label: 'RESTful APIs & Microservices', mobileLabel: 'Microservices', category: 'Backend' },
  { id: 'react-frontend', label: 'React & Modern Frontend', mobileLabel: 'React Frontend', category: 'Frontend' },
  { id: 'data-pipelines', label: 'Data Engineering & Pipelines', mobileLabel: 'Data Pipelines', category: 'Big Data' },
  { id: 'linux-concurrency', label: 'Linux Systems & Concurrency', mobileLabel: 'Linux Systems', category: 'Systems' },
  { id: 'low-level-systems', label: 'C/C++ & Systems Programming', mobileLabel: 'Systems C/C++', category: 'Systems' },
  { id: 'network-protocols', label: 'TCP/IP, HTTP/3 & WebSockets', mobileLabel: 'Web Protocols', category: 'Networking' },
  { id: 'app-security', label: 'Application Security & OWASP', mobileLabel: 'App Security', category: 'Security' },

  // Emerging Industry Skill Gaps
  { id: 'genai-llms', label: 'Generative AI & LLM Systems', mobileLabel: 'GenAI & LLMs', category: 'Emerging', isGap: true },
  { id: 'vector-rag', label: 'Vector DBs & RAG Architecture', mobileLabel: 'RAG & Vectors', category: 'AI Systems', isGap: true },
  { id: 'k8s', label: 'Kubernetes & Production K8s', mobileLabel: 'Kubernetes', category: 'Cloud Native', isGap: true },
  { id: 'agentic-ai', label: 'Autonomous AI Agents', mobileLabel: 'AI Agents', category: 'AI Systems', isGap: true },
  { id: 'observability', label: 'Distributed Tracing & Datadog', mobileLabel: 'Observability', category: 'DevOps', isGap: true },
  { id: 'cyber-ops', label: 'Zero Trust & Cloud Security', mobileLabel: 'Zero Trust', category: 'Security', isGap: true },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateDataset() {
  const STRENGTHS = ['High', 'Strong', 'Moderate', 'Partial'];
  const acadPicks = shuffle(ACADEMIC_CATALOG).slice(0, 5);
  const acadNodes = acadPicks.map((c, i) => ({
    ...c,
    id: 'a' + (i + 1),
    strength: STRENGTHS[i % STRENGTHS.length],
  }));

  // Symmetrical placement: 4 matched slots and 2 skill gap slots
  const gapSlots = [2, 5];
  const matchedSlots = [0, 1, 3, 4];

  // Pick criss-cross pairs between academic courses and matched industry slots
  // Ensure NO parallel identity mappings (i.e. Math.abs(from - to) >= 1)
  const acadIndices = [0, 1, 2, 3, 4];
  let pairs = null;

  for (let trial = 0; trial < 80; trial++) {
    const froms = shuffle(acadIndices).slice(0, 4);
    const tos   = shuffle(matchedSlots);
    if (froms.every((f, idx) => Math.abs(f - tos[idx]) >= 1)) {
      pairs = froms.map((f, idx) => ({ from: f, to: tos[idx] }));
      break;
    }
  }

  // Guaranteed criss-cross fallback if random search takes too long
  if (!pairs) {
    pairs = [
      { from: 0, to: 4 },
      { from: 1, to: 3 },
      { from: 3, to: 0 },
      { from: 4, to: 1 },
    ];
  }

  // Map the 5th academic course to a criss-crossing slot
  const remainingFrom = acadIndices.find((idx) => !pairs.some((p) => p.from === idx));
  const candidateSlots = matchedSlots.filter((s) => Math.abs(remainingFrom - s) >= 1);
  const targetSlot5 = candidateSlots.length > 0 ? shuffle(candidateSlots)[0] : matchedSlots[0];
  pairs.push({ from: remainingFrom, to: targetSlot5 });

  // Add 1 or 2 secondary cross-connections for rich visual network density
  const extraFrom = shuffle(acadIndices)[0];
  const extraTargetSlots = matchedSlots.filter(
    (s) => s !== targetSlot5 && !pairs.some((p) => p.from === extraFrom && p.to === s)
  );
  if (extraTargetSlots.length > 0) {
    pairs.push({ from: extraFrom, to: shuffle(extraTargetSlots)[0] });
  }

  // Populate matchedSlots with industry skills that semantically align with the connected academic courses
  const assignedSkills = new Map();
  const usedSkillIds   = new Set();

  pairs.forEach((p) => {
    if (assignedSkills.has(p.to)) return;
    const acadCourse = acadPicks[p.from];
    const matchingInds = INDUSTRY_CATALOG.filter(
      (ind) => !ind.isGap && acadCourse.skills.includes(ind.id) && !usedSkillIds.has(ind.id)
    );
    if (matchingInds.length > 0) {
      const picked = shuffle(matchingInds)[0];
      assignedSkills.set(p.to, picked);
      usedSkillIds.add(picked.id);
    }
  });

  // Fill any remaining matched slots with distinct industry skills
  matchedSlots.forEach((slot) => {
    if (!assignedSkills.has(slot)) {
      const remainingInd = INDUSTRY_CATALOG.filter((ind) => !ind.isGap && !usedSkillIds.has(ind.id));
      const picked = shuffle(remainingInd)[0] || INDUSTRY_CATALOG.find((ind) => !ind.isGap);
      assignedSkills.set(slot, picked);
      usedSkillIds.add(picked.id);
    }
  });

  // Pick 2 distinct emerging skill gaps
  const pickedGaps = shuffle(INDUSTRY_CATALOG.filter((ind) => ind.isGap)).slice(0, 2);

  // Assemble the 6 industry cards
  const indNodes = new Array(6);
  gapSlots.forEach((slot, i) => {
    indNodes[slot] = {
      ...pickedGaps[i],
      id: 'i' + (slot + 1),
      status: 'Skill Gap',
      isGap: true,
    };
  });

  matchedSlots.forEach((slot) => {
    const isPartial = Math.random() > 0.68;
    indNodes[slot] = {
      ...assignedSkills.get(slot),
      id: 'i' + (slot + 1),
      status: isPartial ? 'Partial Match' : 'Matched',
      isGap: false,
    };
  });

  const connections = pairs.map((p) => ({
    from: p.from,
    to: p.to,
    type:
      indNodes[p.to].status === 'Partial Match' || acadNodes[p.from]?.strength === 'Partial'
        ? 'partial'
        : 'matched',
  }));

  return { acadNodes, indNodes, connections, gapIndices: gapSlots };
}

function cubicPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function bezier(ctx, x0, y0, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
  ctx.stroke();
  return [
    { x: x0, y: y0 },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x3, y: y3 },
  ];
}

export default function SkillNetwork() {
  const canvasRef     = useRef(null);
  const containerRef  = useRef(null);
  const leftRefs      = useRef([]);
  const rightRefs     = useRef([]);
  const leftPanelRef  = useRef(null);
  const rightPanelRef = useRef(null);

  const [data, setData] = useState(() => generateDataset());
  const [isReloading, setIsReloading] = useState(false);
  const [hovered, setHovered] = useState(null);

  const hoveredRef = useRef(null);
  const dataRef    = useRef(data);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const handleReload = () => {
    setIsReloading(true);
    setHovered(null);
    setTimeout(() => {
      setData(generateDataset());
      setIsReloading(false);
    }, 250);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = 0;
    let height = 0;

    const isNarrowInitial = typeof window !== 'undefined' && window.innerWidth < 640;
    const NUM_P = isNarrowInitial ? 22 : 38;

    const particles = Array.from({ length: NUM_P }, () => ({
      ci: Math.floor(Math.random() * (dataRef.current.connections.length || 5)),
      t: Math.random(),
      spd: 0.16 + Math.random() * 0.18,
      r: 1.5 + Math.random() * 1.5,
      a: 0.35 + Math.random() * 0.55,
    }));

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr  = window.devicePixelRatio || 1;
      width  = rect.width;
      height = Math.max(width < 640 ? 460 : 580, rect.height || (width < 640 ? 460 : 580));
      canvas.width  = width  * dpr;
      canvas.height = height * dpr;
      canvas.style.width  = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    let time = 0;
    let lastTs = performance.now();
    const noMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;

    let leftPaths  = [];
    let rightPaths = [];

    const render = (ts) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      if (!noMotion) time += dt * 1.1;

      ctx.clearRect(0, 0, width, height);

      const cRect = containerRef.current?.getBoundingClientRect();
      if (!cRect) {
        animId = requestAnimationFrame(render);
        return;
      }

      const activeData = dataRef.current;
      const h = hoveredRef.current;

      const measure = (el, edge) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: (edge === 'right' ? r.right : r.left) - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      };

      const LP = activeData.acadNodes.map((_, i) =>
        measure(leftRefs.current[i], 'right') ?? { x: 0, y: height * (i + 1) / (activeData.acadNodes.length + 1) }
      );
      const RP = activeData.indNodes.map((_, i) =>
        measure(rightRefs.current[i], 'left') ?? { x: width, y: height * (i + 1) / (activeData.indNodes.length + 1) }
      );

      const cx = width * 0.5;
      const cy = height * 0.5;

      const isMobile = width < 640;
      const BW = isMobile ? 64 : 148;
      const BH = isMobile ? 54 : 88;
      const BX = cx - BW / 2;
      const BY = cy - BH / 2;

      const mergeL = { x: BX,      y: cy };
      const fanR   = { x: BX + BW, y: cy };

      const leftPullRatio = isMobile ? 0.50 : 0.55;
      const bigPullRatio  = isMobile ? 0.55 : 0.60;
      const cardPullRatio = isMobile ? 0.20 : 0.25;

      // ─── LEFT BRANCHES: Academic -> mergeL ───────────────────────────────
      leftPaths = [];
      activeData.connections.forEach((conn) => {
        const lp = LP[conn.from];
        if (!lp) return;
        const fromNode = activeData.acadNodes[conn.from];
        const toNode   = activeData.indNodes[conn.to];
        const isConnHovered = h && (h === fromNode?.id || h === toNode?.id);

        const dx = mergeL.x - lp.x;
        const pull = dx * leftPullRatio;

        ctx.strokeStyle = isConnHovered
          ? 'rgba(133,14,53,0.95)'
          : h
          ? 'rgba(133,14,53,0.12)'
          : 'rgba(133,14,53,0.25)';
        ctx.lineWidth = isConnHovered ? 2.5 : 1.2;
        ctx.setLineDash([]);

        const pts = bezier(
          ctx,
          lp.x,
          lp.y,
          lp.x + pull,
          lp.y,
          mergeL.x - pull * 0.2,
          mergeL.y,
          mergeL.x,
          mergeL.y
        );
        leftPaths.push({ p0: pts[0], p1: pts[1], p2: pts[2], p3: pts[3] });
      });

      // ─── RIGHT BRANCHES: fanR -> Industry ──────────────────────────────
      rightPaths = [];
      activeData.connections.forEach((conn) => {
        const rp = RP[conn.to];
        if (!rp) return;
        const fromNode = activeData.acadNodes[conn.from];
        const toNode   = activeData.indNodes[conn.to];
        const isConnHovered = h && (h === fromNode?.id || h === toNode?.id);

        const totalDx  = rp.x - fanR.x;
        const bigPull  = totalDx * bigPullRatio;
        const cardPull = totalDx * cardPullRatio;

        const isPartial = conn.type === 'partial';
        let strokeColor;

        if (isConnHovered) {
          strokeColor = isPartial ? 'rgba(227,106,106,1)' : 'rgba(133,14,53,0.95)';
        } else if (h) {
          strokeColor = isPartial ? 'rgba(227,106,106,0.18)' : 'rgba(133,14,53,0.15)';
        } else {
          strokeColor = isPartial ? 'rgba(227,106,106,0.55)' : 'rgba(133,14,53,0.42)';
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth   = isConnHovered ? 2.5 : 1.2;
        ctx.setLineDash([]);

        const pts = bezier(
          ctx,
          fanR.x,
          fanR.y,
          fanR.x + bigPull,
          fanR.y,
          rp.x - cardPull,
          rp.y,
          rp.x,
          rp.y
        );
        rightPaths.push({ p0: pts[0], p1: pts[1], p2: pts[2], p3: pts[3] });
      });

      // ─── GAP BRANCHES (Dashed Red): fanR -> Skill Gap Cards ─────────────
      activeData.gapIndices.forEach((toIdx) => {
        const rp = RP[toIdx];
        if (!rp) return;
        const gapNode = activeData.indNodes[toIdx];
        const isGapHovered = h && h === gapNode?.id;

        const totalDx  = rp.x - fanR.x;
        const bigPull  = totalDx * bigPullRatio;
        const cardPull = totalDx * cardPullRatio;

        ctx.strokeStyle = isGapHovered
          ? 'rgba(227,106,106,1)'
          : h
          ? 'rgba(227,106,106,0.22)'
          : 'rgba(227,106,106,0.60)';
        ctx.lineWidth = isGapHovered ? 2.5 : 1.4;
        ctx.setLineDash([5, 5]);

        bezier(
          ctx,
          fanR.x,
          fanR.y,
          fanR.x + bigPull,
          fanR.y,
          rp.x - cardPull,
          rp.y,
          rp.x,
          rp.y
        );
        ctx.setLineDash([]);

        // Warning dot at entry
        ctx.beginPath();
        ctx.arc(rp.x - (isMobile ? 3 : 4), rp.y, isMobile ? 2.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = isGapHovered ? 'rgba(227,106,106,1)' : 'rgba(227,106,106,0.65)';
        ctx.fill();
      });

      // ─── PARTICLES FLOW ────────────────────────────────────────────────
      if (!noMotion && leftPaths.length > 0 && rightPaths.length > 0) {
        particles.forEach((p) => {
          p.t += p.spd * dt;
          if (p.t >= 1) {
            p.t -= 1;
            p.ci = Math.floor(Math.random() * activeData.connections.length);
          }

          const safeCi = p.ci % activeData.connections.length;
          let pt;
          if (p.t < 0.5) {
            const seg = leftPaths[safeCi];
            if (!seg) return;
            pt = cubicPoint(p.t * 2, seg.p0, seg.p1, seg.p2, seg.p3);
          } else {
            const seg = rightPaths[safeCi];
            if (!seg) return;
            pt = cubicPoint((p.t - 0.5) * 2, seg.p0, seg.p1, seg.p2, seg.p3);
          }

          const conn = activeData.connections[safeCi];
          const fromNode = conn ? activeData.acadNodes[conn.from] : null;
          const toNode   = conn ? activeData.indNodes[conn.to] : null;
          const isConnHovered = h && (h === fromNode?.id || h === toNode?.id);

          const alpha = h ? (isConnHovered ? 0.95 : 0.15) : p.a;
          const radius = isConnHovered ? p.r * 1.3 : p.r;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(227,106,106,${alpha})`;
          if (isConnHovered) {
            ctx.shadowColor = 'rgba(227,106,106,0.7)';
            ctx.shadowBlur = 6;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // ─── CENTER ENGINE BOX & GLOW ──────────────────────────────────────
      const pulse = (isMobile ? 38 : 62) + Math.sin(time * 2.2) * (isMobile ? 3 : 5);

      // Radial glow
      const grd = ctx.createRadialGradient(cx, cy, 6, cx, cy, isMobile ? 52 : 82);
      grd.addColorStop(0, 'rgba(227,106,106,0.14)');
      grd.addColorStop(1, 'rgba(255,245,228,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, pulse + (isMobile ? 8 : 16), 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Dashed orbit ring
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(133,14,53,0.18)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Merge + fan anchor dots
      [mergeL, fanR].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isMobile ? 3.5 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(133,14,53,0.22)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isMobile ? 2 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(133,14,53,0.55)';
        ctx.fill();
      });

      // Box shadow
      ctx.save();
      ctx.shadowColor   = 'rgba(133,14,53,0.16)';
      ctx.shadowBlur    = isMobile ? 14 : 24;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle     = '#FFF5E4';
      ctx.beginPath();
      ctx.roundRect(BX, BY, BW, BH, isMobile ? 10 : 14);
      ctx.fill();
      ctx.restore();

      // Box border
      ctx.beginPath();
      ctx.roundRect(BX, BY, BW, BH, isMobile ? 10 : 14);
      ctx.strokeStyle = '#850E35';
      ctx.lineWidth   = 1.8;
      ctx.stroke();

      // Box text
      ctx.textAlign = 'center';
      if (isMobile) {
        ctx.fillStyle = '#850E35';
        ctx.font      = 'bold 9.5px Inter,system-ui,sans-serif';
        ctx.fillText('AI / ML', cx, cy - 5);
        ctx.fillStyle = 'rgba(133,14,53,0.68)';
        ctx.font      = '600 7.5px monospace';
        ctx.fillText('VECTOR Δ', cx, cy + 9);
      } else {
        ctx.fillStyle = '#850E35';
        ctx.font      = '600 10px Inter,system-ui,sans-serif';
        ctx.fillText('SylloMetry AI/ML', cx, cy - 21);
        ctx.font      = 'bold 13.5px Inter,system-ui,sans-serif';
        ctx.fillText('Semantic Matching', cx, cy + 1);
        ctx.fillStyle = 'rgba(133,14,53,0.55)';
        ctx.font      = '500 9.5px monospace';
        ctx.fillText('Embedding Δ = 384-dim', cx, cy + 21);
      }

      // Activity dot
      ctx.beginPath();
      ctx.arc(
        BX + BW - (isMobile ? 7 : 10),
        BY + (isMobile ? 7 : 10),
        isMobile ? 2.5 : 3.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = '#E36A6A';
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  // Compute active connection IDs for hover highlighting
  const connectedAcadIds = new Set();
  const connectedIndIds  = new Set();

  if (hovered) {
    data.connections.forEach((c) => {
      const aId = data.acadNodes[c.from]?.id;
      const iId = data.indNodes[c.to]?.id;
      if (hovered === aId && iId) connectedIndIds.add(iId);
      if (hovered === iId && aId) connectedAcadIds.add(aId);
    });
  }

  return (
    <div className="relative w-full select-none">
      {/* Header with Live Badge, Legend, and Dynamic Simulate / Reload Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2 mb-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E36A6A] animate-pulse" />
            Live Semantic Network
          </span>
          <span className="hidden md:inline text-[#850E35]/60 font-mono text-[11px]">
            SentenceTransformers · pgvector
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px] font-medium text-[#850E35]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#850E35] inline-block" /> Matched
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E36A6A] inline-block" /> Skill Gap
            </span>
          </div>

          {/* Simulate / Reload Button */}
          <button
            type="button"
            onClick={handleReload}
            disabled={isReloading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-[#850E35] text-[#FFFBF1] hover:bg-[#850E35]/90 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            title="Simulate different syllabus and industry market variations"
          >
            <RotateCw className={`w-3 h-3 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Simulate</span>
          </button>
        </div>
      </div>

      {/* Canvas Wrapper */}
      <div
        ref={containerRef}
        className="relative min-h-[460px] sm:min-h-[580px] lg:min-h-[640px] w-full rounded-2xl border border-[#850E35]/20 bg-[#FFF5E4]/40 overflow-hidden"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

        {/* LEFT — Academic Courses */}
        <div
          ref={leftPanelRef}
          className="absolute left-1.5 sm:left-4 top-0 bottom-0 flex flex-col justify-around py-3 sm:py-6 z-10 w-[32%] max-w-[125px] sm:max-w-none sm:w-48 lg:w-52"
        >
          <div className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#850E35]/55 px-1 mb-0.5 truncate">
            Academic
          </div>
          {data.acadNodes.map((node, i) => {
            const isDirectHover = hovered === node.id;
            const isConnected   = connectedAcadIds.has(node.id);
            const isActive      = isDirectHover || isConnected;
            const isDimmed      = hovered && !isActive;

            return (
              <div
                key={node.id}
                ref={(el) => { leftRefs.current[i] = el; }}
                onClick={() => setHovered((prev) => (prev === node.id ? null : node.id))}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className={`p-1.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white border-[#850E35] shadow-md shadow-[#850E35]/20 scale-105 ring-2 ring-[#850E35]/30 z-20'
                    : isDimmed
                    ? 'bg-[#FFFBF1]/50 border-[#850E35]/10 opacity-40 scale-[0.98]'
                    : 'bg-[#FFFBF1]/95 border-[#850E35]/15 hover:border-[#850E35]/40 hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between text-[7.5px] sm:text-[10px] text-[#850E35]/60 font-semibold uppercase tracking-wider mb-0.5 gap-0.5">
                  <span className="truncate">{node.category}</span>
                  <span className="text-[#850E35] font-bold shrink-0 hidden sm:inline">{node.strength}</span>
                </div>
                <div className="text-[9.5px] sm:text-xs font-semibold text-[#850E35] leading-tight">
                  <span className="hidden sm:inline">{node.label}</span>
                  <span className="sm:hidden">{node.mobileLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT — Industry Demands */}
        <div
          ref={rightPanelRef}
          className="absolute right-1.5 sm:right-4 top-0 bottom-0 flex flex-col justify-around py-3 sm:py-6 z-10 w-[35%] max-w-[136px] sm:max-w-none sm:w-52 lg:w-56"
        >
          <div className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-[#850E35]/55 px-1 mb-0.5 text-right truncate">
            Industry Demand
          </div>
          {data.indNodes.map((node, i) => {
            const isDirectHover = hovered === node.id;
            const isConnected   = connectedIndIds.has(node.id);
            const isActive      = isDirectHover || isConnected;
            const isDimmed      = hovered && !isActive;

            return (
              <div
                key={node.id}
                ref={(el) => { rightRefs.current[i] = el; }}
                onClick={() => setHovered((prev) => (prev === node.id ? null : node.id))}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className={`p-1.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isActive
                    ? node.isGap
                      ? 'bg-white border-[#E36A6A] shadow-md shadow-[#E36A6A]/25 scale-105 ring-2 ring-[#E36A6A]/40 z-20'
                      : 'bg-white border-[#850E35] shadow-md shadow-[#850E35]/20 scale-105 ring-2 ring-[#850E35]/30 z-20'
                    : isDimmed
                    ? 'bg-[#FFFBF1]/50 border-[#850E35]/10 opacity-40 scale-[0.98]'
                    : node.isGap
                    ? 'bg-[#FFF5E4] border-[#E36A6A]/45 hover:border-[#E36A6A] hover:scale-[1.02]'
                    : 'bg-[#FFFBF1]/95 border-[#850E35]/15 hover:border-[#850E35]/40 hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between text-[7.5px] sm:text-[10px] mb-0.5 gap-0.5">
                  <span className="text-[#850E35]/60 font-semibold uppercase tracking-wider truncate">{node.category}</span>
                  <span className={`inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded font-bold text-[7.5px] sm:text-[9px] shrink-0 ${
                    node.isGap
                      ? 'bg-[#E36A6A] text-[#FFFBF1]'
                      : node.status === 'Partial Match'
                      ? 'bg-[#D97A2A] text-[#FFFBF1]'
                      : 'bg-[#850E35] text-[#FFFBF1]'
                  }`}>
                    {node.isGap ? (
                      <AlertTriangle className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                    ) : (
                      <CheckCircle2 className="w-2 sm:w-2.5 h-2 sm:h-2.5" />
                    )}
                    <span className="hidden sm:inline">{node.status}</span>
                    <span className="sm:hidden">
                      {node.isGap ? 'Gap' : node.status === 'Partial Match' ? 'Partial' : 'Match'}
                    </span>
                  </span>
                </div>
                <div className="text-[9.5px] sm:text-xs font-semibold text-[#850E35] leading-tight">
                  <span className="hidden sm:inline">{node.label}</span>
                  <span className="sm:hidden">{node.mobileLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[10px] text-[#850E35]/40 mt-2">
        Click <strong className="font-semibold text-[#850E35]/70">Simulate</strong> to test different curricula · Hover or tap any node to trace vector alignment
      </p>
    </div>
  );
}