import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface ExportRequest {
  status: 'pending' | 'processing' | 'ready' | 'expired';
  requestedAt: string;
  expiresAt?: string;
  downloadUrl?: string;
  fileSize?: string;
}

export const DataExportPage: React.FC = () => {
  const navigate = useNavigate();
  const [exportRequest, setExportRequest] = useState<ExportRequest | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [selectedData, setSelectedData] = useState({
    profile: true,
    photos: true,
    messages: true,
    matches: true,
    likes: true,
    activityLog: true,
  });

  const handleRequestExport = async () => {
    setRequesting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/users/data-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ dataTypes: selectedData }),
      });

      if (res.ok) {
        const data = await res.json();
        setExportRequest(data.data || {
          status: 'processing',
          requestedAt: new Date().toISOString(),
        });
      } else {
        alert('Failed to request data export. Please try again.');
      }
    } catch (err) {
      console.error('Failed to request data export:', err);
      alert('Failed to request data export. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const toggleDataType = (type: keyof typeof selectedData) => {
    setSelectedData(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </button>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Download Your Data</h1>
            <p className="text-gray-600">
              Request a copy of your personal data stored on Flamoral. We'll compile it into a downloadable file.
            </p>
          </div>

          {/* GDPR Notice */}
          <div className="p-6 bg-blue-50 border-b border-blue-100">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Your Data Rights</h3>
                <p className="text-sm text-blue-800">
                  Under GDPR and other data protection laws, you have the right to access, download, and delete your personal data.
                  This process typically takes 1-3 business days to complete.
                </p>
              </div>
            </div>
          </div>

          {/* Export Status */}
          {exportRequest && (
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-800 mb-4">Export Status</h3>
              <div className={`p-4 rounded-lg ${
                exportRequest.status === 'ready'
                  ? 'bg-green-50 border border-green-200'
                  : exportRequest.status === 'processing'
                  ? 'bg-blue-50 border border-blue-200'
                  : exportRequest.status === 'expired'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {exportRequest.status === 'ready' ? (
                      <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : exportRequest.status === 'processing' ? (
                      <svg className="w-6 h-6 text-blue-500 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div>
                      <p className={`font-semibold ${
                        exportRequest.status === 'ready' ? 'text-green-900' :
                        exportRequest.status === 'processing' ? 'text-blue-900' :
                        exportRequest.status === 'expired' ? 'text-red-900' :
                        'text-yellow-900'
                      }`}>
                        {exportRequest.status === 'ready' ? 'Your data is ready!' :
                         exportRequest.status === 'processing' ? 'Processing your request' :
                         exportRequest.status === 'expired' ? 'Download link expired' :
                         'Request pending'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        exportRequest.status === 'ready' ? 'text-green-700' :
                        exportRequest.status === 'processing' ? 'text-blue-700' :
                        exportRequest.status === 'expired' ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        Requested on {new Date(exportRequest.requestedAt).toLocaleDateString()}
                      </p>
                      {exportRequest.expiresAt && exportRequest.status === 'ready' && (
                        <p className="text-sm text-green-700 mt-1">
                          Expires on {new Date(exportRequest.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                      {exportRequest.fileSize && (
                        <p className="text-sm text-green-700 mt-1">
                          File size: {exportRequest.fileSize}
                        </p>
                      )}
                    </div>
                  </div>

                  {exportRequest.status === 'ready' && exportRequest.downloadUrl && (
                    <a
                      href={exportRequest.downloadUrl}
                      download
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Selection */}
          {!exportRequest || exportRequest.status === 'expired' ? (
            <div className="p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Select Data to Export</h3>
              <div className="space-y-3">
                {Object.entries({
                  profile: { label: 'Profile Information', desc: 'Name, bio, preferences, and settings' },
                  photos: { label: 'Photos & Media', desc: 'Profile photos and uploaded media' },
                  messages: { label: 'Messages', desc: 'All your chat conversations' },
                  matches: { label: 'Matches', desc: 'Your match history and connections' },
                  likes: { label: 'Likes & Interactions', desc: 'People you liked and who liked you' },
                  activityLog: { label: 'Activity Log', desc: 'Your usage history and activity' },
                }).map(([key, { label, desc }]) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedData[key as keyof typeof selectedData]}
                      onChange={() => toggleDataType(key as keyof typeof selectedData)}
                      className="w-5 h-5 text-pink-500 border-gray-300 rounded focus:ring-pink-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{label}</p>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Export Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">What to expect:</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Your data will be compiled into a downloadable ZIP file
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Processing typically takes 1-3 business days
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    You'll receive an email when your data is ready
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Download link will be valid for 7 days
                  </li>
                </ul>
              </div>

              {/* Request Button */}
              <button
                onClick={handleRequestExport}
                disabled={requesting || !Object.values(selectedData).some(v => v)}
                className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Requesting...
                  </span>
                ) : (
                  'Request Data Export'
                )}
              </button>
            </div>
          ) : null}

          {/* Privacy Notice */}
          <div className="p-6 bg-gray-50 border-t">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Your Privacy Matters</p>
                <p>
                  The download link will be sent to your registered email and is protected by secure authentication.
                  Keep this link private and don't share it with others.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataExportPage;
