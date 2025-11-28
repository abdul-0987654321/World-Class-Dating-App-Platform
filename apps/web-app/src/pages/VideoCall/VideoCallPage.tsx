import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

interface CallState {
  status: 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';
  duration: number;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isSpeakerOn: boolean;
}

interface RemoteUser {
  id: string;
  name: string;
  photoUrl: string;
}

export const VideoCallPage: React.FC = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const isIncoming = searchParams.get('incoming') === 'true';

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [callState, setCallState] = useState<CallState>({
    status: isIncoming ? 'ringing' : 'connecting',
    duration: 0,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isSpeakerOn: true,
  });

  const [remoteUser, setRemoteUser] = useState<RemoteUser>({
    id: matchId || '',
    name: 'Loading...',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  });

  const [showControls, setShowControls] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Load match info
  useEffect(() => {
    const loadMatchInfo = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/matches/${matchId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.matchedUser) {
            setRemoteUser({
              id: data.data.matchedUser.id,
              name: data.data.matchedUser.name,
              photoUrl: data.data.matchedUser.photoUrl,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load match info:', err);
      }
    };

    if (matchId) {
      loadMatchInfo();
    }
  }, [matchId]);

  // Initialize local media
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callState.isVideoEnabled,
          audio: callState.isAudioEnabled,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Simulate connection after 2 seconds
        if (!isIncoming) {
          setTimeout(() => {
            setCallState(prev => ({ ...prev, status: 'ringing' }));
            setTimeout(() => {
              setCallState(prev => ({ ...prev, status: 'connected' }));
            }, 3000);
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to get media:', err);
        setCallState(prev => ({ ...prev, status: 'failed' }));
      }
    };

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState.status === 'connected') {
      timerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState.status]);

  // Auto-hide controls
  useEffect(() => {
    if (callState.status === 'connected') {
      const timeout = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [callState.status, showControls]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setCallState(prev => ({ ...prev, status: 'ended' }));
    setTimeout(() => navigate('/messages'), 1500);
  }, [localStream, navigate]);

  const handleAcceptCall = () => {
    setCallState(prev => ({ ...prev, status: 'connected' }));
  };

  const handleDeclineCall = () => {
    handleEndCall();
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isAudioEnabled: audioTrack.enabled }));
      }
    }
  };

  const toggleSpeaker = () => {
    setCallState(prev => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  };

  const switchCamera = async () => {
    // Toggle between front and back camera on mobile
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const constraints = videoTrack.getConstraints();
          const facingMode = constraints.facingMode === 'user' ? 'environment' : 'user';
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: callState.isAudioEnabled,
          });
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        } catch (err) {
          console.error('Failed to switch camera:', err);
        }
      }
    }
  };

  // Render incoming call screen
  if (callState.status === 'ringing' && isIncoming) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 to-purple-600 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <img
            src={remoteUser.photoUrl}
            alt={remoteUser.name}
            className="w-32 h-32 rounded-full border-4 border-white/50 mx-auto mb-6 object-cover"
          />
          <h2 className="text-2xl font-bold mb-2">{remoteUser.name}</h2>
          <p className="text-white/80 mb-8">Incoming video call...</p>

          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handleDeclineCall}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition animate-pulse"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render connecting screen
  if (callState.status === 'connecting' || callState.status === 'ringing') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <img
            src={remoteUser.photoUrl}
            alt={remoteUser.name}
            className="w-32 h-32 rounded-full border-4 border-white/50 mx-auto mb-6 object-cover"
          />
          <h2 className="text-2xl font-bold mb-2">{remoteUser.name}</h2>
          <p className="text-white/80 mb-8">
            {callState.status === 'connecting' ? 'Connecting...' : 'Ringing...'}
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition mx-auto"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Render ended screen
  if (callState.status === 'ended') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <img
            src={remoteUser.photoUrl}
            alt={remoteUser.name}
            className="w-32 h-32 rounded-full border-4 border-white/50 mx-auto mb-6 object-cover opacity-50"
          />
          <h2 className="text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-white/80">Duration: {formatDuration(callState.duration)}</p>
        </div>
      </div>
    );
  }

  // Render failed screen
  if (callState.status === 'failed') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Failed</h2>
          <p className="text-white/80 mb-6">Unable to establish video call</p>
          <button
            onClick={() => navigate('/messages')}
            className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
          >
            Return to Messages
          </button>
        </div>
      </div>
    );
  }

  // Render connected call screen
  return (
    <div
      className="fixed inset-0 bg-black"
      onClick={() => setShowControls(!showControls)}
    >
      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0 bg-gray-900">
        {callState.isVideoEnabled ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            poster={remoteUser.photoUrl}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={remoteUser.photoUrl}
              alt={remoteUser.name}
              className="w-32 h-32 rounded-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-32 h-44 bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
        {callState.isVideoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>

      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button onClick={handleEndCall} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="font-semibold">{remoteUser.name}</h3>
              <p className="text-sm text-white/70">{formatDuration(callState.duration)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-white/70">Connected</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-center gap-4">
          {/* Mute */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              callState.isAudioEnabled ? 'bg-white/20' : 'bg-red-500'
            }`}
          >
            {callState.isAudioEnabled ? (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              callState.isVideoEnabled ? 'bg-white/20' : 'bg-red-500'
            }`}
          >
            {callState.isVideoEnabled ? (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>

          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              callState.isSpeakerOn ? 'bg-white/20' : 'bg-gray-600'
            }`}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallPage;
