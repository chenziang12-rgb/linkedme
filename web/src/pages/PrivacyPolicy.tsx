import { Link } from 'react-router-dom';

export default function PrivacyPolicy(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 mb-6 inline-block">
            ← Back to Login
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: November 9, 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
              <p className="text-slate-600 mb-4">
                LinkedMe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">2.1 Information You Provide</h3>
              <p className="text-slate-600 mb-4">
                We collect information that you voluntarily provide to us, including:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Account information (name, email address from Google authentication)</li>
                <li>Professional information (resumes, work experience, education, skills)</li>
                <li>Project information and portfolio links</li>
                <li>LinkedIn, GitHub, and other professional profile URLs</li>
                <li>Job preferences and interests</li>
              </ul>

              <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <p className="text-slate-600 mb-4">
                When you use our service, we may automatically collect:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Device information (browser type, operating system)</li>
                <li>Log data (IP address, access times, errors)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <p className="text-slate-600 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Provide and maintain our job matching service</li>
                <li>Generate personalized resumes, cover letters, and outreach messages</li>
                <li>Match you with relevant job opportunities</li>
                <li>Improve and optimize our AI algorithms</li>
                <li>Communicate with you about your account and our services</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. AI Processing</h2>
              <p className="text-slate-600 mb-4">
                We use artificial intelligence and large language models to process your information. Your data may be sent to third-party AI providers (such as OpenAI) to generate personalized content. These providers are bound by their own privacy policies and data processing agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Information Sharing</h2>
              <p className="text-slate-600 mb-4">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li><strong>With your consent:</strong> When you explicitly choose to share information (e.g., applying to jobs)</li>
                <li><strong>Service providers:</strong> With third-party vendors who perform services on our behalf (AI providers, hosting services)</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Data Security</h2>
              <p className="text-slate-600 mb-4">
                We implement appropriate technical and organizational security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Data Retention</h2>
              <p className="text-slate-600 mb-4">
                We retain your information for as long as your account is active or as needed to provide you services. You can request deletion of your account and associated data at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Your Rights</h2>
              <p className="text-slate-600 mb-4">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your information</li>
                <li>Object to or restrict processing of your information</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
              <p className="text-slate-600 mb-4">
                To exercise these rights, please contact us through the platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Cookies and Tracking</h2>
              <p className="text-slate-600 mb-4">
                We use cookies and similar tracking technologies to maintain your session and improve your experience. You can control cookies through your browser settings, but this may limit some functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Third-Party Links</h2>
              <p className="text-slate-600 mb-4">
                Our service may contain links to third-party websites (job boards, company websites). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Children's Privacy</h2>
              <p className="text-slate-600 mb-4">
                Our service is not intended for users under the age of 18. We do not knowingly collect information from children.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Changes to This Policy</h2>
              <p className="text-slate-600 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Contact Us</h2>
              <p className="text-slate-600 mb-4">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us through the platform.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
