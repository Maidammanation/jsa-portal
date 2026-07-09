import Footer from "@/components/Footer";
import { SCHOOL } from "@/settings/config";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-brand-dark mb-4">About {SCHOOL.name}</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Placeholder content — replace with the school's history, mission, vision,
          and core values.
        </p>
      </main>
      <Footer />
    </div>
  );
}
