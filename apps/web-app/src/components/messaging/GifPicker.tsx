/**
 * GIF Picker Component
 * Allows users to search and select GIFs from Giphy/Tenor
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Custom debounce hook to avoid lodash dependency
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debouncedFn = ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T;

    return debouncedFn;
  }, [delay]);
}

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title: string;
}

interface GifPickerProps {
  onSelect: (gif: Gif) => void;
  onClose: () => void;
  isOpen: boolean;
}

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY || 'demo';
const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs';

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose, isOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch trending GIFs on mount
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      fetchTrendingGifs();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${GIPHY_ENDPOINT}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13`
      );
      const data = await response.json();
      setGifs(mapGiphyResponse(data.data));
    } catch (err) {
      setError('Failed to load GIFs');
      console.error('GIF fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${GIPHY_ENDPOINT}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`
      );
      const data = await response.json();
      setGifs(mapGiphyResponse(data.data));
    } catch (err) {
      setError('Failed to search GIFs');
      console.error('GIF search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapGiphyResponse = (data: any[]): Gif[] => {
    return data.map((item) => ({
      id: item.id,
      url: item.images.original.url,
      previewUrl: item.images.fixed_height_small.url || item.images.preview_gif.url,
      width: parseInt(item.images.original.width),
      height: parseInt(item.images.original.height),
      title: item.title,
    }));
  };

  // Debounced search using custom hook
  const debouncedSearch = useDebounce((query: string) => searchGifs(query), 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleGifSelect = (gif: Gif) => {
    onSelect(gif);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search GIFs..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            autoFocus
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* GIF Grid */}
      <div className="h-64 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleGifSelect(gif)}
                className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-500 transition-all"
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">Powered by GIPHY</span>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>
    </div>
  );
};

export default GifPicker;
