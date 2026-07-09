import { SCHOOL } from "@/settings/config";

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white/80 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="text-white font-semibold text-base mb-2">{SCHOOL.name}</p>
          <p>Committed to academic excellence and character development.</p>
        </div>
        <div>
          <p className="text-white font-semibold mb-2">Quick Links</p>
          <ul className="space-y-1">
            <li><a href="/website/about" className="hover:text-white">About Us</a></li>
            <li><a href="/website/admissions" className="hover:text-white">Admissions</a></li>
            <li><a href="/login" className="hover:text-white">Portal Login</a></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-2">Contact</p>
          <p>Jidda, Nigeria</p>
          <p>info@jsa.edu.ng</p>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs py-4">
        © {new Date().getFullYear()} {SCHOOL.name}. All rights reserved.
      </div>
    </footer>
  );
}
