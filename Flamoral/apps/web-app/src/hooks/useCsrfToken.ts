import { useState, useEffect } from 'react';
import csrfService from '../services/csrf.service';

/**
 * React hook for managing CSRF tokens
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { token, loading, error, refresh } = useCsrfToken();
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     // Token is automatically included in API calls
 *     // Or manually add it to forms:
 *     const formData = new FormData(e.target);
 *     formData.append('_csrf', token);
 *     // ... submit
 *   };
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useCsrfToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);
      const newToken = await csrfService.getToken();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch CSRF token'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const newToken = await csrfService.refreshToken();
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh CSRF token'));
    } finally {
      setLoading(false);
    }
  };

  return {
    token,
    loading,
    error,
    refresh,
  };
}

/**
 * React hook for getting CSRF token header
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const csrfHeader = useCsrfHeader();
 *
 *   const makeRequest = async () => {
 *     await fetch('/api/endpoint', {
 *       method: 'POST',
 *       headers: {
 *         ...csrfHeader,
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify(data),
 *     });
 *   };
 * }
 * ```
 */
export function useCsrfHeader() {
  const { token } = useCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

/**
 * React hook for verifying CSRF token
 */
export function useCsrfVerification() {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);

  const verify = async () => {
    try {
      setVerifying(true);
      const valid = await csrfService.verifyToken();
      setIsValid(valid);
      return valid;
    } catch (error) {
      setIsValid(false);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  return {
    isValid,
    verifying,
    verify,
  };
}

export default useCsrfToken;
