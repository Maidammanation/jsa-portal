"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import Footer from "@/components/Footer";
import { SCHOOL } from "@/settings/config";

export default function WebsiteHomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/website"
            className="flex items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src={SCHOOL.logoPath}
                alt={`${SCHOOL.name} logo`}
                fill
                priority
                className="object-contain"
              />
            </div>

            <div className="leading-tight">
              <p className="text-sm font-bold text-brand sm:text-base">
                {SCHOOL.name}
              </p>
              <p className="text-[11px] font-medium text-gray-500 sm:text-xs">
                Knowledge is Light
              </p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-6 lg:flex">
            <Link
              href="/website"
              className="text-sm font-semibold text-brand"
            >
              Home
            </Link>

            <Link
              href="/website/about"
              className="text-sm font-medium text-gray-600 transition hover:text-brand"
            >
              About Us
            </Link>

            <Link
              href="/website/admissions"
              className="text-sm font-medium text-gray-600 transition hover:text-brand"
            >
              Admissions
            </Link>

            <a
              href="#academics"
              className="text-sm font-medium text-gray-600 transition hover:text-brand"
            >
              Academics
            </a>

            <a
              href="#contact"
              className="text-sm font-medium text-gray-600 transition hover:text-brand"
            >
              Contact
            </a>

            <Link
              href="/login"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Portal Login
            </Link>
          </nav>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-lg border border-gray-200 p-2 text-gray-700 lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <span className="text-xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* MOBILE NAV */}
        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-sm lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1">
              <Link
                href="/website"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-brand/5 px-4 py-3 text-sm font-semibold text-brand"
              >
                Home
              </Link>

              <Link
                href="/website/about"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                About Us
              </Link>

              <Link
                href="/website/admissions"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Admissions
              </Link>

              <a
                href="#academics"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Academics
              </a>

              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Contact
              </a>

              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-lg bg-brand px-4 py-3 text-center text-sm font-bold text-white"
              >
                Student / Parent Portal Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <main>
        <section className="relative overflow-hidden bg-brand-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-gray-900 to-black" />

          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/90">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Welcome to {SCHOOL.shortName}
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Building Bright Minds.
                <span className="block text-brand">
                  Shaping Great Futures.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                Welcome to {SCHOOL.name}, where quality education,
                character development and excellence come together to prepare
                learners for a successful future.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/website/admissions"
                  className="rounded-lg bg-brand px-6 py-3.5 text-center text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark"
                >
                  Apply for Admission
                </Link>

                <Link
                  href="/website/about"
                  className="rounded-lg border border-white/25 bg-white/5 px-6 py-3.5 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Discover Our School
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-lg font-bold text-white">JSA</p>
                  <p className="text-xs text-white/50">Excellence</p>
                </div>

                <div>
                  <p className="text-lg font-bold text-white">Zaria</p>
                  <p className="text-xs text-white/50">Main Campus</p>
                </div>

                <div>
                  <p className="text-lg font-bold text-white">2025/26</p>
                  <p className="text-xs text-white/50">Academic Session</p>
                </div>
              </div>
            </div>

            {/* HERO LOGO CARD */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 scale-90 rounded-[2rem] bg-brand/20 blur-3xl" />

                <div className="relative flex min-h-[320px] w-full max-w-md items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] p-10 shadow-2xl backdrop-blur-sm sm:min-h-[380px]">
                  <div className="absolute left-5 top-5 h-16 w-16 rounded-tl-2xl border-l-2 border-t-2 border-brand/70" />
                  <div className="absolute bottom-5 right-5 h-16 w-16 rounded-br-2xl border-b-2 border-r-2 border-brand/70" />

                  <div className="relative h-56 w-56 sm:h-64 sm:w-64">
                    <Image
                      src={SCHOOL.logoPath}
                      alt={`${SCHOOL.name} school logo`}
                      fill
                      priority
                      className="object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WELCOME SECTION */}
        <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Welcome to JSA
              </p>

              <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Education with Purpose
              </h2>

              <p className="mt-5 text-sm leading-7 text-gray-600 sm:text-base">
                At {SCHOOL.name}, we believe education goes beyond the
                classroom. We aim to develop confident, responsible and
                knowledgeable learners who can make a positive difference in
                their communities and the wider world.
              </p>
            </div>

            <div
              id="academics"
              className="mt-12 grid gap-5 md:grid-cols-3"
            >
              {/* CARD 1 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                  📚
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  Academic Excellence
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  A structured learning environment designed to help every
                  learner build strong academic foundations and reach their
                  potential.
                </p>
              </div>

              {/* CARD 2 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                  🌟
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  Character & Values
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  We encourage discipline, respect, responsibility, confidence
                  and positive values alongside academic achievement.
                </p>
              </div>

              {/* CARD 3 */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                  🚀
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  Future Ready
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-600">
                  Learners are encouraged to develop creativity, critical
                  thinking, communication and skills needed for the modern
                  world.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* SCHOOL LEVELS */}
        <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                  Our Learning Community
                </p>

                <h2 className="mt-3 text-3xl font-extrabold text-gray-900 sm:text-4xl">
                  A Complete Learning Journey
                </h2>

                <p className="mt-5 text-sm leading-7 text-gray-600 sm:text-base">
                  Our school provides a structured educational journey from
                  the early years through secondary education, helping learners
                  grow academically, socially and personally at every stage.
                </p>

                <Link
                  href="/website/admissions"
                  className="mt-7 inline-flex rounded-lg bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
                >
                  Explore Admissions
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-2xl">🧒</p>
                  <h3 className="mt-4 font-bold text-gray-900">
                    Early Years
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Building strong foundations through guided learning.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-2xl">📖</p>
                  <h3 className="mt-4 font-bold text-gray-900">
                    Primary
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Developing knowledge, confidence and essential skills.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-2xl">🎓</p>
                  <h3 className="mt-4 font-bold text-gray-900">
                    Junior Secondary
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Preparing learners for greater academic responsibility.
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="text-2xl">🏆</p>
                  <h3 className="mt-4 font-bold text-gray-900">
                    Senior Secondary
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Preparing students for higher education and careers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ADMISSIONS CTA */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-3xl bg-brand-dark">
              <div className="relative px-6 py-12 sm:px-10 lg:px-16 lg:py-14">
                <div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />

                <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                      Admissions
                    </p>

                    <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
                      Give Your Child a Stronger Start
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                      Take the next step toward joining the JSA learning
                      community. Explore our admission process and discover
                      how to begin your child&apos;s journey with us.
                    </p>
                  </div>

                  <Link
                    href="/website/admissions"
                    className="inline-flex items-center justify-center rounded-lg bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark"
                  >
                    Start Admission
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAMPUS / CONTACT */}
        <section
          id="contact"
          className="border-t border-gray-100 bg-white px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
                Find Us
              </p>

              <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
                Our School Locations
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xl">
                    📍
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand">
                      Main Campus
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-gray-900">
                      Zaria
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Jidda Standard Academy
                      <br />
                      Zaria, Kaduna State, Nigeria
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xl">
                    🏫
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand">
                      Annex Campus
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-gray-900">
                      Gaskiya Road
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Jidda Standard Academy Annex
                      <br />
                      Gaskiya Road, Zaria, Kaduna State
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PORTAL CTA */}
        <section className="border-t border-gray-100 bg-gray-50 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl text-white shadow-sm">
              🔐
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Already a JSA Student or Parent?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Access results, attendance, fees and other school information
              through the secure JSA portal.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-lg bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Access School Portal
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}