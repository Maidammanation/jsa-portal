"use client";

import Link from "next/link";
import { useState } from "react";
import Footer from "@/components/Footer";

export default function AboutPage() {
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
              <p className="text-base font-extrabold sm:text-lg">
                JIDDA STANDARD ACADEMY
              </p>
              <p className="text-xs font-semibold text-yellow-700">
                Knowledge is Light
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/website"
              className="text-sm font-semibold text-slate-600 hover:text-yellow-700"
            >
              Home
            </Link>

            <Link
              href="/website/about"
              className="text-sm font-bold text-yellow-700"
            >
              About Us
            </Link>

            <Link
              href="/website/admissions"
              className="text-sm font-semibold text-slate-600 hover:text-yellow-700"
            >
              Admissions
            </Link>

            <Link
              href="/website/academics"
              className="text-sm font-semibold text-slate-600 hover:text-yellow-700"
            >
              Academics
            </Link>

            <Link
              href="/website/contact"
              className="text-sm font-semibold text-slate-600 hover:text-yellow-700"
            >
              Contact
            </Link>

            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-yellow-600 hover:text-slate-950"
            >
              Portal Login
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-slate-300 p-2 md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

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
                className="rounded-lg bg-yellow-50 px-4 py-3 font-bold text-yellow-700"
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
      <section className="bg-slate-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
            About Jidda Standard Academy
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Knowledge is Light.
            <span className="block text-yellow-400">
              Education Builds the Future.
            </span>
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            Jidda Standard Academy is committed to providing quality education
            while developing the character, confidence, discipline and potential
            of every learner.
          </p>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-700">
              Who We Are
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              A School Built Around Learning and Character
            </h2>

            <div className="mt-6 space-y-5 leading-8 text-slate-600">
              <p>
                Jidda Standard Academy believes that every child deserves an
                environment where learning is encouraged, talents are
                discovered and character is strengthened.
              </p>

              <p>
                Our approach combines academic development with discipline,
                responsibility, respect and positive social values.
              </p>

              <p>
                We work together with parents, teachers and the wider community
                to support learners throughout their educational journey.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:p-10">
            <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
              Our Motto
            </p>

            <h2 className="mt-4 text-4xl font-black text-yellow-400">
              Knowledge is Light
            </h2>

            <p className="mt-5 leading-8 text-slate-300">
              We believe knowledge illuminates the mind, strengthens decision
              making and empowers young people to contribute meaningfully to
              their families and society.
            </p>
          </div>
        </div>
      </section>

      {/* MISSION / VISION / VALUES */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="mb-5 text-3xl">🎯</div>
              <h3 className="text-2xl font-black">Our Mission</h3>
              <p className="mt-4 leading-7 text-slate-600">
                To provide a supportive and disciplined learning environment
                that equips students with knowledge, skills and character for
                responsible living.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="mb-5 text-3xl">🌟</div>
              <h3 className="text-2xl font-black">Our Vision</h3>
              <p className="mt-4 leading-7 text-slate-600">
                To nurture confident, knowledgeable and responsible learners
                who can excel academically and make positive contributions to
                society.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7">
              <div className="mb-5 text-3xl">🤝</div>
              <h3 className="text-2xl font-black">Our Values</h3>
              <p className="mt-4 leading-7 text-slate-600">
                Excellence, discipline, integrity, respect, responsibility,
                teamwork, service and continuous learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SCHOOL COMMUNITY */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm font-extrabold uppercase tracking-widest text-yellow-700">
            Our Community
          </p>

          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Working Together for Every Learner
          </h2>

          <p className="mx-auto mt-5 max-w-3xl leading-8 text-slate-600">
            A strong school community depends on cooperation between students,
            parents, teachers, administrators and the wider community. Jidda
            Standard Academy is committed to building that partnership.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/website/academics"
              className="rounded-xl bg-slate-900 px-7 py-3.5 font-bold text-white hover:bg-yellow-600 hover:text-slate-950"
            >
              Explore Academics
            </Link>

            <Link
              href="/website/contact"
              className="rounded-xl border border-slate-300 px-7 py-3.5 font-bold text-slate-900 hover:border-yellow-500 hover:text-yellow-700"
            >
              Contact the School
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}