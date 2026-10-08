"use client";

import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/Footer";

export default function WebsiteHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/website"
            onClick={closeMenu}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-yellow-500 bg-slate-900">
              <img
                src="/logo.png"
                alt="Jidda Standard Academy"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div>
              <p className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                JIDDA STANDARD ACADEMY
              </p>
              <p className="text-xs font-semibold text-yellow-700">
                Knowledge is Light
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/website"
              className="text-sm font-semibold text-slate-900 transition hover:text-yellow-700"
            >
              Home
            </Link>

            <Link
              href="/website/about"
              className="text-sm font-semibold text-slate-600 transition hover:text-yellow-700"
            >
              About Us
            </Link>

            <Link
              href="/website/admissions"
              className="text-sm font-semibold text-slate-600 transition hover:text-yellow-700"
            >
              Admissions
            </Link>

            <Link
              href="/website/academics"
              className="text-sm font-semibold text-slate-600 transition hover:text-yellow-700"
            >
              Academics
            </Link>

            <Link
              href="/website/contact"
              className="text-sm font-semibold text-slate-600 transition hover:text-yellow-700"
            >
              Contact
            </Link>

            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-600 hover:text-slate-950"
            >
              Portal Login
            </Link>
          </nav>

          {/* MOBILE BUTTON */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-slate-300 p-2 text-slate-900 md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* MOBILE NAV */}
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                href="/website"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 font-semibold hover:bg-slate-100"
              >
                Home
              </Link>

              <Link
                href="/website/about"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 font-semibold hover:bg-slate-100"
              >
                About Us
              </Link>

              <Link
                href="/website/admissions"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 font-semibold hover:bg-slate-100"
              >
                Admissions
              </Link>

              <Link
                href="/website/academics"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 font-semibold hover:bg-slate-100"
              >
                Academics
              </Link>

              <Link
                href="/website/contact"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 font-semibold hover:bg-slate-100"
              >
                Contact
              </Link>

              <Link
                href="/login"
                onClick={closeMenu}
                className="mt-2 rounded-lg bg-slate-900 px-4 py-3 text-center font-bold text-white"
              >
                Portal Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.20),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-300">
              Jidda Standard Academy • Zaria
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-7xl">
              Knowledge is Light.
              <span className="block text-yellow-400">
                Character is the Foundation.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Welcome to Jidda Standard Academy, where academic excellence,
              character development, discipline and responsible citizenship
              come together to prepare students for a brighter future.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/website/admissions"
                className="rounded-xl bg-yellow-500 px-7 py-3.5 text-center font-extrabold text-slate-950 shadow-lg transition hover:bg-yellow-400"
              >
                Explore Admissions
              </Link>

              <Link
                href="/website/about"
                className="rounded-xl border border-white/30 bg-white/5 px-7 py-3.5 text-center font-bold text-white transition hover:bg-white/10"
              >
                Discover Our School
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WELCOME */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-700">
              Welcome to Jidda Standard Academy
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Building Knowledge, Character and Confidence
            </h2>

            <div className="mt-6 space-y-4 text-base leading-7 text-slate-600">
              <p>
                At Jidda Standard Academy, we believe that education goes
                beyond the classroom. We seek to develop learners who are
                knowledgeable, disciplined, confident and prepared to make a
                positive contribution to society.
              </p>

              <p>
                Our school community is committed to providing a supportive
                learning environment where every child can discover their
                abilities and develop the skills needed for the future.
              </p>
            </div>

            <Link
              href="/website/about"
              className="mt-7 inline-flex rounded-lg bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-yellow-600 hover:text-slate-950"
            >
              Learn More About Us
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl">
                🎓
              </div>
              <h3 className="text-xl font-extrabold">Academic Excellence</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A learning environment focused on strong academic foundations
                and continuous improvement.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl">
                ⭐
              </div>
              <h3 className="text-xl font-extrabold">Character</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We encourage discipline, responsibility, respect and good
                citizenship.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl">
                📚
              </div>
              <h3 className="text-xl font-extrabold">Quality Learning</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Students are supported through structured teaching and a
                positive school environment.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl">
                🤝
              </div>
              <h3 className="text-xl font-extrabold">Community</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We value partnership between students, parents, teachers and
                the wider community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORE */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-700">
              Explore JSA
            </p>

            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Everything You Need to Know
            </h2>

            <p className="mt-4 text-slate-600">
              Explore our school, academic programmes, admissions information
              and contact details.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/website/about"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-black">About Us</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Learn about our school, values, vision and mission.
              </p>
              <span className="mt-5 inline-block font-bold text-yellow-700 group-hover:text-yellow-600">
                Explore →
              </span>
            </Link>

            <Link
              href="/website/admissions"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-black">Admissions</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Find information about joining Jidda Standard Academy.
              </p>
              <span className="mt-5 inline-block font-bold text-yellow-700 group-hover:text-yellow-600">
                Apply / Enquire →
              </span>
            </Link>

            <Link
              href="/website/academics"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-black">Academics</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Explore our academic structure and learning programmes.
              </p>
              <span className="mt-5 inline-block font-bold text-yellow-700 group-hover:text-yellow-600">
                View Academics →
              </span>
            </Link>

            <Link
              href="/website/contact"
              className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-xl font-black">Contact</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Find our campus locations and contact information.
              </p>
              <span className="mt-5 inline-block font-bold text-yellow-700 group-hover:text-yellow-600">
                Contact Us →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* PORTAL CTA */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
            JSA School Portal
          </p>

          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Your School, Connected
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
            Students, parents, teachers, administrators and school management
            can access the digital school portal from one secure platform.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex rounded-xl bg-yellow-500 px-8 py-3.5 font-extrabold text-slate-950 transition hover:bg-yellow-400"
          >
            Access School Portal
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}