import { Header } from '@/components/ui/Header'
import { FAQItem } from '@/components/ui/FAQItem'
import Link from 'next/link'

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600">
            Find answers to common questions about HelpMeApply.ai
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <FAQItem
            question="What is HelpMeApply.ai?"
            answer="HelpMeApply.ai is an AI powered platform that helps jobseekers prepare and submit job applications more efficiently and with greater confidence."
          />
          <FAQItem
            question="Is HelpMeApply.ai a recruiter or employer?"
            answer="No. HelpMeApply.ai is not a recruiter, staffing agency, or employer."
          />
          <FAQItem
            question="What is Auto Apply?"
            answer="Auto Apply allows HelpMeApply.ai to submit an application on your behalf when you explicitly choose to enable it for a specific role."
          />
          <FAQItem
            question="Is Auto Apply automatic?"
            answer="No. Auto Apply is never enabled by default."
          />
          <FAQItem
            question="What counts toward my application limit?"
            answer="Only Auto Apply submissions count toward monthly application limits."
          />
          <FAQItem
            question="Do I need to pay to use Manual Apply?"
            answer="Yes. After the free trial ends, a paid subscription is required to use any part of the platform."
          />
          <FAQItem
            question="Can I cancel plans and add-ons separately?"
            answer="Yes. Core plans and add-ons can be cancelled independently."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="No. HelpMeApply.ai does not offer refunds."
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:hello@helpmeapply.ai"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Contact us at hello@helpmeapply.ai
          </a>
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
