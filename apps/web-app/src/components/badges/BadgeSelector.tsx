import React, { useState, useEffect } from 'react';
import { Check, X, Search } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category?: string;
  description?: string;
  display_order?: number;
}

interface BadgeSelectorProps {
  type: 'interest' | 'intention';
  availableBadges: Badge[];
  selectedBadges: Badge[];
  onSelect: (badges: Badge[]) => void;
  maxSelections?: number;
  searchable?: boolean;
  categorized?: boolean;
  className?: string;
}

const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  type,
  availableBadges,
  selectedBadges,
  onSelect,
  maxSelections = type === 'interest' ? 20 : 2,
  searchable = true,
  categorized = type === 'interest',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBadges, setFilteredBadges] = useState<Badge[]>(availableBadges);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    let filtered = availableBadges;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((badge) =>
        badge.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory && categorized) {
      filtered = filtered.filter((badge) => badge.category === selectedCategory);
    }

    setFilteredBadges(filtered);
  }, [searchQuery, selectedCategory, availableBadges, categorized]);

  const handleToggleBadge = (badge: Badge) => {
    const isSelected = selectedBadges.some((b) => b.id === badge.id);

    if (isSelected) {
      // Deselect
      onSelect(selectedBadges.filter((b) => b.id !== badge.id));
    } else {
      // Select (if not at max)
      if (selectedBadges.length < maxSelections) {
        onSelect([...selectedBadges, badge]);
      }
    }
  };

  const categories = categorized
    ? Array.from(new Set(availableBadges.map((b) => b.category).filter((c): c is string => Boolean(c))))
    : [];

  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {type === 'interest' ? 'Select Your Interests' : 'Select Your Intentions'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedBadges.length}/{maxSelections} selected
          </p>
        </div>
      </div>

      {/* Search Bar */}
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${type === 'interest' ? 'interests' : 'intentions'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Category Filter */}
      {categorized && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors
              ${
                !selectedCategory
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors
                ${
                  selectedCategory === category
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {formatCategoryName(category)}
            </button>
          ))}
        </div>
      )}

      {/* Badge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
        {filteredBadges.map((badge) => {
          const isSelected = selectedBadges.some((b) => b.id === badge.id);
          const canSelect = selectedBadges.length < maxSelections || isSelected;

          return (
            <button
              key={badge.id}
              onClick={() => handleToggleBadge(badge)}
              disabled={!canSelect}
              className={`
                relative p-3 rounded-lg border-2 text-left transition-all
                ${
                  isSelected
                    ? type === 'interest'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                    : canSelect
                    ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                }
                ${canSelect ? 'hover:shadow-md' : ''}
              `}
              title={badge.description || badge.name}
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {badge.name}
                </span>
                {isSelected && (
                  <Check
                    className={`w-4 h-4 ${
                      type === 'interest' ? 'text-purple-500' : 'text-pink-500'
                    }`}
                  />
                )}
              </div>
              {badge.description && type === 'intention' && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {badge.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No {type === 'interest' ? 'interests' : 'intentions'} found
        </div>
      )}

      {/* Helper Text */}
      {type === 'intention' && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Select up to {maxSelections} relationship intentions that best describe what you're
          looking for
        </p>
      )}
    </div>
  );
};

export default BadgeSelector;
