import React, { useEffect, useState } from 'react';
import { useSocialAuth } from '../../hooks/useSocialAuth';

interface LinkedAccount {
  id: string;
  provider: 'google' | 'apple' | 'facebook';
  provider_email?: string;
  provider_name?: string;
  is_primary: boolean;
  created_at: string;
}

const LinkedAccountsSettings: React.FC = () => {
  const { getLinkedAccounts, unlinkSocialAccount, loading } = useSocialAuth();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const linkedAccounts = await getLinkedAccounts();
      setAccounts(linkedAccounts);
    } catch (err: any) {
      setError(err.message || 'Failed to load linked accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleUnlink = async (provider: 'google' | 'apple' | 'facebook') => {
    if (accounts.length === 1) {
      setError('Cannot unlink your only login method. Please add another login method first.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to unlink your ${provider} account? You will no longer be able to sign in with ${provider}.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      await unlinkSocialAccount(provider);
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to unlink account');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        );
      case 'apple':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        );
      case 'facebook':
        return (
          <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  if (loadingAccounts) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-charcoal-900 mb-4">Linked Accounts</h3>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flame-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-charcoal-900 mb-2">Linked Accounts</h3>
      <p className="text-sm text-charcoal-500 mb-6">
        Manage your connected social accounts for easy sign-in
      </p>

      {error && (
        <div className="mb-4 bg-flame-50 border border-flame-200 text-flame-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-charcoal-500 text-sm text-center py-4">
            No social accounts linked yet
          </p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 border border-charcoal-200 rounded-lg hover:border-charcoal-300 transition"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">{getProviderIcon(account.provider)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-charcoal-900">
                      {getProviderName(account.provider)}
                    </h4>
                    {account.is_primary && (
                      <span className="px-2 py-0.5 bg-flame-100 text-flame-700 text-xs rounded-full font-medium">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-charcoal-500">
                    {account.provider_email || account.provider_name || 'Connected'}
                  </p>
                  <p className="text-xs text-charcoal-400 mt-1">
                    Linked on {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleUnlink(account.provider)}
                disabled={loading || accounts.length === 1}
                className="px-4 py-2 text-sm font-medium text-flame-600 hover:bg-flame-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-charcoal-50 rounded-lg">
        <h4 className="text-sm font-medium text-charcoal-900 mb-2">About Linked Accounts</h4>
        <ul className="text-sm text-charcoal-600 space-y-1">
          <li>• Use linked accounts to sign in quickly without a password</li>
          <li>• You must have at least one login method (social account or password)</li>
          <li>• Your primary account is used for profile information sync</li>
        </ul>
      </div>
    </div>
  );
};

export default LinkedAccountsSettings;
