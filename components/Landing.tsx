"use client";

import Image from "next/image";
import Link from "next/link";
import { CodeInput } from "@/components/CodeInput";
import { Reveal } from "@/components/Reveal";
import { Rope } from "@/components/Rope";
import { useHarbourStatus } from "@/hooks/useHarbourStatus";
import { copy } from "@/lib/copy";

interface LandingProps {
  configured: boolean;
  onHost: () => void;
  onJoin: (code: string) => void;
}

export function Landing({ configured, onHost, onJoin }: LandingProps) {
  const harbour = useHarbourStatus();

  return (
    <div className="landing">
      <header className="site-header">
        <span className="wordmark">{copy.wordmark}</span>
        <a className="site-header__link" href="#how">
          {copy.howLink}
        </a>
      </header>

      <section className="hero">
        <div className="hero__content">
          {harbour.state !== "unrigged" && (
            <p
              className={`harbour-chip harbour-chip--${harbour.state} hero__chip rise rise--1`}
              role="status"
            >
              {harbour.state === "checking" && copy.harbour.checking}
              {harbour.state === "open" && copy.harbour.open(harbour.aboard)}
              {harbour.state === "full" && copy.harbour.full}
            </p>
          )}
          <h1 className="hero__title rise rise--2">
            {copy.heroLineOne}
            <br />
            {copy.heroLineTwo}
          </h1>
          <p className="hero__sub rise rise--3">{copy.heroSub}</p>

          {configured ? (
            <div className="hero__actions rise rise--4">
              <button
                type="button"
                className="button button--kilo"
                onClick={onHost}
              >
                {copy.ctaHost}
              </button>
              <CodeInput onSubmit={onJoin} />
            </div>
          ) : (
            <p className="hero__unrigged" role="alert">
              {copy.failure.notConfigured}
            </p>
          )}
          {harbour.state === "full" && (
            <p className="harbour-chip__detail">{copy.harbour.fullDetail}</p>
          )}
        </div>

        <Reveal>
          <figure className="hero__photo">
            <Image
              src="/images/harbour-day.png"
              alt={copy.figures.heroAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 992px"
            />
          </figure>
        </Reveal>

        <div className="hero__rope" aria-hidden="true">
          <Rope mode="slack" ambient />
        </div>
      </section>

      <section className="proof" aria-label={copy.proofAria}>
        <ul className="proof__list">
          {copy.proofStrip.map((item, index) => (
            <li key={item.figure} className="proof__item">
              <Reveal delay={index * 90}>
                <span className="proof__figure">{item.figure}</span>
                <span className="proof__caption">{item.caption}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="how" id="how">
        <Reveal>
          <p className="eyebrow">{copy.howEyebrow}</p>
          <h2 className="section-title">{copy.howTitle}</h2>
        </Reveal>
        <ol className="how__steps">
          {copy.howSteps.map((step, index) => (
            <li key={step.term} className="how__step">
              <Reveal delay={index * 120}>
                <span className="how__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="how__term">{step.term}</h3>
                <p className="how__plain">{step.plain}</p>
              </Reveal>
            </li>
          ))}
        </ol>
        <div className="how__figures">
          <Reveal>
            <figure className="how__figure">
              <Image
                src="/images/rope-strands.png"
                alt={copy.figures.ropeAlt}
                width={940}
                height={627}
                sizes="(max-width: 720px) 100vw, 50vw"
              />
              <figcaption>{copy.figures.ropeCaption}</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={140}>
            <figure className="how__figure">
              <Image
                src="/images/bollard-hitch.png"
                alt={copy.figures.bollardAlt}
                width={940}
                height={627}
                sizes="(max-width: 720px) 100vw, 50vw"
              />
              <figcaption>{copy.figures.bollardCaption}</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="glossary">
        <Reveal>
          <p className="eyebrow">{copy.glossaryEyebrow}</p>
          <h2 className="section-title">{copy.glossaryTitle}</h2>
          <p className="glossary__body">{copy.glossaryBody}</p>
        </Reveal>
        <Reveal delay={120}>
          <dl className="glossary__terms">
            {copy.glossaryTerms.map((entry) => (
              <div key={entry.term} className="glossary__row">
                <dt>{entry.term}</dt>
                <dd>{entry.plain}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <footer className="site-footer">
        <span className="wordmark wordmark--small">{copy.wordmark}</span>
        <p className="site-footer__note">{copy.footerNote}</p>
        <nav className="site-footer__nav" aria-label="Legal">
          <Link href="/privacy">{copy.nav.privacy}</Link>
          <Link href="/terms">{copy.nav.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}
