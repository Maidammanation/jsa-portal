import Footer from "@/components/Footer";
import { SCHOOL } from "@/settings/config";

export default function AdmissionsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-brand-dark mb-4">Admissions</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Placeholder content — outline the admissions process, requirements,
          and an application form/link for {SCHOOL.name}.
        </p>
      </main>
      <Footer />
    </div>
  );
}
