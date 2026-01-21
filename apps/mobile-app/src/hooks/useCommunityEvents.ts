/**
 * useCommunityEvents Hook
 * Manages community events, RSVPs, and event creation
 */

import { useState, useCallback, useEffect } from 'react';
import { httpClient } from '../services/api/httpClient';

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  endDate?: string;
  time: string;
  location: {
    name: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  isVirtual: boolean;
  virtualLink?: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  isBookmarked: boolean;
  price: number;
  currency: string;
  host: {
    id: string;
    name: string;
    photoUrl: string;
  };
  category: string;
  tags?: string[];
  createdAt: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export interface EventAttendee {
  id: string;
  name: string;
  photoUrl: string;
  rsvpStatus: 'going' | 'maybe' | 'not_going';
  rsvpDate: string;
}

export interface CreateEventInput {
  communityId: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  endDate?: string;
  time: string;
  location: {
    name: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  isVirtual: boolean;
  virtualLink?: string;
  maxAttendees?: number;
  price?: number;
  currency?: string;
  category?: string;
  tags?: string[];
}

interface CommunityEventsState {
  events: CommunityEvent[];
  upcomingEvents: CommunityEvent[];
  myEvents: CommunityEvent[];
  selectedEvent: CommunityEvent | null;
  eventAttendees: EventAttendee[];
  loading: boolean;
  eventsLoading: boolean;
  attendeesLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

interface UseCommunityEventsReturn extends CommunityEventsState {
  fetchEvents: (communityId?: string, reset?: boolean) => Promise<void>;
  fetchUpcomingEvents: () => Promise<void>;
  fetchMyEvents: () => Promise<void>;
  fetchEventDetail: (eventId: string) => Promise<void>;
  fetchEventAttendees: (eventId: string) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<boolean>;
  updateEvent: (eventId: string, updates: Partial<CreateEventInput>) => Promise<boolean>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  cancelEvent: (eventId: string, reason?: string) => Promise<boolean>;
  rsvpEvent: (eventId: string, status: 'going' | 'maybe' | 'not_going') => Promise<boolean>;
  bookmarkEvent: (eventId: string) => Promise<boolean>;
  shareEvent: (eventId: string) => Promise<{ shareUrl: string } | null>;
  refreshEvents: (communityId?: string) => Promise<void>;
}

const DEFAULT_EVENTS: CommunityEvent[] = [
  {
    id: '1',
    communityId: '1',
    title: 'Travel Meetup - NYC',
    description:
      'Meet fellow travelers in Central Park. Share stories, exchange tips, and maybe find your next travel buddy!',
    imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=400',
    date: '2025-12-01T14:00:00Z',
    time: '2:00 PM',
    location: {
      name: 'Central Park',
      address: 'Central Park West',
      city: 'New York, NY',
      latitude: 40.785091,
      longitude: -73.968285,
    },
    isVirtual: false,
    attendees: 45,
    maxAttendees: 100,
    isAttending: true,
    isBookmarked: false,
    price: 0,
    currency: 'USD',
    host: { id: 'h1', name: 'Travel Lovers', photoUrl: '' },
    category: 'meetup',
    tags: ['travel', 'networking', 'outdoor'],
    createdAt: '2024-11-01T00:00:00Z',
    status: 'upcoming',
  },
  {
    id: '2',
    communityId: '2',
    title: 'Foodie Crawl - Brooklyn',
    description:
      'Explore the best eateries in Brooklyn! We will visit 5 amazing spots and sample local favorites.',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    date: '2025-12-05T18:00:00Z',
    time: '6:00 PM',
    location: {
      name: 'Smorgasburg',
      address: 'East River State Park',
      city: 'Brooklyn, NY',
    },
    isVirtual: false,
    attendees: 28,
    maxAttendees: 40,
    isAttending: false,
    isBookmarked: true,
    price: 25,
    currency: 'USD',
    host: { id: 'h2', name: 'Foodies Unite', photoUrl: '' },
    category: 'food-tour',
    tags: ['food', 'brooklyn', 'walking-tour'],
    createdAt: '2024-11-05T00:00:00Z',
    status: 'upcoming',
  },
  {
    id: '3',
    communityId: '8',
    title: 'Group Hike - Bear Mountain',
    description:
      'Weekend hiking adventure at Bear Mountain State Park. Moderate difficulty, stunning views!',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    date: '2025-12-08T08:00:00Z',
    time: '8:00 AM',
    location: {
      name: 'Bear Mountain State Park',
      address: 'Bear Mountain',
      city: 'NY',
    },
    isVirtual: false,
    attendees: 15,
    maxAttendees: 25,
    isAttending: false,
    isBookmarked: false,
    price: 10,
    currency: 'USD',
    host: { id: 'h8', name: 'Outdoor Adventures', photoUrl: '' },
    category: 'outdoor',
    tags: ['hiking', 'nature', 'fitness'],
    createdAt: '2024-11-10T00:00:00Z',
    status: 'upcoming',
  },
  {
    id: '4',
    communityId: '4',
    title: 'Book Club Meeting',
    description:
      'Discussing "The Midnight Library" by Matt Haig. Join us for an engaging discussion!',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    date: '2025-12-10T19:00:00Z',
    time: '7:00 PM',
    location: {
      name: 'Virtual',
      address: 'Zoom',
      city: 'Online',
    },
    isVirtual: true,
    virtualLink: 'https://zoom.us/j/123456789',
    attendees: 32,
    maxAttendees: 50,
    isAttending: true,
    isBookmarked: true,
    price: 0,
    currency: 'USD',
    host: { id: 'h4', name: 'Book Club', photoUrl: '' },
    category: 'book-club',
    tags: ['books', 'discussion', 'virtual'],
    createdAt: '2024-11-15T00:00:00Z',
    status: 'upcoming',
  },
];

const DEFAULT_ATTENDEES: EventAttendee[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
    rsvpStatus: 'going',
    rsvpDate: '2024-11-20T00:00:00Z',
  },
  {
    id: '2',
    name: 'Mike Chen',
    photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    rsvpStatus: 'going',
    rsvpDate: '2024-11-21T00:00:00Z',
  },
  {
    id: '3',
    name: 'Emma Wilson',
    photoUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
    rsvpStatus: 'maybe',
    rsvpDate: '2024-11-22T00:00:00Z',
  },
  {
    id: '4',
    name: 'James Brown',
    photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg',
    rsvpStatus: 'going',
    rsvpDate: '2024-11-23T00:00:00Z',
  },
];

export function useCommunityEvents(communityId?: string): UseCommunityEventsReturn {
  const [state, setState] = useState<CommunityEventsState>({
    events: [],
    upcomingEvents: [],
    myEvents: [],
    selectedEvent: null,
    eventAttendees: [],
    loading: true,
    eventsLoading: false,
    attendeesLoading: false,
    error: null,
    hasMore: true,
    page: 1,
  });

  const fetchEvents = useCallback(
    async (commId?: string, reset = false) => {
      const currentPage = reset ? 1 : state.page;
      const targetCommunityId = commId || communityId;

      if (!reset && state.eventsLoading) return;

      setState((prev) => ({
        ...prev,
        eventsLoading: true,
        error: null,
        page: currentPage,
      }));

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        });

        if (targetCommunityId) {
          params.append('communityId', targetCommunityId);
        }

        const response = await httpClient.get<{
          events: CommunityEvent[];
          hasMore: boolean;
        }>(`/api/communities/events?${params.toString()}`);

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            events: reset ? response.data!.events : [...prev.events, ...response.data!.events],
            hasMore: response.data!.hasMore,
            eventsLoading: false,
            page: currentPage + 1,
          }));
        } else {
          const filteredEvents = targetCommunityId
            ? DEFAULT_EVENTS.filter((e) => e.communityId === targetCommunityId)
            : DEFAULT_EVENTS;
          setState((prev) => ({
            ...prev,
            events: filteredEvents,
            hasMore: false,
            eventsLoading: false,
          }));
        }
      } catch (error: any) {
        console.error('Error fetching events:', error);
        const filteredEvents = targetCommunityId
          ? DEFAULT_EVENTS.filter((e) => e.communityId === targetCommunityId)
          : DEFAULT_EVENTS;
        setState((prev) => ({
          ...prev,
          events: filteredEvents,
          eventsLoading: false,
          error: error.message || 'Failed to fetch events',
          hasMore: false,
        }));
      }
    },
    [communityId, state.page, state.eventsLoading]
  );

  const fetchUpcomingEvents = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await httpClient.get<{ events: CommunityEvent[] }>(
        '/api/communities/events/upcoming'
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          upcomingEvents: response.data!.events,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          upcomingEvents: DEFAULT_EVENTS.filter((e) => e.status === 'upcoming'),
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      setState((prev) => ({
        ...prev,
        upcomingEvents: DEFAULT_EVENTS.filter((e) => e.status === 'upcoming'),
        loading: false,
      }));
    }
  }, []);

  const fetchMyEvents = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await httpClient.get<{ events: CommunityEvent[] }>(
        '/api/communities/events/my'
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          myEvents: response.data!.events,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          myEvents: DEFAULT_EVENTS.filter((e) => e.isAttending),
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching my events:', error);
      setState((prev) => ({
        ...prev,
        myEvents: DEFAULT_EVENTS.filter((e) => e.isAttending),
        loading: false,
      }));
    }
  }, []);

  const fetchEventDetail = useCallback(async (eventId: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await httpClient.get<{ event: CommunityEvent }>(
        `/api/communities/events/${eventId}`
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          selectedEvent: response.data!.event,
          loading: false,
        }));
      } else {
        const event = DEFAULT_EVENTS.find((e) => e.id === eventId) || null;
        setState((prev) => ({
          ...prev,
          selectedEvent: event,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching event detail:', error);
      const event = DEFAULT_EVENTS.find((e) => e.id === eventId) || null;
      setState((prev) => ({
        ...prev,
        selectedEvent: event,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  const fetchEventAttendees = useCallback(async (eventId: string) => {
    setState((prev) => ({ ...prev, attendeesLoading: true }));

    try {
      const response = await httpClient.get<{ attendees: EventAttendee[] }>(
        `/api/communities/events/${eventId}/attendees`
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          eventAttendees: response.data!.attendees,
          attendeesLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          eventAttendees: DEFAULT_ATTENDEES,
          attendeesLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching event attendees:', error);
      setState((prev) => ({
        ...prev,
        eventAttendees: DEFAULT_ATTENDEES,
        attendeesLoading: false,
      }));
    }
  }, []);

  const createEvent = useCallback(async (input: CreateEventInput): Promise<boolean> => {
    try {
      const response = await httpClient.post<{ event: CommunityEvent }>(
        '/api/communities/events',
        input
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          events: [response.data!.event, ...prev.events],
          myEvents: [response.data!.event, ...prev.myEvents],
        }));
        return true;
      }

      // Optimistic update for demo
      const newEvent: CommunityEvent = {
        id: Date.now().toString(),
        ...input,
        attendees: 1,
        maxAttendees: input.maxAttendees || 50,
        isAttending: true,
        isBookmarked: false,
        price: input.price || 0,
        currency: input.currency || 'USD',
        host: { id: 'me', name: 'You', photoUrl: '' },
        category: input.category || 'general',
        tags: input.tags || [],
        createdAt: new Date().toISOString(),
        status: 'upcoming',
      };
      setState((prev) => ({
        ...prev,
        events: [newEvent, ...prev.events],
        myEvents: [newEvent, ...prev.myEvents],
      }));
      return true;
    } catch (error) {
      console.error('Error creating event:', error);
      return false;
    }
  }, []);

  const updateEvent = useCallback(
    async (eventId: string, updates: Partial<CreateEventInput>): Promise<boolean> => {
      try {
        const response = await httpClient.patch(`/api/communities/events/${eventId}`, updates);

        if (response.success) {
          setState((prev) => ({
            ...prev,
            events: prev.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
            selectedEvent:
              prev.selectedEvent?.id === eventId
                ? { ...prev.selectedEvent, ...updates }
                : prev.selectedEvent,
          }));
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error updating event:', error);
        return false;
      }
    },
    []
  );

  const deleteEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      await httpClient.delete(`/api/communities/events/${eventId}`);
      setState((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== eventId),
        myEvents: prev.myEvents.filter((e) => e.id !== eventId),
        selectedEvent: prev.selectedEvent?.id === eventId ? null : prev.selectedEvent,
      }));
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      // Optimistic update
      setState((prev) => ({
        ...prev,
        events: prev.events.filter((e) => e.id !== eventId),
        myEvents: prev.myEvents.filter((e) => e.id !== eventId),
      }));
      return true;
    }
  }, []);

  const cancelEvent = useCallback(async (eventId: string, reason?: string): Promise<boolean> => {
    try {
      await httpClient.post(`/api/communities/events/${eventId}/cancel`, { reason });
      setState((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, status: 'cancelled' as const } : e
        ),
        selectedEvent:
          prev.selectedEvent?.id === eventId
            ? { ...prev.selectedEvent, status: 'cancelled' as const }
            : prev.selectedEvent,
      }));
      return true;
    } catch (error) {
      console.error('Error cancelling event:', error);
      return false;
    }
  }, []);

  const rsvpEvent = useCallback(
    async (eventId: string, status: 'going' | 'maybe' | 'not_going'): Promise<boolean> => {
      try {
        await httpClient.post(`/api/communities/events/${eventId}/rsvp`, { status });

        const isAttending = status === 'going' || status === 'maybe';
        const attendeeDelta = status === 'going' ? 1 : status === 'not_going' ? -1 : 0;

        setState((prev) => {
          const updatedEvents = prev.events.map((e) => {
            if (e.id !== eventId) return e;
            const wasAttending = e.isAttending;
            const newAttendees = wasAttending
              ? e.attendees + attendeeDelta - 1
              : e.attendees + attendeeDelta + (isAttending ? 1 : 0);
            return {
              ...e,
              isAttending,
              attendees: Math.max(0, newAttendees),
            };
          });

          return {
            ...prev,
            events: updatedEvents,
            myEvents: isAttending
              ? [
                  ...prev.myEvents,
                  ...updatedEvents.filter(
                    (e) => e.id === eventId && !prev.myEvents.find((m) => m.id === eventId)
                  ),
                ]
              : prev.myEvents.filter((e) => e.id !== eventId),
            selectedEvent:
              prev.selectedEvent?.id === eventId
                ? {
                    ...prev.selectedEvent,
                    isAttending,
                    attendees: Math.max(0, prev.selectedEvent.attendees + attendeeDelta),
                  }
                : prev.selectedEvent,
          };
        });
        return true;
      } catch (error) {
        // Optimistic update for demo
        const isAttending = status === 'going' || status === 'maybe';
        setState((prev) => ({
          ...prev,
          events: prev.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  isAttending,
                  attendees: isAttending ? e.attendees + 1 : Math.max(0, e.attendees - 1),
                }
              : e
          ),
        }));
        return true;
      }
    },
    []
  );

  const bookmarkEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      await httpClient.post(`/api/communities/events/${eventId}/bookmark`);
      setState((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, isBookmarked: !e.isBookmarked } : e
        ),
        selectedEvent:
          prev.selectedEvent?.id === eventId
            ? { ...prev.selectedEvent, isBookmarked: !prev.selectedEvent.isBookmarked }
            : prev.selectedEvent,
      }));
      return true;
    } catch (error) {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, isBookmarked: !e.isBookmarked } : e
        ),
      }));
      return true;
    }
  }, []);

  const shareEvent = useCallback(async (eventId: string): Promise<{ shareUrl: string } | null> => {
    try {
      const response = await httpClient.post<{ shareUrl: string }>(
        `/api/communities/events/${eventId}/share`
      );

      if (response.success && response.data) {
        return response.data;
      }

      // Return a mock share URL
      return { shareUrl: `https://flamoral.app/events/${eventId}` };
    } catch (error) {
      console.error('Error sharing event:', error);
      return { shareUrl: `https://flamoral.app/events/${eventId}` };
    }
  }, []);

  const refreshEvents = useCallback(
    async (commId?: string) => {
      setState((prev) => ({ ...prev, loading: true }));
      await Promise.all([fetchEvents(commId, true), fetchUpcomingEvents(), fetchMyEvents()]);
      setState((prev) => ({ ...prev, loading: false }));
    },
    [fetchEvents, fetchUpcomingEvents, fetchMyEvents]
  );

  // Initial fetch
  useEffect(() => {
    fetchEvents(communityId, true);
    fetchUpcomingEvents();
    fetchMyEvents();
  }, [communityId]);

  return {
    ...state,
    fetchEvents,
    fetchUpcomingEvents,
    fetchMyEvents,
    fetchEventDetail,
    fetchEventAttendees,
    createEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    rsvpEvent,
    bookmarkEvent,
    shareEvent,
    refreshEvents,
  };
}

export default useCommunityEvents;
