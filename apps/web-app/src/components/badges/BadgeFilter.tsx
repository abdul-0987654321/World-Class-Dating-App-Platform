import React, { useState } from 'react';
import { Filter, X, Check } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category?: string;
}

interface BadgeFilterProps {
  type: 'interest' | 'intention';
  availableBadges: Badge[];
  selectedBadges: string[];
  onFilterChange: (badgeIds: string[]) => void;
  className?: string;
}

const BadgeFilter: React.FC<BadgeFilterProps> = ({
  type,
  availableBadges,
  selectedBadges,
  onFilterChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleBadge = (badgeId: string) => {
    if (selectedBadges.includes(badgeId)) {
      onFilterChange(selectedBadges.filter((id) => id !== badgeId));
    } else {
      onFilterChange([...selectedBadges, badgeId]);
    }
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const selectedCount = selectedBadges.length;

  return (
    <div className={`relative ${className}`}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-colors
          ${
            selectedCount > 0
              ? type === 'interest'
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-pink-500 text-white hover:bg-pink-600'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        <span>
          {type === 'interest' ? 'Interests' : 'Intentions'}
          {selectedCount > 0 && ` (${selectedCount})`}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Filter by {type === 'interest' ? 'Interests' : 'Intentions'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badge List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {availableBadges.map((badge) => {
                const isSelected = selectedBadges.includes(badge.id);

                return (
                  <button
                    key={badge.id}
                    onClick={() => handleToggleBadge(badge.id)}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-lg
                      transition-colors text-left
                      ${
                        isSelected
                          ? type === 'interest'
                            ? 'bg-purple-50 dark:bg-purple-900/20'
                            : 'bg-pink-50 dark:bg-pink-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }
                    `}
                  >
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
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            {selectedCount > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleClearAll}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                           bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600
                           transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BadgeFilter;
