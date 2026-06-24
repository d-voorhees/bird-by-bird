type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What does Bird by Bird cost?",
    answer:
      "Nothing. The application is free to use and runs on a small infrastructure stack.",
  },
  {
    question: "Can I sync with Asana, Notion, or another task manager?",
    answer:
      "No, by design. The flock is meant to be a curated focus list. Adding tasks one at a time is the focusing exercise that keeps it that way.",
  },
  {
    question: "Where does my data live?",
    answer:
      "PostgreSQL hosted on Neon, with email-verified accounts. The privacy policy covers the specifics.",
  },
  {
    question: "Is the code open?",
    answer:
      "The full source lives on GitHub, with a README that walks through the architecture and a CHANGELOG that covers versioning.",
  },
  {
    question: "How do I get my data out?",
    answer:
      "The history page has a Download option allowing you to export your completed tasks with dates and times. Markdown and CSV export formats available.",
  },
];

export function FaqAccordion() {
  return (
    <div className="divide-y divide-stone/20 border-y border-stone/20">
      {FAQ_ITEMS.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-4">
              {item.question}
              <span
                className="mt-0.5 shrink-0 text-ink/40 transition group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink/75">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
