import type { Metadata } from 'next';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  Lock,
  Key,
  Server,
  Trash2,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  RefreshCw,
  EyeOff,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - AdOptimize | Google Ads API Data Protection, Retention & Deletion',
  description:
    'AdOptimize privacy policy detailing Google Ads API data usage, sensitive data protection mechanisms, encryption standards, retention periods, and user data deletion procedures.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans selection:bg-[#00d67d]/20 selection:text-slate-900">
      {/* Top Header */}
      <header className="bg-[#0d1117] text-white px-6 py-4 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#00d67d]/20">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/security"
              className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline-block"
            >
              Security Center
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-10">
        {/* Title & Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google API Services User Data Policy Compliant</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
            <span>Effective Date: October 2026</span>
            <span>•</span>
            <span>Last Updated: October 2026</span>
            <span>•</span>
            <span>Version 2.4</span>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            This Privacy Policy explains how AdOptimize (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, protects, retains, and deletes information when you access our platform and connect your Google Ads account via Google OAuth 2.0. We are committed to transparency, bank-grade sensitive data protection, and strict adherence to Google&apos;s User Data Policy.
          </p>
        </div>

        {/* Quick Summary Highlights Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Sensitive Data Protection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              AES-256 encryption at rest, TLS 1.3 in transit, and server-isolated credential storage. Tokens are never exposed to browser clients.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Clear Data Retention</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Data retained only while your account is connected. Inactive or disconnected account data is purged within 30 days.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Immediate User Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              1-click in-app data deletion, direct revocation via Google Security settings, or email request with prompt deletion within 48–72 hours.
            </p>
          </div>
        </div>

        {/* Policy Content Container */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xs space-y-10 text-xs sm:text-sm text-slate-700 leading-relaxed">

          {/* Section 1: Overview and Google Limited Use Disclosure */}
          <section id="limited-use" className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">1</span>
              <h2>Google API Services User Data Policy &amp; Limited Use Disclosure</h2>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2 text-emerald-950">
              <p className="font-semibold text-xs sm:text-sm leading-relaxed">
                AdOptimize&apos;s use and transfer to any other app of information received from Google APIs will adhere to{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5 hover:text-emerald-900"
                >
                  Google API Services User Data Policy
                  <ExternalLink className="w-3 h-3 inline ml-0.5" />
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
            <p>
              Specifically, AdOptimize complies with the following mandatory restrictions regarding Google user data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong>No Transfer or Sale:</strong> We never transfer, sell, license, or disclose Google user data to third parties, advertising brokers, data marketplaces, or info aggregators.
              </li>
              <li>
                <strong>No Generalized AI / Model Training:</strong> We never use Google user data to train, fine-tune, or improve generalized or public artificial intelligence (AI) models, large language models (LLMs), or machine learning foundation weights.
              </li>
              <li>
                <strong>No Advertising Retargeting:</strong> Google user data is never used to serve advertisements or create retargeting audiences.
              </li>
              <li>
                <strong>Zero Human Inspection:</strong> No human employee reads your Google user data unless you provide explicit affirmative consent for a specific troubleshooting inquiry, it is needed for technical security investigation, or required by law.
              </li>
            </ul>
          </section>

          {/* Section 2: What Google User Data We Collect */}
          <section id="data-collected" className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">2</span>
              <h2>Google User Data We Collect and Process</h2>
            </div>
            <p>
              When you authenticate with AdOptimize using Google OAuth 2.0 and grant permission to access your Google Ads account, we access only the minimum necessary data required to deliver performance monitoring and optimization features:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Account Identity Data</div>
                <p className="text-xs text-slate-600">
                  Google account email address, display name, and unique Google account ID, used exclusively for user authentication, access control, and workspace identity.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Google Ads Account Identifiers</div>
                <p className="text-xs text-slate-600">
                  Customer ID (CID), Manager Account (MCC) IDs, account display name, currency code, and time zone necessary to query the Google Ads SearchStream API.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Campaign Performance Metrics</div>
                <p className="text-xs text-slate-600">
                  Campaign names, status (ENABLED, PAUSED), impressions, clicks, spend, conversions, cost-per-acquisition (CPA), and return on ad spend (ROAS).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">Ad Group &amp; Keyword Data</div>
                <p className="text-xs text-slate-600">
                  Ad group structure, keywords, search terms, and Quality Score components (expected CTR, ad relevance, landing page experience) for negative keyword proposals.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              <strong>Data We Never Access:</strong> We do not access, process, or store credit card numbers, billing payment instruments configured in Google Ads, emails, private Drive files, or contacts.
            </p>
          </section>

          {/* Section 3: Data Protection Mechanisms for Sensitive Data */}
          <section id="data-protection" className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-xs font-mono text-emerald-800">3</span>
              <h2>Data Protection Mechanisms for Sensitive Data</h2>
            </div>
            <p>
              AdOptimize implements robust technical, organizational, and physical safeguards designed to prevent unauthorized access, disclosure, alteration, or destruction of sensitive data, including Google OAuth tokens, customer credentials, and advertising telemetry.
            </p>

            <div className="space-y-3">
              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    A. Encryption in Transit (TLS 1.3 / TLS 1.2)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All communications between your browser, our application servers, and Google APIs (including the Google Ads SearchStream API and Google OAuth endpoints) are encrypted using Transport Layer Security (TLS 1.3 or TLS 1.2) over HTTPS. We enforce strict HTTP Strict Transport Security (HSTS) with forward secrecy. Unencrypted HTTP traffic is rejected at all network boundaries.
                  </p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    B. Encryption at Rest (AES-256)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All sensitive user data, synchronized performance records, and persistent documents stored in our Google Cloud Platform databases and Firestore datastores are encrypted at rest using industry-standard Advanced Encryption Standard with 256-bit keys (AES-256). Cryptographic keys are managed securely by Google Cloud Key Management Service (Cloud KMS) with automatic rotation.
                  </p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    C. Token Isolation &amp; Zero Client-Side Exposure
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Google OAuth refresh tokens and developer tokens are stored exclusively in isolated, server-side environment vaults and secured backend database collections protected by strict server-only security rules. Sensitive tokens are never transmitted to client browsers, never written to unencrypted cookies, never placed in browser localStorage or sessionStorage, and never included in debugging logs.
                  </p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    D. Role-Based Access Control (RBAC) &amp; Principle of Least Privilege
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Access to backend production environments, application infrastructure, and database layers is governed by strict Role-Based Access Control (RBAC). Only authenticated server processes possessing valid service credentials can execute Google Ads API calls. Engineering access requires Multi-Factor Authentication (MFA), hardware security keys, and strict audit logging.
                  </p>
                </div>
              </div>

              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Server className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    E. Infrastructure Security, Vulnerability Scanning &amp; Monitoring
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Our platform is hosted in secure Google Cloud Platform data centers featuring Virtual Private Cloud (VPC) isolation, Web Application Firewalls (WAF), automated DDoS mitigation, and continuous automated container vulnerability scanning. Automated alerts detect anomalous query spikes or unauthorized access attempts immediately.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Retention of Google User Data */}
          <section id="retention" className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-mono text-blue-800">4</span>
              <h2>Retention of Google User Data</h2>
            </div>
            <p>
              AdOptimize adheres to the principle of data minimization. We retain Google user data only for as long as necessary to provide you with the services you have requested, and in accordance with the specific retention schedules detailed below:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold">
                    <th className="p-3 border border-slate-200">Category of Google Data</th>
                    <th className="p-3 border border-slate-200">Retention Period</th>
                    <th className="p-3 border border-slate-200">Retention Purpose &amp; Lifecycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      OAuth Access Tokens
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-emerald-700 font-semibold">
                      Up to 60 minutes
                    </td>
                    <td className="p-3 border border-slate-200">
                      Short-lived in-memory credentials provided by Google OAuth. Automatically discarded upon expiration.
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      OAuth Refresh Tokens
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-blue-700 font-semibold">
                      Duration of active connection
                    </td>
                    <td className="p-3 border border-slate-200">
                      Retained only while your Google Ads account remains connected to AdOptimize. Destroyed immediately upon disconnection or revocation.
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      Cached Campaign Performance Metrics
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-slate-800">
                      Active connection or max 30 days post-disconnect
                    </td>
                    <td className="p-3 border border-slate-200">
                      Synchronized metrics (spend, clicks, conversions) are retained for trend analysis while active. Permanently purged within 30 days of disconnect.
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      Search Query &amp; Keyword Performance Logs
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-slate-800">
                      Active connection or max 30 days post-disconnect
                    </td>
                    <td className="p-3 border border-slate-200">
                      Used to formulate negative keyword and bid recommendations. Purged upon disconnect.
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      Execution &amp; Audit Change Logs
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-slate-800">
                      Up to 12 months (or immediate on request)
                    </td>
                    <td className="p-3 border border-slate-200">
                      Audit trail of changes executed on Google Ads (for compliance and rollback). Deleted immediately upon full account deletion request.
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900 border border-slate-200">
                      Inactive Account Data Purge
                    </td>
                    <td className="p-3 border border-slate-200 font-mono text-rose-700 font-semibold">
                      Automatic purge after 12 months
                    </td>
                    <td className="p-3 border border-slate-200">
                      Accounts inactive for more than 12 consecutive months have all tokens and cached metrics automatically and irreversibly wiped.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Deletion of Google User Data */}
          <section id="deletion" className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-xs font-mono text-rose-800">5</span>
              <h2>Deletion of Google User Data (How to Request Deletion)</h2>
            </div>
            <p>
              You maintain complete ownership and control over your Google Ads data. You can delete your Google user data and disconnect our platform at any time through any of the three straightforward methods below:
            </p>

            <div className="space-y-3.5">
              {/* Method 1 */}
              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-xs">Method 1</span>
                  <span>In-App Self-Service Deletion &amp; Account Disconnect</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You can immediately purge all synced campaign data and credentials directly from the app interface:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700">
                  <li>Navigate to the <strong>Settings</strong> tab in the left navigation sidebar.</li>
                  <li>Under <strong>Connected Google Ads Accounts</strong> or <strong>Security &amp; Privacy</strong>, click <strong>&quot;Clear All Data &amp; Fresh Start&quot;</strong> or <strong>&quot;Disconnect &amp; Wipe Google Data&quot;</strong>.</li>
                  <li>Confirm the action. All stored OAuth tokens, Customer IDs, and cached metrics are immediately wiped from your session and our databases.</li>
                </ol>
              </div>

              {/* Method 2 */}
              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-xs">Method 2</span>
                  <span>Revoke Permissions Directly via Google Account Security</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You can instantly and unconditionally revoke AdOptimize&apos;s access to your Google account at any time without logging into our app:
                </p>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-slate-700">
                    Visit your official Google Account Permissions page:
                  </span>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors shrink-0 text-xs"
                  >
                    <span>Google Permissions Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-500">
                  Select <strong>AdOptimize</strong> and click <strong>&quot;Remove Access&quot;</strong>. Google immediately invalidates all active tokens. Upon detection, our backend automatically purges associated cached records.
                </p>
              </div>

              {/* Method 3 */}
              <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono text-xs">Method 3</span>
                  <span>Written Deletion Request via Email to Privacy Officer</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You can submit a formal data erasure request to our support and privacy team at{' '}
                  <a href="mailto:support@adoptimize.app" className="font-bold text-slate-900 underline">support@adoptimize.app</a>.
                </p>
                <p className="text-xs text-slate-600">
                  Please specify your Google account email address or connected Google Ads Customer ID. We process and confirm all deletion requests within <strong>48 to 72 business hours</strong>.
                </p>
              </div>
            </div>

            {/* Deletion Process & Timeline */}
            <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>Technical Deletion Process &amp; Verification Timeline</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Step 1 (Immediate / Under 1 hour):</strong> OAuth revocation signal dispatched to Google&apos;s revocation endpoint (<code>https://oauth2.googleapis.com/revoke</code>) to permanently invalidate access and refresh tokens.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Step 2 (Within 24 hours):</strong> Hard deletion of connected Customer IDs, cached campaign snapshots, ad groups, keywords, and anomaly proposals from all primary operational databases.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Step 3 (Within 30 days):</strong> Full automated expiration and purge from rolling encrypted disaster-recovery backups.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6: Third-Party Subprocessors */}
          <section id="subprocessors" className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">6</span>
              <h2>Third-Party Subprocessors &amp; Hosting Partners</h2>
            </div>
            <p>
              We only share your data with strictly vetted cloud infrastructure subprocessors necessary to deliver the service. All subprocessors are bound by stringent data protection agreements:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">Google Cloud Platform (GCP)</div>
                <div className="text-slate-500 mt-0.5">Cloud server execution, encrypted databases, and VPC network hosting.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">Google Identity Services (Google LLC)</div>
                <div className="text-slate-500 mt-0.5">User authentication, encrypted document storage, and security rules enforcement.</div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              For complete details on our infrastructure partners and data processing agreements, review our dedicated{' '}
              <Link href="/subprocessors" className="text-emerald-700 font-bold underline hover:text-emerald-900">
                Subprocessors Directory
              </Link>.
            </p>
          </section>

          {/* Section 7: User Rights (GDPR & CCPA) */}
          <section id="user-rights" className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">7</span>
              <h2>Your Privacy Rights (GDPR, CCPA &amp; International Laws)</h2>
            </div>
            <p>
              Depending on your jurisdiction (including the European Economic Area, UK, California, and other jurisdictions), you possess statutory privacy rights including:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs sm:text-sm">
              <li><strong>Right to Access &amp; Portability:</strong> Request an export of all personal and Google Ads data associated with your account.</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate account records or configuration settings.</li>
              <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request unconditional permanent deletion of your account and all associated Google user data.</li>
              <li><strong>Right to Restrict or Object to Processing:</strong> Request restrictions on processing or revoke consent at any time.</li>
              <li><strong>Right to Non-Discrimination:</strong> We never discriminate against users who exercise their statutory privacy rights.</li>
            </ul>
          </section>

          {/* Section 8: Changes to this Policy */}
          <section id="policy-changes" className="space-y-3 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">8</span>
              <h2>Modifications to this Privacy Policy</h2>
            </div>
            <p>
              We may update this Privacy Policy periodically to reflect technical enhancements, regulatory changes, or adjustments to Google&apos;s API policies. In the event of material changes to our data protection mechanisms, retention periods, or data deletion procedures, we will notify you via prominent notices within the application dashboard or email notification before changes take effect.
            </p>
          </section>

          {/* Section 9: Contact Information */}
          <section id="contact" className="space-y-4 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-mono text-slate-800">9</span>
              <h2>Contact Us &amp; Data Protection Officer</h2>
            </div>
            <p>
              If you have any questions, feedback, or requests regarding this Privacy Policy, our data protection mechanisms for sensitive data, or wish to request the retention schedule or permanent deletion of your Google user data, contact our Data Protection Officer:
            </p>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
              <div className="font-bold text-slate-900 text-sm">AdOptimize Privacy &amp; Data Compliance Team</div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>Contact Email: </span>
                <a href="mailto:support@adoptimize.app" className="font-mono text-emerald-700 hover:underline font-semibold">
                  support@adoptimize.app
                </a>
              </div>
              <div className="text-slate-500 pt-1 text-[11px]">
                Domain: <span className="font-mono font-semibold text-slate-700">adoptimize.app</span> • Response Timeline: All data inquiries, deletion requests, and retention inquiries are acknowledged within 24 hours and fulfilled within 48 to 72 hours.
              </div>
            </div>
          </section>

        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-500 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <Link href="/terms-of-service" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link href="/security" className="hover:text-slate-900 transition-colors">Security Architecture</Link>
            <Link href="/subprocessors" className="hover:text-slate-900 transition-colors">Subprocessors</Link>
          </div>
          <Link href="/" className="font-bold text-[#00d67d] hover:underline">
            ← Return to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
