import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ArtifactBrowserPage from './artifact-browser-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/artifacts']}>
      <ArtifactBrowserPage />
    </RouterTestWrapper>
  );
}

describe('ArtifactBrowserPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('artifact-browser-page')).toBeInTheDocument();
    });
  });

  it('renders the mission-control heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: /browse governed delivery artifacts as traceable evidence/i,
        })
      ).toBeInTheDocument();
    });
  });

  it('renders registry controls and signals', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Governed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/evidence remains governed/i)).toBeInTheDocument();
  });
});
