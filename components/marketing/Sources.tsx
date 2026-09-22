import type { SourceLink } from "@/lib/sources";

// Quiet citation list at the bottom of a content page (item 3.4).
export function Sources({ links }: { links: SourceLink[] }) {
  return (
    <div className="mkt-sources">
      <h2>Sources</h2>
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
