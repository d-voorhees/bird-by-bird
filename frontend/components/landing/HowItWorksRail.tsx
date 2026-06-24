import { BirdImage } from "@/components/BirdImage";

type Step = {
  number: string;
  title: string;
  body: string;
  illustration: React.ReactNode;
};

type MockTask = {
  title: string;
  bird: string;
};

function MockCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`bird-checkbox ${checked ? "bird-checkbox--checked" : ""}`}
      aria-hidden="true"
    >
      {checked ? (
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="bird-checkbox__mark">
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      ) : null}
    </span>
  );
}

function MockDragHandle() {
  return (
    <span className="flock-action-btn text-ink/60" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <path
          d="M8 3.5L8 5.5M8 10.5L8 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M5.5 5.5L8 3L10.5 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 10.5L8 13L10.5 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function MockTrashIcon() {
  return (
    <span className="flock-action-btn text-ink/60" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
        <path
          d="M3 4.5H13M6 4.5V3.5H10V4.5M5.5 4.5L6 13H10L10.5 4.5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </span>
  );
}

function MockPendingRow({ title, bird }: MockTask) {
  return (
    <div className="flock-list-item rounded-lg border border-stone/20 bg-surface/40 px-3 py-2">
      <div className="flock-row">
        <MockCheckbox checked={false} />
        <BirdImage filename={bird} widthPx={100} />
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center">
          <div className="flock-row__text flock-row__text--title-only">
            <span className="text-sm text-ink">{title}</span>
          </div>
          <div className="flock-row__actions pb-1.5 sm:pb-0">
            <MockDragHandle />
            <MockTrashIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCompletedRow({ title, bird, time }: MockTask & { time: string }) {
  return (
    <div className="flock-list-item rounded-lg border border-stone/15 bg-surface/25 px-3 py-2">
      <div className="flock-row">
        <MockCheckbox checked={true} />
        <BirdImage filename={bird} widthPx={100} />
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center">
          <div className="flock-row__text">
            <span className="text-sm font-medium text-ink/75 line-through decoration-ink/25">
              {title}
            </span>
          </div>
          <time className="pb-1.5 text-xs text-ink/40 sm:shrink-0 sm:pb-0">{time}</time>
        </div>
      </div>
    </div>
  );
}

function MockFlockView() {
  const items: MockTask[] = [
    { title: "Respond to Priya's Slack", bird: "Artboard8.svg" },
    { title: "Pull analytics for the deck", bird: "Artboard3.svg" },
  ];

  return (
    <div className="flock-list space-y-2" aria-hidden="true">
      <p className="mb-3 font-display text-sm text-ink">Awaiting flight</p>
      {items.map((item) => (
        <MockPendingRow key={item.title} {...item} />
      ))}
    </div>
  );
}

function MockBirdView() {
  return (
    <div
      className="rounded-lg border border-stone/20 bg-surface/60 px-6 py-8 text-center"
      aria-hidden="true"
    >
      <BirdImage filename="Artboard27.svg" widthPx={240} className="mx-auto mb-4" />
      <p className="font-display text-xl leading-tight text-ink sm:text-2xl">
        resend email routing info
      </p>
      <p className="mt-3 text-sm text-ink/55">One task on screen. Everything else out of sight.</p>
      <div className="mt-6 flex justify-center gap-3">
        <span className="min-w-[5rem] rounded-md bg-accent px-4 py-2 text-xs font-medium text-accent-fg">
          Done
        </span>
        <span className="min-w-[5rem] rounded-md border border-stone/30 px-4 py-2 text-xs font-medium text-ink">
          Skip
        </span>
      </div>
    </div>
  );
}

function MockHistoryView() {
  const items: (MockTask & { time: string })[] = [
    { title: "Write the agenda so meeting has a point", bird: "Artboard12.svg", time: "June 19 10:27am" },
    { title: "finish chapter 2", bird: "Artboard3.svg", time: "June 19 9:14am" },
  ];

  return (
    <div className="flock-list space-y-2" aria-hidden="true">
      <p className="mb-3 font-display text-sm font-semibold text-ink">Today</p>
      {items.map((item) => (
        <MockCompletedRow key={item.title} {...item} />
      ))}
    </div>
  );
}

const STEPS: Step[] = [
  {
    number: "1",
    title: "Build your flock",
    body: "Pick a handful of tasks from your main list and add them to your flock. Not everything. Just what you want to work on today.",
    illustration: <MockFlockView />,
  },
  {
    number: "2",
    title: "Meet your bird",
    body: "The application shows one task on screen, with everything else out of sight. Notes are inline. Reordering happens on a separate page.",
    illustration: <MockBirdView />,
  },
  {
    number: "3",
    title: "Finish and move on",
    body: "Mark the bird done, and the next one appears. The history page keeps a record of what you finished.",
    illustration: <MockHistoryView />,
  },
];

export function HowItWorksRail() {
  return (
    <div className="relative">
      <div
        className="absolute bottom-0 left-[11px] top-0 z-0 w-px bg-stone/30 sm:left-[15px]"
        aria-hidden="true"
      />
      <ol className="space-y-16 sm:space-y-20">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="relative z-10 grid gap-8 sm:grid-cols-[1fr_minmax(0,360px)] sm:gap-10"
          >
            <div className="relative pl-10 sm:pl-12">
              <span
                className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-stone/30 bg-paper text-xs text-ink/60 sm:h-8 sm:w-8"
                aria-hidden="true"
              >
                {step.number}
              </span>
              <h3 className="font-display text-lg text-ink">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">{step.body}</p>
            </div>
            <div className="min-w-0 bg-paper sm:bg-transparent sm:pt-1">{step.illustration}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
