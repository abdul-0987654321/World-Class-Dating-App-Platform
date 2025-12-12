import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    age: number;
    bio?: string;
    photos: string[];
    location?: string;
    distance?: number;
    occupation?: string;
    education?: string;
    interests?: string[];
    verified?: boolean;
    online?: boolean;
    subscriptionTier?: string;
  };
  variant?: 'swipe' | 'list' | 'grid' | 'detailed';
  onLike?: () => void;
  onDislike?: () => void;
  onSuperLike?: () => void;
  onRewind?: () => void;
  showActions?: boolean;
  interactive?: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  variant = 'grid',
  onLike,
  onDislike,
  onSuperLike,
  onRewind,
  showActions = true,
  interactive = true,
}) => {
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    if (interactive) {
      navigate(`/profile/${user.id}`);
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % user.photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + user.photos.length) % user.photos.length);
  };

  const getTierBadge = () => {
    if (!user.subscriptionTier || user.subscriptionTier === 'FREE') return null;

    const tierColors = {
      GOLD: 'from-yellow-400 to-amber-500',
      PLATINUM: 'from-purple-500 to-indigo-600',
      DIAMOND: 'from-cyan-400 to-blue-500',
      ELITE: 'from-rose-500 to-pink-600',
    };

    return (
      <span className={`px-2 py-0.5 bg-gradient-to-r ${tierColors[user.subscriptionTier as keyof typeof tierColors]} text-white text-xs rounded-full font-medium`}>
        {user.subscriptionTier}
      </span>
    );
  };

  // Swipe Card Variant
  if (variant === 'swipe') {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-md h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden relative">
          {/* Photo */}
          <div className="absolute inset-0">
            <img
              src={user.photos[currentPhotoIndex] || 'https://via.placeholder.com/600x800?text=No+Photo'}
              alt={user.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />

            {/* Photo Navigation */}
            {user.photos.length > 1 && (
              <>
                <div className="absolute top-4 left-0 right-0 flex gap-1 px-4">
                  {user.photos.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${
                        index === currentPhotoIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white hover:bg-black/50 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          </div>

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-3xl font-bold">
                    {user.name}, {user.age}
                  </h2>
                  {user.verified && (
                    <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {user.online && (
                    <span className="w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
                  )}
                </div>
                {user.occupation && (
                  <p className="text-white/90 text-sm mb-1">{user.occupation}</p>
                )}
                {user.location && (
                  <div className="flex items-center gap-1 text-white/80 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {user.distance ? `${user.distance} km away` : user.location}
                  </div>
                )}
              </div>
              {getTierBadge()}
            </div>

            {user.bio && (
              <p className="text-white/90 text-sm line-clamp-2 mb-3">{user.bio}</p>
            )}

            {user.interests && user.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.interests.slice(0, 3).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
                {user.interests.length > 3 && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                    +{user.interests.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 px-6">
              {onRewind && (
                <button
                  onClick={onRewind}
                  className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
                >
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                  </svg>
                </button>
              )}

              <button
                onClick={onDislike}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
              >
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {onSuperLike && (
                <button
                  onClick={onSuperLike}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
                >
                  <svg className="w-7 h-7 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              )}

              <button
                onClick={onLike}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
              >
                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List Variant
  if (variant === 'list') {
    return (
      <div
        onClick={handleClick}
        className="flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition cursor-pointer"
      >
        <div className="relative">
          <img
            src={user.photos[0] || 'https://via.placeholder.com/80'}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          {user.online && (
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 truncate">
              {user.name}, {user.age}
            </h3>
            {user.verified && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {getTierBadge()}
          </div>
          {user.occupation && (
            <p className="text-sm text-gray-600 truncate mb-1">{user.occupation}</p>
          )}
          {user.distance && (
            <p className="text-xs text-gray-500">{user.distance} km away</p>
          )}
        </div>

        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  }

  // Grid Variant (Default)
  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="relative aspect-[3/4]">
        <img
          src={user.photos[0] || 'https://via.placeholder.com/400x600'}
          alt={user.name}
          className="w-full h-full object-cover"
        />

        {user.online && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-green-400 text-white text-xs rounded-full font-medium">
            Online
          </span>
        )}

        {user.verified && (
          <svg className="absolute top-3 left-3 w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold">
              {user.name}, {user.age}
            </h3>
            {getTierBadge()}
          </div>
          {user.location && (
            <p className="text-sm text-white/90">
              {user.distance ? `${user.distance} km away` : user.location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
