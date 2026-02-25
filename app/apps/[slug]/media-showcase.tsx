"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface MediaItem {
  id: string;
  type: "image" | "youtube";
  url: string;
  title: string | null;
}

interface MediaShowcaseProps {
  media: MediaItem[];
}

function YouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  return (
    <div className="showcase-v2__youtube">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function Lightbox({
  src,
  title,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  src: string;
  title?: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <div className="showcase-v2__lightbox" onClick={onClose}>
      <button className="showcase-v2__lightbox-close" onClick={onClose}>
        ✕
      </button>
      {hasPrev && (
        <button
          className="showcase-v2__lightbox-nav showcase-v2__lightbox-nav--prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          ‹
        </button>
      )}
      <img
        src={src}
        alt={title || "App screenshot"}
        onClick={(e) => e.stopPropagation()}
      />
      {hasNext && (
        <button
          className="showcase-v2__lightbox-nav showcase-v2__lightbox-nav--next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          ›
        </button>
      )}
      {title && <p className="showcase-v2__lightbox-title">{title}</p>}
    </div>
  );
}

function PlatformCarousel({
  items,
  onImageClick,
  variant,
}: {
  items: MediaItem[];
  onImageClick: (item: MediaItem) => void;
  variant: "portrait" | "landscape";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Figure out which card is most visible
    const cards = track.querySelectorAll(".showcase-v2__card");
    let closestIndex = 0;
    let closestDistance = Infinity;
    const center = scrollLeft + clientWidth / 2;
    cards.forEach((card, i) => {
      const el = card as HTMLElement;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(center - cardCenter);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = i;
      }
    });
    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => track.removeEventListener("scroll", updateScrollState);
  }, [updateScrollState]);

  const scrollTo = (direction: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".showcase-v2__card") as HTMLElement;
    if (!card) return;
    const scrollAmount = card.offsetWidth + 20; // card width + gap
    track.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll(".showcase-v2__card");
    const card = cards[index] as HTMLElement;
    if (!card) return;
    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeft = card.offsetLeft - (trackRect.width / 2 - cardRect.width / 2);
    track.scrollTo({ left: scrollLeft, behavior: "smooth" });
  };

  return (
    <div className={`showcase-v2__carousel showcase-v2__carousel--${variant}`}>
      {/* Navigation arrows */}
      <button
        className={`showcase-v2__arrow showcase-v2__arrow--left ${!canScrollLeft ? "showcase-v2__arrow--hidden" : ""}`}
        onClick={() => scrollTo("left")}
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        className={`showcase-v2__arrow showcase-v2__arrow--right ${!canScrollRight ? "showcase-v2__arrow--hidden" : ""}`}
        onClick={() => scrollTo("right")}
        aria-label="Next"
      >
        ›
      </button>

      {/* Scrollable track */}
      <div className="showcase-v2__track" ref={trackRef}>
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`showcase-v2__card ${i === activeIndex ? "showcase-v2__card--active" : ""}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {item.type === "youtube" ? (
              <YouTubeEmbed videoId={item.url} title={item.title || undefined} />
            ) : (
              <button
                className="showcase-v2__card-btn"
                onClick={() => onImageClick(item)}
                type="button"
              >
                <img src={item.url} alt={item.title || "App screenshot"} loading="lazy" />
                <div className="showcase-v2__card-shine" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="showcase-v2__dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`showcase-v2__dot ${i === activeIndex ? "showcase-v2__dot--active" : ""}`}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaShowcase({ media }: MediaShowcaseProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activePlatform, setActivePlatform] = useState<"ios" | "macos">("ios");

  if (!media || media.length === 0) return null;

  // Separate by platform based on title prefix
  const iosItems = media.filter((m) => m.title?.toLowerCase().startsWith("ios"));
  const macosItems = media.filter((m) => m.title?.toLowerCase().startsWith("macos") || m.title?.toLowerCase().startsWith("mac"));
  const otherItems = media.filter(
    (m) => !m.title?.toLowerCase().startsWith("ios") && !m.title?.toLowerCase().startsWith("macos") && !m.title?.toLowerCase().startsWith("mac")
  );

  const hasPlatforms = iosItems.length > 0 && macosItems.length > 0;
  // If only one platform exists, show that one
  const effectivePlatform = !hasPlatforms
    ? (iosItems.length > 0 ? "ios" : "macos")
    : activePlatform;

  // Build flat list for lightbox navigation based on active platform
  const visibleItems = effectivePlatform === "ios"
    ? [...iosItems, ...otherItems]
    : [...macosItems, ...otherItems];
  const visibleImageItems = visibleItems.filter((m) => m.type === "image");

  const openLightbox = (item: MediaItem) => {
    const idx = visibleImageItems.findIndex((m) => m.id === item.id);
    if (idx >= 0) setLightboxIndex(idx);
  };

  return (
    <>
      <section className="showcase-v2">
        <div className="showcase-v2__header">
          <div className="showcase-v2__header-line" />
          <h2 className="showcase-v2__title">SHOWCASE</h2>
          {hasPlatforms && (
            <div className="showcase-v2__tabs">
              {(["ios", "macos"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`showcase-v2__tab ${effectivePlatform === tab ? "showcase-v2__tab--active" : ""}`}
                  onClick={() => setActivePlatform(tab)}
                >
                  {tab === "ios" ? "iOS" : "macOS"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* iOS Section */}
        {effectivePlatform === "ios" && iosItems.length > 0 && (
          <div className="showcase-v2__section">
            <PlatformCarousel
              items={iosItems}
              onImageClick={openLightbox}
              variant="portrait"
            />
          </div>
        )}

        {/* macOS Section */}
        {effectivePlatform === "macos" && macosItems.length > 0 && (
          <div className="showcase-v2__section">
            <PlatformCarousel
              items={macosItems}
              onImageClick={openLightbox}
              variant="landscape"
            />
          </div>
        )}

        {/* Other items (always shown) */}
        {otherItems.length > 0 && (
          <div className="showcase-v2__section">
            <PlatformCarousel
              items={otherItems}
              onImageClick={openLightbox}
              variant="landscape"
            />
          </div>
        )}
      </section>

      {lightboxIndex !== null && visibleImageItems[lightboxIndex] && (
        <Lightbox
          src={visibleImageItems[lightboxIndex].url}
          title={visibleImageItems[lightboxIndex].title || undefined}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((prev) => Math.max(0, (prev ?? 0) - 1))}
          onNext={() => setLightboxIndex((prev) => Math.min(visibleImageItems.length - 1, (prev ?? 0) + 1))}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < visibleImageItems.length - 1}
        />
      )}
    </>
  );
}
