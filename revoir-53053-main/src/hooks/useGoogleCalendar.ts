import { useState, useCallback } from 'react';
import { toast } from 'sonner';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const connect = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google Calendar is not configured. Please set up VITE_GOOGLE_CLIENT_ID.');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      // Use Google OAuth 2.0 implicit flow
      const redirectUri = window.location.origin;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('prompt', 'consent');

      // Open popup for OAuth
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl.toString(),
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        resolve(false);
        return;
      }

      // Listen for the OAuth callback
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'google-oauth-success') {
          setAccessToken(event.data.accessToken);
          setIsConnected(true);
          toast.success('Connected to Google Calendar!');
          window.removeEventListener('message', handleMessage);
          resolve(true);
        } else if (event.data.type === 'google-oauth-error') {
          toast.error('Failed to connect to Google Calendar');
          window.removeEventListener('message', handleMessage);
          resolve(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Poll for popup close or token in URL
      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            window.removeEventListener('message', handleMessage);
            resolve(false);
          }
          
          // Check if we can access the popup location
          const popupUrl = popup.location.href;
          if (popupUrl.includes('access_token=')) {
            const hash = popupUrl.split('#')[1];
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            
            if (token) {
              setAccessToken(token);
              setIsConnected(true);
              popup.close();
              clearInterval(interval);
              window.removeEventListener('message', handleMessage);
              toast.success('Connected to Google Calendar!');
              resolve(true);
            }
          }
        } catch (e) {
          // Cross-origin error, popup is on Google's domain
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(interval);
        window.removeEventListener('message', handleMessage);
        if (popup && !popup.closed) {
          popup.close();
        }
        resolve(false);
      }, 300000);
    });
  }, []);

  const disconnect = useCallback(() => {
    setAccessToken(null);
    setIsConnected(false);
    toast.info('Disconnected from Google Calendar');
  }, []);

  const addEvents = useCallback(async (events: CalendarEvent[]): Promise<boolean> => {
    if (!accessToken) {
      toast.error('Not connected to Google Calendar');
      return false;
    }

    setIsLoading(true);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const event of events) {
        try {
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error('Failed to add event:', await response.text());
          }
        } catch (e) {
          failCount++;
          console.error('Error adding event:', e);
        }
      }

      if (failCount === 0) {
        toast.success(`Added ${successCount} events to Google Calendar!`);
        return true;
      } else if (successCount > 0) {
        toast.warning(`Added ${successCount} events, but ${failCount} failed`);
        return true;
      } else {
        toast.error('Failed to add events to Google Calendar');
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  return {
    isConnected,
    isLoading,
    connect,
    disconnect,
    addEvents,
  };
}
