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
  { label: "Academics", href: "/website#academics" },
  { label: "Contact", href: "/website#contact" },
];

const VALUES = [
  {
    number: "01",
    title: "Academic Excellence",
    text: "We encourage every learner to develop strong academic foundations, curiosity, discipline and a genuine love for learning.",
  },
  {
    number: "02",
    title: "Good Character",
    text: "Education goes beyond the classroom. We promote respect, responsibility, honesty, confidence and positive relationships.",
  },
  {
    number: "03",
    title: "Faith & Values",
    text: "We recognise the importance of sound moral values, personal responsibility and a respectful environment for every learner.",
  },
  {
    number: "04",
    title: "Future Readiness",
    text: "We prepare learners with knowledge, confidence, communication skills and practical thinking for the opportunities ahead.",
  },
  {
    number: "05",
    title: "Respect & Inclusion",
    text: "Every child deserves to feel valued, supported and encouraged to participate, grow and discover their strengths.",
  },
  {
    number: "06",
    title: "Community",
    text: "We believe that strong schools are built through meaningful relationships between learners, teachers, parents and the wider community.",
  },
];

export default function AboutPage() {
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
              className="flex items-center gap-3 min-w-0"
              onClick={() => setMenuOpen(false)}
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
                const active = link.href === "/website/about";

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
                  const active = link.href === "/website/about";

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

      {/* =========================
          HERO
      ========================== */}
      <main>
        <section className="relative overflow-hidden bg-[#172033]">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full border-[70px] border-[#c89b4b]" />
            <div className="absolute -bottom-40 -left-20 w-[420px] h-[420px] rounded-full border-[80px] border-[#d8c8a9]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-5 sm:px-6 py-20 sm:py-28">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#e8d3a5]">
                <span className="h-2 w-2 rounded-full bg-[#d8ad58]" />
                About JSA
              </div>

              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] text-white">
                Where Knowledge
                <span className="block text-[#e4c17a]">
                  Becomes Character.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/75">
                {SCHOOL.name} is committed to providing an environment where
                learners can grow academically, morally, socially and
                confidently as they prepare for the future.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/website/admissions"
                  className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] shadow-lg hover:bg-[#efd49c] transition"
                >
                  Explore Admissions
                </Link>

                <Link
                  href="/website#academics"
                  className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                >
                  Explore Academics
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            INTRODUCTION
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Who We Are
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033] leading-tight">
                Education with purpose,
                <span className="block text-[#7d8795]">
                  discipline and direction.
                </span>
              </h2>

              <div className="mt-6 space-y-5 text-[#596170] leading-8">
                <p>
                  At {SCHOOL.name}, we believe that meaningful education should
                  develop the whole child. Academic knowledge matters, but so
                  do character, confidence, responsibility, creativity and the
                  ability to relate positively with others.
                </p>

                <p>
                  Our goal is to provide learners with a supportive school
                  environment in which they can discover their abilities,
                  strengthen their foundations and develop the mindset needed
                  for the next stage of their lives.
                </p>

                <p>
                  We value the partnership between the school, parents and
                  learners because every child benefits when the people around
                  them share a common commitment to their growth.
                </p>
              </div>
            </div>

            {/* School Identity Card */}
            <div className="relative">
              <div className="rounded-[28px] bg-white border border-[#ded6c8] shadow-xl overflow-hidden">
                <div className="bg-[#ece2cf] p-7 sm:p-9">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-2xl bg-white border border-[#d8cdbb] overflow-hidden shadow-sm">
                      <Image
                        src={SCHOOL.logoPath}
                        alt={`${SCHOOL.name} logo`}
                        fill
                        className="object-contain p-2"
                        sizes="80px"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-[#806020]">
                        Our School
                      </p>
                      <h3 className="mt-1 text-xl sm:text-2xl font-black text-[#172033]">
                        {SCHOOL.shortName}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-8">
                    <p className="text-2xl sm:text-3xl font-black text-[#172033]">
                      Knowledge is Light
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#625d55]">
                      A simple principle that reflects our commitment to
                      learning, personal development and responsible growth.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-[#e2ddd3]">
                  <div className="p-5 text-center">
                    <p className="text-2xl font-black text-[#172033]">JSA</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#777067]">
                      School
                    </p>
                  </div>

                  <div className="p-5 text-center">
                    <p className="text-2xl font-black text-[#172033]">4+</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#777067]">
                      Levels
                    </p>
                  </div>

                  <div className="p-5 text-center">
                    <p className="text-2xl font-black text-[#172033]">∞</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#777067]">
                      Potential
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            MISSION / VISION
        ========================== */}
        <section className="bg-white border-y border-[#e3ded4]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Our Direction
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                What guides us
              </h2>
              <p className="mt-4 text-[#68707d] leading-7">
                Our educational approach is centred on purposeful learning,
                positive character and preparation for a changing world.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 gap-6">
              {/* Mission */}
              <div className="rounded-3xl bg-[#172033] p-8 sm:p-10 text-white shadow-lg">
                <div className="w-14 h-14 rounded-2xl bg-[#e4c078] text-[#172033] flex items-center justify-center text-xl font-black">
                  M
                </div>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                  Our Mission
                </p>

                <h3 className="mt-3 text-2xl sm:text-3xl font-black">
                  To nurture capable and responsible learners.
                </h3>

                <p className="mt-5 text-white/70 leading-8">
                  We strive to create a learning environment that supports
                  academic development, sound character, confidence,
                  creativity and responsible citizenship.
                </p>
              </div>

              {/* Vision */}
              <div className="rounded-3xl bg-[#f0e7d7] border border-[#ddd1bd] p-8 sm:p-10 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[#172033] text-white flex items-center justify-center text-xl font-black">
                  V
                </div>

                <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[#8b641e]">
                  Our Vision
                </p>

                <h3 className="mt-3 text-2xl sm:text-3xl font-black text-[#172033]">
                  To help every learner become ready for tomorrow.
                </h3>

                <p className="mt-5 text-[#62615c] leading-8">
                  We envision learners who possess strong foundations,
                  positive values, confidence and the ability to contribute
                  meaningfully to their families, communities and society.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* =========================
            CORE VALUES
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
              Our Core Values
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
              The values behind the learning
            </h2>

            <p className="mt-4 text-[#68707d] leading-7">
              These principles help shape the culture we want our learners to
              experience every day.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map((value) => (
              <div
                key={value.number}
                className="group rounded-3xl bg-white border border-[#dfd9cf] p-7 shadow-sm hover:-translate-y-1 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-3xl font-black text-[#d9c49a]">
                    {value.number}
                  </span>

                  <span className="h-2.5 w-2.5 rounded-full bg-[#b98a38] mt-2" />
                </div>

                <h3 className="mt-6 text-xl font-black text-[#172033]">
                  {value.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#68707d]">
                  {value.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            UNIFORM / IDENTITY
        ========================== */}
        <section className="bg-[#172033] text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                  Our School Identity
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                  A uniform that reflects the JSA identity.
                </h2>

                <p className="mt-5 text-white/70 leading-8">
                  The school uniform combines a warm cream tone with a
                  distinctive dark blue and cream checked pattern, supported
                  by dark trousers. It gives JSA learners a recognisable,
                  smart and disciplined appearance.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2">
                    <span className="w-4 h-4 rounded-full bg-[#d8bd8b] border border-white/30" />
                    <span className="text-sm font-semibold">Cream</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2">
                    <span className="w-4 h-4 rounded-full bg-[#25324a] border border-white/30" />
                    <span className="text-sm font-semibold">Deep Blue</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2">
                    <span className="w-4 h-4 rounded-full bg-[#171a20] border border-white/30" />
                    <span className="text-sm font-semibold">Dark</span>
                  </div>
                </div>
              </div>

              {/* Uniform-inspired visual */}
              <div className="rounded-[32px] overflow-hidden border border-white/10 bg-[#eee3d0] p-4 sm:p-6">
                <div className="rounded-[24px] overflow-hidden min-h-[310px] relative">
                  {/* Cream fabric */}
                  <div className="absolute inset-0 bg-[#d8bd8b]" />

                  {/* Check pattern */}
                  <div
                    className="absolute inset-0 opacity-95"
                    style={{
                      backgroundImage: `
                        linear-gradient(
                          90deg,
                          transparent 0 42px,
                          #25324a 42px 55px,
                          transparent 55px 88px
                        ),
                        linear-gradient(
                          0deg,
                          transparent 0 42px,
                          #25324a 42px 55px,
                          transparent 55px 88px
                        ),
                        linear-gradient(
                          90deg,
                          transparent 0 78px,
                          rgba(38, 49, 70, 0.45) 78px 84px,
                          transparent 84px 118px
                        ),
                        linear-gradient(
                          0deg,
                          transparent 0 78px,
                          rgba(38, 49, 70, 0.45) 78px 84px,
                          transparent 84px 118px
                        )
                      `,
                      backgroundSize: "118px 118px",
                    }}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-[#172033]/25" />

                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="rounded-2xl bg-[#172033]/90 backdrop-blur px-5 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] font-bold text-[#e4c17a]">
                        JSA Identity
                      </p>
                      <p className="mt-1 text-lg font-black">
                        Smart • Distinctive • Disciplined
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            SCHOOL LEVELS
        ========================== */}
        <section className="bg-[#f8f5ee]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Learning Journey
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Growing with our learners
              </h2>

              <p className="mt-4 text-[#68707d] leading-7">
                Our school structure supports learners through different
                stages of their educational journey.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: "Early Years",
                  subtitle: "Strong beginnings",
                  text: "A nurturing environment where young learners begin developing confidence, curiosity and foundational skills.",
                },
                {
                  title: "Primary",
                  subtitle: "Building foundations",
                  text: "Focused learning that strengthens literacy, numeracy, knowledge, discipline and positive learning habits.",
                },
                {
                  title: "Junior Secondary",
                  subtitle: "Discovering potential",
                  text: "Learners develop broader academic knowledge while building independence, responsibility and confidence.",
                },
                {
                  title: "Senior Secondary",
                  subtitle: "Preparing for the future",
                  text: "Learners are guided toward higher academic expectations, personal responsibility and future opportunities.",
                },
              ].map((level, index) => (
                <div
                  key={level.title}
                  className={`rounded-3xl p-7 border ${
                    index % 2 === 0
                      ? "bg-white border-[#ddd7cd]"
                      : "bg-[#eee5d5] border-[#dcd0ba]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#172033] text-white flex items-center justify-center font-black">
                    {index + 1}
                  </div>

                  <p className="mt-6 text-xs font-black uppercase tracking-wider text-[#9a6b18]">
                    {level.subtitle}
                  </p>

                  <h3 className="mt-2 text-xl font-black text-[#172033]">
                    {level.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#69717d]">
                    {level.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================
            CAMPUS
        ========================== */}
        <section className="bg-white border-t border-[#e3ded4]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-[#172033] p-8 sm:p-10 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                  Main Campus
                </p>

                <h2 className="mt-3 text-2xl sm:text-3xl font-black">
                  Zaria
                </h2>

                <p className="mt-4 text-white/70 leading-7">
                  Our main campus serves as a central learning environment for
                  the JSA community.
                </p>
              </div>

              <div className="rounded-3xl bg-[#eee5d5] border border-[#ddd0b8] p-8 sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8d651f]">
                  Annex
                </p>

                <h2 className="mt-3 text-2xl sm:text-3xl font-black text-[#172033]">
                  Gaskiya Road, Zaria
                </h2>

                <p className="mt-4 text-[#64635e] leading-7">
                  Our annex extends the JSA learning community and supports
                  access to the school.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ADMISSION CTA
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 pb-16 sm:pb-24">
          <div className="relative overflow-hidden rounded-[32px] bg-[#d8bd8b] px-7 sm:px-12 py-12 sm:py-16">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border-[45px] border-[#172033]/10" />
            <div className="absolute -left-16 -bottom-28 w-72 h-72 rounded-full border-[55px] border-white/15" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6e511e]">
                Join the JSA Community
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Give your child a strong foundation for the future.
              </h2>

              <p className="mt-5 max-w-2xl text-[#514b42] leading-7">
                Learn more about admission opportunities, school requirements
                and the next steps for joining {SCHOOL.name}.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/website/admissions"
                  className="rounded-xl bg-[#172033] px-6 py-3.5 text-sm font-extrabold text-white hover:bg-[#27334a] transition"
                >
                  Admission Information
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl border border-[#172033]/20 bg-white/60 px-6 py-3.5 text-sm font-extrabold text-[#172033] hover:bg-white transition"
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