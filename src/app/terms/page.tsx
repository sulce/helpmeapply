import { Header } from '@/components/ui/Header'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-light text-gray-900 mb-4">
          Terms and Conditions
        </h1>
        <p className="text-gray-600 mb-8">Last updated: January 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            These Terms and Conditions govern your use of HelpMeApply.ai.
          </p>

          <p>
            HelpMeApply.ai is owned and operated by HMI AI Ltd, registered in the United Kingdom
            under company number 16551139.
          </p>

          <p>
            By accessing or using HelpMeApply.ai, you agree to these Terms.
          </p>

          <p>
            HelpMeApply.ai provides AI assisted tools to support jobseekers. It does not act as a
            recruiter, employer, or hiring agent.
          </p>

          <p>
            Users are responsible for reviewing application materials and deciding whether and how to
            apply.
          </p>

          <p>
            HelpMeApply.ai does not guarantee interviews, job offers, responses, or employment
            outcomes.
          </p>

          <p>
            Users must not misuse the platform, attempt mass automation, scraping, or interfere with
            system integrity.
          </p>

          <p>
            Users retain ownership of their personal content. HMI AI Ltd retains ownership of the
            platform and underlying technology.
          </p>

          <p>
            A paid subscription is required after the free trial ends.
          </p>

          <p>
            Auto Apply usage is limited by plan and subject to fair use.
          </p>

          <p>
            Subscriptions renew automatically unless cancelled. No refunds are offered.
          </p>

          <p>
            These Terms are governed by the laws of England and Wales.
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
