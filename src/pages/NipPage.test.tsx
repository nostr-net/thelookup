import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import NipPage from './NipPage';

// Mock the hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'c'.repeat(64), // Valid 64-character hex string
      signer: {},
    },
  }),
}));

vi.mock('@/hooks/useCustomNip', () => ({
  useCustomNip: (naddr: string) => {
    if (naddr === 'test-naddr-official-fork') {
      return {
        data: {
          kind: 30817,
          pubkey: 'a'.repeat(64),
          content: 'Custom NIP content forked from official',
          created_at: 1234567890,
          tags: [
            ['d', 'test-official-fork'],
            ['title', 'Test Official Fork NIP'],
            ['k', '1000'],
            ['i', 'https://github.com/nostr-protocol/nips/blob/master/01.md', 'fork'],
          ],
        },
        isLoading: false,
        error: null,
      };
    }
    return {
      data: {
        kind: 30817,
        pubkey: 'a'.repeat(64), // Valid 64-character hex string
        content: 'Custom NIP content',
        created_at: 1234567890,
        tags: [
          ['d', 'test-nip'],
          ['title', 'Test Custom NIP'],
          ['k', '1000'],
          ['a', '30817:' + 'b'.repeat(64) + ':source-identifier', '', 'fork'],
        ],
      },
      isLoading: false,
      error: null,
    };
  },
}));

vi.mock('@/hooks/useOfficialNip', () => ({
  useOfficialNip: () => ({
    data: {
      content: '# NIP-01\n\nBasic protocol flow description\n\nThis is the official NIP content.',
      nipNumber: '01',
    },
    isLoading: false,
    error: null,
  }),
}));


vi.mock('@/hooks/useAuthor', () => ({
  useAuthor: () => ({
    data: {
      metadata: {
        name: 'Test Author',
        picture: 'https://example.com/avatar.jpg',
      },
    },
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});



describe('NipPage', () => {
  it('renders official NIP with GitHub link, fork button, and download button', () => {
    render(
      <TestApp>
        <NipPage nipId="01" isOfficialNip={true} />
      </TestApp>
    );

    expect(screen.getByText('NIP-01')).toBeInTheDocument();
    
    // Check for the presence of action buttons by finding links with specific hrefs
    const links = screen.getAllByRole('link');
    const githubLink = links.find(link => 
      link.getAttribute('href') === 'https://github.com/nostr-protocol/nips/blob/master/01.md'
    );
    expect(githubLink).toBeInTheDocument();
    
    const forkLink = links.find(link => 
      link.getAttribute('href') === '/create?officialFork=01'
    );
    expect(forkLink).toBeInTheDocument();
    
    // Check for download button by finding a button with download functionality
    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons.find(button => 
      button.querySelector('svg') && 
      button.onclick !== null
    );
    expect(downloadButton).toBeInTheDocument();
  });

  it('renders custom NIP with fork badge when forked', () => {
    render(
      <TestApp>
        <NipPage nipId="test-naddr" isOfficialNip={false} />
      </TestApp>
    );

    expect(screen.getByRole('heading', { name: 'Test Custom NIP' })).toBeInTheDocument();
    // Look for the fork badge specifically by checking for multiple Fork texts
    const forkTexts = screen.getAllByText('Fork');
    expect(forkTexts.length).toBeGreaterThan(0);
    expect(screen.getByText('Custom Protocol')).toBeInTheDocument();
  });

  it('shows fork information for forked NIPs', () => {
    render(
      <TestApp>
        <NipPage nipId="test-naddr" isOfficialNip={false} />
      </TestApp>
    );

    expect(screen.getByText('Fork of')).toBeInTheDocument();
  });

  it('includes fork option for custom NIPs', () => {
    render(
      <TestApp>
        <NipPage nipId="test-naddr" isOfficialNip={false} />
      </TestApp>
    );

    // The fork option should be available as a link with the correct href
    const links = screen.getAllByRole('link');
    const forkLink = links.find(link => 
      link.getAttribute('href') === '/create?fork=test-naddr'
    );
    expect(forkLink).toBeInTheDocument();
  });

  it('shows official fork information for NIPs forked from official NIPs', () => {
    render(
      <TestApp>
        <NipPage nipId="test-naddr-official-fork" isOfficialNip={false} />
      </TestApp>
    );

    expect(screen.getByRole('heading', { name: 'Test Official Fork NIP' })).toBeInTheDocument();
    expect(screen.getByText('Fork of')).toBeInTheDocument();
    expect(screen.getByText('NIP-01')).toBeInTheDocument();
  });

  it('includes download option for custom NIPs', () => {
    render(
      <TestApp>
        <NipPage nipId="test-naddr" isOfficialNip={false} />
      </TestApp>
    );

    // Check that download option is present as a button
    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons.find(button => 
      button.querySelector('svg') && 
      button.onclick !== null
    );
    expect(downloadButton).toBeInTheDocument();
  });

  it('download button is clickable for official NIPs', () => {
    render(
      <TestApp>
        <NipPage nipId="01" isOfficialNip={true} />
      </TestApp>
    );

    // Find the download button by looking for buttons with click handlers
    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons.find(button => 
      button.querySelector('svg') && 
      button.onclick !== null
    );
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).not.toBeDisabled();
  });
});