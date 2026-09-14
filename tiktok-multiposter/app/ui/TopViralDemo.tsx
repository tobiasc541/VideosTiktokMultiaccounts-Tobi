import "./top-viral-demo.css";

const demoVideos = [
  { rank: "01", user: "@vyral.main", views: "1,8M", likes: "214K", phone: "titanium", src: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4" },
  { rank: "02", user: "@vyral.media", views: "942K", likes: "88K", phone: "black", src: "https://assets.mixkit.co/videos/preview/mixkit-father-and-his-little-daughter-eating-marshmallows-in-nature-39765-large.mp4" },
  { rank: "03", user: "@vyral.lab", views: "718K", likes: "73K", phone: "natural", src: "https://assets.mixkit.co/videos/preview/mixkit-mother-with-her-little-daughter-eating-a-marshmallow-in-nature-39764-large.mp4" },
  { rank: "04", user: "@vyral.clips", views: "503K", likes: "41K", phone: "graphite", src: "https://assets.mixkit.co/videos/preview/mixkit-womans-feet-splashing-in-the-pool-1261-large.mp4" },
  { rank: "05", user: "@vyral.store", views: "327K", likes: "29K", phone: "silver", src: "https://assets.mixkit.co/videos/preview/mixkit-a-girl-blowing-a-bubble-gum-at-an-amusement-park-1226-large.mp4" }
];

export default function TopViralDemo() {
  return (
    <section className="tvSection">
      <div className="tvHead">
        <div>
          <small>TOP CONTENT · EJEMPLO</small>
          <h2>Tus 5 videos más virales.</h2>
          <p>Así se va a ver el ranking real cuando conectemos las métricas de TikTok.</p>
        </div>
        <span className="tvBadge">DEMO VISUAL</span>
      </div>
      <div className="tvRail">
        {demoVideos.map((item) => (
          <article className="tvItem" key={item.rank}>
            <div className={`tvPhone ${item.phone}`}>
              <div className="tvSideButton one"/><div className="tvSideButton two"/>
              <div className="tvScreen">
                <video src={item.src} autoPlay muted loop playsInline preload="metadata" />
                <div className="tvShade"/>
                <div className="tvIsland"/>
                <div className="tvRank">#{item.rank}</div>
                <div className="tvMeta"><strong>{item.user}</strong><span>{item.views} vistas</span></div>
              </div>
            </div>
            <div className="tvStats"><span><b>{item.views}</b> vistas</span><span><b>{item.likes}</b> likes</span></div>
          </article>
        ))}
      </div>
      <div className="tvFoot"><span>Los videos y números son ilustrativos.</span><b>Próximamente: ranking automático por view_count ↗</b></div>
    </section>
  );
}
