/* ============================================
   ISOLATED.TECH — MAIN JS
   ============================================
   Portfolio is driven by projects.js.
   To add a new project just edit that file
   and drop a screenshot — done.
   ============================================ */

// ── Render a project card ──
function createProjectCard(project) {
  const platformBadges = project.platforms.map(p => {
    if (p === 'ios') return '<span class="badge badge--ios">iOS APP</span>';
    if (p === 'web') return '<span class="badge badge--web">WEBSITE</span>';
    return `<span class="badge">${p.toUpperCase()}</span>`;
  }).join('');

  const card = document.createElement('a');
  card.href = project.url;
  card.target = '_blank';
  card.rel = 'noopener';
  card.className = 'project-card reveal';

  card.innerHTML = `
    <div class="project-card__image">
      ${project.screenshot
        ? `<img src="${project.screenshot}" alt="${project.name} screenshot" loading="lazy">`
        : `<div class="project-card__placeholder">${project.name[0].toUpperCase()}</div>`
      }
    </div>
    <div class="project-card__info">
      <div class="project-card__top">
        <div class="project-card__badges">
          ${platformBadges}
        </div>
        <h3 class="project-card__name">${project.name}</h3>
        <p class="project-card__description">${project.description}</p>
      </div>
      <div class="project-card__bottom">
        <span class="project-card__url">${project.url.replace('https://', '')}</span>
        <span class="project-card__arrow">↗</span>
      </div>
    </div>
  `;

  return card;
}

// ── Render all projects ──
function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';
  projects.forEach(p => grid.appendChild(createProjectCard(p)));
  initScrollReveal();
}

// ── Load projects from global PROJECTS array ──
function loadProjects() {
  const statusDot = document.querySelector('.work__discovery-dot');
  const statusText = document.querySelector('.work__discovery-text');

  if (typeof PROJECTS === 'undefined' || !PROJECTS.length) {
    statusDot.className = 'work__discovery-dot';
    statusText.textContent = 'No projects found. Check projects.js.';
    return;
  }

  renderProjects(PROJECTS);

  // Update stat counters
  const totalProducts = PROJECTS.length;
  const iosApps = PROJECTS.filter(p => p.platforms.includes('ios')).length;
  const websites = PROJECTS.filter(p => p.platforms.includes('web')).length;
  updateStats(totalProducts, iosApps, websites);

  statusDot.className = 'work__discovery-dot work__discovery-dot--live';
  statusText.textContent = `${PROJECTS.length} projects loaded from projects.js`;
}

// ── Update stat counters ──
function updateStats(total, ios, web) {
  const numbers = document.querySelectorAll('.stat__number[data-count]');
  numbers.forEach(el => {
    const label = el.nextElementSibling?.textContent || '';
    if (label.includes('PRODUCTS')) el.dataset.count = total;
    if (label.includes('iOS')) el.dataset.count = ios;
    if (label.includes('WEBSITES')) el.dataset.count = web;
  });
}

// ── Scroll reveal ──
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
}

// ── Animate stat numbers ──
function animateStats() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        if (isNaN(target)) return;

        let current = 0;
        const duration = 1500;
        const step = Math.max(1, Math.ceil(target / (duration / 30)));
        const interval = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(interval);
          }
          el.textContent = current;
        }, 30);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat__number[data-count]').forEach(el => observer.observe(el));
}

// ── Nav scroll effect ──
function initNavScroll() {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.style.borderBottomColor = window.scrollY > 100 ? '#444' : '#333';
  }, { passive: true });
}

// ── Add reveal class to static elements ──
function markRevealElements() {
  const selectors = [
    '.section-header',
    '.section-title',
    '.about__description',
    '.about__capabilities',
    '.about__image-stack',
    '.contact__left',
    '.contact__right',
    '.stat',
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
    });
  });
}

// ── Showcase: full-viewport scroll-driven project browser ──
function initShowcase() {
  if (typeof PROJECTS === 'undefined' || !PROJECTS.length) return;

  const showcase = document.getElementById('showcase');
  if (!showcase || window.innerWidth <= 900) return;

  const projects = PROJECTS;
  const N = projects.length;

  // Each project gets 100vh of scroll. +1 screen for the panel itself.
  showcase.style.height = `${(N + 1) * 100}vh`;

  const iframe      = document.getElementById('showcase-iframe');
  const loader      = document.getElementById('showcase-loader');
  const content     = document.getElementById('showcase-content');
  const pipsEl      = document.getElementById('showcase-pips');
  const scrollCue   = showcase.querySelector('.showcase__scroll-cue');

  let currentIndex    = -1;
  let isTransitioning = false;
  let loadTimer       = null;

  // Build progress pips
  projects.forEach((_, i) => {
    const pip = document.createElement('div');
    pip.className = 'showcase__pip' + (i === 0 ? ' showcase__pip--active' : '');
    pipsEl.appendChild(pip);
  });

  // ── Update DOM with project data ──
  function updateInfo(project, index) {
    document.getElementById('showcase-counter').textContent =
      `${String(index + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    document.getElementById('showcase-name').textContent = project.name;
    document.getElementById('showcase-tagline').textContent = project.title;
    document.getElementById('showcase-desc').textContent = project.description;

    const link     = document.getElementById('showcase-link');
    const linkText = document.getElementById('showcase-link-text');
    link.href          = project.url;
    linkText.textContent = project.url.replace('https://', '');

    document.getElementById('showcase-badges').innerHTML =
      project.platforms.map(p => {
        if (p === 'ios') return '<span class="badge badge--ios">iOS APP</span>';
        if (p === 'web') return '<span class="badge badge--web">WEBSITE</span>';
        return `<span class="badge">${p.toUpperCase()}</span>`;
      }).join('');

    // Pips
    pipsEl.querySelectorAll('.showcase__pip').forEach((pip, i) => {
      pip.classList.toggle('showcase__pip--active', i === index);
    });

    // Hide scroll cue on last project
    if (scrollCue) {
      scrollCue.style.opacity = index === N - 1 ? '0' : '1';
    }
  }

  // ── Load iframe ──
  function loadIframe(url) {
    clearTimeout(loadTimer);
    loader.classList.add('showcase__iframe-loader--visible');
    iframe.classList.add('showcase__iframe--loading');
    iframe.src = url;

    // Fallback: force-show after 8 s even if load event doesn't fire
    loadTimer = setTimeout(() => {
      iframe.classList.remove('showcase__iframe--loading');
      loader.classList.remove('showcase__iframe-loader--visible');
    }, 8000);
  }

  iframe.addEventListener('load', () => {
    clearTimeout(loadTimer);
    iframe.classList.remove('showcase__iframe--loading');
    loader.classList.remove('showcase__iframe-loader--visible');
  });

  // ── Switch active project ──
  function setProject(index, immediate) {
    if (index === currentIndex) return;
    if (isTransitioning && !immediate) return;

    const project = projects[index];
    currentIndex = index;

    if (immediate) {
      updateInfo(project, index);
      loadIframe(project.url);
      return;
    }

    isTransitioning = true;

    // Phase 1 — fade out
    content.classList.add('transitioning');
    content.style.opacity = '0';
    content.style.transform = 'translateY(-20px)';

    // Start loading iframe immediately
    loadIframe(project.url);

    setTimeout(() => {
      // Phase 2 — swap content, position for entrance
      updateInfo(project, index);
      content.classList.remove('transitioning');
      content.style.opacity = '0';
      content.style.transform = 'translateY(25px)';

      // Phase 3 — animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content.classList.add('transitioning');
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';

          // Phase 4 — clean up after animation
          setTimeout(() => {
            content.classList.remove('transitioning');
            isTransitioning = false;
          }, 350);
        });
      });
    }, 300);
  }

  // ── Scroll handler: determines active project + parallax ──
  function onScroll() {
    const rect    = showcase.getBoundingClientRect();
    const scrolled = -rect.top;
    const maxScroll = showcase.offsetHeight - window.innerHeight;

    // Only run while showcase is in play
    if (scrolled < 0 || scrolled > maxScroll) return;

    // Determine active project
    const index = Math.min(N - 1, Math.floor(scrolled / window.innerHeight));

    // Subtle parallax within the current slot
    if (!isTransitioning) {
      const slotProgress = (scrolled / window.innerHeight) - index; // 0 → 1
      const parallaxY = (slotProgress - 0.5) * 14; // ±7 px
      content.style.transform = `translateY(${parallaxY}px)`;
    }

    setProject(index);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Recalculate height on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 900) {
        showcase.style.height = `${(N + 1) * 100}vh`;
      }
    }, 200);
  });

  // Init first project
  setProject(0, true);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  markRevealElements();
  initScrollReveal();
  animateStats();
  initNavScroll();
  loadProjects();
  initShowcase();
});
