import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  it('renders without crashing and displays the title', () => {
    render(<Sidebar />);
    expect(screen.getByText('Guará-Notes')).toBeInTheDocument();
  });
});
