import React from 'react';
import { ReportCategoryInfo } from '../../services/report.service';

interface ReportCategorySelectorProps {
  categories: ReportCategoryInfo[];
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
}

export const ReportCategorySelector: React.FC<ReportCategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#fbbf24';
      default:
        return '#6b7280';
    }
  };

  const getCategoryIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      inappropriate_photos: '📷',
      inappropriate_messages: '💬',
      fake_profile: '🎭',
      spam: '📧',
      harassment: '⚠️',
      underage: '🔞',
      scam: '💰',
      violence: '⚡',
      hate_speech: '🚫',
      other: '❓',
    };
    return iconMap[type] || '📝';
  };

  return (
    <div className="report-category-selector">
      <h3 className="selector-title">What's the issue?</h3>
      <p className="selector-description">Select the category that best describes the problem</p>

      <div className="categories-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-card ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => onSelectCategory(category.id)}
            style={
              {
                '--severity-color': getSeverityColor(category.severity),
              } as React.CSSProperties
            }
          >
            <div className="category-icon">{getCategoryIcon(category.id)}</div>
            <div className="category-content">
              <h4 className="category-name">{category.label}</h4>
              <p className="category-description">{category.description}</p>
            </div>
            {selectedCategory === category.id && (
              <div className="selected-indicator">✓</div>
            )}
          </button>
        ))}
      </div>

      <style>{`
        .report-category-selector {
          margin-bottom: 1.5rem;
        }

        .selector-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .selector-description {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0 0 1.5rem 0;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .category-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .category-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--severity-color);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .category-card:hover {
          border-color: var(--severity-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .category-card:hover::before {
          opacity: 1;
        }

        .category-card.selected {
          border-color: var(--severity-color);
          background: linear-gradient(135deg, white 0%, rgba(239, 68, 68, 0.05) 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        }

        .category-card.selected::before {
          opacity: 1;
        }

        .category-icon {
          font-size: 2rem;
          flex-shrink: 0;
          line-height: 1;
        }

        .category-content {
          flex: 1;
        }

        .category-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .category-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .selected-indicator {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          width: 28px;
          height: 28px;
          background: var(--severity-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.875rem;
        }

        @media (max-width: 768px) {
          .categories-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
