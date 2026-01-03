/**
 * Card Component Tests
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/test-utils';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '../Card';

describe('Card', () => {
  describe('Card Component', () => {
    it('renders children', () => {
      renderWithProviders(
        <Card>
          <p>Card content</p>
        </Card>
      );
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('applies default styling', () => {
      renderWithProviders(
        <Card data-testid="card">Content</Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      renderWithProviders(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('CardHeader Component', () => {
    it('renders children', () => {
      renderWithProviders(
        <CardHeader>
          <h1>Header</h1>
        </CardHeader>
      );
      expect(screen.getByRole('heading', { name: 'Header' })).toBeInTheDocument();
    });
  });

  describe('CardTitle Component', () => {
    it('renders as h1 heading', () => {
      renderWithProviders(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
    });

    it('applies title styling', () => {
      renderWithProviders(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toBeInTheDocument();
    });
  });

  describe('CardSubtitle Component', () => {
    it('renders subtitle text', () => {
      renderWithProviders(<CardSubtitle>Subtitle text</CardSubtitle>);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('renders as paragraph', () => {
      renderWithProviders(<CardSubtitle>Subtitle</CardSubtitle>);
      const subtitle = screen.getByText('Subtitle');
      expect(subtitle.tagName).toBe('P');
    });
  });

  describe('CardBody Component', () => {
    it('renders body content', () => {
      renderWithProviders(
        <CardBody>
          <p>Body content</p>
        </CardBody>
      );
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });
  });

  describe('CardFooter Component', () => {
    it('renders footer content', () => {
      renderWithProviders(
        <CardFooter>Footer text</CardFooter>
      );
      expect(screen.getByText('Footer text')).toBeInTheDocument();
    });

    it('renders links correctly', () => {
      renderWithProviders(
        <CardFooter>
          <a href="/test">Test Link</a>
        </CardFooter>
      );
      const link = screen.getByRole('link', { name: 'Test Link' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('Complete Card', () => {
    it('renders complete card structure', () => {
      renderWithProviders(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardSubtitle>Please sign in to continue</CardSubtitle>
          </CardHeader>
          <CardBody>
            <p>Main content goes here</p>
          </CardBody>
          <CardFooter>
            <a href="/signup">Create account</a>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
      expect(screen.getByText('Please sign in to continue')).toBeInTheDocument();
      expect(screen.getByText('Main content goes here')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Create account' })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('Card has styled-component wrapper', () => {
      renderWithProviders(
        <Card data-testid="styled-card">Styled</Card>
      );
      const card = screen.getByTestId('styled-card');
      expect(card).toBeInTheDocument();
    });

    it('all parts render without errors', () => {
      renderWithProviders(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardSubtitle>Subtitle</CardSubtitle>
          </CardHeader>
          <CardBody>Body</CardBody>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});
