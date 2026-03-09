"use client";

import { useState, useEffect } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('<'))
    .map(p => `<p>${p}</p>`)
    .join('');
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Check for hash on mount to auto-open
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && items.some(item => item.id === hash)) {
      setOpenId(hash);
      // Scroll to the item
      setTimeout(() => {
        const element = document.getElementById(`faq-${hash}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [items]);

  const toggle = (id: string) => {
    const newId = openId === id ? null : id;
    setOpenId(newId);
    // Update URL hash
    if (newId) {
      window.history.replaceState(null, "", `#${newId}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  return (
    <div className="faq-accordion">
      {items.map((item) => (
        <div
          key={item.id}
          id={`faq-${item.id}`}
          className={`faq-item ${openId === item.id ? "faq-item--open" : ""}`}
        >
          <button
            className="faq-item__question"
            onClick={() => toggle(item.id)}
            aria-expanded={openId === item.id}
          >
            <span>{item.question}</span>
            <span className="faq-item__icon">{openId === item.id ? "−" : "+"}</span>
          </button>
          {openId === item.id && (
            <div
              className="faq-item__answer"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(item.answer) }}
            />
          )}
        </div>
      ))}

      <style>{`
        .faq-accordion {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .faq-item {
          border: 1px solid #2f2f2f;
          border-bottom: none;
          background: transparent;
        }

        .faq-item:last-child {
          border-bottom: 1px solid #2f2f2f;
        }

        .faq-item--open {
          border-color: #444;
          background: rgba(255, 255, 255, 0.02);
        }

        .faq-item__question {
          width: 100%;
          min-height: 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1.05rem 1.2rem;
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.5;
          text-align: left;
          color: var(--text);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .faq-item__question:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .faq-item--open .faq-item__question {
          background: rgba(255, 255, 255, 0.04);
        }

        .faq-item__icon {
          font-size: 1.3rem;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .faq-item__answer {
          padding: 0 1.2rem 1.25rem;
          font-size: 0.98rem;
          line-height: 1.85;
          color: var(--text-secondary);
        }

        .faq-item__answer p {
          margin: 0 0 0.85rem;
        }

        .faq-item__answer p:last-child {
          margin-bottom: 0;
        }

        .faq-item__answer code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-size: 0.86em;
          color: var(--text);
        }

        .faq-item__answer a {
          color: var(--text);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .faq-item__answer ul,
        .faq-item__answer ol {
          padding-left: 1.5rem;
          margin: 0.6rem 0;
        }

        .faq-item__answer li {
          margin-bottom: 0.4rem;
        }

        @media (max-width: 600px) {
          .faq-item__question,
          .faq-item__answer {
            font-size: 0.94rem;
          }
        }
      `}</style>
    </div>
  );
}
