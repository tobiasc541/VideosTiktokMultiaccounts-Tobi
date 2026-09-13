export const metadata = {
  title: "Terms of Service | TikTok Multi Poster",
  description: "Terms of Service for TikTok Multi Poster."
};

const sectionStyle: React.CSSProperties = {
  padding: "22px 0",
  borderTop: "1px solid rgba(255,255,255,.08)"
};

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 0%, rgba(37,244,238,.14), transparent 34%), radial-gradient(circle at 85% 10%, rgba(255,45,117,.14), transparent 30%), #090b10",
        color: "#f7f8fb",
        padding: "48px 20px 72px"
      }}
    >
      <div style={{ width: "min(900px, 100%)", margin: "0 auto" }}>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            color: "#dffefd",
            textDecoration: "none",
            fontWeight: 800,
            marginBottom: 28
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg,#25f4ee,#ff2d75)",
              color: "#07090d",
              boxShadow: "0 0 26px rgba(37,244,238,.18)"
            }}
          >
            TC
          </span>
          TikTok Multi Poster
        </a>

        <section
          style={{
            background: "rgba(20,23,31,.78)",
            border: "1px solid rgba(255,255,255,.09)",
            borderRadius: 24,
            padding: "clamp(24px,5vw,52px)",
            boxShadow: "0 24px 90px rgba(0,0,0,.38)",
            backdropFilter: "blur(18px)"
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(37,244,238,.08)",
              border: "1px solid rgba(37,244,238,.18)",
              color: "#bffdfa",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase"
            }}
          >
            Legal
          </div>

          <h1
            style={{
              fontSize: "clamp(38px,7vw,66px)",
              lineHeight: 1,
              letterSpacing: "-.045em",
              margin: "22px 0 14px"
            }}
          >
            Terms of Service
          </h1>
          <p style={{ color: "#99a1b3", fontSize: 17, lineHeight: 1.7, marginTop: 0 }}>
            Effective date: September 13, 2026. These Terms govern access to and use of TikTok Multi Poster.
          </p>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>1. About the service</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              TikTok Multi Poster is a web application that lets authorized users connect their own TikTok accounts, select a video, add a caption, and submit that content to selected connected accounts through TikTok&apos;s official developer tools and APIs.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>2. Account authorization</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              You may only connect accounts that you own or are authorized to manage. Account access is granted through TikTok&apos;s official authorization flow. TikTok Multi Poster does not ask for or store your TikTok password.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>3. Your content</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              You remain responsible for all videos, captions, hashtags, trademarks, music, and other material you upload or publish. You must have the rights and permissions necessary to use and publish that content and must comply with applicable law and TikTok&apos;s rules.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>4. Acceptable use</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              You may not use the service for unlawful activity, unauthorized access to third-party accounts, spam, impersonation, infringement, malware distribution, or activity designed to bypass platform restrictions or security measures.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>5. Third-party platforms</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              TikTok Multi Poster depends on third-party services, including TikTok, Vercel, and Supabase. Features may be limited, changed, delayed, or unavailable if those providers change their APIs, policies, availability, permissions, or review requirements.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>6. Availability and warranties</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              The service is provided on an &quot;as available&quot; basis. We do not guarantee uninterrupted availability, publishing success, reach, engagement, account growth, or any particular result on TikTok.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>7. Suspension or termination</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              Access may be restricted or terminated if the service is misused, if required by law or a platform policy, or if continued access creates security, legal, or operational risk.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>8. Changes to these Terms</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              These Terms may be updated from time to time. The effective date at the top of this page will be updated when material changes are made.
            </p>
          </div>

          <div style={{ ...sectionStyle, paddingBottom: 0 }}>
            <h2 style={{ marginTop: 0 }}>9. Contact</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75, marginBottom: 0 }}>
              Questions about these Terms may be directed to the administrator of TikTok Multi Poster.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
