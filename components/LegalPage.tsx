import Link from "next/link";
import { copy } from "@/lib/copy";
import type { LegalDoc } from "@/lib/legal";

interface LegalPageProps {
  doc: LegalDoc;
}

export function LegalPage({ doc }: LegalPageProps) {
  return (
    <div>
      <header className="site-header">
        <Link className="wordmark" href="/">
          {copy.wordmark}
        </Link>
        <Link className="site-header__link" href="/">
          {copy.nav.backHome}
        </Link>
      </header>
      <main className="legal">
        <div>
          <h1 className="legal__title">{doc.title}</h1>
          <p className="legal__updated">{doc.updated}</p>
        </div>
        <p className="legal__intro">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="legal__section">
            <h2 className="legal__heading">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>
      <footer className="site-footer">
        <span className="wordmark wordmark--small">{copy.wordmark}</span>
        <nav className="site-footer__nav" aria-label="Legal">
          <Link href="/privacy">{copy.nav.privacy}</Link>
          <Link href="/terms">{copy.nav.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}
