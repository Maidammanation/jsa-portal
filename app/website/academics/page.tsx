"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import { SCHOOL } from "@/settings/config";

const NAV_LINKS = [
  { label: "Home", href: "/website" },
  { label: "About Us", href: "/website/about" },
  { label: "Admissions", href: "/website/admissions" },
  { label: "Academics", href: "/website/academics" },
  { label: "Contact", href: "/website#contact" },
];

const LEVELS = [
  {
    number: "01",
    title: "Pre-Nursery & Early Years",
    subtitle: "Strong beginnings",
    text: "Learning begins with a supportive environment that encourages curiosity, communication, confidence, social development and early foundational skills.",
  },
  {
    number: "02",
    title: "Primary",
    subtitle: "Building foundations",
    text: "Learners develop strong foundations across essential areas of learning while building discipline, positive study habits and confidence.",
  },
  {
    number: "03",
    title: "Junior Secondary",
    subtitle: "Expanding knowledge",
    text: "Learners encounter a broader range of subjects and develop stronger analytical, communication, practical and independent-learning skills.",
  },
  {
    number: "04",
    title: "Senior Secondary",
    subtitle: "Preparing for tomorrow",
    text: "Academic development becomes more focused as learners prepare for examinations, further education, careers and responsible adulthood.",
  },
];

const PILLARS = [
  {
    icon: "01",
    title: "Strong Foundations",
    text: "We focus on helping learners understand the fundamentals before progressing to more advanced concepts.",
  },
  {
    icon: "02",
    title: "Active Learning",
    text: "Learners are encouraged to ask questions, participate, practise skills and connect classroom knowledge with real situations.",
  },
  {
    icon: "03",
    title: "Character Development",
    text: "Academic growth is supported by discipline, responsibility, respect, confidence and positive behaviour.",
  },
  {
    icon: "04",
    title: "Continuous Progress",
    text: "Learners receive ongoing academic guidance so that strengths can be developed and areas requiring improvement can be addressed.",
  },
];

const SUBJECT_AREAS = [
  {
    title: "Languages & Communication",
    text: "Reading, writing, speaking, comprehension and effective communication form an important part of the learner's development.",
  },
  {
    title: "Mathematics & Numeracy",
    text: "Learners develop logical thinking, numerical confidence, problem-solving and practical mathematical skills.",
  },
  {
    title: "Science & Discovery",
    text: "Scientific learning encourages observation, questioning, experimentation, reasoning and understanding of the world around us.",
  },
  {
    title: "Humanities & Social Studies",
    text: "Learners explore people, society, citizenship, history, geography, culture and the responsibilities of living together.",
  },
  {
    title: "Technology & Digital Skills",
    text: "Learners are encouraged to develop appropriate digital awareness and practical skills for an increasingly connected world.",
  },
  {
    title: "Creative & Practical Learning",
    text: "Creative activities and practical learning provide opportunities for expression, imagination, collaboration and problem-solving.",
  },
];

export default function AcademicsPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f5ee] text-[#172033]">
      {/* =========================
          HEADER
      ========================== */}
      <header className="sticky top-0 z-50 border-b border-[#d9d2c3] bg-[#f8f5ee]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <div className="h-[76px] flex items-center justify-between">
            <Link
              href="/website"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="relative w-12 h-12 rounded-full bg-white border border-[#d8cfbe] shadow-sm overflow-hidden flex-shrink-0">
                <Image
                  src={SCHOOL.logoPath}
                  alt={`${SCHOOL.name} logo`}
                  fill
                  className="object-contain p-1"
                  sizes="48px"
                />
              </div>

              <div className="min-w-0">
                <p className="font-extrabold text-[#172033] text-sm sm:text-base truncate">
                  {SCHOOL.name}
                </p>

                <p className="text-[11px] sm:text-xs text-[#6d675d]">
                  Knowledge is Light
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-7">
              {NAV_LINKS.map((link) => {
                const active = link.href === "/website/academics";

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-semibold transition ${
                      active
                        ? "text-[#9a6b18]"
                        : "text-[#30394a] hover:text-[#9a6b18]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <Link
                href="/login"
                className="rounded-xl bg-[#172033] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#263149] transition"
              >
                Portal Login
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="lg:hidden w-11 h-11 rounded-xl border border-[#d5cdbc] bg-white flex items-center justify-center text-[#172033]"
            >
              <span className="text-xl leading-none">
                {menuOpen ? "×" : "☰"}
              </span>
            </button>
          </div>

          {/* Mobile Navigation */}
          {menuOpen && (
            <div className="lg:hidden border-t border-[#ddd5c7] py-4">
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = link.href === "/website/academics";

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        active
                          ? "bg-[#ece4d3] text-[#8c6117]"
                          : "text-[#30394a] hover:bg-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}

                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 rounded-xl bg-[#172033] px-4 py-3 text-center text-sm font-bold text-white"
                >
                  Portal Login
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* =========================
            HERO
        ========================== */}
        <section className="relative overflow-hidden bg-[#172033]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-36 -right-24 w-[420px] h-[420px] rounded-full border-[75px] border-[#c89b4b]" />
            <div className="absolute -bottom-48 -left-24 w-[480px] h-[480px] rounded-full border-[85px] border-[#d8c8a9]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#e8d3a5]">
                  <span className="h-2 w-2 rounded-full bg-[#d8ad58]" />
                  Academics
                </div>

                <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] text-white">
                  Learning Today.
                  <span className="block text-[#e4c17a]">
                    Preparing for Tomorrow.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/75">
                  At {SCHOOL.name}, academic development is combined with
                  character, confidence, practical thinking and preparation
                  for the future.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#levels"
                    className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] shadow-lg hover:bg-[#efd49c] transition"
                  >
                    Explore Learning Levels
                  </a>

                  <Link
                    href="/website/admissions"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                  >
                    Admissions
                  </Link>
                </div>
              </div>

              {/* Academic Identity Card */}
              <div className="rounded-[32px] bg-[#eee3d0] p-5 sm:p-7 shadow-2xl">
                <div className="rounded-[26px] bg-white border border-[#dcd3c2] p-7 sm:p-9">
                  <div className="flex justify-center">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[#f8f5ee] border border-[#ddd3c1] overflow-hidden shadow-sm">
                      <Image
                        src={SCHOOL.logoPath}
                        alt={`${SCHOOL.name} logo`}
                        fill
                        className="object-contain p-3"
                        sizes="128px"
                      />
                    </div>
                  </div>

                  <div className="text-center mt-7">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                      Academic Principle
                    </p>

                    <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172033]">
                      Knowledge is Light
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[#6a6e75]">
                      Building knowledge, developing character and preparing
                      learners for the opportunities ahead.
                    </p>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-[#f2eadb] p-4 text-center">
                      <p className="text-xl font-black text-[#172033]">
                        Learn
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-[#777067]">
                        Knowledge
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#172033] p-4 text-center">
                      <p className="text-xl font-black text-white">
                        Grow
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-[#d9c08d]">
                        Character
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#f2eadb] p-4 text-center">
                      <p className="text-xl font-black text-[#172033]">
                        Lead
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-[#777067]">
                        Future
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ACADEMIC PHILOSOPHY
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Our Approach
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033] leading-tight">
                Education that develops the whole learner.
              </h2>

              <p className="mt-5 text-[#68707d] leading-8">
                We believe academic success is strengthened when learners are
                encouraged to think, participate, practise, communicate and
                take responsibility for their own development.
              </p>

              <p className="mt-5 text-[#68707d] leading-8">
                Our approach aims to give learners strong foundations while
                helping them develop the confidence and values needed to use
                their knowledge positively.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {PILLARS.map((pillar) => (
                <div
                  key={pillar.icon}
                  className="rounded-3xl bg-white border border-[#dfd9cf] p-7 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#172033] text-[#e4c17a] flex items-center justify-center font-black">
                    {pillar.icon}
                  </div>

                  <h3 className="mt-5 text-xl font-black text-[#172033]">
                    {pillar.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#68707d]">
                    {pillar.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================
            LEARNING LEVELS
        ========================== */}
        <section
          id="levels"
          className="bg-white border-y border-[#e3ded4]"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Academic Journey
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Learning at every stage
              </h2>

              <p className="mt-4 text-[#68707d] leading-7">
                Each stage of the learner's journey has different academic
                priorities and developmental needs.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 gap-5">
              {LEVELS.map((level) => (
                <div
                  key={level.number}
                  className="rounded-3xl bg-[#f8f5ee] border border-[#dfd8cc] p-7 sm:p-8"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#172033] text-[#e4c17a] flex items-center justify-center font-black">
                      {level.number}
                    </div>

                    <span className="text-xs font-black uppercase tracking-wider text-[#a16e19]">
                      {level.subtitle}
                    </span>
                  </div>

                  <h3 className="mt-7 text-2xl font-black text-[#172033]">
                    {level.title}
                  </h3>

                  <p className="mt-4 text-sm sm:text-base leading-7 text-[#68707d]">
                    {level.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* =========================
            SUBJECT AREAS
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
              Areas of Learning
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
              Broad knowledge. Practical understanding.
            </h2>

            <p className="mt-4 text-[#68707d] leading-7">
              Our academic environment supports learning across different
              areas so that learners can develop a broad and useful
              understanding of the world.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SUBJECT_AREAS.map((area, index) => (
              <div
                key={area.title}
                className={`rounded-3xl border p-7 ${
                  index % 2 === 0
                    ? "bg-white border-[#dfd9cf]"
                    : "bg-[#eee5d5] border-[#dcd0ba]"
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#172033] text-[#e4c17a] flex items-center justify-center font-black">
                  {index + 1}
                </div>

                <h3 className="mt-6 text-xl font-black text-[#172033]">
                  {area.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#68707d]">
                  {area.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            ASSESSMENT & PROGRESS
        ========================== */}
        <section className="bg-[#172033] text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                  Progress & Assessment
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                  Helping learners know where they stand.
                </h2>

                <p className="mt-5 text-white/70 leading-8">
                  Assessment helps teachers understand learner progress,
                  identify areas that need attention and provide appropriate
                  academic guidance.
                </p>

                <p className="mt-5 text-white/70 leading-8">
                  Our school portal also supports the management of academic
                  results, giving authorised school users access to relevant
                  learner performance information.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                  <div className="text-3xl">📖</div>

                  <h3 className="mt-5 text-xl font-black">
                    Classroom Learning
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Daily teaching, learning activities, practice and
                    participation form the foundation of academic development.
                  </p>
                </div>

                <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                  <div className="text-3xl">📝</div>

                  <h3 className="mt-5 text-xl font-black">
                    Continuous Assessment
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Regular assessment provides useful information about
                    learner understanding and progress.
                  </p>
                </div>

                <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                  <div className="text-3xl">📊</div>

                  <h3 className="mt-5 text-xl font-black">
                    Performance Review
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Performance information can help teachers and parents
                    understand areas of strength and improvement.
                  </p>
                </div>

                <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                  <div className="text-3xl">🎯</div>

                  <h3 className="mt-5 text-xl font-black">
                    Academic Guidance
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Learners can be supported with appropriate guidance as
                    they progress through their educational journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            BEYOND THE CLASSROOM
        ========================== */}
        <section className="bg-[#f8f5ee]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
              <div className="rounded-[32px] bg-[#e4d4b7] border border-[#d5c5a7] p-8 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#75551d]">
                  Beyond the Classroom
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                  Learning is more than textbooks.
                </h2>

                <p className="mt-5 text-[#5e584e] leading-8">
                  Learners benefit from opportunities to develop communication,
                  creativity, teamwork, confidence, discipline and practical
                  problem-solving alongside their academic studies.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/60 p-4">
                    <p className="font-black text-[#172033]">
                      Creativity
                    </p>
                    <p className="mt-1 text-xs text-[#6c665d]">
                      Express ideas
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/60 p-4">
                    <p className="font-black text-[#172033]">
                      Teamwork
                    </p>
                    <p className="mt-1 text-xs text-[#6c665d]">
                      Work together
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/60 p-4">
                    <p className="font-black text-[#172033]">
                      Leadership
                    </p>
                    <p className="mt-1 text-xs text-[#6c665d]">
                      Take responsibility
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/60 p-4">
                    <p className="font-black text-[#172033]">
                      Confidence
                    </p>
                    <p className="mt-1 text-xs text-[#6c665d]">
                      Find your voice
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                  The JSA Learner
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                  What we want every learner to develop.
                </h2>

                <div className="mt-7 space-y-4">
                  {[
                    "A strong foundation of knowledge",
                    "The confidence to ask questions and express ideas",
                    "The discipline to take learning seriously",
                    "The ability to think and solve problems",
                    "Respect for others and responsibility for actions",
                    "A positive attitude toward future opportunities",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-4 rounded-2xl bg-white border border-[#dfd9cf] p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#172033] text-[#e4c17a] flex items-center justify-center text-xs font-black flex-shrink-0">
                        {index + 1}
                      </div>

                      <p className="pt-1 text-sm font-semibold text-[#4f5867]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ACADEMIC SESSION
        ========================== */}
        <section className="bg-white border-y border-[#e3ded4]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="rounded-[32px] bg-[#172033] p-8 sm:p-12">
              <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                    Current Academic Information
                  </p>

                  <h2 className="mt-3 text-3xl sm:text-4xl font-black text-white">
                    {SCHOOL.session}
                  </h2>

                  <p className="mt-3 text-white/65 leading-7">
                    The school portal currently uses the configured academic
                    session and term for authorised school activities.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/10 px-7 py-5 text-center min-w-[180px]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#d9c08d]">
                    Current Term
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {SCHOOL.term}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ADMISSIONS CTA
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="relative overflow-hidden rounded-[32px] bg-[#d8bd8b] px-7 sm:px-12 py-12 sm:py-16">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border-[45px] border-[#172033]/10" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6e511e]">
                Your Child's Journey
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Ready to become part of the JSA learning community?
              </h2>

              <p className="mt-5 max-w-2xl text-[#514b42] leading-7">
                Explore the admission process and learn how your child can
                begin their educational journey at {SCHOOL.name}.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/website/admissions"
                  className="rounded-xl bg-[#172033] px-6 py-3.5 text-sm font-extrabold text-white hover:bg-[#27334a] transition"
                >
                  Explore Admissions
                </Link>

                <Link
                  href="/website/about"
                  className="rounded-xl border border-[#172033]/20 bg-white/60 px-6 py-3.5 text-sm font-extrabold text-[#172033] hover:bg-white transition"
                >
                  About JSA
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl border border-[#172033]/20 px-6 py-3.5 text-sm font-extrabold text-[#172033] hover:bg-white/50 transition"
                >
                  School Portal
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}