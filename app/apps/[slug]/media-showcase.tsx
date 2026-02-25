"use client";

import { useState } from "react";

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
    <div className="media-showcase__youtube">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
        title={title || "Video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function ImageItem({
  src,
  title,
  onClick,
}: {
  src: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button className="media-showcase__image" onClick={onClick} type="button">
      <img src={src} alt={title || "App screenshot"} />
    </button>
  );
}

function Lightbox({
  src,
  title,
  onClose,
}: {
  src: string;
  title?: string;
  onClose: () => void;
}) {
  return (
    <div className="media-lightbox" onClick={onClose}>
      <button className="media-lightbox__close" onClick={onClose}>
        ✕
      </button>
      <img src={src} alt={title || "App screenshot"} onClick={(e) => e.stopPropagation()} />
      {title && <p className="media-lightbox__title">{title}</p>}
    </div>
  );
}

export function MediaShowcase({ media }: MediaShowcaseProps) {
  const [lightboxImage, setLightboxImage] = useState<MediaItem | null>(null);

  if (!media || media.length === 0) return null;

  return (
    <>
      <section className="media-showcase">
        <h2 className="media-showcase__title">SHOWCASE</h2>
        <div className="media-showcase__grid">
          {media.map((item) => (
            <div key={item.id} className="media-showcase__item">
              {item.type === "youtube" ? (
                <YouTubeEmbed videoId={item.url} title={item.title || undefined} />
              ) : (
                <ImageItem
                  src={item.url}
                  title={item.title || undefined}
                  onClick={() => setLightboxImage(item)}
                />
              )}
              {item.title && (
                <p className="media-showcase__caption">{item.title}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {lightboxImage && (
        <Lightbox
          src={lightboxImage.url}
          title={lightboxImage.title || undefined}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
