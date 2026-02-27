interface AppFooterProps {
  className?: string;
}

export function AppFooter({ className = "" }: AppFooterProps) {
  return (
    <footer className={`footer ${className}`.trim()}>
      <div className="footer__left">
        <span>© 2026 ISOLATED.TECH</span>
      </div>
      <div className="footer__right" />
    </footer>
  );
}
