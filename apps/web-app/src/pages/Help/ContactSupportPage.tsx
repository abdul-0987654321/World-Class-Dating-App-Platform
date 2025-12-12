import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface SupportTicket {
  category: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  attachments: File[];
}

export const ContactSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicket>({
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    attachments: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    { value: 'account', label: 'Account & Login Issues', icon: '👤' },
    { value: 'payment', label: 'Billing & Payments', icon: '💳' },
    { value: 'technical', label: 'Technical Problems', icon: '🔧' },
    { value: 'safety', label: 'Safety & Privacy', icon: '🛡️' },
    { value: 'matches', label: 'Matching & Discovery', icon: '❤️' },
    { value: 'messages', label: 'Messages & Chat', icon: '💬' },
    { value: 'profile', label: 'Profile & Photos', icon: '📸' },
    { value: 'subscription', label: 'Subscription & Features', icon: '⭐' },
    { value: 'other', label: 'Other', icon: '📋' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = [...ticket.attachments, ...newFiles];

    if (totalFiles.length > 5) {
      alert('You can only attach up to 5 files');
      return;
    }

    const oversizedFiles = newFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert('Files must be less than 10MB');
      return;
    }

    setTicket({ ...ticket, attachments: totalFiles });
  };

  const removeAttachment = (index: number) => {
    setTicket({
      ...ticket,
      attachments: ticket.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticket.category || !ticket.subject || !ticket.description) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', ticket.category);
      formData.append('subject', ticket.subject);
      formData.append('description', ticket.description);
      formData.append('priority', ticket.priority);
      ticket.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Failed to submit ticket. Please try again.');
      }
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ticket Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for contacting us. We've received your support request and will respond within 24 hours.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                A confirmation email has been sent to your registered email address with your ticket number.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/help')}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                Back to Help Center
              </button>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setTicket({
                    category: '',
                    subject: '',
                    description: '',
                    priority: 'medium',
                    attachments: [],
                  });
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Submit Another Ticket
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/help')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Help Center
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Contact Support</h1>
            <p className="text-gray-600">
              Fill out the form below and our support team will get back to you as soon as possible.
            </p>
          </div>

          {/* Quick Help Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">Need help faster?</p>
                <p className="text-sm text-blue-700">
                  Check our{' '}
                  <button onClick={() => navigate('/help')} className="underline font-medium">
                    Help Center
                  </button>{' '}
                  for instant answers to common questions.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What do you need help with? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setTicket({ ...ticket, category: cat.value })}
                    className={`p-4 border-2 rounded-lg text-left transition ${
                      ticket.category === cat.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <p className="text-sm font-medium text-gray-800">{cat.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={ticket.subject}
                onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                placeholder="Brief description of your issue"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={ticket.description}
                onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                placeholder="Please provide as much detail as possible about your issue..."
                rows={6}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-500 mt-1">
                Include relevant details like error messages, device info, or steps to reproduce the issue.
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <div className="flex gap-3">
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setTicket({ ...ticket, priority })}
                    className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition ${
                      ticket.priority === priority
                        ? priority === 'high'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : priority === 'medium'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, PDF up to 10MB (max 5 files)
                  </p>
                </label>
              </div>

              {/* Attachment List */}
              {ticket.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {ticket.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Ticket'
                )}
              </button>
            </div>
          </form>

          {/* Alternative Contact Methods */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Ways to Reach Us</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href="mailto:support@flamoral.com"
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-800">Email Support</p>
                  <p className="text-sm text-gray-600">support@flamoral.com</p>
                </div>
              </a>

              <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-800">Live Chat</p>
                  <p className="text-sm text-gray-600">Available Mon-Fri 9am-5pm</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactSupportPage;
