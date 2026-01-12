import { Header } from '@/components/ui/Header'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-light text-gray-900 mb-8">
          About Help Me Apply
        </h1>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            HelpMeApply.ai is an AI powered platform designed to help jobseekers apply for jobs more
            effectively, with less time, effort, and stress.
          </p>

          <p>
            Applying for jobs is often repetitive, overwhelming, and emotionally draining. Many people
            know they are qualified but struggle to tailor applications, write cover letters, manage
            multiple roles, or maintain momentum. HelpMeApply.ai exists to make the job application
            process clearer, faster, and more manageable.
          </p>

          <p>
            The platform supports jobseekers by analyzing job descriptions, tailoring CVs and cover
            letters, surfacing relevant job opportunities, helping users prepare for interviews, and
            managing applications in one place.
          </p>

          <p>
            HelpMeApply.ai gives users a choice in how they apply. Users can apply manually by
            reviewing and submitting applications themselves, or they can choose Auto Apply for roles
            where this option is available. Auto Apply is never enabled by default and only operates
            when a user explicitly chooses to use it for a specific role.
          </p>

          <p>
            HelpMeApply.ai is not a recruiter, employer, or hiring agent. The platform does not make
            hiring decisions, rank candidates, or influence employer outcomes. All hiring decisions are
            made by employers.
          </p>

          <p>
            HelpMeApply.ai is owned and operated by HMI AI Ltd, a company registered in the United
            Kingdom under company number 16551139.
          </p>

          <p>
            The platform is built on clear principles. Users remain in control of their applications at all
            times. Personal data is treated with care and is never sold. AI is used to assist jobseekers,
            not to replace human judgment. Fair access matters and the platform does not monetise
            desperation.
          </p>

          <p className="pt-4">
            Contact email:{' '}
            <a href="mailto:hello@helpmeapply.ai" className="text-blue-600 hover:text-blue-700">
              hello@helpmeapply.ai
            </a>
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
