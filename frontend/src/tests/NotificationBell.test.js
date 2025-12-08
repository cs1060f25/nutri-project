import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../components/NotificationBell';
import { getFriendRequests, getNotifications } from '../services/socialService';

jest.mock('../services/socialService', () => ({
  getFriendRequests: jest.fn(),
  getNotifications: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    isAuthenticated: true,
    user: { uid: 'user-123' },
  }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    getFriendRequests.mockResolvedValue({
      requests: [
        {
          id: 'req-001',
          fromUserName: 'Alex Chen',
          createdAt: '2025-11-26T18:42:00Z',
          status: 'pending',
          toUserId: 'user-123',
        },
        {
          id: 'req-002',
          fromUserName: 'Priya Patel',
          createdAt: '2025-11-27T14:10:00Z',
          status: 'pending',
          toUserId: 'user-123',
        },
      ],
    });
    getNotifications.mockResolvedValue({
      notifications: [],
    });
  });

  it('allows marking individual notifications as read/unread and keeps history', async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    // Badge shows count once data loads (without clicking)
    expect(await screen.findByText('2')).toBeInTheDocument();

    // Open and view friend requests
    await user.click(screen.getByRole('button', { name: /notifications/i }));
    const newRequests = await screen.findAllByText(/requested to be friends/i);
    expect(newRequests).toHaveLength(2);

    // Mark first notification as read individually
    const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
    await user.click(markReadButtons[0]);

    // One new remains, one moves to history
    await waitFor(() => {
      expect(screen.getAllByText(/requested to be friends/i)).toHaveLength(2);
      expect(screen.getAllByText(/mark as read/i)).toHaveLength(1);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Mark the remaining as read
    await user.click(screen.getByRole('button', { name: /mark all as read/i }));
    await waitFor(() => {
      expect(screen.getByText(/you have no new notifications/i)).toBeInTheDocument();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    // Move one back to unread
    await user.click(screen.getAllByRole('button', { name: /mark as unread/i })[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/mark as read/i)).toHaveLength(1);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
