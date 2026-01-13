import Link from 'next/link'
import { Header } from '@/components/ui/Header'
import { FAQItem } from '@/components/ui/FAQItem'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-sm font-medium text-blue-700">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse" />
              AI-Powered Job Application Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight leading-tight">
              Land Your Dream Job
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                10x Faster
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Let HelpMeApply handle the tedious work while you focus on what matters. Customize resumes, generate cover letters, and apply to jobs in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              <span className="font-semibold">24-hour free trial</span> • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to accelerate your job search and maximize your success rate
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Profiles</h3>
              <p className="text-gray-600 leading-relaxed">
                Create comprehensive profiles with seamless LinkedIn integration. Your data, always up to date.
              </p>
            </div>

            <div className="group p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-indigo-500 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">AI Matching</h3>
              <p className="text-gray-600 leading-relaxed">
                Intelligent job matching powered by AI. Find opportunities that truly match your skills and career goals.
              </p>
            </div>

            <div className="group p-8 bg-white border-2 border-gray-200 rounded-2xl hover:border-purple-500 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Automation</h3>
              <p className="text-gray-600 leading-relaxed">
                Streamline your entire application process with intelligent tracking and automated workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Questions people usually ask
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know before getting started
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
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
          <div className="text-center mt-8">
            <Link href="/faq" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold">
              View all FAQs
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to transform your job search?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who are landing their dream jobs faster with AI-powered assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all duration-200 shadow-xl"
            >
              Start Free Trial
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          <p className="text-blue-100 text-sm mt-6">
            No credit card required • 24-hour free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4">
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
              © 2026 HMI AI. AI-powered career advancement platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}