import Link from "next/link";

type TaskLink = { href: string; label: string };

type TaskFaq = { question: string; answer: string };

type TaskLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  mode: "search" | "isbn";
  placeholder: string;
  submitLabel: string;
  access?: "public-domain";
  steps: string[];
  related: TaskLink[];
  faq?: TaskFaq[];
};

export function TaskLanding({
  eyebrow,
  title,
  description,
  mode,
  placeholder,
  submitLabel,
  access,
  steps,
  related,
  faq,
}: TaskLandingProps) {
  const faqJsonLd = faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }
    : null;
  return (
    <main className="task-page">
      <header className="task-header">
        <Link href="/">Shelfmark</Link>
        <a href="https://bulidoge.site/products/shelfmark">DBL-TOOLS</a>
      </header>
      <article className="task-content">
        <p className="eyebrow"><span>TASK</span> {eyebrow}</p>
        <h1>{title}</h1>
        <p className="task-lede">{description}</p>

        <form className="task-search" action="/" method="get">
          <input type="hidden" name="mode" value={mode} />
          {access ? <input type="hidden" name="access" value={access} /> : null}
          <label htmlFor="task-query">{mode === "isbn" ? "ISBN-10 or ISBN-13" : "Book title or author"}</label>
          <div>
            <input id="task-query" name="q" required placeholder={placeholder} autoComplete="off" />
            <button type="submit">{submitLabel}</button>
          </div>
        </form>

        <section>
          <h2>What happens next</h2>
          <ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol>
        </section>

        {faq?.length ? (
          <section className="task-faq">
            <h2>Frequently asked questions</h2>
            {faq.map((item) => (
              <div key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </section>
        ) : null}

        {faqJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        ) : null}

        <nav className="task-related" aria-label="Related Shelfmark tasks">
          <strong>Other ways to search</strong>
          {related.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
      </article>
    </main>
  );
}
