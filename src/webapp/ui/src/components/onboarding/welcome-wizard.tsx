/**
 * WelcomeWizard — 5-step first-time user onboarding flow.
 * Dismissible, persists dismissal in localStorage.
 * M15-040
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
import {
  Rocket,
  Terminal,
  Activity,
  Package,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
} from 'lucide-react';

interface WizardStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: { label: string; href: string };
}

const STEPS: WizardStep[] = [
  {
    title: 'Welcome to the Command Center',
    description:
      'This is your control panel for managing the full software development lifecycle. ' +
      'You can monitor sessions, manage agents, and track decisions — all from one place.',
    icon: <Rocket className="size-8 text-blue-500" />,
  },
  {
    title: 'Run Commands',
    description:
      'Use the Commands page to issue CREATE, AUDIT, or FEATURE commands. ' +
      'Each command starts a new session that progresses through all SDLC phases.',
    icon: <Terminal className="size-8 text-green-500" />,
    action: { label: 'Go to Commands', href: '/commands' },
  },
  {
    title: 'Monitor Sessions',
    description:
      'Track active sessions in real time. Watch agents work through phases, ' +
      'view artifacts as they are created, and review gate validation results.',
    icon: <Activity className="size-8 text-purple-500" />,
    action: { label: 'View Sessions', href: '/sessions' },
  },
  {
    title: 'Review Artifacts & Decisions',
    description:
      'Every deliverable is tracked as an artifact. Open decisions require your input — ' +
      'review them promptly to keep the pipeline moving.',
    icon: <Package className="size-8 text-amber-500" />,
    action: { label: 'Browse Artifacts', href: '/artifacts' },
  },
  {
    title: 'Governance & Quality',
    description:
      'Gate validations ensure quality at every phase boundary. ' +
      'The Governance dashboard shows compliance status and approval workflows.',
    icon: <ShieldCheck className="size-8 text-teal-500" />,
    action: { label: 'View Governance', href: '/governance' },
  },
];

interface WelcomeWizardProps {
  onDismiss: () => void;
}

export function WelcomeWizard({ onDismiss }: WelcomeWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onDismiss();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }, [isLast, onDismiss]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  return (
    <div role="dialog" aria-label="Welcome wizard" aria-modal="false" data-testid="welcome-wizard">
      <Card elevation="raised" className="p-6 max-w-lg mx-auto">
        {/* Header with dismiss */}
        <div className="flex items-center justify-between mb-4">
          <Text muted className="text-xs">
            Step {currentStep + 1} of {STEPS.length}
          </Text>
          <button
            type="button"
            aria-label="Dismiss wizard"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center gap-4">
          {step.icon}
          <Heading level={2}>{step.title}</Heading>
          <Text muted className="text-sm max-w-md">
            {step.description}
          </Text>

          {step.action && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(step.action!.href);
                onDismiss();
              }}
            >
              {step.action.label} <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mt-6" aria-label="Wizard progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`size-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-primary/40' : 'bg-muted'
              }`}
              aria-label={`Step ${i + 1}${i === currentStep ? ' (current)' : ''}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="sm" onClick={handleBack} disabled={isFirst}>
            <ArrowLeft className="size-3 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={handleNext}>
            {isLast ? (
              <>
                <CheckCircle className="size-3 mr-1" /> Get Started
              </>
            ) : (
              <>
                Next <ArrowRight className="size-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
