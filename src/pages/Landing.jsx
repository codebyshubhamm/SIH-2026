import { useState, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const GlobeCanvas = lazy(() => import('../components/landing/GlobeCanvas'));

// Categories and evidence factors aligned 100% with Main Website & Video
const CLASSIFICATION_DATA = {
  'Industrial Accidental Fire': {
    confidence: '91%',
    riskTier: 'Critical',
    riskScore: 87,
    color: '#DC2626',
    modelScore: '84+',
    evidence: [
      { name: 'Thermal Severity Spike', val: 'Escalating +34% over 6h pass', pct: 95 },
      { name: 'Petrochem Proximity', val: 'Adjacent to bulk fuel storage tank farm', pct: 93 },
      { name: 'Population Exposure', val: 'Dense settlement within 1.8 km', pct: 86 },
      { name: 'Land Cover Match', val: 'Built-up / heavy industrial complex', pct: 88 },
    ],
  },
  'Industrial Persistent Source': {
    confidence: '94%',
    riskTier: 'Moderate',
    riskScore: 68,
    color: '#D97706',
    modelScore: '92+',
    evidence: [
      { name: 'Industrial Proximity', val: 'Within 200m of refinery complex', pct: 96 },
      { name: 'Temporal Persistence', val: 'Active for 72+ hours continuously', pct: 92 },
      { name: 'Land Cover Match', val: 'Confirmed industrial land use (OSM)', pct: 90 },
      { name: 'FRP Signature', val: '64.2 MW · steady-state thermal profile', pct: 78 },
    ],
  },
  'Wildfire': {
    confidence: '89%',
    riskTier: 'Critical',
    riskScore: 84,
    color: '#DC2626',
    modelScore: '89+',
    evidence: [
      { name: 'Vegetation Density', val: 'Dense forest canopy / scrubland', pct: 92 },
      { name: 'Spread Velocity', val: '1.4 km/h along wind vector', pct: 85 },
      { name: 'Industrial Buffer', val: '> 8.5 km to nearest industrial plant', pct: 91 },
      { name: 'FRP Signature', val: '142.0 MW · rapid spatial expansion', pct: 94 },
    ],
  },
  'Agricultural Burning': {
    confidence: '92%',
    riskTier: 'Low',
    riskScore: 28,
    color: '#16A34A',
    modelScore: '91+',
    evidence: [
      { name: 'Land Cover Match', val: 'Agricultural cropland (Copernicus)', pct: 95 },
      { name: 'Seasonal Window', val: 'Matches post-harvest residue window', pct: 90 },
      { name: 'Short Persistence', val: '< 6 hours temporal lifetime', pct: 88 },
      { name: 'FRP Pattern', val: '18.5 MW · localized field boundary', pct: 72 },
    ],
  },
  'Gas Flare': {
    confidence: '96%',
    riskTier: 'Low',
    riskScore: 24,
    color: '#D97706',
    modelScore: '96+',
    evidence: [
      { name: 'Flare Stack Registry', val: 'Exact match with OSM flare stack coordinate', pct: 98 },
      { name: 'Diurnal Recurrence', val: 'Continuous day/night thermal load', pct: 95 },
      { name: 'Point Source Extent', val: 'Sub-pixel localized (<30m)', pct: 94 },
      { name: 'FRP Stability', val: '14.8 MW · stable baseline variance', pct: 84 },
    ],
  },
  'Unknown': {
    confidence: '64%',
    riskTier: 'Moderate',
    riskScore: 52,
    color: '#9CA3AF',
    modelScore: '64+',
    evidence: [
      { name: 'Cadastral Verification', val: 'No registered facility on record', pct: 78 },
      { name: 'Temporal Pattern', val: 'Newly detected anomaly, <6 hours', pct: 74 },
      { name: 'Multi-Sensor Check', val: 'Awaiting next Sentinel-2 MSI pass', pct: 68 },
      { name: 'FRP Profile', val: '32.1 MW · fluctuating signature', pct: 65 },
    ],
  },
};

// Earth at night satellite constellation hotspots (matches video 00:12 - 00:19)
const GLOBAL_MAP_HOTSPOTS = [
  {
    id: 'alberta',
    name: 'Alberta Boreal Fire, Canada',
    badge: 'CRITICAL · REFINERY COMPLEX',
    frp: '95.8 MW',
    coords: '54.88°N · 115.58°W',
    sensor: 'VIIRS 375m',
    top: '25%',
    left: '18%',
    isCritical: true,
  },
  {
    id: 'gulf',
    name: 'Gulf Coast Industrial Zone, Texas',
    badge: 'MODERATE · REFINERY ANOMALY',
    frp: '48.1 MW',
    coords: '29.76°N · 95.37°W',
    sensor: 'VIIRS 375m',
    top: '40%',
    left: '23%',
    isCritical: false,
  },
  {
    id: 'brazil',
    name: 'Mato Grosso Active Fire, Brazil',
    badge: 'CRITICAL · WILDFIRE FRONT',
    frp: '98.6 MW',
    coords: '11.50°S · 55.50°W',
    sensor: 'VIIRS 375m',
    top: '64%',
    left: '32%',
    isCritical: true,
  },
  {
    id: 'congo',
    name: 'Congo Basin Savanna Fire, DRC',
    badge: 'CRITICAL · ACTIVE WILDFIRE',
    frp: '112.4 MW',
    coords: '7.80°S · 22.50°E',
    sensor: 'VIIRS 375m',
    top: '59%',
    left: '54%',
    isCritical: true,
  },
  {
    id: 'niger',
    name: 'Niger Delta Flare Cluster, Nigeria',
    badge: 'PERSISTENT · GAS FLARE',
    frp: '41.2 MW',
    coords: '4.85°N · 6.95°E',
    sensor: 'VIIRS 375m',
    top: '52%',
    left: '49%',
    isCritical: false,
  },
  {
    id: 'greece',
    name: 'Peloponnese Anomaly, Greece',
    badge: 'CRITICAL · FOREST FIRE',
    frp: '63.8 MW',
    coords: '37.80°N · 22.40°E',
    sensor: 'VIIRS 375m',
    top: '35%',
    left: '55%',
    isCritical: true,
  },
  {
    id: 'jamnagar',
    name: 'Jamnagar Petrochem, India',
    badge: 'CRITICAL · PETROCHEM COMPLEX',
    frp: '88.4 MW',
    coords: '22.47°N · 70.06°E',
    sensor: 'VIIRS 375m',
    top: '42%',
    left: '68%',
    isCritical: true,
  },
  {
    id: 'bokaro',
    name: 'Bokaro Thermal Complex, India',
    badge: 'MODERATE · THERMAL COMPLEX',
    frp: '52.3 MW',
    coords: '23.67°N · 86.15°E',
    sensor: 'VIIRS 375m',
    top: '41%',
    left: '72%',
    isCritical: false,
  },
  {
    id: 'siberia',
    name: 'Siberian Taiga Fire, Russia',
    badge: 'CRITICAL · BOREAL FIRE',
    frp: '142.0 MW',
    coords: '56.50°N · 94.20°E',
    sensor: 'VIIRS 375m',
    top: '22%',
    left: '74%',
    isCritical: true,
  },
  {
    id: 'australia',
    name: 'Queensland Bushfire, Australia',
    badge: 'CRITICAL · BUSHFIRE',
    frp: '74.2 MW',
    coords: '19.40°S · 145.20°E',
    sensor: 'VIIRS 375m',
    top: '68%',
    left: '88%',
    isCritical: true,
  },
];

// Response views matching Main Website's data model & operational workflow
const RESPONSE_VIEWS = [
  {
    id: 'analyst',
    tab: 'ANALYST VIEW',
    title: 'Incident Dossier — Classified & Verified',
    desc: 'Evidence panel: registered refinery buffer 200m, temporal persistence 72h, FRP 88.4 MW. Counter-evidence and multi-spectral curves disclosed for operator audit.',
    metric: '91%',
    metricLabel: 'CLASSIFICATION CONFIDENCE',
    step: 1, // VERIFIED
  },
  {
    id: 'command',
    tab: 'COMMAND TRIAGE',
    title: 'Priority Dispatch — State Emergency Ops',
    desc: 'Assets at risk: 82K population buffer, petrochemical tank farm, power corridor. Recommended access via NH-55. Agency: State Disaster Management Authority.',
    metric: '87',
    metricLabel: 'RISK SCORE · CRITICAL',
    step: 2, // DISPATCHED
  },
  {
    id: 'responder',
    tab: 'FIELD RESPONSE',
    title: 'En Route — Safe Approach via NH-55',
    desc: 'Responder terminal: downwind plume safety buffer 1.8 km, nearest industrial water intake at plant Gate 2, ECMWF wind vector NE at 14 km/h.',
    metric: '12 min',
    metricLabel: 'ESTIMATED TIME TO SCENE',
    step: 3, // EN ROUTE
  },
];

const TIMELINE_STATES = ['DETECTED', 'VERIFIED', 'DISPATCHED', 'EN ROUTE', 'CONTAINED'];

export default function Landing() {
  const reducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [selectedClass, setSelectedClass] = useState('Industrial Accidental Fire');
  const [activeResponseIdx, setActiveResponseIdx] = useState(0);
  const [activeMapHotspot, setActiveMapHotspot] = useState(GLOBAL_MAP_HOTSPOTS[0]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentClassData = CLASSIFICATION_DATA[selectedClass] || CLASSIFICATION_DATA['Industrial Accidental Fire'];
  const currentResponse = RESPONSE_VIEWS[activeResponseIdx];

  const revealProps = (delay = 0) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1A17] font-sans overflow-x-hidden antialiased selection:bg-[#F5C518] selection:text-[#1A1A17]">
      {/* Top Navigation Bar — Warm Cream with Glass Blur */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E3D7] py-3 shadow-xs'
            : 'bg-[#FAF7F2]/80 backdrop-blur-xs border-b border-[#EFECE3] py-4'
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 flex items-center justify-between">
          {/* Brand mark with yellow icon and bold THERMOS */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-[6px] bg-[#F5C518] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A1A17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-[#1A1A17]">
              THERMOS
            </span>
          </Link>

          {/* Section Jump Links */}
          <div className="hidden lg:flex items-center gap-7 text-sm text-[#5C5C54] font-medium">
            <a href="#detect" className="hover:text-[#1A1A17] transition-colors">
              Intelligence
            </a>
            <a href="#constellation" className="hover:text-[#1A1A17] transition-colors">
              Global Telemetry
            </a>
            <a href="#classify" className="hover:text-[#1A1A17] transition-colors">
              Classification
            </a>
            <a href="#context" className="hover:text-[#1A1A17] transition-colors">
              Context
            </a>
            <a href="#risk" className="hover:text-[#1A1A17] transition-colors">
              Risk Engine
            </a>
            <a href="#platform" className="hover:text-[#1A1A17] transition-colors">
              Platform
            </a>
          </div>

          {/* Right Actions: Live Feed status + CTA */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-2 pl-3 border-l border-[#E2DDD1]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[12px] text-[#6B6B60] font-mono hidden sm:inline tabular-nums">
                LIVE · NASA FIRMS V2
              </span>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#1A1A17] bg-[#F5C518] hover:bg-[#EAB308] shadow-xs hover:shadow-sm active:scale-95 transition-all group"
            >
              <span>Launch Dashboard</span>
              <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION — Warm Beige/Cream Theme with Interactive 3D Orbit Globe */}
      <header className="relative min-h-[92vh] flex flex-col justify-center pt-28 pb-16 px-4 sm:px-6 md:px-8 overflow-hidden bg-gradient-to-b from-[#FBF9F4] via-[#F8F5EC] to-[#FAF7F2]">
        {/* Technical Blueprint Graph Grid */}
        <div
          className="absolute inset-0 pointer-events-none select-none opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(195, 185, 165, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(195, 185, 165, 0.35) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Ambient Warm Golden/Yellow Glow */}
        <div
          className="absolute top-1/4 left-10 w-[420px] h-[420px] rounded-full blur-[100px] pointer-events-none opacity-30 select-none"
          style={{ background: 'radial-gradient(circle, #F5C518 0%, #FDE047 35%, transparent 70%)' }}
        />

        {/* Vertical Scanning Beam Moving Across */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] pointer-events-none select-none z-10 opacity-60"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(245, 197, 24, 0.3) 20%, rgba(245, 197, 24, 0.9) 50%, rgba(245, 197, 24, 0.3) 80%, transparent)',
            boxShadow: '0 0 10px rgba(245, 197, 24, 0.5)',
            animation: reducedMotion ? 'none' : 'scan 11s linear infinite',
          }}
        />

        {/* Hero Content: 2-Column Responsive Layout */}
        <div className="relative z-10 max-w-[1240px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column (Hero Content) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Operational Tag */}
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#E5DECD] bg-[#FFFBEB] px-3.5 py-1 mb-6 text-[12px] font-semibold text-[#1A1A17] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#F5C518]" />
              <span className="font-mono uppercase tracking-wider text-[11px] text-[#524E44]">THERMOS</span>
              <span className="text-[#C4BCAB]">|</span>
              <span className="font-mono uppercase tracking-wider text-[11px] text-[#524E44]">SATELLITE DISASTER INTELLIGENCE</span>
            </div>

            {/* Main Headline — Exactly matching video "From signal to action." */}
            <h1 className="text-[clamp(44px,6.2vw,84px)] font-extrabold tracking-[-0.035em] leading-[1.02] text-[#1A1A17]">
              From signal
              <br />
              <span className="text-[#1A1A17]">to action.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-[clamp(16px,1.6vw,20px)] text-[#4A4A42] leading-[1.5] max-w-[560px]">
              Thermal Event Recognition and Monitoring Operational System (THERMOS)
            </p>

            {/* Action Buttons — Pill style matching video */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F5C518] hover:bg-[#EAB308] text-[#1A1A17] font-semibold text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all group"
              >
                <span>Explore THERMOS</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <a
                href="#detect"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#DCD5C6] bg-white hover:bg-[#FAF7F2] text-[#1A1A17] text-sm font-semibold shadow-2xs transition-colors"
              >
                How it works
              </a>
            </div>

            {/* Real Operational Telemetry Strip — 3 Columns */}
            <div className="mt-12 pt-6 border-t border-[#E8E2D4] grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#78786E]">
                  LOCATION
                </div>
                <div className="font-mono text-sm font-bold text-[#1A1A17] mt-1 tabular-nums">
                  22.47°N · 70.06°E
                </div>
              </div>
              <div>
                <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#78786E]">
                  SENSOR
                </div>
                <div className="font-mono text-sm font-bold text-[#1A1A17] mt-1 tabular-nums">
                  VIIRS · 375 m
                </div>
              </div>
              <div>
                <div className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#78786E]">
                  FEED STATUS
                </div>
                <div className="font-mono text-sm font-bold text-[#1A1A17] mt-1 flex items-center gap-1.5 tabular-nums">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>NRT Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Vector Globe & Floating Card */}
          <div className="lg:col-span-5 relative w-full aspect-square max-w-[420px] sm:max-w-[480px] lg:max-w-[540px] mx-auto mt-4 lg:mt-0 flex items-center justify-center">
            {/* Soft Ambient Warm Glow matching yellow/amber accent */}
            <div
              className="absolute inset-0 -z-10 pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              <div
                className="w-[85%] h-[85%] rounded-full blur-[70px] opacity-70"
                style={{
                  background: 'radial-gradient(circle, rgba(245, 197, 24, 0.28) 0%, rgba(230, 222, 204, 0.35) 50%, transparent 75%)',
                }}
              />
            </div>

            {/* Masked Globe Canvas */}
            <div
              className="w-full h-full relative aspect-square flex items-center justify-center"
              style={{
                maskImage: 'radial-gradient(circle at 50% 50%, black 65%, rgba(0, 0, 0, 0.6) 82%, transparent 92%)',
                WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 65%, rgba(0, 0, 0, 0.6) 82%, transparent 92%)',
              }}
            >
              <Suspense
                fallback={
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#78786E] font-mono text-xs">
                    <span className="w-3 h-3 rounded-full bg-[#F5C518] pulse-ring mb-3" />
                    Initializing 3D Telemetry…
                  </div>
                }
              >
                <GlobeCanvas />
              </Suspense>
            </div>

            {/* Pinned Telemetry Callout Card — Matches Video 00:00 - 00:08 */}
            <div className="absolute right-0 sm:right-2 bottom-2 sm:bottom-4 z-20 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md border border-[#E5DFD1] rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] min-w-[240px] sm:min-w-[270px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span className="font-mono text-[11px] font-bold tracking-wider uppercase text-red-600">
                    VIIRS · THERMAL ANOMALY
                  </span>
                </div>
                <div className="text-sm font-bold text-[#1A1A17] mt-1.5">
                  Industrial Fire — 91%
                </div>
                <div className="font-mono text-[11px] text-[#66665E] mt-2 flex items-center justify-between border-t border-[#F0EBE0] pt-2 tabular-nums">
                  <span className="font-bold text-[#1A1A17]">FRP 88.4 MW</span>
                  <span>22.47°N · 70.06°E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 01 / DETECT SECTION */}
      <section id="detect" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div className="max-w-[680px] mb-16" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">01 /</span> DETECT
            </div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
              Every incident begins
              <br />
              as a signal.
            </h2>
            <p className="mt-4 text-base text-[#52524A] leading-relaxed">
              NASA satellites scan India every passing orbit. THERMOS ingests each thermal detection the moment it hits the feed — raw heat becomes a tracked event.
            </p>
          </motion.div>

          {/* Stat Cards Row — 3 Cards with Color Accents matching Video 00:10 */}
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" {...revealProps(0.1)}>
            <div className="bg-white border border-[#E8E2D4] rounded-2xl p-8 flex flex-col justify-between shadow-xs hover:border-[#D0C8B8] transition-all">
              <div>
                <div className="font-mono text-[clamp(44px,4.5vw,56px)] font-bold tracking-tight text-[#EA580C] leading-none">
                  375<span className="text-xl text-[#78786E] font-medium ml-1">m</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-[#52524A] leading-normal">
                <strong className="text-[#1A1A17] font-semibold">VIIRS RESOLUTION</strong> — every thermal anomaly down to an individual facility stack or city block.
              </p>
            </div>

            <div className="bg-white border border-[#E8E2D4] rounded-2xl p-8 flex flex-col justify-between shadow-xs hover:border-[#D0C8B8] transition-all">
              <div>
                <div className="font-mono text-[clamp(44px,4.5vw,56px)] font-bold tracking-tight text-[#2563EB] leading-none">
                  5<span className="text-xl text-[#78786E] font-medium ml-1.5">Sensors</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-[#52524A] leading-normal">
                Continuous constellation from <strong className="text-[#1A1A17] font-semibold">SNPP, NOAA-20, NOAA-21, Aqua/Terra MODIS</strong>, and Sentinel-2 MSI validation.
              </p>
            </div>

            <div className="bg-white border border-[#E8E2D4] rounded-2xl p-8 flex flex-col justify-between shadow-xs hover:border-[#D0C8B8] transition-all">
              <div>
                <div className="font-mono text-[clamp(44px,4.5vw,56px)] font-bold tracking-tight text-[#16A34A] leading-none">
                  &lt;60<span className="text-xl text-[#78786E] font-medium ml-1">sec</span>
                </div>
              </div>
              <p className="mt-6 text-sm text-[#52524A] leading-normal">
                <strong className="text-[#1A1A17] font-semibold">Ingestion latency</strong> — alerts reach command consoles before ground emergency calls are placed.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* GLOBAL SURVEILLANCE FEED: EARTH AT NIGHT (Matches Video 00:12 - 00:19) */}
      <section id="constellation" className="py-20 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div
            className="border border-[#262C3A] rounded-2xl overflow-hidden bg-[#0A0D14] text-white shadow-xl relative"
            {...revealProps(0)}
          >
            {/* Card Header with Badges & Legend */}
            <div className="p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2330]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 mb-2 text-xs font-semibold text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-mono text-[10.5px] uppercase tracking-wider">GLOBAL SURVEILLANCE FEED</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Earth at Night · Active Thermal Constellation
                </h3>
              </div>

              {/* Legend & Hint */}
              <div className="flex flex-wrap items-center gap-5 text-xs font-mono text-[#8B92A0]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-white font-medium">Critical Fire</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5C518] shadow-[0_0_8px_rgba(245,197,24,0.8)]" />
                  <span className="text-white font-medium">Industrial / Flare</span>
                </div>
                <div className="text-[11px] text-[#636B78] hidden sm:block">
                  Hover dots to inspect anomaly telemetry
                </div>
              </div>
            </div>

            {/* Earth at Night Map Canvas with Hotspots */}
            <div className="relative min-h-[440px] sm:min-h-[500px] w-full overflow-hidden select-none bg-[#090C12]">
              {/* NASA Night Earth Image */}
              <img
                src="/media/earth_at_night.jpg"
                alt="Earth at Night - Active Thermal Constellation"
                className="w-full h-full object-cover min-h-[440px] sm:min-h-[500px] opacity-85"
                loading="lazy"
              />

              {/* Subtle Scanning Beam */}
              <div
                className="absolute top-0 bottom-0 w-[1px] pointer-events-none select-none z-10 opacity-40"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(126, 200, 242, 0.4) 30%, rgba(245, 197, 24, 0.8) 50%, rgba(126, 200, 242, 0.4) 70%, transparent)',
                  animation: reducedMotion ? 'none' : 'scan 10s linear infinite',
                }}
              />

              {/* Interactive Pulsing Hotspot Dots across the Globe with 3D Reticle on Hover */}
              {GLOBAL_MAP_HOTSPOTS.map((hotspot) => {
                const isSelected = activeMapHotspot?.id === hotspot.id;
                const dotColor = hotspot.isCritical ? '#EF4444' : '#F5C518';
                const dotGlow = hotspot.isCritical ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 197, 24, 0.9)';

                return (
                  <div
                    key={hotspot.id}
                    className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group z-20"
                    style={{ top: hotspot.top, left: hotspot.left }}
                    onMouseEnter={() => setActiveMapHotspot(hotspot)}
                    onClick={() => setActiveMapHotspot(hotspot)}
                  >
                    {/* 3D Isometric Ground Radar Reticle & Expanding Sonar Waves on Hover/Active */}
                    {isSelected && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ perspective: 500 }}>
                        {/* Rotating 3D Dashed Orbital Reticle Ring */}
                        <div
                          className="absolute top-1/2 left-1/2 w-[54px] h-[54px] rounded-full border border-dashed pointer-events-none"
                          style={{
                            borderColor: dotColor,
                            animation: 'reticle3d 4.5s linear infinite',
                            boxShadow: `0 0 16px ${dotGlow}`,
                          }}
                        />
                        {/* Expanding 3D Sonar Wave 1 */}
                        <div
                          className="absolute top-1/2 left-1/2 w-[44px] h-[44px] rounded-full border pointer-events-none"
                          style={{
                            borderColor: dotColor,
                            animation: 'wave3d 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
                          }}
                        />
                        {/* Expanding 3D Sonar Wave 2 */}
                        <div
                          className="absolute top-1/2 left-1/2 w-[44px] h-[44px] rounded-full border pointer-events-none"
                          style={{
                            borderColor: dotColor,
                            animation: 'wave3d 2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.9s infinite',
                          }}
                        />
                        {/* Floor Thermal Heat Aura */}
                        <div
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full blur-[8px] pointer-events-none opacity-50"
                          style={{
                            background: `radial-gradient(circle, ${dotColor} 0%, transparent 70%)`,
                          }}
                        />
                      </div>
                    )}

                    {/* Outer pinging halo */}
                    <span
                      className={`absolute -inset-2.5 rounded-full opacity-60 animate-ping pointer-events-none ${
                        hotspot.isCritical ? 'bg-red-500' : 'bg-[#F5C518]'
                      }`}
                    />

                    {/* Core Beacon Dot with 3D Glow Scaling */}
                    <span
                      className={`block w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                        hotspot.isCritical
                          ? 'border-red-500 bg-red-600/80 shadow-[0_0_16px_rgba(239,68,68,1)]'
                          : 'border-[#F5C518] bg-[#F5C518]/80 shadow-[0_0_16px_rgba(245,197,24,1)]'
                      } ${isSelected ? 'scale-135 ring-4 ring-white/30' : 'group-hover:scale-125'}`}
                    />
                    {/* Bright white core center */}
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  </div>
                );
              })}

              {/* 3D Holographic HUD Tooltip Popup with Smooth Spring & Perspective Tilt on Dot Hover */}
              <AnimatePresence mode="wait">
                {activeMapHotspot && (() => {
                  const isTopHalf = parseInt(activeMapHotspot.top) < 28;
                  const isRightEdge = parseInt(activeMapHotspot.left) > 78;
                  const isLeftEdge = parseInt(activeMapHotspot.left) < 22;

                  const xOffset = isRightEdge ? '-82%' : isLeftEdge ? '-18%' : '-50%';
                  const yOffset = isTopHalf ? '0%' : '-100%';

                  return (
                    <motion.div
                      key={activeMapHotspot.id}
                      className="absolute z-30 pointer-events-none"
                      style={{
                        top: isTopHalf ? `calc(${activeMapHotspot.top} + 22px)` : `calc(${activeMapHotspot.top} - 22px)`,
                        left: activeMapHotspot.left,
                        perspective: 1200,
                        transformStyle: 'preserve-3d',
                      }}
                      initial={{
                        opacity: 0,
                        scale: 0.75,
                        y: isTopHalf ? '-14px' : 'calc(-100% + 14px)',
                        x: xOffset,
                        rotateX: isTopHalf ? -28 : 28,
                        rotateY: isRightEdge ? -14 : isLeftEdge ? 14 : 0,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: yOffset,
                        x: xOffset,
                        rotateX: 0,
                        rotateY: 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.8,
                        y: isTopHalf ? '-10px' : 'calc(-100% + 10px)',
                        x: xOffset,
                        rotateX: isTopHalf ? -16 : 16,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 24,
                      }}
                    >
                      {/* Vertical 3D Hologram Projection Beam connecting dot to card */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{
                          ...(isTopHalf
                            ? { top: '-22px', height: '22px' }
                            : { bottom: '-22px', height: '22px' }),
                          width: '2px',
                          background: `linear-gradient(${isTopHalf ? 'to bottom' : 'to top'}, ${
                            activeMapHotspot.isCritical ? '#EF4444' : '#F5C518'
                          }, transparent)`,
                          boxShadow: `0 0 10px ${
                            activeMapHotspot.isCritical ? 'rgba(239,68,68,0.85)' : 'rgba(245,197,24,0.85)'
                          }`,
                          animation: 'beamPulse 1.8s ease-in-out infinite',
                        }}
                      />

                      {/* 3D Holographic Card Shell with Floating Depth Layers */}
                      <div
                        className="relative bg-[#10141F]/95 backdrop-blur-xl border rounded-xl p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] min-w-[240px] sm:min-w-[280px] text-left overflow-hidden transition-all duration-300"
                        style={{
                          borderColor: activeMapHotspot.isCritical
                            ? 'rgba(239, 68, 68, 0.5)'
                            : 'rgba(245, 197, 24, 0.5)',
                          boxShadow: activeMapHotspot.isCritical
                            ? '0 16px 36px -8px rgba(220, 38, 38, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.25)'
                            : '0 16px 36px -8px rgba(245, 197, 24, 0.4), 0 0 0 1px rgba(245, 197, 24, 0.25)',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Shimmering Holographic Scanline Overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none opacity-20"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.18) 50%, transparent 100%)',
                            animation: 'holoShimmer 3s ease-in-out infinite',
                          }}
                        />

                        {/* Top & Bottom Corner HUD Target Brackets */}
                        <div
                          className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 pointer-events-none"
                          style={{ borderColor: activeMapHotspot.isCritical ? '#EF4444' : '#F5C518' }}
                        />
                        <div
                          className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 pointer-events-none"
                          style={{ borderColor: activeMapHotspot.isCritical ? '#EF4444' : '#F5C518' }}
                        />
                        <div
                          className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 pointer-events-none"
                          style={{ borderColor: activeMapHotspot.isCritical ? '#EF4444' : '#F5C518' }}
                        />
                        <div
                          className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 pointer-events-none"
                          style={{ borderColor: activeMapHotspot.isCritical ? '#EF4444' : '#F5C518' }}
                        />

                        {/* 3D Layer 1: Header (Badge & Sensor) */}
                        <div className="flex items-center justify-between gap-2" style={{ transform: 'translateZ(16px)' }}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                activeMapHotspot.isCritical
                                  ? 'bg-red-500 shadow-[0_0_8px_#EF4444]'
                                  : 'bg-[#F5C518] shadow-[0_0_8px_#F5C518]'
                              }`}
                            />
                            <span
                              className={`font-mono text-[10.5px] font-bold tracking-wider uppercase ${
                                activeMapHotspot.isCritical ? 'text-red-400' : 'text-amber-400'
                              }`}
                            >
                              {activeMapHotspot.badge}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#838D9E] bg-[#161C2A] px-1.5 py-0.5 rounded border border-[#262F44]">
                            {activeMapHotspot.sensor}
                          </span>
                        </div>

                        {/* 3D Layer 2: Title */}
                        <div
                          className="text-[14.5px] font-bold text-white mt-2 tracking-tight"
                          style={{ transform: 'translateZ(26px)' }}
                        >
                          {activeMapHotspot.name}
                        </div>

                        {/* 3D Layer 3: Telemetry Row */}
                        <div
                          className="font-mono text-[11px] text-[#A6B0C3] mt-2.5 flex items-center justify-between border-t border-[#222A3B] pt-2 tabular-nums"
                          style={{ transform: 'translateZ(20px)' }}
                        >
                          <span
                            className="px-2 py-0.5 rounded font-bold text-[10.5px] shadow-xs"
                            style={{
                              backgroundColor: activeMapHotspot.isCritical ? '#EF4444' : '#F5C518',
                              color: activeMapHotspot.isCritical ? '#FFFFFF' : '#1A1A17',
                            }}
                          >
                            FRP {activeMapHotspot.frp}
                          </span>
                          <span className="text-[#CAD3E2] font-semibold">{activeMapHotspot.coords}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Bottom Ticker Strip */}
            <div className="py-3 px-6 bg-[#0E121C] border-t border-[#1E2330] text-center font-mono text-[11px] text-[#717A8C] tracking-wider uppercase">
              EARTH AT NIGHT · NASA VIIRS NRT · CONTINUOUS SATELLITE DISASTER INTELLIGENCE
            </div>
          </motion.div>
        </div>
      </section>

      {/* 02 / CLASSIFY SECTION — Matching Video 00:20 - 00:27 */}
      <section id="classify" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div className="max-w-[680px] mb-16" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">02 /</span> CLASSIFY
            </div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
              A signal isn't an answer.
            </h2>
            <p className="mt-4 text-base text-[#52524A] leading-relaxed">
              A thermal pixel could be a refinery flare, a stubble fire, or a spreading wildfire. THERMOS fuses facility data, land-cover and 60-day temporal behaviour to say which — with auditable evidence.
            </p>
          </motion.div>

          {/* Classification Board */}
          <motion.div className="border border-[#E8E2D4] rounded-2xl bg-white p-6 sm:p-12 shadow-xs" {...revealProps(0.1)}>
            {/* Top Flow Header matching Video: THERMAL ANOMALY -> CLASSIFYING -> DYNAMIC RESULT */}
            <div className="flex flex-col items-center justify-center text-center mb-8">
              <div className="font-mono text-xs font-bold tracking-[0.2em] text-[#78786E] uppercase">
                THERMAL ANOMALY
              </div>
              <div className="text-[#A8A89E] my-1 text-sm font-mono">↓</div>
              <div className="font-mono text-xs font-bold tracking-[0.2em] text-[#2563EB] uppercase">
                CLASSIFYING · CONTEXT · PERSISTENCE
              </div>
              <div className="text-[#A8A89E] my-1 text-sm font-mono">↓</div>
              <div className="font-mono text-base sm:text-xl font-extrabold tracking-wider uppercase text-[#DC2626]">
                {selectedClass.toUpperCase()} · {currentClassData.confidence} CONFIDENCE
              </div>
            </div>

            {/* Interactive Taxonomy Category Chips */}
            <div className="flex flex-wrap gap-2 justify-center mb-10">
              {Object.keys(CLASSIFICATION_DATA).map((cat) => {
                const isSelected = selectedClass === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedClass(cat)}
                    className={`font-mono text-[11.5px] uppercase tracking-wider px-4 py-2 rounded-full border transition-all ${
                      isSelected
                        ? 'border-[#F5C518] text-[#1A1A17] bg-[#FEF9E7] shadow-xs font-bold'
                        : 'border-[#E2DDD0] text-[#66665E] hover:border-[#C8C2B4] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Evidence Breakdown Bars */}
            <div className="w-full max-w-[700px] mx-auto flex flex-col gap-4">
              {currentClassData.evidence.map((ev, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#FAF7F2] border border-[#EFEBE0]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#1A1A17] font-medium">{ev.name}</span>
                    <span className="font-mono text-xs text-[#52524A]">{ev.val}</span>
                  </div>
                  <div className="h-2 w-full bg-[#E5DFD0] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor:
                          ev.pct > 90 ? '#DC2626' : ev.pct > 80 ? '#EA580C' : '#F5C518',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ev.pct}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.05 }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-4 text-center font-mono text-[11px] text-[#88887E] tracking-wider uppercase">
                MODEL SCORE {currentClassData.modelScore} · AUDITABLE EVIDENCE DISCLOSED FOR OPERATOR REVIEW
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 03 / CONTEXT SECTION — Tactical Radar Map matching Video 00:28 - 00:31 */}
      <section id="context" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div className="max-w-[680px] mb-16" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">03 /</span> CONTEXT
            </div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
              Know what surrounds
              <br />
              the fire.
            </h2>
            <p className="mt-4 text-base text-[#52524A] leading-relaxed">
              NASA gives you the signal. THERMOS gives you the surroundings — population, infrastructure, access routes and land-cover, computed for every incident.
            </p>
          </motion.div>

          {/* Context Display Card */}
          <motion.div className="border border-[#262C3A] rounded-2xl overflow-hidden bg-[#0A0D14] shadow-xl" {...revealProps(0.1)}>
            {/* Tactical Radar Display Canvas */}
            <div className="relative h-[380px] bg-[#0E121A] border-b border-[#1E2330] overflow-hidden select-none">
              {/* Technical Grid lines */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Concentric Distance Rings (1km, 2km, 3km) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] rounded-full border border-dashed border-[#2A3448] pointer-events-none flex items-center justify-center">
                <span className="font-mono text-[9px] text-[#475569] self-start mt-1">1 KM</span>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-dashed border-[#222B3D] pointer-events-none flex items-center justify-center">
                <span className="font-mono text-[9px] text-[#475569] self-start mt-1">2 KM</span>
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-dashed border-[#1C2333] pointer-events-none flex items-center justify-center">
                <span className="font-mono text-[9px] text-[#475569] self-start mt-1">3 KM</span>
              </div>

              {/* Rotating Radar Sweep Line */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none radar-sweep">
                <div
                  className="w-1/2 h-1/2 ml-auto rounded-tl-full origin-bottom-left"
                  style={{
                    background: 'conic-gradient(from 0deg at 0% 100%, rgba(245, 197, 24, 0.18) 0deg, transparent 60deg)',
                  }}
                />
              </div>

              {/* SVG Connecting Vectors */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {/* Center to Top-Left */}
                <line x1="50%" y1="50%" x2="25%" y2="28%" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                {/* Center to Top-Right */}
                <line x1="50%" y1="50%" x2="75%" y2="28%" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" strokeDasharray="4 4" />
                {/* Center to Bottom-Right */}
                <line x1="50%" y1="50%" x2="72%" y2="76%" stroke="rgba(22, 163, 74, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
                {/* Center to Bottom-Left */}
                <line x1="50%" y1="50%" x2="28%" y2="74%" stroke="rgba(220, 38, 38, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Node 1: Target Incident (Center) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 shadow-[0_0_16px_rgba(220,38,38,0.9)]"></span>
                </span>
                <span className="font-mono text-[10.5px] font-bold text-red-400 mt-2 bg-[#121620] px-2.5 py-0.5 rounded border border-red-500/40">
                  INCIDENT
                </span>
              </div>

              {/* Node 2: Industrial Facility */}
              <div className="absolute left-[25%] top-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <span className="font-mono text-[10px] font-semibold text-blue-300 mt-1.5 bg-[#121620] px-2 py-0.5 rounded border border-blue-500/30">
                  INDUSTRIAL FACILITY · 0.9 KM
                </span>
              </div>

              {/* Node 3: Settlement */}
              <div className="absolute left-[75%] top-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="font-mono text-[10px] font-semibold text-slate-300 mt-1.5 bg-[#121620] px-2 py-0.5 rounded border border-slate-700">
                  SETTLEMENT · 2.4 KM
                </span>
              </div>

              {/* Node 4: Power Corridor */}
              <div className="absolute left-[28%] top-[74%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,197,24,0.8)]" />
                <span className="font-mono text-[10px] font-semibold text-amber-300 mt-1.5 bg-[#121620] px-2 py-0.5 rounded border border-amber-500/30">
                  POWER CORRIDOR · AT RISK
                </span>
              </div>

              {/* Node 5: Access Road */}
              <div className="absolute left-[72%] top-[76%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="font-mono text-[10px] font-semibold text-emerald-300 mt-1.5 bg-[#121620] px-2 py-0.5 rounded border border-emerald-500/30">
                  ACCESS ROAD · NH-55 (OPEN)
                </span>
              </div>
            </div>

            {/* Context Telemetry Metrics Strip (4 Columns matching Video 00:30) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1E2330] bg-[#0E121C]">
              <div className="p-6">
                <div className="font-mono text-[11px] tracking-wider uppercase text-[#717A8C] mb-1">
                  POPULATION EXPOSURE
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span className="font-mono">82,000</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 font-semibold">
                    AT RISK
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="font-mono text-[11px] tracking-wider uppercase text-[#717A8C] mb-1">
                  INFRASTRUCTURE
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>Power corridor</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 font-semibold">
                    AT RISK
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="font-mono text-[11px] tracking-wider uppercase text-[#717A8C] mb-1">
                  ACCESS ROUTES
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>NH-55 open</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-semibold">
                    CLEAR
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="font-mono text-[11px] tracking-wider uppercase text-[#717A8C] mb-1">
                  LAND COVER
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>Built-up / industrial</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 04 / ASSESS (5-FACTOR RISK ENGINE) SECTION — Matches Video 00:32 - 00:33 */}
      <section id="risk" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Score Callout with Huge 87 */}
          <motion.div className="lg:col-span-5" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">04 /</span> ASSESS
            </div>
            <div className="font-mono text-[clamp(110px,15vw,180px)] font-extrabold tracking-[-0.05em] leading-none text-[#DC2626]">
              87
            </div>
            <div className="font-mono text-sm tracking-wider uppercase text-[#52524A] font-bold mt-2">
              RISK SCORE / 100 · CRITICAL
            </div>
            <p className="mt-4 text-sm text-[#52524A] leading-relaxed max-w-[420px]">
              Decision-support priority — so the most dangerous fire is never buried in an unranked list.
            </p>
          </motion.div>

          {/* Right: 5-Factor Weights */}
          <motion.div className="lg:col-span-7 flex flex-col gap-4 bg-white border border-[#E8E2D4] rounded-2xl p-6 sm:p-8 shadow-xs" {...revealProps(0.1)}>
            {[
              { label: 'Severity (FRP & Brightness Temp)', pct: '30%', val: 30 },
              { label: 'Persistence (Recurrence & Lifetime)', pct: '25%', val: 25 },
              { label: 'Exposure (Population Buffer)', pct: '20%', val: 20 },
              { label: 'Infrastructure (Refinery & Power Grid)', pct: '15%', val: 15 },
              { label: 'Growth (Escalation Velocity)', pct: '10%', val: 10 },
            ].map((factor, idx) => (
              <div key={idx} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#1A1A17] font-medium">{factor.label}</span>
                  <span className="font-mono text-xs text-[#52524A] font-bold">{factor.pct}</span>
                </div>
                <div className="h-2 bg-[#F0ECE1] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#DC2626]"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${factor.val * 3.33}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-2 pt-3 border-t border-[#EFEBE0] text-xs text-[#78786E]">
              Weighted operational allocation model calibrated against NASA FIRMS v2 telemetry.
            </div>
          </motion.div>
        </div>
      </section>

      {/* 05 / RESPOND SECTION — Matches Video 00:34 - 00:35 */}
      <section id="respond" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div className="max-w-[680px] mb-16" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">05 /</span> RESPOND
            </div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
              One incident.
              <br />
              One source of truth.
            </h2>
            <p className="mt-4 text-base text-[#52524A] leading-relaxed">
              The same event moves through every pair of hands — analyst, commander, responder — without a single detail lost in translation.
            </p>
          </motion.div>

          {/* Response Lifecycle Card */}
          <motion.div className="border border-[#E8E2D4] rounded-2xl bg-white overflow-hidden shadow-xs" {...revealProps(0.1)}>
            {/* View Tabs */}
            <div className="flex border-b border-[#E8E2D4] bg-[#FAF7F2]">
              {RESPONSE_VIEWS.map((rv, idx) => (
                <button
                  key={rv.id}
                  onClick={() => setActiveResponseIdx(idx)}
                  className={`flex-1 py-4 px-3 font-mono text-xs font-bold tracking-wider text-center border-b-2 transition-all ${
                    activeResponseIdx === idx
                      ? 'text-[#1A1A17] border-[#F5C518] bg-white shadow-xs'
                      : 'text-[#78786E] border-transparent hover:text-[#1A1A17]'
                  }`}
                >
                  {rv.tab}
                </button>
              ))}
            </div>

            {/* View Content */}
            <div className="p-6 sm:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
              <div className="max-w-[560px]">
                <div className="font-mono text-xs font-bold text-[#78786E]">
                  INC-2490 · JAMNAGAR INDUSTRIAL ZONE
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#1A1A17] mt-1.5 tracking-tight">
                  {currentResponse.title}
                </div>
                <p className="mt-3 text-base text-[#52524A] leading-relaxed">
                  {currentResponse.desc}
                </p>
              </div>

              <div className="sm:text-right shrink-0">
                <div className="font-mono text-[clamp(44px,5vw,56px)] font-bold text-[#DC2626] leading-none">
                  {currentResponse.metric}
                </div>
                <div className="font-mono text-xs font-bold tracking-wider text-[#78786E] uppercase mt-2">
                  {currentResponse.metricLabel}
                </div>
              </div>
            </div>

            {/* Lifecycle Stepper Timeline */}
            <div className="flex border-t border-[#E8E2D4] bg-[#FAF7F2]">
              {TIMELINE_STATES.map((st, i) => {
                const isActive = i === currentResponse.step;
                const isDone = i < currentResponse.step;
                return (
                  <div
                    key={st}
                    className={`flex-1 py-3 text-center font-mono text-[11px] tracking-wider relative border-t-2 transition-colors ${
                      isActive
                        ? 'text-[#1A1A17] border-[#F5C518] font-bold bg-white'
                        : isDone
                        ? 'text-emerald-700 border-emerald-600 font-semibold'
                        : 'text-[#A09C90] border-transparent'
                    }`}
                  >
                    {isDone ? `✓ ${st}` : st}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PLATFORM MODULES SECTION — Matches Video 00:36 - 00:38 */}
      <section id="platform" className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto">
          <motion.div className="max-w-[680px] mb-16" {...revealProps(0)}>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase text-[#78786E] mb-3">
              <span className="text-[#1A1A17] font-bold">PLATFORM</span>
            </div>
            <h2 className="text-[clamp(32px,4vw,46px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
              Six experiences.
              <br />
              One mission.
            </h2>
          </motion.div>

          {/* Module Cards Grid (6 Modules matching Video) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Intelligence Map',
                sub: 'Understand.',
                path: '/dashboard',
                desc: 'Investigate thermal detections with full evidence dossiers — facility context, predictive trajectory, and land-cover on a live GIS map.',
              },
              {
                num: '02',
                title: 'Priority Queue',
                sub: 'Coordinate.',
                path: '/priority',
                desc: 'Ranked queue sorted by operational risk tier (Critical, High, Moderate, Low), with confidence and order category filters.',
              },
              {
                num: '03',
                title: 'Constellation Intel',
                sub: 'Analyze.',
                path: '/intelligence',
                desc: 'Multi-satellite constellation telemetry (SNPP, NOAA-20, MODIS, Sentinel-2), industrial correlation buffer, and buffer analysis.',
              },
              {
                num: '04',
                title: 'AI Investigator',
                sub: 'Verify.',
                path: '/investigator',
                desc: 'Algorithmic decision tree auditing, multi-band temporal persistence history.',
              },
              {
                num: '05',
                title: 'Analytics Trends',
                sub: 'Project.',
                path: '/analytics',
                desc: '24-hour thermal anomaly distributions, regional risk cluster rankings.',
              },
              {
                num: '06',
                title: 'System Telemetry',
                sub: 'Monitor.',
                path: '/system',
                desc: 'Pipeline ingestion performance, FIRMS feed latency, and manual resync controls.',
              },
            ].map((p, idx) => (
              <motion.div key={p.num} {...revealProps(idx * 0.05)}>
                <Link
                  to={p.path}
                  className="bg-white border border-[#E8E2D4] rounded-2xl p-7 flex flex-col justify-between hover:border-[#D0C8B8] hover:shadow-md transition-all group h-full"
                >
                  <div>
                    <div className="font-mono text-xs font-semibold text-[#78786E] tracking-wider">
                      {p.num} / {p.title}
                    </div>
                    <div className="text-sm font-bold text-[#EA580C] mt-1 font-mono">
                      {p.sub}
                    </div>
                    <p className="mt-3 text-sm text-[#52524A] leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1A17] mt-6 group-hover:text-amber-600 transition-colors uppercase font-mono tracking-wider">
                    <span>EXPLORE</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Built On Real Signals Pipeline Strip (Matches Video 00:38) */}
          <motion.div className="mt-16 border border-[#E8E2D4] rounded-2xl p-8 bg-white shadow-xs text-center" {...revealProps(0.1)}>
            <div className="text-xs font-mono font-semibold tracking-[0.2em] text-[#78786E] uppercase mb-5">
              BUILT ON REAL SIGNALS
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-mono text-[#52524A] font-semibold">
              <span className="text-[#DC2626] font-bold">NASA FIRMS (375m)</span>
              <span className="text-[#B0AAA0]">→</span>
              <span className="text-[#1A1A17]">THERMAL DETECTION</span>
              <span className="text-[#B0AAA0]">→</span>
              <span className="text-[#DC2626] font-bold">XGBOOST CLASSIFIER</span>
              <span className="text-[#B0AAA0]">→</span>
              <span className="text-[#1A1A17]">GEOSPATIAL CONTEXT</span>
              <span className="text-[#B0AAA0]">→</span>
              <span className="text-[#DC2626] font-bold">5-FACTOR RISK</span>
              <span className="text-[#B0AAA0]">→</span>
              <span className="text-[#1A1A17]">DISPATCH API</span>
            </div>
            <div className="mt-4 font-mono text-[11px] text-[#88887E]">
              VIIRS 375m · OSM Overpass · ESA WorldCover · Mapbox GL · REST API · GeoJSON
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA SECTION — Matches Video 00:39 - 00:40 */}
      <section className="py-24 px-4 sm:px-6 md:px-8 border-t border-[#E8E2D4] bg-[#FAF7F2] text-center">
        <motion.div className="max-w-[760px] mx-auto" {...revealProps(0)}>
          <h2 className="text-[clamp(36px,5vw,56px)] font-extrabold tracking-tight text-[#1A1A17] leading-tight">
            See what matters.
            <br />
            <span className="text-[#78786E]">Before it becomes an emergency.</span>
          </h2>
          <p className="mt-4 text-base text-[#52524A] leading-relaxed">
            The live platform is running right now.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#F5C518] hover:bg-[#EAB308] text-[#1A1A17] font-semibold text-sm shadow-xs hover:shadow-sm active:scale-95 transition-all group"
            >
              <span>Open THERMOS</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER — Matches Video 00:41 */}
      <footer className="border-t border-[#E8E2D4] bg-[#FAF7F2]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 py-16 grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] bg-[#F5C518] flex items-center justify-center shadow-xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1A1A17" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="font-bold text-base tracking-tight text-[#1A1A17]">
                THERMOS
              </span>
            </div>
            <p className="text-sm text-[#52524A] mt-4 leading-relaxed max-w-[340px]">
              Satellite intelligence for faster disaster response, from signal to action.
            </p>
            <div className="flex items-center gap-2 mt-5 font-mono text-xs text-[#78786E]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>OPERATIONS PLATFORM: SIH2024-NTRD · LIVE</span>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs font-semibold tracking-wider text-[#78786E] uppercase mb-4">
              INTELLIGENCE
            </div>
            <div className="flex flex-col gap-2.5 text-sm text-[#52524A]">
              <Link to="/dashboard" className="hover:text-[#1A1A17] transition-colors">Command Map</Link>
              <Link to="/priority" className="hover:text-[#1A1A17] transition-colors">Priority Queue</Link>
              <Link to="/analytics" className="hover:text-[#1A1A17] transition-colors">Analytics Trends</Link>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs font-semibold tracking-wider text-[#78786E] uppercase mb-4">
              DIAGNOSTICS
            </div>
            <div className="flex flex-col gap-2.5 text-sm text-[#52524A]">
              <Link to="/intelligence" className="hover:text-[#1A1A17] transition-colors">Constellation Intel</Link>
              <Link to="/investigator" className="hover:text-[#1A1A17] transition-colors">AI Investigator</Link>
              <Link to="/system" className="hover:text-[#1A1A17] transition-colors">System Telemetry</Link>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs font-semibold tracking-wider text-[#78786E] uppercase mb-4">
              DATA SOURCES
            </div>
            <div className="flex flex-col gap-2.5 text-sm text-[#52524A]">
              <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A17] transition-colors">
                NASA FIRMS v2 ↗
              </a>
              <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A17] transition-colors">
                OpenStreetMap ↗
              </a>
              <a href="https://worldcover2021.esa.int/" target="_blank" rel="noopener noreferrer" className="hover:text-[#1A1A17] transition-colors">
                ESA WorldCover ↗
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E2D4] py-6 px-4 sm:px-6 md:px-8 max-w-[1240px] mx-auto flex flex-wrap justify-between items-center gap-4 text-xs text-[#78786E] font-mono">
          <div>
            © 2024 THERMOS · Operational thermal disaster intelligence. Smart India Hackathon 2024 (SIH2024).
          </div>
          <div>
            <span className="cursor-help hover:text-[#1A1A17] transition-colors" title="Thermal anomaly detection is not confirmed ground-truth fire. Risk score reflects operational prioritization, not fire-ignition probability.">
              Operational Disclaimer ↗
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
