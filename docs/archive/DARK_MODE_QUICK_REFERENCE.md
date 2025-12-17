# FLAMORAL Dark Mode - Quick Reference

## Color System

### Backgrounds
```
Main Background: bg-[#0A0A0A]
Cards: bg-white/5 backdrop-blur-xl border border-white/10
Overlays: bg-black/90 backdrop-blur-sm
```

### Text Colors
```
Headings: text-white
Body: text-gray-400
Subtext: text-gray-500
Light text on dark: text-gray-300
```

### Gradients
```
Primary (Like): from-pink-500 to-rose-500
Secondary (Super Like): from-blue-500 to-purple-500
Tertiary: from-purple-500 to-pink-500
Match: from-pink-500 to-purple-600
Verified: from-blue-500 to-cyan-500
Compatibility: from-green-500 to-emerald-500
```

### Shadows
```
Cards: shadow-2xl shadow-pink-500/10
Like Button: shadow-lg shadow-pink-500/50
Super Like Button: shadow-lg shadow-blue-500/50
Verified Badge: shadow-lg shadow-blue-500/50
Modal: shadow-2xl shadow-pink-500/20
```

### Borders
```
Subtle: border-white/10
Medium: border-white/20
Accent: border-white/30
```

## Component Patterns

### Glass Card
```tsx
className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-pink-500/10"
```

### Primary Button (Like)
```tsx
className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-500/50 hover:opacity-90 transition"
```

### Secondary Button (Super Like)
```tsx
className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white hover:opacity-90 transition shadow-lg shadow-blue-500/50"
```

### Tertiary Button (Pass)
```tsx
className="w-16 h-16 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-500/10 transition shadow-lg"
```

### Badge
```tsx
className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg shadow-pink-500/50"
```

### Interest Tag
```tsx
className="bg-white/10 backdrop-blur-sm text-gray-300 px-3 py-1 rounded-full text-sm border border-white/20"
```

### Modal
```tsx
<div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl shadow-pink-500/20">
    {/* Content */}
  </div>
</div>
```

### Gradient Text
```tsx
className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent"
```

### Stats Container
```tsx
className="bg-white/5 backdrop-blur-xl rounded-xl p-4 mb-4 flex justify-around text-center shadow-2xl shadow-pink-500/10 border border-white/10"
```

## Animation Classes

### Pulse
```tsx
className="animate-pulse"
```

### Hover Scale
```tsx
className="transition transform hover:scale-110"
```

### Opacity Transition
```tsx
className="hover:opacity-90 transition"
```

## File Locations

- **DiscoveryPage.tsx**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app/src/pages/Discovery/DiscoveryPage.tsx`
- **EnhancedDiscoveryPage.tsx**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app/src/pages/Discovery/EnhancedDiscoveryPage.tsx`
- **Backup**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app/src/pages/Discovery/DiscoveryPage.tsx.backup`

## Key Design Principles

1. **Glass Morphism**: All cards use frosted glass effect with `backdrop-blur-xl`
2. **Subtle Borders**: White borders at 10-30% opacity for definition
3. **Colored Shadows**: Match shadow color to element (pink for likes, blue for super likes)
4. **Gradient Text**: Use gradient backgrounds with `bg-clip-text` for statistics
5. **Dark Overlays**: Photo overlays use `from-black/90` for strong contrast
6. **Consistent Spacing**: Use `rounded-3xl` for cards, `rounded-full` for buttons
7. **Text Hierarchy**: White > Gray-300 > Gray-400 > Gray-500

## Testing Checklist

- [ ] Background is dark (#0A0A0A)
- [ ] All cards have glass effect
- [ ] Text is readable (white/gray-400)
- [ ] Buttons have glow shadows
- [ ] Gradients are smooth
- [ ] Badges have proper shadows
- [ ] Modal has backdrop blur
- [ ] Match animation works
- [ ] Hover states are visible
- [ ] Interest tags are styled
