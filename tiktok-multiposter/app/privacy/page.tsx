export const metadata = {
  title: "Privacy Policy | TikTok Multi Poster",
  description: "Privacy Policy for TikTok Multi Poster."
};

const sectionStyle: React.CSSProperties = {
  padding: "22px 0",
  borderTop: "1px solid rgba(255,255,255,.08)"
};

export default function PrivacyPage() {
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
              background: "rgba(255,45,117,.08)",
              border: "1px solid rgba(255,45,117,.18)",
              color: "#ffc0d4",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".08em",
              textTransform: "uppercase"
            }}
          >
            Privacy
          </div>

          <h1
            style={{
              fontSize: "clamp(38px,7vw,66px)",
              lineHeight: 1,
              letterSpacing: "-.045em",
              margin: "22px 0 14px"
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: "#99a1b3", fontSize: 17, lineHeight: 1.7, marginTop: 0 }}>
            Effective date: September 13, 2026. This Policy explains how TikTok Multi Poster handles information when you use the service.
          </p>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>1. Information we process</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              When you connect TikTok, the service may process basic profile information returned by TikTok, account identifiers, authorization tokens, and the permissions you grant. We also process videos, captions, privacy selections, and publishing instructions that you intentionally submit through the dashboard.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>2. How information is used</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              Information is used to authenticate connected accounts, display those accounts in the dashboard, submit authorized content through TikTok&apos;s Content Posting API, maintain the service, prevent misuse, and troubleshoot technical problems.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>3. TikTok credentials and authorization</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              TikTok authorization occurs through TikTok&apos;s official OAuth flow. TikTok Multi Poster does not request or store your TikTok password. Access is limited to the scopes and permissions that you explicitly authorize.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>4. Service providers</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              The application may rely on infrastructure and database providers such as Vercel and Supabase, and on TikTok&apos;s developer platform. These providers may process technical data as necessary to provide their services and are subject to their own terms and privacy practices.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>5. Data sharing</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              We do not sell personal information. Information is shared only as needed to operate requested features, comply with applicable law, protect the service and its users, or when you direct the service to communicate with TikTok.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>6. Data retention and security</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              Information is retained only for as long as reasonably necessary for the purposes described in this Policy or as required by law. Reasonable technical and organizational safeguards are used, but no internet service can guarantee absolute security.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>7. Your choices</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              You can choose which TikTok accounts to connect and which content to publish. You may revoke TikTok permissions through the controls made available by TikTok. You may also stop using the service at any time.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>8. Children</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              TikTok Multi Poster is not directed to children and is intended only for users who are permitted to use the connected platforms and authorize the relevant accounts under applicable rules and law.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>9. Changes to this Policy</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75 }}>
              This Privacy Policy may be updated as the application, integrations, or legal requirements change. The effective date above identifies the current version.
            </p>
          </div>

          <div style={{ ...sectionStyle, paddingBottom: 0 }}>
            <h2 style={{ marginTop: 0 }}>10. Contact</h2>
            <p style={{ color: "#c8ced9", lineHeight: 1.75, marginBottom: 0 }}>
              Privacy questions or requests may be directed to the administrator of TikTok Multi Poster.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
