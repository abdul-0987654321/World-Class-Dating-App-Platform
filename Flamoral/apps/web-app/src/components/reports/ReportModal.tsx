import React, { useEffect, useState } from 'react';
import { ReportCategorySelector } from './ReportCategorySelector';
import {
  reportService,
  ReportCategory,
  ReportCategoryInfo,
} from '../../services/report.service';

interface ReportModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  userId,
  userName,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<ReportCategoryInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await reportService.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load report categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await reportService.createReport({
        reportedUserId: userId,
        category: selectedCategory,
        description: description.trim() || '',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit report:', err);
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report {userName}</h2>
          <button className="close-button" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-banner">
                <span>{error}</span>
                <button type="button" onClick={() => setError(null)}>×</button>
              </div>
            )}

            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                <strong>Before you report:</strong> Reporting is anonymous and helps keep our
                community safe. False reports may result in account restrictions.
              </div>
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <span>Loading categories...</span>
              </div>
            ) : (
              <>
                <ReportCategorySelector
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={(category) => setSelectedCategory(category as ReportCategory)}
                />

                <div className="description-section">
                  <label className="description-label">
                    Additional details (optional)
                    <span className="label-hint">Help us understand the issue better</span>
                  </label>
                  <textarea
                    className="description-textarea"
                    placeholder="Provide any additional context or details about this report..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <div className="char-count">
                    {description.length}/500 characters
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={!selectedCategory || submitting || loading}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        <style>{`
          .report-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
            overflow-y: auto;
          }

          .report-modal {
            background: white;
            border-radius: 16px;
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
            margin: auto;
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 2px solid #f3f4f6;
            flex-shrink: 0;
          }

          .modal-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
          }

          .close-button {
            background: none;
            border: none;
            font-size: 2rem;
            color: #9ca3af;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
          }

          .close-button:hover:not(:disabled) {
            background: #f3f4f6;
            color: #1f2937;
          }

          .close-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
          }

          .error-banner {
            background: #fee2e2;
            border: 2px solid #ef4444;
            color: #991b1b;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .error-banner button {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: #991b1b;
            cursor: pointer;
          }

          .warning-box {
            display: flex;
            gap: 1rem;
            padding: 1rem;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            margin-bottom: 1.5rem;
          }

          .warning-icon {
            font-size: 1.5rem;
            flex-shrink: 0;
          }

          .warning-text {
            font-size: 0.95rem;
            color: #78350f;
            line-height: 1.5;
          }

          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            gap: 1rem;
            color: #6b7280;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #8b5cf6;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .description-section {
            margin-top: 1.5rem;
          }

          .description-label {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.95rem;
            font-weight: 600;
            color: #4b5563;
            margin-bottom: 0.75rem;
          }

          .label-hint {
            font-size: 0.875rem;
            font-weight: 400;
            color: #9ca3af;
          }

          .description-textarea {
            width: 100%;
            padding: 0.875rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
            resize: vertical;
            transition: all 0.3s ease;
          }

          .description-textarea:focus {
            outline: none;
            border-color: #8b5cf6;
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
          }

          .char-count {
            text-align: right;
            font-size: 0.75rem;
            color: #9ca3af;
            margin-top: 0.5rem;
          }

          .modal-footer {
            display: flex;
            gap: 0.75rem;
            padding: 1.5rem;
            border-top: 2px solid #f3f4f6;
            flex-shrink: 0;
          }

          .modal-footer button {
            flex: 1;
            padding: 0.875rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1rem;
          }

          .btn-cancel {
            background: #f3f4f6;
            color: #6b7280;
          }

          .btn-cancel:hover:not(:disabled) {
            background: #e5e7eb;
          }

          .btn-submit {
            background: #ef4444;
            color: white;
          }

          .btn-submit:hover:not(:disabled) {
            background: #dc2626;
          }

          .btn-submit:disabled,
          .btn-cancel:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @media (max-width: 768px) {
            .report-modal {
              max-height: 95vh;
            }

            .modal-header {
              padding: 1rem;
            }

            .modal-body {
              padding: 1rem;
            }

            .modal-footer {
              padding: 1rem;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
