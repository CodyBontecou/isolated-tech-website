"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Project } from "@/lib/projects";

interface ShowcaseProps {
  projects: Project[];
}

export function Showcase({ projects }: ShowcaseProps) {
  const showcaseRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const N = projects.length;

  const loadIframe = useCallback((url: string) => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    // Fallback: force-show after 8s
    loadTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 8000);
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setIsLoading(false);
  }, []);

  const setProject = useCallback(
    (index: number, immediate = false) => {
      if (index === currentIndex && !immediate) return;
      if (isTransitioning && !immediate) return;

      const project = projects[index];
      setCurrentIndex(index);

      if (immediate) {
        loadIframe(project.url);
        return;
      }

      setIsTransitioning(true);

      // Start loading iframe immediately
      loadIframe(project.url);

      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    },
    [currentIndex, isTransitioning, projects, loadIframe]
  );

  useEffect(() => {
    const showcase = showcaseRef.current;
    if (!showcase || typeof window === "undefined") return;

    // Set height for scroll-driven animation
    showcase.style.height = `${(N + 1) * 100}vh`;

    const onScroll = () => {
      const rect = showcase.getBoundingClientRect();
      const scrolled = -rect.top;
      const maxScroll = showcase.offsetHeight - window.innerHeight;

      if (scrolled < 0 || scrolled > maxScroll) return;

      const index = Math.min(N - 1, Math.floor(scrolled / window.innerHeight));

      // Parallax effect
      if (!isTransitioning && contentRef.current) {
        const slotProgress = scrolled / window.innerHeight - index;
        const parallaxY = (slotProgress - 0.5) * 14;
        contentRef.current.style.transform = `translateY(${parallaxY}px)`;
      }

      if (index !== currentIndex) {
        setProject(index);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Resize handler
    let resizeTimer: NodeJS.Timeout;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 900) {
          showcase.style.height = `${(N + 1) * 100}vh`;
        }
      }, 200);
    };
    window.addEventListener("resize", onResize);

    // Init first project
    setProject(0, true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [N, setProject, currentIndex, isTransitioning]);

  const project = projects[currentIndex];

  return (
    <div className="showcase" id="showcase" ref={showcaseRef}>
      <div className="showcase__sticky">
        <div className="showcase__iframe-col">
          <iframe
            ref={iframeRef}
            className={`showcase__iframe ${isLoading ? "showcase__iframe--loading" : ""}`}
            src="about:blank"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
          <div
            className={`showcase__iframe-loader ${isLoading ? "showcase__iframe-loader--visible" : ""}`}
          >
            <span className="showcase__loader-text">LOADING</span>
          </div>
        </div>
        <div className="showcase__info-col">
          <div
            ref={contentRef}
            className={`showcase__info-content ${isTransitioning ? "transitioning" : ""}`}
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? "translateY(-20px)" : undefined,
            }}
          >
            <span className="showcase__counter">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(N).padStart(2, "0")}
            </span>
            <div className="showcase__badges">
              {project.platforms.map((p) =>
                p === "ios" ? (
                  <span key={p} className="badge badge--ios">
                    iOS APP
                  </span>
                ) : (
                  <span key={p} className="badge badge--web">
                    WEBSITE
                  </span>
                )
              )}
            </div>
            <h3 className="showcase__name">{project.name}</h3>
            <p className="showcase__tagline">{project.title}</p>
            <p className="showcase__desc">{project.description}</p>
            <a
              href={project.url}
              className="showcase__link"
              target="_blank"
              rel="noopener"
            >
              <span>{project.url.replace("https://", "")}</span>
              <span className="showcase__link-arrow">↗</span>
            </a>
          </div>
          <div className="showcase__footer">
            <div className="showcase__pips">
              {projects.map((_, i) => (
                <div
                  key={i}
                  className={`showcase__pip ${i === currentIndex ? "showcase__pip--active" : ""}`}
                />
              ))}
            </div>
            <div
              className="showcase__scroll-cue"
              style={{ opacity: currentIndex === N - 1 ? 0 : 1 }}
            >
              <span>SCROLL</span>
              <div className="showcase__scroll-cue-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
