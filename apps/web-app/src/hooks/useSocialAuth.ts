import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface GoogleTokenPayload {
  code?: string;
  id_token?: string;
  access_token?: string;
}

interface AppleTokenPayload {
  code: string;
  id_token: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

interface FacebookTokenPayload {
  access_token: string;
}

interface SocialAuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  needsProfileSetup: boolean;
}

export const useSocialAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async (payload: GoogleTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/auth/google`, payload);

      if (response.data.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data.data;

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.data.message || 'Google login failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Google login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithApple = async (payload: AppleTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/auth/apple`, payload);

      if (response.data.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data.data;

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.data.message || 'Apple login failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Apple login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithFacebook = async (payload: FacebookTokenPayload): Promise<SocialAuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/auth/facebook`, payload);

      if (response.data.success) {
        const { user, accessToken, refreshToken, isNewUser, needsProfileSetup } = response.data.data;

        // Store tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken, isNewUser, needsProfileSetup };
      } else {
        throw new Error(response.data.message || 'Facebook login failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Facebook login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const linkSocialAccount = async (
    provider: 'google' | 'apple' | 'facebook',
    token: GoogleTokenPayload | AppleTokenPayload | FacebookTokenPayload
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_URL}/api/auth/social/link`,
        { provider, token },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to link account');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to link account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unlinkSocialAccount = async (provider: 'google' | 'apple' | 'facebook'): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_URL}/api/auth/social/unlink`,
        { provider },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to unlink account');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to unlink account';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLinkedAccounts = async (): Promise<any[]> => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/api/auth/social/linked`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get linked accounts');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to get linked accounts';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loginWithGoogle,
    loginWithApple,
    loginWithFacebook,
    linkSocialAccount,
    unlinkSocialAccount,
    getLinkedAccounts,
    loading,
    error,
  };
};
