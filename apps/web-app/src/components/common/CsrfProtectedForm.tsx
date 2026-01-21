import React, { FormEvent, ReactNode } from 'react';
import { useCsrfToken } from '../../hooks/useCsrfToken';

/**
 * CSRF-Protected Form Component
 *
 * Automatically includes CSRF token in form submissions
 * Use this component instead of regular <form> for state-changing operations
 *
 * @example
 * ```tsx
 * <CsrfProtectedForm onSubmit={handleSubmit}>
 *   <input name="username" />
 *   <input name="email" />
 *   <button type="submit">Submit</button>
 * </CsrfProtectedForm>
 * ```
 */

interface CsrfProtectedFormProps {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  className?: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  action?: string;
  encType?: string;
  autoComplete?: string;
  id?: string;
}

export function CsrfProtectedForm({
  children,
  onSubmit,
  className,
  method = 'POST',
  action,
  encType,
  autoComplete,
  id,
}: CsrfProtectedFormProps) {
  const { token, loading, error } = useCsrfToken();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // If token is still loading, prevent submission
    if (loading) {
      event.preventDefault();
      console.warn('CSRF token is still loading, please try again');
      return;
    }

    // If there's an error fetching token, prevent submission
    if (error) {
      event.preventDefault();
      console.error('Failed to get CSRF token:', error);
      alert('Security token unavailable. Please refresh the page and try again.');
      return;
    }

    // Call the provided onSubmit handler
    if (onSubmit) {
      await onSubmit(event);
    }
  };

  return (
    <form
      id={id}
      className={className}
      onSubmit={handleSubmit}
      method={method}
      action={action}
      encType={encType}
      autoComplete={autoComplete}
    >
      {/* Hidden CSRF token field */}
      {token && <input type="hidden" name="_csrf" value={token} readOnly />}

      {/* Display loading or error state if needed */}
      {loading && (
        <div style={{ display: 'none' }} aria-hidden="true">
          Loading security token...
        </div>
      )}

      {error && (
        <div style={{ display: 'none' }} aria-hidden="true">
          Error loading security token: {error.message}
        </div>
      )}

      {children}
    </form>
  );
}

/**
 * CSRF Token Input Component
 *
 * Standalone component for adding CSRF token to existing forms
 * Use when you can't use CsrfProtectedForm wrapper
 *
 * @example
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <CsrfTokenInput />
 *   <input name="username" />
 *   <button type="submit">Submit</button>
 * </form>
 * ```
 */
export function CsrfTokenInput() {
  const { token, loading, error } = useCsrfToken();

  if (loading || error || !token) {
    return null;
  }

  return <input type="hidden" name="_csrf" value={token} readOnly />;
}

export default CsrfProtectedForm;
