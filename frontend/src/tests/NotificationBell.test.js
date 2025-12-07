import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../components/NotificationBell';

describe('NotificationBell', () => {
  it('clears notifications after closing and reopening (current behavior)', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    // Badge reflects seeded notifications
    expect(screen.getByText('2')).toBeInTheDocument();

    // Open and see both requests
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const requests = screen.getAllByText(/requested to be friends/i);
    expect(requests).toHaveLength(2);

    // Close (this clears notifications in the component)
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    // Reopen: notifications are gone; empty state shows and badge disappears
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText(/you have no new notifications/i)).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });
});
