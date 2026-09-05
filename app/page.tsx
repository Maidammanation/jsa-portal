import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/Footer";
import { SCHOOL } from "@/settings/config";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-11 h-11 shrink-0">
            <Image
              src="/assets/school-logo.png"
              alt={`${SCHOOL.name} logo`}
              fill
              priority
              className="object-contain"
            />
          </div>

          <div className="leading-tight">
            <span className="font-bold text-brand text-lg block">
              {SCHOOL.name}
            </span>
            <span className="text-xs text-gray-500">
              {SCHOOL.shortName}
            </span>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/website/about" className="hover:text-brand">
            About
          </Link>

          <Link href="/website/admissions" className="hover:text-brand">
            Admissions
          </Link>

          <Link href="/login" className="hover:text-brand">
            Portal Login
          </Link>
        </nav>

        <Link
          href="/login"
          className="bg-brand text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark"
        >
          Login
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center">
          {/* School Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              <Image
                src="/assets/school-logo.png"
                alt={`${SCHOOL.name} logo`}
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-brand-dark mb-4">
            Welcome to {SCHOOL.name}
          </h1>

          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Nurturing excellence, discipline, and character in every learner.
            Explore our academic programs, admissions process, and school
            portal.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/website/admissions"
              className="bg-accent text-brand-dark font-semibold px-6 py-3 rounded-lg hover:bg-accent-light"
            >
              Apply for Admission
            </Link>

            <Link
              href="/login"
              className="border border-brand text-brand font-semibold px-6 py-3 rounded-lg hover:bg-brand/5"
            >
              Portal Login
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 pb-16 sm:pb-20">
          {[
            {
              title: "Quality Education",
              body: "A balanced curriculum built for academic and moral excellence.",
            },
            {
              title: "Modern Facilities",
              body: "Well-equipped classrooms, labs, and library resources.",
            },
            {
              title: "Dedicated Staff",
              body: "Experienced teachers committed to every student's growth.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-card shadow-sm border border-gray-100 p-6 text-left"
            >
              <p className="font-semibold text-brand mb-2">{f.title}</p>
              <p className="text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Developer Credit */}
      <div className="text-center pb-5 px-4">
        <p className="text-xs text-gray-400">
          Designed &amp; Developed by{" "}
          <span className="font-semibold text-gray-500">
            Maidammanation Tech Company
          </span>
        </p>

        <p className="text-[11px] text-gray-400 mt-1">
          08032191668 / 08117106867
        </p>
      </div>

      {/* Existing Footer */}
      <Footer />
    </div>
  );
}