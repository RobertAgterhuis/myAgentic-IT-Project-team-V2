import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb primitive for consistent location context in page chrome.
 */
export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="px-6 pt-4 text-sm text-muted-foreground">
      <ol className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
        {items.map((item, index) => (
          <li key={item.path + index} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>/</span>}
            {index === items.length - 1 ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.path} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
