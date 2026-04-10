import { Link } from 'react-router-dom';

export default function TermsOfService(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <Link to="/login" className="text-sm text-brand-600 hover:text-brand-700 mb-6 inline-block">
            ← Back to Login
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: November 9, 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 mb-4">
                By accessing and using LinkedMe, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Description of Service</h2>
              <p className="text-slate-600 mb-4">
                LinkedMe is an AI-powered job matching platform that helps users find relevant job opportunities and create personalized application materials. Our service includes:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Job recommendations based on your profile and preferences</li>
                <li>AI-generated resumes and cover letters</li>
                <li>HR outreach message generation</li>
                <li>Knowledge base management for your professional information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Accounts</h2>
              <p className="text-slate-600 mb-4">
                You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">4. User Content</h2>
              <p className="text-slate-600 mb-4">
                You retain ownership of all content you upload to LinkedMe, including resumes, project information, and other professional materials. By uploading content, you grant us a license to use, store, and process this content solely for the purpose of providing our services to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">5. AI-Generated Content</h2>
              <p className="text-slate-600 mb-4">
                Our service uses artificial intelligence to generate resumes, cover letters, and other materials. While we strive for accuracy and quality, you are responsible for reviewing and verifying all AI-generated content before use. We make no guarantees regarding the success of job applications made using our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Acceptable Use</h2>
              <p className="text-slate-600 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-slate-600 space-y-2 mb-4">
                <li>Use the service for any illegal purpose</li>
                <li>Upload false or misleading information</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated systems to access the service in ways that send more requests than a human could reasonably produce</li>
                <li>Interfere with or disrupt the service or servers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Termination</h2>
              <p className="text-slate-600 mb-4">
                We reserve the right to terminate or suspend your account at any time, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-slate-600 mb-4">
                The service is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Limitation of Liability</h2>
              <p className="text-slate-600 mb-4">
                To the maximum extent permitted by law, LinkedMe shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Changes to Terms</h2>
              <p className="text-slate-600 mb-4">
                We reserve the right to modify these terms at any time. We will notify users of any material changes. Your continued use of the service after such modifications constitutes your acceptance of the updated terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Contact Information</h2>
              <p className="text-slate-600 mb-4">
                If you have any questions about these Terms of Service, please contact us through the platform.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
