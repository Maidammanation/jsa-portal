import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* SCHOOL */}
          <div>
            <Link href="/website" className="inline-block">
              <h2 className="text-xl font-black">
                JIDDA STANDARD ACADEMY
              </h2>

              <p className="mt-1 text-sm font-semibold text-yellow-400">
                Knowledge is Light
              </p>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              A school committed to academic excellence, character development,
              discipline and the development of responsible future leaders.
            </p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
              Quick Links
            </h3>

            <nav className="mt-5 flex flex-col gap-3 text-sm">
              <Link
                href="/website"
                className="text-slate-300 hover:text-yellow-400"
              >
                Home
              </Link>

              <Link
                href="/website/about"
                className="text-slate-300 hover:text-yellow-400"
              >
                About Us
              </Link>

              <Link
                href="/website/admissions"
                className="text-slate-300 hover:text-yellow-400"
              >
                Admissions
              </Link>

              <Link
                href="/website/academics"
                className="text-slate-300 hover:text-yellow-400"
              >
                Academics
              </Link>

              <Link
                href="/website/contact"
                className="text-slate-300 hover:text-yellow-400"
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* PORTAL */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
              School Portal
            </h3>

            <p className="mt-5 text-sm leading-7 text-slate-400">
              Access the secure digital school portal for students, parents,
              teachers and school management.
            </p>

            <Link
              href="/login"
              className="mt-5 inline-flex rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-yellow-400"
            >
              Portal Login
            </Link>
          </div>

          {/* LOCATION */}
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-yellow-400">
              Our Locations
            </h3>

            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-400">
              <div>
                <p className="font-bold text-white">Main Campus — Zaria</p>
                <p>No. 5 Hayin Dogo, Anguwan Rafi Danmagaji, Zaria</p>
              </div>

              <div>
                <p className="font-bold text-white">Annex — Gaskiya Road</p>
                <p>
                  No. 5 Aminu Mai Kai Close, Behind Baba Kaduna's Garage,
                  Gaskiya Road, Zaria
                </p>
              </div>

              <div>
                <p className="font-bold text-white">Phone</p>
                <p>08121414008</p>
                <p>08069121401</p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-10 border-t border-slate-800 pt-6">
          <div className="flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Jidda Standard Academy. All rights
              reserved.
            </p>

            <div className="flex gap-5">
              <Link
                href="/website/about"
                className="hover:text-yellow-400"
              >
                About
              </Link>

              <Link
                href="/website/contact"
                className="hover:text-yellow-400"
              >
                Contact
              </Link>

              <Link href="/login" className="hover:text-yellow-400">
                Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}