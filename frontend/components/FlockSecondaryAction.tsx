import Link from "next/link";

const secondaryActionClass =
  "text-xs leading-none text-ink/50 transition hover:text-ink";

type FlockListFooterProps = {
  list: React.ReactNode;
  action?: React.ReactNode;
};

export function FlockListFooter({ list, action }: FlockListFooterProps) {
  return (
    <div className="flock-list-footer">
      {list}
      {action ? <div className="flock-list-footer__action">{action}</div> : null}
    </div>
  );
}

type FlockSecondaryButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
};

export function FlockSecondaryButton({
  children,
  onClick,
}: FlockSecondaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${secondaryActionClass} m-0 border-0 bg-transparent p-0 font-inherit`}
    >
      {children}
    </button>
  );
}

type FlockSecondaryLinkProps = {
  children: React.ReactNode;
  href: string;
};

export function FlockSecondaryLink({ children, href }: FlockSecondaryLinkProps) {
  return (
    <Link href={href} className={secondaryActionClass}>
      {children}
    </Link>
  );
}
