css_file = "frontend/src/app/globals.css"
with open(css_file, "a", encoding="utf-8") as f:
    f.write("""

/* --- REFINED CLINICAL LUXURY: HOMEPAGE --- */

/* 1. The Hero */
.home-hero-new {
  position: relative;
  overflow: hidden;
  padding: clamp(60px, 8vw, 120px) 0;
  background: var(--background);
}

.home-hero-new__inner {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

@media (min-width: 1024px) {
  .home-hero-new__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.home-hero-new__content {
  flex: 0 0 55%;
  max-width: 680px;
  animation: fadeIn 1s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.home-hero-new__content h1 {
  font-family: var(--font-display);
  font-size: clamp(3.2rem, 5vw, 5rem);
  line-height: 1.05;
  color: var(--foreground);
  margin-top: 16px;
  letter-spacing: -0.02em;
}

.home-hero-new__content h1 .accent {
  color: var(--accent);
  font-style: italic;
  padding-right: 4px;
}

.home-hero-new__excerpt {
  margin-top: 24px;
  font-size: clamp(1.1rem, 1.5vw, 1.35rem);
  color: var(--muted);
  line-height: 1.5;
  max-width: 90%;
}

.home-hero-new__visual {
  flex: 1;
  position: relative;
  animation: revealImage 1.2s cubic-bezier(0.2, 0, 0, 1) forwards;
}

.home-hero-new__media-wrap {
  position: relative;
  border-radius: 20px 20px 20px 100px;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(15, 42, 74, 0.08);
}

.home-hero-new__stat-card {
  position: absolute;
  bottom: 0;
  left: 0;
  background: rgba(251, 252, 254, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 24px 32px;
  border-radius: 0 20px 0 0;
  display: flex;
  gap: 32px;
  box-shadow: 12px -12px 32px rgba(15, 42, 74, 0.04);
}

.home-hero-new__stat-card .stat {
  display: flex;
  flex-direction: column;
}

.home-hero-new__stat-card .stat strong {
  font-family: var(--font-display);
  font-size: 2.2rem;
  color: var(--accent-ink);
  line-height: 1;
}

.home-hero-new__stat-card .stat span {
  font-size: 0.8rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

/* 2. Advantages Grid */
.home-advantages-new {
  padding: clamp(60px, 6vw, 100px) 0;
  background: var(--surface);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.home-advantages-new__header h2 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  text-align: center;
  margin-bottom: 48px;
}

.home-advantages-new__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0;
  list-style: none;
}

.home-advantages-new__item {
  padding: 40px;
  position: relative;
  opacity: 0;
  transform: translateY(20px);
  animation: megaMenuReveal 0.8s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@media (min-width: 768px) {
  .home-advantages-new__item {
    border-left: 1px solid var(--line);
  }
  .home-advantages-new__item:first-child {
    border-left: none;
  }
}

.home-advantages-new__icon {
  font-size: 2rem;
  color: var(--accent);
  margin-bottom: 24px;
}

.home-advantages-new__item h3 {
  font-size: 1.25rem;
  margin-bottom: 16px;
  color: var(--foreground);
}

.home-advantages-new__item p {
  color: var(--muted);
  line-height: 1.6;
  font-size: 0.95rem;
}

/* 3. Promo Carousel */
.home-promo-carousel {
  padding: clamp(80px, 8vw, 120px) 0;
  overflow: hidden;
}

.home-promo-carousel__title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  margin-bottom: 40px;
}

.home-promo-carousel__track {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 0 5vw 40px;
  scrollbar-width: none; /* Firefox */
}

.home-promo-carousel__track::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

.home-promo-carousel__card {
  scroll-snap-align: start;
  flex: 0 0 min(85vw, 380px);
  position: relative;
  border-radius: 16px;
  transition: transform 0.3s ease;
}

.home-promo-carousel__card:hover {
  transform: translateY(-8px);
}

.home-promo-carousel__image-wrap {
  border-radius: 16px;
  overflow: hidden;
  height: 480px;
}

.home-promo-carousel__card-body {
  position: absolute;
  bottom: -20px;
  left: 20px;
  right: 20px;
  background: var(--surface);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 42, 74, 0.08);
  transition: transform 0.3s ease;
}

.home-promo-carousel__card:hover .home-promo-carousel__card-body {
  transform: translateY(-8px);
}

.home-promo-carousel__card-body h3 {
  font-size: 1.25rem;
  margin-bottom: 8px;
}

.home-promo-carousel__card-body p {
  font-size: 0.9rem;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16px;
}

.home-promo-carousel__cta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.home-promo-carousel__cta .arrow {
  transition: transform 0.2s ease;
}

.home-promo-carousel__card:hover .arrow {
  transform: translateX(4px);
}

/* 4. Medical Ledger */
.home-medical-ledger {
  padding: clamp(80px, 8vw, 120px) 0;
  background: var(--surface);
}

.home-medical-ledger__inner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px;
}

@media (min-width: 1024px) {
  .home-medical-ledger__inner {
    grid-template-columns: 1fr 2fr;
  }
}

.home-medical-ledger__header h2 {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  position: sticky;
  top: 120px;
  line-height: 1.1;
}

.home-medical-ledger__list {
  list-style: none;
}

.home-medical-ledger__item {
  border-bottom: 1px solid var(--line);
}

.home-medical-ledger__item:first-child {
  border-top: 1px solid var(--line);
}

.home-medical-ledger__link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 24px;
  transition: background 0.2s ease;
}

.home-medical-ledger__link:hover {
  background: var(--surface-soft);
}

.home-medical-ledger__content h3 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: var(--foreground);
}

.home-medical-ledger__content p {
  color: var(--muted);
  max-width: 600px;
}

.home-medical-ledger__arrow {
  font-size: 1.5rem;
  color: var(--muted);
  transition: color 0.2s ease, transform 0.2s ease;
}

.home-medical-ledger__link:hover .home-medical-ledger__arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}

/* 5. Video Theater */
.home-video-theater {
  background: var(--color-ink);
  color: var(--color-bone);
  padding: clamp(80px, 8vw, 120px) 0;
}

.home-video-theater__header {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 64px;
}

@media (min-width: 1024px) {
  .home-video-theater__header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }
  .home-video-theater__header p {
    max-width: 500px;
  }
}

.home-video-theater__header h2 {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 4rem);
  color: var(--color-bone-50);
}

.home-video-theater__header p {
  color: var(--color-bone-300);
  font-size: 1.1rem;
}

.cta-link-light {
  color: var(--color-bone-50);
  font-weight: 500;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  padding-bottom: 4px;
  transition: border-color 0.2s ease;
}

.cta-link-light:hover {
  border-color: var(--color-bone-50);
}

.home-video-theater__primary {
  margin-bottom: 40px;
}

.video-player-frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16/9;
  background: #000;
}

.video-player-frame .play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.video-player-frame .play-button:hover {
  transform: translate(-50%, -50%) scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.video-player-frame .play-icon {
  color: #fff;
  font-size: 1.5rem;
  margin-left: 4px;
}

.home-video-theater__playlist {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.home-video-theater__playlist::-webkit-scrollbar {
  height: 6px;
}

.home-video-theater__playlist::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 6px;
}

.playlist-item {
  flex: 0 0 240px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.playlist-item:hover {
  opacity: 0.8;
}

.playlist-item__thumb {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16/9;
  margin-bottom: 12px;
}

.playlist-item__title {
  font-size: 0.95rem;
  color: var(--color-bone-200);
}

/* 6. Contact Footer */
.home-contact-footer {
  padding: clamp(80px, 10vw, 160px) 0;
  background: var(--accent-soft);
  text-align: center;
}

.home-contact-footer__inner h2 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.5vw, 3.5rem);
  color: var(--accent-ink);
  max-width: 800px;
  margin: 0 auto 48px;
  line-height: 1.1;
}

.home-contact-footer__actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

@keyframes revealImage {
  from {
    clip-path: inset(10% 10% 10% 10% round 20px);
    opacity: 0;
  }
  to {
    clip-path: inset(0% 0% 0% 0% round 20px);
    opacity: 1;
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
""")
