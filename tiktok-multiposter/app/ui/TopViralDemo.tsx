import "./top-viral-demo.css";

const videos = [
  { rank: "01", user: "@tobi.main", views: "1,8M", likes: "214K", followers: "+12,4K", comments: "4,8K", delta: "+184%", phone: "titanium", src: "/Savetik-Net_7580294625508838664_v3.mp4" },
  { rank: "02", user: "@tobi.media", views: "942K", likes: "88,7K", followers: "+6,1K", comments: "2,2K", delta: "+121%", phone: "black", src: "/Savetik-Net_7378452778168880416_v3.mp4" },
  { rank: "03", user: "@tobi.lab", views: "718K", likes: "73,4K", followers: "+4,9K", comments: "1,9K", delta: "+96%", phone: "natural", src: "/Savetik-Net_7632602106456706306_v3.mp4" },
  { rank: "04", user: "@tobi.clips", views: "503K", likes: "41,2K", followers: "+3,2K", comments: "1,1K", delta: "+62%", phone: "graphite", src: "/Savetik-Net_7626813654679309590_v3.mp4" },
  { rank: "05", user: "@tobi.store", views: "327K", likes: "29,6K", followers: "+1,8K", comments: "684", delta: "+38%", phone: "silver", src: "/Savetik-Net_7326898228740230406_v3.mp4" }
];

export default function TopViralDemo() {
  return (
    <section className="tvSection">
      <div className="tvHead">
        <div>
          <small>TOP CONTENT</small>
          <h2>Tus 5 videos más virales.</h2>
          <p>Ordenados por rendimiento para detectar rápido qué contenido está empujando más tu crecimiento.</p>
        </div>
        <span className="tvBadge">TOP 5</span>
      </div>
      <div className="tvRail">
        {videos.map((item) => (
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
            <div className="tvStats">
              <span><small>VISTAS</small><b>{item.views}</b></span>
              <span><small>LIKES</small><b>{item.likes}</b></span>
              <span><small>SEGUIDORES</small><b>{item.followers}</b></span>
              <span><small>COMENTARIOS</small><b>{item.comments}</b></span>
              <span className="tvDelta"><small>VS. VIDEO ANTERIOR</small><b>{item.delta}</b></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
