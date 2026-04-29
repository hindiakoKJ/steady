import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Steady',
  description: 'Steady privacy policy. We collect only what keeps you safe, and nothing else.',
}

export default function PrivacyPolicy() {
  const updated = 'April 29, 2026'

  return (
    <main style={{ fontFamily: '-apple-system, Helvetica, sans-serif', color: '#1A1F24', maxWidth: 720, margin: '0 auto', padding: '60px 24px 80px' }}>
      <a href="/" style={{ fontSize: 13, color: '#2E7D7A', textDecoration: 'none', fontWeight: 600 }}>← Back to Steady</a>

      <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 32, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#5A6470', fontSize: 14, marginBottom: 40 }}>Last updated: {updated}</p>

      <p style={body}>
        Steady is a free, privacy-first epilepsy companion app built by a parent for families living with epilepsy.
        This policy explains exactly what we collect, why we collect it, and what we never do with your data.
      </p>

      <h2 style={h2}>Our core promise</h2>
      <p style={body}>
        <strong>We do not sell your data. We do not share your medical information with advertisers, data brokers,
        or any third party.</strong> We collect only what is needed to keep your family safe.
      </p>

      <h2 style={h2}>What we collect and why</h2>

      <h3 style={h3}>Account information</h3>
      <p style={body}>
        We ask for an <strong>email address</strong> and a <strong>password</strong> to create an account.
        No legal name is required. You identify yourself and your family members using nicknames only
        (e.g., "Ate Mia", "Kuya Ben").
      </p>

      <h3 style={h3}>Seizure logs</h3>
      <p style={body}>
        When you log a seizure, Steady records: start time, end time, duration, seizure type, possible
        triggers, whether consciousness was lost, whether an injury occurred, and any notes you add.
        This data is stored securely and is only accessible to members of your household.
      </p>

      <h3 style={h3}>Location</h3>
      <p style={body}>
        Steady requests your location <strong>only at the moment a seizure is logged or a BEACON alert
        is fired</strong>. Location is used to (1) look up local weather conditions at the time of the
        seizure (a known seizure trigger factor) and (2) include a maps link in emergency SMS alerts
        sent to your family contacts. We do not continuously track your location.
      </p>

      <h3 style={h3}>Weather conditions</h3>
      <p style={body}>
        At the time of a seizure log, we call the OpenWeather API with your device coordinates to record
        temperature, humidity, and weather condition. This data is stored with the seizure log to help
        identify environmental triggers over time.
      </p>

      <h3 style={h3}>Motion sensor data (passive monitoring)</h3>
      <p style={body}>
        If you enable Passive Monitor, Steady reads your device&apos;s accelerometer to detect rhythmic
        shaking patterns associated with seizures. <strong>This data never leaves your device.</strong>
        It is processed locally in real time and is not stored or transmitted.
      </p>

      <h3 style={h3}>Emergency SMS messages</h3>
      <p style={body}>
        When you press BEACON, Steady sends an SMS alert <strong>directly from your own phone number</strong>
        using your device&apos;s built-in messaging capability (Android SmsManager). We do not route
        messages through a third-party SMS service. The message is sent from your SIM card, exactly as if
        you sent it manually. The message contains your patient&apos;s nickname and, if available, a Google
        Maps link with their current location.
      </p>

      <h3 style={h3}>Push notifications</h3>
      <p style={body}>
        We use Expo&apos;s push notification service to send BEACON alerts to family members who have the
        Steady app installed. Push tokens are stored securely and used only to deliver emergency alerts
        within your household.
      </p>

      <h3 style={h3}>AI-generated summaries</h3>
      <p style={body}>
        When you request an AI summary (for your neurologist visit), your seizure log data — stripped of
        any personally identifying information — is sent to Anthropic&apos;s Claude API to generate a
        plain-language paragraph. Only anonymised clinical data (dates, durations, types, triggers) is
        sent. No names, email addresses, or account details are included. Anthropic&apos;s privacy policy
        applies to this processing: <a href="https://www.anthropic.com/privacy" style={link}>anthropic.com/privacy</a>.
      </p>

      <h2 style={h2}>What we never collect</h2>
      <ul style={{ ...body, paddingLeft: 20, lineHeight: 2.2 } as React.CSSProperties}>
        <li>Full legal name</li>
        <li>Date of birth (only birth year, and only if you provide it)</li>
        <li>Social Security, PhilHealth, or any government ID</li>
        <li>Medical records outside of what you enter in the app</li>
        <li>Continuous GPS or background location</li>
        <li>Contacts list, call log, or SMS history</li>
        <li>Advertising identifiers</li>
        <li>Browsing history or cross-app data</li>
      </ul>

      <h2 style={h2}>Data storage and security</h2>
      <p style={body}>
        All data is stored in a PostgreSQL database hosted on Railway. Every query is scoped to your
        household ID — it is architecturally impossible for one household to read another household&apos;s data.
        Passwords are hashed using bcrypt and are never stored in plain text. Data is transmitted over HTTPS.
      </p>

      <h2 style={h2}>Data retention and deletion</h2>
      <p style={body}>
        Your data is retained for as long as your account is active. You may request deletion of your
        account and all associated data at any time by emailing us (see contact below). We will process
        deletion requests within 7 days.
      </p>

      <h2 style={h2}>Children</h2>
      <p style={body}>
        Steady is designed for use by adult caregivers on behalf of patients of any age. We do not
        knowingly collect personal information directly from children under 13. Account registration
        is for caregivers and family members, not patients themselves.
      </p>

      <h2 style={h2}>Changes to this policy</h2>
      <p style={body}>
        If we make material changes to this policy, we will update the date at the top of this page
        and notify users via the app. Continued use of the app after changes constitutes acceptance
        of the updated policy.
      </p>

      <h2 style={h2}>Contact</h2>
      <p style={body}>
        If you have questions about this privacy policy or want to request data deletion, please reach out
        via the Steady landing page at <a href="https://steady.app" style={link}>steady.app</a>.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #EDE8E0', margin: '48px 0 32px' }} />
      <p style={{ fontSize: 12, color: '#8B95A1' }}>
        Steady is a free app. No subscriptions. No ads. No data sold. Built by a dad, for every family.
      </p>
    </main>
  )
}

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  marginTop: 40,
  marginBottom: 12,
  color: '#1A1F24',
}

const h3: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  marginTop: 24,
  marginBottom: 6,
  color: '#1A1F24',
}

const body: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.75,
  color: '#3A4450',
  marginBottom: 16,
}

const link: React.CSSProperties = {
  color: '#2E7D7A',
  textDecoration: 'underline',
}
