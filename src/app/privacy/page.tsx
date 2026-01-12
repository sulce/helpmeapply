import { Header } from '@/components/ui/Header'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-light text-gray-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">Last updated: January 10, 2026</p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            This Privacy Policy applies to HelpMeApply.ai, operated by HMI AI Ltd.
          </p>

          <p>
            HelpMeApply.ai collects personal data including CVs, job preferences, job descriptions,
            account details, usage data, referral data, and payment data processed by third party
            providers.
          </p>

          <p>
            Personal data is used to deliver the service, operate Auto Apply and Interview Preparation
            features, manage subscriptions, and provide customer support.
          </p>

          <p>
            Personal data is not sold. Data is shared with employers only when users choose to apply.
          </p>

          <p>
            AI systems process user data to generate suggestions but do not make hiring decisions.
          </p>

          <p>
            Data is protected using reasonable technical and organizational safeguards.
          </p>

          <p>
            Users may request access, correction, or deletion of data by contacting{' '}
            <a href="mailto:hello@helpmeapply.ai" className="text-blue-600 hover:text-blue-700">
              hello@helpmeapply.ai
            </a>
            .
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
