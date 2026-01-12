import { Header } from '@/components/ui/Header'
import Link from 'next/link'

export default function FairUsePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-light text-gray-900 mb-8">
          Fair Use Policy
        </h1>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            HelpMeApply.ai is designed for genuine jobseekers.
          </p>

          <p>
            Auto Apply limits are enforced by plan. Repeated, automated, or non job related usage may
            result in throttling or restriction.
          </p>

          <p>
            Interview Preparation is intended for real interview practice and limited to reasonable use.
          </p>

          <p>
            HelpMeApply.ai reserves the right to limit usage to protect platform integrity.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8 text-center">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-gray-900 text-sm">
                    About Help Me Apply
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm">
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/fair-use" className="text-gray-600 hover:text-gray-900 text-sm">
                    Fair Use Policy
                  </Link>
                </li>
                <li>
                  <Link href="/ai-transparency" className="text-gray-600 hover:text-gray-900 text-sm">
                    AI Use & Transparency Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/faq" className="text-gray-600 hover:text-gray-900 text-sm">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-center pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              © 2026 HelpMeApply AI. AI-powered career advancement platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
