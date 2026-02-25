"use client";

import { useEffect } from "react";
import { Project } from "@/lib/projects";

interface ProjectCardsProps {
  projects: Project[];
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener"
      className="project-card reveal"
    >
      <div className="project-card__image">
        {project.screenshot ? (
          <img
            src={project.screenshot}
            alt={`${project.name} screenshot`}
            loading="lazy"
          />
        ) : (
          <div className="project-card__placeholder">
            {project.name[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="project-card__info">
        <div className="project-card__top">
          <div className="project-card__badges">
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
          <h3 className="project-card__name">{project.name}</h3>
          <p className="project-card__description">{project.description}</p>
        </div>
        <div className="project-card__bottom">
          <span className="project-card__url">
            {project.url.replace("https://", "")}
          </span>
          <span className="project-card__arrow">↗</span>
        </div>
      </div>
    </a>
  );
}

export function ProjectCards({ projects }: ProjectCardsProps) {
  useEffect(() => {
    // Initialize scroll reveal for project cards
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".reveal:not(.visible)").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="projects" id="projects-grid">
      {projects.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  );
}
