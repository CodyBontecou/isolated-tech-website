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
          border: 1px solid #222;
          border-bottom: none;
        }
        .faq-item:last-child {
          border-bottom: 1px solid #222;
        }
        .faq-item--open {
          border-color: #333;
        }
        .faq-item__question {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 500;
          text-align: left;
          color: var(--text);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .faq-item__question:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .faq-item--open .faq-item__question {
          background: rgba(255, 255, 255, 0.03);
        }
        .faq-item__icon {
          font-size: 1.25rem;
          color: #666;
          flex-shrink: 0;
          margin-left: 1rem;
        }
        .faq-item__answer {
          padding: 0 1.25rem 1.25rem;
          font-size: 0.9rem;
          line-height: 1.7;
          color: #aaa;
        }
        .faq-item__answer p {
          margin: 0 0 0.75rem;
        }
        .faq-item__answer p:last-child {
          margin-bottom: 0;
        }
        .faq-item__answer code {
          background: #1a1a1a;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          font-size: 0.85em;
        }
        .faq-item__answer a {
          color: #60a5fa;
        }
        .faq-item__answer ul {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
}
