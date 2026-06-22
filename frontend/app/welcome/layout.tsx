import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bird by Bird",
  description:
    "A focus tool for people who already have too many places to keep their tasks. One task at a time until the flock is clear.",
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
