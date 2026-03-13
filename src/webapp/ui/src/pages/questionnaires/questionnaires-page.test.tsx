/**
 * Questionnaires page tests — Issue #242 (S9G-35)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionnairesPage from './questionnaires-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/questionnaires']}>
      <QuestionnairesPage />
    </RouterTestWrapper>
  );
}

describe('QuestionnairesPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('questionnaires-page')).toBeInTheDocument();
    });
  });

  it('renders sidebar with phase sections', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Phase 1')).toBeInTheDocument();
    });
  });

  it('shows empty state when no questionnaire is selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/select a questionnaire/i)).toBeInTheDocument();
    });
  });

  it('selects a questionnaire from the sidebar', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /business analyst/i })).toBeInTheDocument();
    });
  });

  it('displays questions when a questionnaire is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      expect(screen.getByText(/what is the target market/i)).toBeInTheDocument();
    });
  });

  it('shows REQUIRED badge on required questions', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      expect(screen.getByText('REQUIRED')).toBeInTheDocument();
    });
  });

  it('shows progress bars for questionnaire stats', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      const bars = screen.getAllByRole('progressbar');
      expect(bars.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('save button is disabled when no changes are made', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /save/i });
      expect(saveBtn).toBeDisabled();
    });
  });

  it('enables save button when user types an answer', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      expect(screen.getByText(/what is the target market/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/answer/i);
    await user.type(input, 'Enterprise SaaS');

    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeEnabled();
  });

  it('renders search input for filtering questions', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Business Analyst'));

    await waitFor(() => {
      expect(screen.getByLabelText(/search questions/i)).toBeInTheDocument();
    });
  });
});
