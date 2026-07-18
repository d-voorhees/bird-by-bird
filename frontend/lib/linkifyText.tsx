import { Fragment, type ReactNode } from "react";

const URL_PATTERN = /https?:\/\/[^\s]+/g;

function trimTrailingPunctuation(url: string): { url: string; trailing: string } {
  const match = url.match(/^(.*?)([.,;:!?)\"']*)$/);
  if (!match || match[1].length === 0) {
    return { url, trailing: "" };
  }
  return { url: match[1], trailing: match[2] };
}

export function linkifyText(text: string, linkClassName = ""): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(URL_PATTERN.source, "g");
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const { url, trailing } = trimTrailingPunctuation(raw);
    const start = match.index;

    if (start > lastIndex) {
      parts.push(<Fragment key={`text-${start}`}>{text.slice(lastIndex, start)}</Fragment>);
    }

    parts.push(
      <a
        key={`link-${start}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        onClick={(event) => event.stopPropagation()}
      >
        {url}
      </a>,
    );

    if (trailing) {
      parts.push(<Fragment key={`trail-${start}`}>{trailing}</Fragment>);
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key="text-end">{text.slice(lastIndex)}</Fragment>);
  }

  return parts.length > 0 ? parts : text;
}
