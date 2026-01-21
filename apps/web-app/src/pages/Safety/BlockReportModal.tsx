import React, { useState } from 'react';
import './BlockReportModal.css';

export interface BlockReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userPhoto?: string;
  onBlock: (userId: string, reason: string) => Promise<void>;
  onReport: (userId: string, reportData: ReportData) => Promise<void>;
}

export interface ReportData {
  reportType: string;
  description: string;
  evidenceUrls?: string[];
  severity: 'low' | 'medium' | 'high';
}

const REPORT_CATEGORIES = [
  {
    id: 'inappropriate_messages',
    label: 'Inappropriate Messages',
    description: 'Offensive, sexual, or harassing messages',
    severity: 'high' as const,
  },
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'Suspicious or impersonating someone else',
    severity: 'medium' as const,
  },
  {
    id: 'spam',
    label: 'Spam or Scam',
    description: 'Promoting services, asking for money',
    severity: 'high' as const,
  },
  {
    id: 'inappropriate_photos',
    label: 'Inappropriate Photos',
    description: 'Nudity or sexually explicit content',
    severity: 'high' as const,
  },
  {
    id: 'underage',
    label: 'Underage User',
    description: 'User appears to be under 18',
    severity: 'high' as const,
  },
  {
    id: 'hate_speech',
    label: 'Hate Speech',
    description: 'Discriminatory or hateful language',
    severity: 'high' as const,
  },
  {
    id: 'violence_threat',
    label: 'Violence or Threats',
    description: 'Threatening behavior or violence',
    severity: 'high' as const,
  },
  {
    id: 'stolen_photos',
    label: 'Stolen Photos',
    description: "Using someone else's photos",
    severity: 'medium' as const,
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else that concerns me',
    severity: 'medium' as const,
  },
];

export const BlockReportModal: React.FC<BlockReportModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userPhoto,
  onBlock,
  onReport,
}) => {
  const [activeTab, setActiveTab] = useState<'block' | 'report'>('report');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleReport = async () => {
    if (!selectedCategory) {
      alert('Please select a report category');
      return;
    }

    const category = REPORT_CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category) return;

    setIsSubmitting(true);
    try {
      await onReport(userId, {
        reportType: selectedCategory,
        description: description || category.description,
        severity: category.severity,
      });
      setShowConfirmation(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await onBlock(userId, blockReason || 'User blocked');
      setShowConfirmation(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Failed to block user:', error);
      alert('Failed to block user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockAndReport = async () => {
    await handleReport();
    await handleBlock();
  };

  const resetForm = () => {
    setSelectedCategory('');
    setDescription('');
    setBlockReason('');
    setShowConfirmation(false);
    setActiveTab('report');
  };

  return (
    <div className="block-report-modal-overlay" onClick={onClose}>
      <div className="block-report-modal" onClick={(e) => e.stopPropagation()}>
        {showConfirmation ? (
          <div className="confirmation-screen">
            <div className="confirmation-icon">✓</div>
            <h2>Thank You</h2>
            <p>
              {activeTab === 'report'
                ? 'Your report has been submitted. Our team will review it shortly.'
                : 'User has been blocked. You will no longer see their profile.'}
            </p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Safety Actions</h2>
              <button className="close-button" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            <div className="user-info">
              {userPhoto && <img src={userPhoto} alt={userName} className="user-photo" />}
              <div className="user-details">
                <h3>{userName}</h3>
                <p className="user-id">ID: {userId.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="tabs">
              <button
                className={`tab ${activeTab === 'report' ? 'active' : ''}`}
                onClick={() => setActiveTab('report')}
              >
                <span className="tab-icon">🚩</span>
                Report
              </button>
              <button
                className={`tab ${activeTab === 'block' ? 'active' : ''}`}
                onClick={() => setActiveTab('block')}
              >
                <span className="tab-icon">🚫</span>
                Block
              </button>
            </div>

            <div className="modal-content">
              {activeTab === 'report' ? (
                <div className="report-section">
                  <h3>Report This User</h3>
                  <p className="section-description">
                    Help us keep Flamoral safe by reporting inappropriate behavior. All reports are
                    confidential.
                  </p>

                  <div className="report-categories">
                    <h4>Select a reason:</h4>
                    {REPORT_CATEGORIES.map((category) => (
                      <label
                        key={category.id}
                        className={`category-option ${
                          selectedCategory === category.id ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={category.id}
                          checked={selectedCategory === category.id}
                          onChange={() => setSelectedCategory(category.id)}
                        />
                        <div className="category-content">
                          <div className="category-label">{category.label}</div>
                          <div className="category-description">{category.description}</div>
                        </div>
                        {category.severity === 'high' && (
                          <span className="severity-badge high">High Priority</span>
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="description-field">
                    <label htmlFor="description">Additional Details (Optional)</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide any additional information that would help us review this report..."
                      rows={4}
                      maxLength={500}
                    />
                    <div className="char-count">{description.length}/500</div>
                  </div>

                  <div className="safety-notice">
                    <strong>🔒 Your report is confidential</strong>
                    <p>
                      The user will not be notified that you reported them. Our moderation team will
                      review this report within 24 hours.
                    </p>
                  </div>

                  <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleReport}
                      disabled={!selectedCategory || isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleBlockAndReport}
                      disabled={!selectedCategory || isSubmitting}
                    >
                      Report & Block
                    </button>
                  </div>
                </div>
              ) : (
                <div className="block-section">
                  <h3>Block This User</h3>
                  <p className="section-description">Blocking will prevent this user from:</p>

                  <ul className="block-effects">
                    <li>✓ Seeing your profile</li>
                    <li>✓ Sending you messages</li>
                    <li>✓ Appearing in your discovery feed</li>
                    <li>✓ Matching with you</li>
                  </ul>

                  <div className="warning-box">
                    <strong>⚠️ Note:</strong>
                    <p>
                      The user will not be notified that you blocked them. You can unblock them
                      later from Settings.
                    </p>
                  </div>

                  <div className="reason-field">
                    <label htmlFor="blockReason">Reason for blocking (Optional)</label>
                    <textarea
                      id="blockReason"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Optional: Let us know why you're blocking this user..."
                      rows={3}
                      maxLength={200}
                    />
                  </div>

                  <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={handleBlock}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Blocking...' : 'Block User'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BlockReportModal;
