import { createContext, useContext, useState, useEffect } from 'react';

declare global {
  interface Window {
    gapi: any;
  }
}

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

interface GoogleAuthContextType {
  isSignedIn: boolean;
  isInitialized: boolean;
  signIn: () => Promise<void>;
  signInAndExecute: (action: () => void) => Promise<void>;
  signOut: () => Promise<void>;
  addEventsToCalendar: (events: CalendarEvent[]) => Promise<void>;
  listUpcomingEvents: () => Promise<any[]>;
  selectedCalendarId: string;
}

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  console.log('GoogleAuthProvider rendering');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true); // Set to true to avoid blocking
  const [selectedCalendarId] = useState('primary');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const initializeGoogleAPI = async () => {
      // Skip Google API initialization for now - not required for the app to function
      console.log('Google API initialization skipped - configure API keys in production');
      // Note: Users will need to configure their own Google API credentials
    };

    initializeGoogleAPI();
  }, []);

  const signIn = async () => {
    throw new Error('Google Calendar integration requires API configuration. Please configure your Google API credentials.');
  };

  const signInAndExecute = async (action: () => void) => {
    if (isSignedIn) {
      action();
    } else {
      setPendingAction(() => action);
      await signIn();
    }
  };

  const signOut = async () => {
    console.log('Sign out requested');
  };

  const addEventsToCalendar = async (events: CalendarEvent[]): Promise<void> => {
    console.log('Would add events to calendar:', events);
    throw new Error('Google Calendar integration requires API configuration. Please configure your Google API credentials in production.');
  };

  const listUpcomingEvents = async () => {
    return [];
  };

  const value = {
    isSignedIn,
    isInitialized,
    signIn,
    signInAndExecute,
    signOut,
    addEventsToCalendar,
    listUpcomingEvents,
    selectedCalendarId,
  };

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

export function useGoogleAuth() {
  const context = useContext(GoogleAuthContext);
  console.log('useGoogleAuth called, context:', context ? 'exists' : 'undefined');
  if (context === undefined) {
    console.error('GoogleAuthContext is undefined - provider not found in tree');
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
}
