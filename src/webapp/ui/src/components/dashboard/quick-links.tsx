import { useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Terminal, GitBranch, FileText, Scale, BarChart3, ArrowRight } from 'lucide-react';

export function QuickLinks() {
  const navigate = useNavigate();
  const links = [
    {
      ...routes.commands,
      icon: <Terminal className="size-5" />,
      desc: 'Queue commands and manage the pipeline',
    },
    {
      ...routes.pipeline,
      icon: <GitBranch className="size-5" />,
      desc: 'View pipeline phases and agent progress',
    },
    {
      ...routes.questionnaires,
      icon: <FileText className="size-5" />,
      desc: 'Answer project intake questions',
    },
    {
      ...routes.decisions,
      icon: <Scale className="size-5" />,
      desc: 'Review and manage architectural decisions',
    },
    {
      ...routes.observability,
      icon: <BarChart3 className="size-5" />,
      desc: 'Monitor drift, KPIs, and quality metrics',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {links.map((link) => (
        <button
          key={link.path}
          type="button"
          onClick={() => navigate(link.path)}
          className="text-left rounded-lg border bg-card p-4 hover:bg-accent hover:border-primary/30 hover:shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              {link.icon}
            </span>
            <span className="font-semibold text-sm">{link.label}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{link.desc}</p>
          <div className="flex justify-end mt-2">
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>
      ))}
    </div>
  );
}
