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
  { label: "Contact", href: "/website/contact" },
];

const CONTACT_CARDS = [
  {
    icon: "🏫",
    title: "Main Campus",
    value: "Zaria",
    description:
      "Our main school campus serving learners and families in the JSA community.",
  },
  {
    icon: "📍",
    title: "Annex",
    value: "Gaskiya Road, Zaria",
    description:
      "Our additional school location serving the wider JSA community.",
  },
  {
    icon: "✉️",
    title: "Email",
    value: "info@jsa.edu.ng",
    description:
      "For general school enquiries and admission-related communication.",
  },
];

const QUICK_ACTIONS = [
  {
    number: "01",
    title: "Admission Enquiry",
    text: "Learn about the admission process, available levels and what to prepare.",
    href: "/website/admissions",
    label: "View Admissions",
  },
  {
    number: "02",
    title: "Academic Information",
    text: "Explore the school's educational approach and learning levels.",
    href: "/website/academics",
    label: "View Academics",
  },
  {
    number: "03",
    title: "School Portal",
    text: "Existing students, parents and authorised staff can access the school portal.",
    href: "/login",
    label: "Open Portal",
  },
];

export default function ContactPage() {
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
                const active = link.href === "/website/contact";

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
                  const active = link.href === "/website/contact";

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
                  Contact JSA
                </div>

                <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] text-white">
                  We Are Here
                  <span className="block text-[#e4c17a]">
                    to Help.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base sm:text-lg leading-8 text-white/75">
                  Whether you are a parent seeking admission information, a
                  member of the JSA community or simply looking to learn more
                  about our school, this is where you can find the key
                  information to get started.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <a
                    href="#contact-details"
                    className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] shadow-lg hover:bg-[#efd49c] transition"
                  >
                    Contact Information
                  </a>

                  <Link
                    href="/website/admissions"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                  >
                    Admissions
                  </Link>
                </div>
              </div>

              {/* Identity Card */}
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
                      {SCHOOL.name}
                    </p>

                    <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172033]">
                      Knowledge is Light
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-[#6a6e75]">
                      Building knowledge, character and confidence for the
                      future.
                    </p>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#f2eadb] p-4 text-center">
                      <p className="text-lg font-black text-[#172033]">
                        Zaria
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-[#777067]">
                        Main Campus
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#172033] p-4 text-center">
                      <p className="text-lg font-black text-white">
                        JSA
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wider font-bold text-[#d9c08d]">
                        Contact
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            CONTACT DETAILS
        ========================== */}
        <section
          id="contact-details"
          className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
              Get In Touch
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
              Find and contact JSA
            </h2>

            <p className="mt-4 text-[#68707d] leading-7">
              Use the information below when contacting the school about
              admissions, learners, academics or general enquiries.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {CONTACT_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-3xl bg-white border border-[#dfd9cf] p-7 shadow-sm"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#172033] flex items-center justify-center text-2xl">
                  {card.icon}
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.15em] text-[#a16e19]">
                  {card.title}
                </p>

                <h3 className="mt-2 text-xl font-black text-[#172033]">
                  {card.value}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#68707d]">
                  {card.description}
                </p>

                {card.title === "Email" && (
                  <a
                    href="mailto:info@jsa.edu.ng"
                    className="inline-flex mt-5 text-sm font-black text-[#9a6b18] hover:underline"
                  >
                    Send an Email →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            CAMPUS LOCATIONS
        ========================== */}
        <section className="bg-white border-y border-[#e3ded4]">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
                  Our Locations
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                  JSA in Zaria
                </h2>

                <p className="mt-5 text-[#68707d] leading-8">
                  Jidda Standard Academy serves its school community through
                  its Main Campus and Annex in Zaria.
                </p>

                <div className="mt-7 rounded-3xl bg-[#f2eadb] border border-[#ded1b9] p-6">
                  <p className="text-sm font-black text-[#172033]">
                    School identity
                  </p>

                  <p className="mt-2 text-sm leading-7 text-[#625e57]">
                    Knowledge is Light — an educational environment focused
                    on learning, character and preparation for the future.
                  </p>
                </div>
              </div>

              {/* Location Visual */}
              <div className="rounded-[32px] overflow-hidden bg-[#172033] p-5 sm:p-7">
                <div className="relative min-h-[340px] rounded-[25px] overflow-hidden bg-[#e5d7bc]">
                  <div className="absolute inset-0 opacity-80">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `
                          linear-gradient(
                            35deg,
                            transparent 0 46%,
                            rgba(23,32,51,0.13) 46% 48%,
                            transparent 48% 100%
                          ),
                          linear-gradient(
                            -25deg,
                            transparent 0 58%,
                            rgba(23,32,51,0.1) 58% 60%,
                            transparent 60% 100%
                          )
                        `,
                      }}
                    />
                  </div>

                  <div className="absolute top-8 left-8 right-8 rounded-2xl bg-white/90 border border-white/60 p-5 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#172033] text-[#e4c17a] flex items-center justify-center text-xl">
                        📍
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#a16e19]">
                          Main Campus
                        </p>

                        <p className="mt-1 text-lg font-black text-[#172033]">
                          Zaria
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-[#172033]/95 p-5 shadow-lg">
                    <p className="text-xs font-black uppercase tracking-wider text-[#e4c17a]">
                      Annex
                    </p>

                    <p className="mt-1 text-lg font-black text-white">
                      Gaskiya Road, Zaria
                    </p>
                  </div>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full bg-[#9a6b18] border-4 border-white shadow-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* =========================
            QUICK ACTIONS
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a16e19]">
              What Do You Need?
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
              Go directly to what you are looking for.
            </h2>

            <p className="mt-4 text-[#68707d] leading-7">
              Choose the area that best matches your enquiry.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {QUICK_ACTIONS.map((action) => (
              <div
                key={action.number}
                className="rounded-3xl bg-white border border-[#dfd9cf] p-7 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#172033] text-[#e4c17a] flex items-center justify-center font-black">
                  {action.number}
                </div>

                <h3 className="mt-6 text-xl font-black text-[#172033]">
                  {action.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#68707d]">
                  {action.text}
                </p>

                <Link
                  href={action.href}
                  className="inline-flex mt-6 rounded-xl bg-[#f0e7d8] px-4 py-2.5 text-sm font-black text-[#8d631d] hover:bg-[#e8dbc5] transition"
                >
                  {action.label} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* =========================
            ADMISSION ENQUIRY
        ========================== */}
        <section className="bg-[#172033] text-white">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
            <div className="grid lg:grid-cols-[1fr_0.8fr] gap-12 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e3c27d]">
                  Parents & Guardians
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                  Looking for admission information?
                </h2>

                <p className="mt-5 max-w-2xl text-white/70 leading-8">
                  Visit our Admissions page for the admission process,
                  learning levels and general information to help you prepare
                  for an enquiry with the school.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/website/admissions"
                    className="rounded-xl bg-[#e5c27b] px-6 py-3.5 text-sm font-extrabold text-[#172033] hover:bg-[#efd49c] transition"
                  >
                    View Admissions
                  </Link>

                  <Link
                    href="/website/academics"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/15 transition"
                  >
                    Explore Academics
                  </Link>
                </div>
              </div>

              <div className="rounded-[30px] bg-white/10 border border-white/10 p-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d9c08d]">
                  General Enquiries
                </p>

                <div className="mt-6">
                  <p className="text-sm text-white/55">
                    Email
                  </p>

                  <a
                    href="mailto:info@jsa.edu.ng"
                    className="mt-1 block text-xl font-black text-white hover:text-[#e4c17a] transition"
                  >
                    info@jsa.edu.ng
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-white/55">
                    Location
                  </p>

                  <p className="mt-1 text-lg font-black text-white">
                    Zaria, Nigeria
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
            SCHOOL PORTAL CTA
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
          <div className="rounded-[32px] bg-[#d8bd8b] px-7 sm:px-12 py-12 sm:py-16 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border-[45px] border-[#172033]/10" />

            <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6e511e]">
                  JSA School Portal
                </p>

                <h2 className="mt-3 text-3xl sm:text-4xl font-black text-[#172033]">
                  Already part of the JSA community?
                </h2>

                <p className="mt-4 max-w-2xl text-[#514b42] leading-7">
                  Students, parents and authorised school staff can access
                  the school's digital portal for the services available to
                  their account.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex justify-center rounded-xl bg-[#172033] px-7 py-4 text-sm font-extrabold text-white hover:bg-[#27334a] transition"
              >
                Open School Portal →
              </Link>
            </div>
          </div>
        </section>

        {/* =========================
            FINAL CONTACT CTA
        ========================== */}
        <section className="max-w-7xl mx-auto px-5 sm:px-6 pb-16 sm:pb-24">
          <div className="rounded-[32px] bg-white border border-[#dfd9cf] p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[#172033] text-[#e4c17a] flex items-center justify-center text-2xl">
              ✉
            </div>

            <h2 className="mt-7 text-3xl sm:text-4xl font-black text-[#172033]">
              Have a question?
            </h2>

            <p className="mt-4 max-w-2xl mx-auto text-[#68707d] leading-7">
              For general enquiries, admissions information or other school
              matters, contact Jidda Standard Academy through the available
              school channels.
            </p>

            <a
              href="mailto:info@jsa.edu.ng"
              className="inline-flex mt-7 rounded-xl bg-[#172033] px-7 py-3.5 text-sm font-extrabold text-white hover:bg-[#27334a] transition"
            >
              Email JSA →
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}