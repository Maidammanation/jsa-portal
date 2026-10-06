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

const SCHOOL_LEVELS = [
  {
    number: "01",
    title: "Early Years",
    description:
      "A supportive beginning where young learners develop confidence, curiosity, communication and foundational learning skills.",
  },
  {
    number: "02",
    title: "Primary",
    description:
      "A strong foundation in core learning areas, positive habits, discipline and the skills needed for continued educational growth.",
  },
  {
    number: "03",
    title: "Junior Secondary",
    description:
      "Learners develop broader academic knowledge, independence, responsibility and confidence as they progress.",
  },
  {
    number: "04",
    title: "Senior Secondary",
    description:
      "Focused preparation for higher education, future opportunities and responsible participation in society.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Make an Enquiry",
    text: "Contact the school to discuss the class or level you are interested in and confirm the current admission arrangements.",
  },
  {
    number: "02",
    title: "Obtain Application Information",
    text: "Receive the relevant application information and guidance from the school admissions office.",
  },
  {
    number: "03",
    title: "Complete the Application",
    text: "Provide the required learner and parent or guardian information accurately and submit the application as directed by the school.",
  },
  {
    number: "04",
    title: "Assessment / Review",
    text: "Where applicable, the school may review the learner's previous academic information and conduct an appropriate assessment or interaction.",
  },
  {
    number: "05",
    title: "Admission Decision",
    text: "The school communicates the outcome and provides the next instructions to successful applicants.",
  },
  {
    number: "06",
    title: "Complete Registration",
    text: "Complete the school's registration and enrolment requirements before the learner begins school.",
  },
];

const DOCUMENTS = [
  {
    title: "Learner Information",
    text: "Basic personal and educational information about the child.",
  },
  {
    title: "Previous School Records",
    text: "Previous academic records or school information where applicable, particularly for transfer applicants.",
  },
  {
    title: "Identification Documents",
    text: "Relevant child identification or age documentation as requested by the school.",
  },
  {
    title: "Recent Photograph",
    text: "A recent passport-style photograph may be requested during the application process.",
  },
  {
    title: "Parent / Guardian Details",
    text: "Current contact information for the parent or responsible guardian.",
  },
  {
    title: "Additional Information",
    text: "Any other documents or information specifically requested by the admissions office.",
  },
];

export default function AdmissionsPage() {
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
                const active = link.href === "/website/admissions";

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

            {/* Mobile Menu */}
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

          {menuOpen && (
            <div className="lg:hidden border-t border-[#ddd5c7] py-4">
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => {
                  const active = link.href === "/website/admissions";

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
                  Admissions
                </div>

                <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] text-white">
                  Start Your Child's
                  <span className="block text-[#e4c17a]">
                    JSA Journey.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/75">
                  Discover the pathway to joining {SCHOOL.name} and learn
                  about the steps families can take when seeking admission.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#process"
                    className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] shadow-lg hover:bg-[#efd49c] transition"
                  >
                    View Admission Process
                  </a>

                  <Link
                    href="/login"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                  >
                    Portal Login
                  </Link>
                </div>
              </div>

              {/* Hero Identity Card */}
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
                      Welcome to
                    </p>

                    <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172033]">
                      {SCHOOL.name}
                    </h2>

                    <p className="mt-3 text-sm text-[#6a6e75]">
                      Knowledge is Light
                    </p>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#f2eadb] p-4 text-center">
                      <p className="text-lg font-black text-[#172033]">
                        Zaria
                      </p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#777067]">
                        Main Campus
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#172033] p-4 text-center">
                      <p className="text-lg font-black text-white">JSA</p>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#d9c08d]">
                        School
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            WELCOME
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-12 items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Begin Here
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033] leading-tight">
                Choosing the right school is an important decision.
              </h2>

              <p className="mt-5 text-[#68707d] leading-8">
                We understand that parents and guardians want to know where
                their children will learn, grow and develop. Our admissions
                process is designed to help families understand the school
                and receive the appropriate information before enrolment.
              </p>

              <div className="mt-7 rounded-2xl bg-[#172033] p-6 text-white">
                <p className="text-sm font-bold text-[#e4c17a]">
                  A simple principle
                </p>

                <p className="mt-2 text-xl font-black">
                  Knowledge is Light.
                </p>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  We want every learner to leave each stage of education with
                  stronger knowledge, better character and greater confidence.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {SCHOOL_LEVELS.map((level) => (
                <div
                  key={level.number}
                  className="rounded-3xl bg-white border border-[#dfd9cf] p-7 shadow-sm"
                >
                  <span className="text-3xl font-black text-[#d9c49a]">
                    {level.number}
                  </span>

                  <h3 className="mt-5 text-xl font-black text-[#172033]">
                    {level.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#68707d]">
                    {level.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================
            ADMISSION PROCESS
        ========================== */}
        <section
          id="process"
          className="bg-white border-y border-[#e3ded4]"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                How It Works
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Admission process
              </h2>

              <p className="mt-4 text-[#68707d] leading-7">
                The exact requirements and arrangements may vary according to
                the learner's level and the current school admission cycle.
                Families should confirm current details with the school.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="relative rounded-3xl bg-[#f8f5ee] border border-[#dfd8cc] p-7"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#172033] text-white flex items-center justify-center font-black">
                    {step.number}
                  </div>

                  <h3 className="mt-6 text-xl font-black text-[#172033]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#68707d]">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* =========================
            DOCUMENTS TO PREPARE
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                Before You Apply
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                Information to prepare
              </h2>

              <p className="mt-5 text-[#68707d] leading-8">
                Having basic learner and parent information ready can make the
                admission conversation and application process easier.
              </p>

              <div className="mt-7 rounded-3xl bg-[#eee4d3] border border-[#ddd0b8] p-7">
                <p className="text-sm font-black text-[#172033]">
                  Important
                </p>

                <p className="mt-2 text-sm leading-7 text-[#625e57]">
                  This is a general preparation guide. The school may request
                  additional documents depending on the learner's class,
                  previous school and current admission requirements.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {DOCUMENTS.map((document, index) => (
                <div
                  key={document.title}
                  className="rounded-3xl bg-white border border-[#dfd9cf] p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#172033] text-[#e4c17a] flex items-center justify-center font-black flex-shrink-0">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-black text-[#172033]">
                        {document.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#68707d]">
                        {document.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================
            LEVEL-SPECIFIC GUIDANCE
        ========================== */}
        <section className="bg-[#172033] text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                Admission by Level
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                Find the right starting point
              </h2>

              <p className="mt-4 text-white/65 leading-7">
                Admission arrangements are considered according to the
                learner's educational level and the school's available places.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                <div className="text-3xl">🌱</div>

                <h3 className="mt-5 text-xl font-black">
                  Early Years
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/65">
                  Focus on readiness, social development, communication and
                  foundational learning.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                <div className="text-3xl">📚</div>

                <h3 className="mt-5 text-xl font-black">
                  Primary
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/65">
                  Focus on strong academic foundations, learning habits and
                  positive character.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                <div className="text-3xl">🎓</div>

                <h3 className="mt-5 text-xl font-black">
                  Junior Secondary
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/65">
                  Focus on broader academic development, independence and
                  preparation for senior secondary education.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 border border-white/10 p-7">
                <div className="text-3xl">🚀</div>

                <h3 className="mt-5 text-xl font-black">
                  Senior Secondary
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/65">
                  Focus on academic progression, responsibility and
                  preparation for future opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            UNIFORM IDENTITY
        ========================== */}
        <section className="bg-[#f8f5ee]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
            <div className="rounded-[32px] overflow-hidden bg-[#e4d4b7] border border-[#d5c5a7]">
              <div className="grid lg:grid-cols-[1fr_0.8fr]">
                <div className="p-8 sm:p-12">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#75551d]">
                    JSA Identity
                  </p>

                  <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                    Smart. Distinctive. Disciplined.
                  </h2>

                  <p className="mt-5 max-w-xl text-[#5e584e] leading-8">
                    The JSA school identity is reflected in the distinctive
                    cream and deep-blue checked uniform, complemented by a
                    dark lower uniform. It represents the smart and
                    recognisable appearance of our learners.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <div className="rounded-full bg-white/60 px-4 py-2 text-sm font-bold text-[#172033]">
                      Cream
                    </div>

                    <div className="rounded-full bg-[#25324a] px-4 py-2 text-sm font-bold text-white">
                      Deep Blue
                    </div>

                    <div className="rounded-full bg-[#171a20] px-4 py-2 text-sm font-bold text-white">
                      Dark
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[260px] overflow-hidden">
                  <div className="absolute inset-0 bg-[#d8bd8b]" />

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

                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-[#172033]/20" />

                  <div className="absolute left-5 right-5 bottom-5 rounded-2xl bg-[#172033]/90 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] font-bold text-[#e4c17a]">
                      School Uniform
                    </p>

                    <p className="mt-1 text-lg font-black text-white">
                      Jidda Standard Academy
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            ENQUIRY / CTA
        ========================== */}
        <section
          id="enquiry"
          className="max-w-7xl mx-auto px-5 sm:px-6 pb-16 sm:pb-24"
        >
          <div className="rounded-[32px] bg-[#172033] px-7 sm:px-12 py-12 sm:py-16 text-white relative overflow-hidden">
            <div className="absolute -right-24 -top-28 w-80 h-80 rounded-full border-[55px] border-[#d7b56b]/10" />

            <div className="relative max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                Ready to Take the Next Step?
              </p>

              <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                Let us help you begin the admission journey.
              </h2>

              <p className="mt-5 text-white/70 leading-8">
                For current admission availability, requirements, dates and
                other school-specific information, please contact the school
                directly or visit the appropriate school office.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/website#contact"
                  className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] hover:bg-[#efd49c] transition"
                >
                  Contact the School
                </Link>

                <Link
                  href="/login"
                  className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                >
                  School Portal
                </Link>

                <Link
                  href="/website"
                  className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-white/75 hover:text-white hover:bg-white/10 transition"
                >
                  Back to Home
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