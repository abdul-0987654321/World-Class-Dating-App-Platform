# Discovery Page Dark Mode Updates

## Files to Update:
1. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app/src/pages/Discovery/DiscoveryPage.tsx`
2. `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app/src/pages/Discovery/EnhancedDiscoveryPage.tsx`

---

## Changes for DiscoveryPage.tsx:

### 1. Loading Screen Background (Line 98)
**OLD:**
```tsx
<div className="min-h-screen bg-gray-100 flex items-center justify-center">
```
**NEW:**
```tsx
<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
```

### 2. Main Container Background (Line 105)
**OLD:**
```tsx
<div className="min-h-screen bg-gray-100">
```
**NEW:**
```tsx
<div className="min-h-screen bg-[#0A0A0A]">
```

### 3. Stats Bar (Lines 112-125)
**OLD:**
```tsx
<div className="bg-white rounded-xl p-4 mb-4 flex justify-around text-center shadow-sm">
  <div>
    <p className="text-2xl font-bold text-pink-500">{stats.remainingLikes}</p>
    <p className="text-xs text-gray-500">Likes Left</p>
  </div>
  <div>
    <p className="text-2xl font-bold text-blue-500">{stats.remainingSuperLikes}</p>
    <p className="text-xs text-gray-500">Super Likes</p>
  </div>
  <div>
    <p className="text-2xl font-bold text-purple-500">{stats.remainingBoosts}</p>
    <p className="text-xs text-gray-500">Boosts</p>
  </div>
</div>
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 mb-4 flex justify-around text-center shadow-2xl shadow-pink-500/10 border border-white/10">
  <div>
    <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">{stats.remainingLikes}</p>
    <p className="text-xs text-gray-400">Likes Left</p>
  </div>
  <div>
    <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{stats.remainingSuperLikes}</p>
    <p className="text-xs text-gray-400">Super Likes</p>
  </div>
  <div>
    <p className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">{stats.remainingBoosts}</p>
    <p className="text-xs text-gray-400">Boosts</p>
  </div>
</div>
```

### 4. Profile Card Container (Line 130)
**OLD:**
```tsx
<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
```
**NEW:**
```tsx
<div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl shadow-pink-500/10">
```

### 5. Gradient Overlay (Line 167)
**OLD:**
```tsx
<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 pt-20">
```
**NEW:**
```tsx
<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-20">
```

### 6. Verified Badge (Lines 172-176)
**OLD:**
```tsx
<span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
  Verified
</span>
```
**NEW:**
```tsx
<span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg shadow-blue-500/50">
  Verified
</span>
```

### 7. Location Text (Line 178)
**OLD:**
```tsx
<p className="text-white/80 text-sm mt-1">
```
**NEW:**
```tsx
<p className="text-gray-400 text-sm mt-1">
```

### 8. Compatibility Badge (Lines 182-184)
**OLD:**
```tsx
<span className="bg-pink-500/80 text-white text-xs px-2 py-1 rounded-full">
  {currentProfile.compatibilityScore}% Match
</span>
```
**NEW:**
```tsx
<span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg shadow-pink-500/50">
  {currentProfile.compatibilityScore}% Match
</span>
```

### 9. Profile Info Section (Line 190)
**OLD:**
```tsx
<div className="p-6">
  <p className="text-gray-700">{currentProfile.bio}</p>
```
**NEW:**
```tsx
<div className="p-6 bg-gradient-to-b from-black/40 to-transparent">
  <p className="text-gray-400">{currentProfile.bio}</p>
```

### 10. Interests Section (Lines 193-204)
**OLD:**
```tsx
<div className="mt-4">
  <p className="text-sm font-medium text-gray-500 mb-2">Interests</p>
  <div className="flex flex-wrap gap-2">
    {currentProfile.interests.map((interest, idx) => (
      <span
        key={idx}
        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
      >
        {interest}
      </span>
    ))}
  </div>
</div>
```
**NEW:**
```tsx
<div className="mt-4">
  <p className="text-sm font-medium text-gray-500 mb-2">Interests</p>
  <div className="flex flex-wrap gap-2">
    {currentProfile.interests.map((interest, idx) => (
      <span
        key={idx}
        className="bg-white/10 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-full text-sm border border-white/20"
      >
        {interest}
      </span>
    ))}
  </div>
</div>
```

### 11. Action Buttons Container (Line 209)
**OLD:**
```tsx
<div className="flex justify-center gap-4 p-6 pt-0">
```
**NEW:**
```tsx
<div className="flex justify-center gap-4 p-6 pt-0 pb-8">
```

### 12. Pass Button (Lines 210-217)
**OLD:**
```tsx
<button
  onClick={() => handleSwipe('pass')}
  className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 transition shadow-md"
>
```
**NEW:**
```tsx
<button
  onClick={() => handleSwipe('pass')}
  className="w-16 h-16 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-500/10 transition shadow-lg"
>
```

### 13. Super Like Button (Lines 219-226)
**OLD:**
```tsx
<button
  onClick={() => handleSwipe('super_like')}
  className="w-14 h-14 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-blue-400 hover:border-blue-400 hover:text-blue-500 transition shadow-md"
>
```
**NEW:**
```tsx
<button
  onClick={() => handleSwipe('super_like')}
  className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white hover:opacity-90 transition shadow-lg shadow-blue-500/50"
>
```

### 14. Like Button (Lines 228-235)
**OLD:**
```tsx
<button
  onClick={() => handleSwipe('like')}
  className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition"
>
```
**NEW:**
```tsx
<button
  onClick={() => handleSwipe('like')}
  className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-500/50 hover:opacity-90 transition"
>
```

### 15. No Profiles Card (Lines 239-243)
**OLD:**
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8 text-center">
  <div className="text-6xl mb-4">💫</div>
  <h2 className="text-xl font-bold text-gray-800 mb-2">No more profiles</h2>
  <p className="text-gray-500">Check back later for new matches!</p>
</div>
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 text-center">
  <div className="text-6xl mb-4">💫</div>
  <h2 className="text-xl font-bold text-white mb-2">No more profiles</h2>
  <p className="text-gray-400">Check back later for new matches!</p>
</div>
```

### 16. Match Modal Backdrop (Line 249)
**OLD:**
```tsx
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
```
**NEW:**
```tsx
<div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
```

### 17. Match Modal Card (Line 250)
**OLD:**
```tsx
<div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center animate-bounce-slow">
```
**NEW:**
```tsx
<div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl shadow-pink-500/20">
```

### 18. Match Modal Title (Lines 252-254)
**OLD:**
```tsx
<h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
  It's a Match!
</h2>
```
**NEW:**
```tsx
<h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2 animate-pulse">
  It's a Match!
</h2>
```

### 19. Match Modal Text (Lines 255-257)
**OLD:**
```tsx
<p className="text-gray-600 mb-6">
  You and {matchedProfile.matchedUser.name} liked each other!
</p>
```
**NEW:**
```tsx
<p className="text-gray-300 mb-6">
  You and {matchedProfile.matchedUser.name} liked each other!
</p>
```

### 20. Match Modal Profile Image (Lines 258-262)
**OLD:**
```tsx
<img
  src={matchedProfile.matchedUser.photoUrl}
  alt={matchedProfile.matchedUser.name}
  className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-4 border-pink-500"
/>
```
**NEW:**
```tsx
<img
  src={matchedProfile.matchedUser.photoUrl}
  alt={matchedProfile.matchedUser.name}
  className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-4 border-pink-500 shadow-lg shadow-pink-500/50"
/>
```

### 21. Match Modal Send Button (Lines 264-271)
**OLD:**
```tsx
<button
  onClick={() => {
    setShowMatch(false);
    navigate('/messages');
  }}
  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
>
  Send Message
</button>
```
**NEW:**
```tsx
<button
  onClick={() => {
    setShowMatch(false);
    navigate('/messages');
  }}
  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-lg shadow-pink-500/50"
>
  Send Message
</button>
```

### 22. Match Modal Keep Swiping Button (Lines 273-280)
**OLD:**
```tsx
<button
  onClick={() => {
    setShowMatch(false);
    nextProfile();
  }}
  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
>
  Keep Swiping
</button>
```
**NEW:**
```tsx
<button
  onClick={() => {
    setShowMatch(false);
    nextProfile();
  }}
  className="flex-1 bg-white/10 backdrop-blur-sm text-gray-300 py-3 rounded-lg font-semibold hover:bg-white/20 transition border border-white/20"
>
  Keep Swiping
</button>
```

---

## Changes for EnhancedDiscoveryPage.tsx:

### 1. Loading Screen Background (Line 268)
**OLD:**
```tsx
<div className="min-h-screen bg-gray-50 flex items-center justify-center">
```
**NEW:**
```tsx
<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
```

### 2. Loading Text (Line 271)
**OLD:**
```tsx
<p className="mt-4 text-gray-600">Finding perfect matches...</p>
```
**NEW:**
```tsx
<p className="mt-4 text-gray-400">Finding perfect matches...</p>
```

### 3. No Profiles Container (Line 279)
**OLD:**
```tsx
<div className="min-h-screen bg-gray-50 flex items-center justify-center">
```
**NEW:**
```tsx
<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
```

### 4. No Profiles Text (Lines 282-283)
**OLD:**
```tsx
<h2 className="text-2xl font-bold text-gray-800 mb-2">No More Profiles</h2>
<p className="text-gray-600 mb-6">Check back later for more matches!</p>
```
**NEW:**
```tsx
<h2 className="text-2xl font-bold text-white mb-2">No More Profiles</h2>
<p className="text-gray-400 mb-6">Check back later for more matches!</p>
```

### 5. Main Container (Line 296)
**OLD:**
```tsx
<div className="min-h-screen bg-gray-50">
```
**NEW:**
```tsx
<div className="min-h-screen bg-[#0A0A0A]">
```

### 6. Header (Line 298)
**OLD:**
```tsx
<header className="bg-white border-b border-gray-200 sticky top-0 z-40">
```
**NEW:**
```tsx
<header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40 shadow-lg shadow-black/20">
```

### 7. Discovery Title (Lines 302-304)
**OLD:**
```tsx
<h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
  Discovery
</h1>
```
**NEW:**
```tsx
<h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
  Discovery
</h1>
```

### 8. Boost Active Badge (Line 306)
**OLD:**
```tsx
<div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
```
**NEW:**
```tsx
<div className="flex items-center space-x-2 px-3 py-1 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 rounded-full border border-yellow-500/30">
```

### 9. Filter Button (Lines 322-328)
**OLD:**
```tsx
<button
  onClick={() => setShowFiltersModal(true)}
  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
>
  <Filter className="w-5 h-5" />
  <span>Filters</span>
</button>
```
**NEW:**
```tsx
<button
  onClick={() => setShowFiltersModal(true)}
  className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full transition border border-white/20 text-white"
>
  <Filter className="w-5 h-5" />
  <span>Filters</span>
</button>
```

### 10. Stats Sidebar (Line 346)
**OLD:**
```tsx
<div className="bg-white rounded-2xl p-6 shadow-sm">
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10">
```

### 11. Stats Title and Values (Lines 347-362)
**OLD:**
```tsx
<h3 className="font-semibold mb-4">Your Stats</h3>
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <span className="text-gray-600">Likes Sent</span>
    <span className="font-bold">42</span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-gray-600">Likes Received</span>
    <span className="font-bold text-pink-500">28</span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-gray-600">Matches</span>
    <span className="font-bold text-green-500">15</span>
  </div>
</div>
```
**NEW:**
```tsx
<h3 className="font-semibold mb-4 text-white">Your Stats</h3>
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <span className="text-gray-400">Likes Sent</span>
    <span className="font-bold text-white">42</span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-gray-400">Likes Received</span>
    <span className="font-bold text-pink-500">28</span>
  </div>
  <div className="flex justify-between items-center">
    <span className="text-gray-400">Matches</span>
    <span className="font-bold text-green-500">15</span>
  </div>
</div>
```

### 12. Super Likes Card (Line 365)
**OLD:**
```tsx
<div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
```
**NEW:**
```tsx
<div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30 border border-white/10">
```

### 13. Keyboard Shortcuts (Line 374)
**OLD:**
```tsx
<div className="bg-white rounded-2xl p-6 shadow-sm">
  <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
  <div className="space-y-2 text-sm text-gray-600">
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10">
  <h3 className="font-semibold mb-3 text-white">Keyboard Shortcuts</h3>
  <div className="space-y-2 text-sm text-gray-400">
```

### 14. Profile Card (Line 389)
**OLD:**
```tsx
<div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 border border-white/10">
```

### 15. Photo Navigation Buttons (Lines 401-415)
**OLD:**
```tsx
<button
  onClick={() => setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))}
  disabled={currentPhotoIndex === 0}
  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full disabled:opacity-50"
>
```
**NEW:**
```tsx
<button
  onClick={() => setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))}
  disabled={currentPhotoIndex === 0}
  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2 rounded-full disabled:opacity-50 border border-white/30"
>
```

### 16. Compatibility Badge (Lines 437-441)
**OLD:**
```tsx
<div className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full">
  <TrendingUp className="w-4 h-4" />
  <span className="font-semibold">{currentProfile.compatibilityScore}% Match</span>
</div>
```
**NEW:**
```tsx
<div className="flex items-center space-x-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full shadow-lg shadow-green-500/50">
  <TrendingUp className="w-4 h-4" />
  <span className="font-semibold">{currentProfile.compatibilityScore}% Match</span>
</div>
```

### 17. Profile Info Text (Lines 452-474)
**OLD:**
```tsx
<div className="absolute bottom-0 left-0 right-0 p-6 text-white">
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-3xl font-bold">
      {currentProfile.name}, {currentProfile.age}
    </h2>
    <div className="flex items-center space-x-2">
      <MapPin className="w-5 h-5" />
      <span>{currentProfile.distance} km away</span>
    </div>
  </div>

  <p className="text-lg opacity-90 mb-2">{currentProfile.occupation}</p>
```
**NEW:**
```tsx
<div className="absolute bottom-0 left-0 right-0 p-6 text-white">
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-3xl font-bold text-white">
      {currentProfile.name}, {currentProfile.age}
    </h2>
    <div className="flex items-center space-x-2 text-gray-300">
      <MapPin className="w-5 h-5" />
      <span>{currentProfile.distance} km away</span>
    </div>
  </div>

  <p className="text-lg text-gray-300 mb-2">{currentProfile.occupation}</p>
```

### 18. Common Interests (Lines 465-471)
**OLD:**
```tsx
{currentProfile.commonInterests && currentProfile.commonInterests.length > 0 && (
  <div className="flex items-center space-x-2 mb-3">
    <Heart className="w-4 h-4 text-pink-500" />
    <span className="text-sm">
      You both like {currentProfile.commonInterests.join(', ')}
    </span>
  </div>
)}
```
**NEW:**
```tsx
{currentProfile.commonInterests && currentProfile.commonInterests.length > 0 && (
  <div className="flex items-center space-x-2 mb-3">
    <Heart className="w-4 h-4 text-pink-400" />
    <span className="text-sm text-gray-300">
      You both like {currentProfile.commonInterests.join(', ')}
    </span>
  </div>
)}
```

### 19. Bio Text (Line 474)
**OLD:**
```tsx
<p className="mb-4 line-clamp-3">{currentProfile.bio}</p>
```
**NEW:**
```tsx
<p className="mb-4 line-clamp-3 text-gray-300">{currentProfile.bio}</p>
```

### 20. Interest Tags (Lines 476-484)
**OLD:**
```tsx
<div className="flex flex-wrap gap-2">
  {currentProfile.interests.map((interest, index) => (
    <span
      key={index}
      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
    >
      {interest}
    </span>
  ))}
</div>
```
**NEW:**
```tsx
<div className="flex flex-wrap gap-2">
  {currentProfile.interests.map((interest, index) => (
    <span
      key={index}
      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm border border-white/30"
    >
      {interest}
    </span>
  ))}
</div>
```

### 21. Undo Button (Lines 492-499)
**OLD:**
```tsx
<button
  onClick={handleUndo}
  disabled={undoStack.length === 0}
  className="w-14 h-14 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-lg flex items-center justify-center transition"
  title="Undo (Ctrl+Z)"
>
  <RotateCcw className="w-6 h-6 text-yellow-500" />
</button>
```
**NEW:**
```tsx
<button
  onClick={handleUndo}
  disabled={undoStack.length === 0}
  className="w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-lg flex items-center justify-center transition border border-white/20"
  title="Undo (Ctrl+Z)"
>
  <RotateCcw className="w-6 h-6 text-yellow-400" />
</button>
```

### 22. Pass Button (Lines 501-507)
**OLD:**
```tsx
<button
  onClick={handleSwipeLeft}
  className="w-16 h-16 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110"
  title="Pass (←)"
>
  <X className="w-8 h-8 text-red-500" />
</button>
```
**NEW:**
```tsx
<button
  onClick={handleSwipeLeft}
  className="w-16 h-16 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110 border border-white/20"
  title="Pass (←)"
>
  <X className="w-8 h-8 text-red-400" />
</button>
```

### 23. Super Like Button (Lines 509-520)
**OLD:**
```tsx
<button
  onClick={handleSuperLike}
  className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-2xl rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110 relative"
  title="Super Like (↑)"
>
  <Star className="w-7 h-7 text-white fill-current" />
  {superLikeQuota.remaining > 0 && (
    <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
      {superLikeQuota.remaining}
    </div>
  )}
</button>
```
**NEW:**
```tsx
<button
  onClick={handleSuperLike}
  className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-2xl rounded-full shadow-xl shadow-blue-500/50 flex items-center justify-center transition transform hover:scale-110 relative"
  title="Super Like (↑)"
>
  <Star className="w-7 h-7 text-white fill-current" />
  {superLikeQuota.remaining > 0 && (
    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
      {superLikeQuota.remaining}
    </div>
  )}
</button>
```

### 24. Like Button (Lines 522-528)
**OLD:**
```tsx
<button
  onClick={handleSwipeRight}
  className="w-16 h-16 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110"
  title="Like (→)"
>
  <Heart className="w-8 h-8 text-green-500" />
</button>
```
**NEW:**
```tsx
<button
  onClick={handleSwipeRight}
  className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 rounded-full shadow-xl shadow-pink-500/50 flex items-center justify-center transition transform hover:scale-110"
  title="Like (→)"
>
  <Heart className="w-8 h-8 text-white fill-current" />
</button>
```

### 25. Info Button (Lines 530-536)
**OLD:**
```tsx
<button
  onClick={() => {}}
  className="w-14 h-14 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center transition"
  title="More Info"
>
  <Info className="w-6 h-6 text-purple-500" />
</button>
```
**NEW:**
```tsx
<button
  onClick={() => {}}
  className="w-14 h-14 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full shadow-lg flex items-center justify-center transition border border-white/20"
  title="More Info"
>
  <Info className="w-6 h-6 text-purple-400" />
</button>
```

### 26. Who Liked You Card (Line 543)
**OLD:**
```tsx
<div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl p-6 text-white shadow-lg">
```
**NEW:**
```tsx
<div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-pink-500/30 border border-white/10">
```

### 27. Profile Views Card (Line 555)
**OLD:**
```tsx
<div className="bg-white rounded-2xl p-6 shadow-sm mt-4">
  <h3 className="font-semibold mb-4">Profile Views</h3>
  <div className="text-3xl font-bold text-pink-500 mb-2">142</div>
  <p className="text-sm text-gray-600 mb-4">in the last 7 days</p>
  <button
    onClick={() => navigate('/insights')}
    className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-full font-semibold transition"
  >
    View Insights
  </button>
</div>
```
**NEW:**
```tsx
<div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10 mt-4">
  <h3 className="font-semibold mb-4 text-white">Profile Views</h3>
  <div className="text-3xl font-bold text-pink-500 mb-2">142</div>
  <p className="text-sm text-gray-400 mb-4">in the last 7 days</p>
  <button
    onClick={() => navigate('/insights')}
    className="w-full py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full font-semibold transition border border-white/20 text-white"
  >
    View Insights
  </button>
</div>
```

### 28. Super Like Modal (Line 572)
**OLD:**
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-3xl p-8 max-w-md w-full">
```
**NEW:**
```tsx
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-pink-500/20">
```

### 29. Super Like Modal Content (Lines 574-580)
**OLD:**
```tsx
<div className="text-center mb-6">
  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
    <Star className="w-8 h-8 text-white fill-current" />
  </div>
  <h2 className="text-2xl font-bold mb-2">Super Like {currentProfile.name}</h2>
  <p className="text-gray-600">Stand out and send a message!</p>
</div>
```
**NEW:**
```tsx
<div className="text-center mb-6">
  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50">
    <Star className="w-8 h-8 text-white fill-current" />
  </div>
  <h2 className="text-2xl font-bold mb-2 text-white">Super Like {currentProfile.name}</h2>
  <p className="text-gray-300">Stand out and send a message!</p>
</div>
```

### 30. Super Like Textarea (Lines 582-589)
**OLD:**
```tsx
<textarea
  className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none mb-2"
  rows={4}
  placeholder="Write a message (optional)..."
  value={superLikeMessage}
  onChange={(e) => setSuperLikeMessage(e.target.value)}
  maxLength={500}
/>
```
**NEW:**
```tsx
<textarea
  className="w-full p-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-xl resize-none focus:border-blue-500 focus:outline-none mb-2 text-white placeholder-gray-400"
  rows={4}
  placeholder="Write a message (optional)..."
  value={superLikeMessage}
  onChange={(e) => setSuperLikeMessage(e.target.value)}
  maxLength={500}
/>
```

### 31. Character Count (Line 591)
**OLD:**
```tsx
<div className="text-right text-sm text-gray-500 mb-6">{superLikeMessage.length}/500</div>
```
**NEW:**
```tsx
<div className="text-right text-sm text-gray-400 mb-6">{superLikeMessage.length}/500</div>
```

### 32. Super Like Modal Buttons (Lines 593-611)
**OLD:**
```tsx
<div className="flex space-x-3">
  <button
    onClick={() => {
      setShowSuperLikeModal(false);
      setSuperLikeMessage('');
    }}
    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-full font-semibold transition"
  >
    Cancel
  </button>
  <button
    onClick={confirmSuperLike}
    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg transition flex items-center justify-center space-x-2"
  >
    <Send className="w-5 h-5" />
    <span>Send Super Like</span>
  </button>
</div>
```
**NEW:**
```tsx
<div className="flex space-x-3">
  <button
    onClick={() => {
      setShowSuperLikeModal(false);
      setSuperLikeMessage('');
    }}
    className="flex-1 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-full font-semibold transition border border-white/20 text-white"
  >
    Cancel
  </button>
  <button
    onClick={confirmSuperLike}
    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg shadow-lg shadow-blue-500/50 transition flex items-center justify-center space-x-2"
  >
    <Send className="w-5 h-5" />
    <span>Send Super Like</span>
  </button>
</div>
```

### 33. Match Modal (Lines 616-642)
**OLD:**
```tsx
{showMatch && matchedProfile && (
  <div className="fixed inset-0 bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center z-50 p-4">
    <div className="text-center text-white">
      <h1 className="text-6xl font-bold mb-4">It's a Match!</h1>
      <p className="text-2xl mb-8">You and {matchedProfile.name} liked each other</p>
      <div className="flex space-x-4 justify-center">
        <button
          onClick={() => {
            setShowMatch(false);
            navigate('/matches');
          }}
          className="px-8 py-4 bg-white text-pink-500 rounded-full font-bold text-lg hover:shadow-2xl transition"
        >
          Send Message
        </button>
        <button
          onClick={() => {
            setShowMatch(false);
            nextProfile();
          }}
          className="px-8 py-4 bg-white/20 backdrop-blur text-white rounded-full font-bold text-lg hover:bg-white/30 transition"
        >
          Keep Swiping
        </button>
      </div>
    </div>
  </div>
)}
```
**NEW:**
```tsx
{showMatch && matchedProfile && (
  <div className="fixed inset-0 bg-gradient-to-br from-pink-500/90 to-purple-600/90 backdrop-blur-xl flex items-center justify-center z-50 p-4">
    <div className="text-center text-white">
      <h1 className="text-6xl font-bold mb-4 animate-pulse">It's a Match!</h1>
      <p className="text-2xl mb-8 text-gray-200">You and {matchedProfile.name} liked each other</p>
      <div className="flex space-x-4 justify-center">
        <button
          onClick={() => {
            setShowMatch(false);
            navigate('/matches');
          }}
          className="px-8 py-4 bg-white text-pink-500 rounded-full font-bold text-lg hover:shadow-2xl transition shadow-lg shadow-white/30"
        >
          Send Message
        </button>
        <button
          onClick={() => {
            setShowMatch(false);
            nextProfile();
          }}
          className="px-8 py-4 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold text-lg hover:bg-white/30 transition border border-white/30"
        >
          Keep Swiping
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Summary of Changes:

### Color Palette:
- **Background**: `#0A0A0A` (dark black)
- **Cards**: Glass morphism with `bg-white/5`, `backdrop-blur-xl`, `border border-white/10`
- **Text**: White for headings, `text-gray-400` for body text
- **Gradients**: Pink/purple for primary actions, blue/purple for super likes
- **Shadows**: Colored shadows with low opacity (`shadow-pink-500/50`, `shadow-blue-500/50`)

### Design Elements:
- Glass morphism effect on all cards
- Gradient text for statistics
- Glowing shadows on buttons and badges
- Rounded corners increased to `rounded-3xl`
- Border accents with `border-white/10` or `border-white/20`
- Backdrop blur effects throughout
- Animated pulse on match modal

### Button Styles:
- **Like**: Pink-to-rose gradient with pink glow
- **Pass**: Dark transparent with red hover
- **Super Like**: Blue-to-purple gradient with blue glow
- **All buttons**: Glass morphism backgrounds with borders

Apply these changes to transform both Discovery pages to the futuristic FLAMORAL dark-mode design!
