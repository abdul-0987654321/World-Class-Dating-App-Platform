/**
 * VirtualList - High-Performance Virtual Scrolling Component
 *
 * Features:
 * - Renders only visible items for 60fps scrolling
 * - Variable height item support
 * - Smooth scrolling with momentum
 * - Efficient memory usage
 * - Supports both vertical and horizontal scrolling
 *
 * @package @flamoral/web
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number | ((item: T, index: number) => number);
  overscan?: number;
  className?: string;
  containerClassName?: string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  getItemKey?: (item: T, index: number) => string;
  estimatedItemSize?: number;
}

export interface VirtualListRef {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getItemHeight = <T,>(
  itemHeight: number | ((item: T, index: number) => number),
  item: T,
  index: number
): number => {
  return typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight;
};

// Binary search for finding start index
const findStartIndex = (
  scrollTop: number,
  itemOffsets: number[]
): number => {
  let low = 0;
  let high = itemOffsets.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (itemOffsets[mid] <= scrollTop) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return Math.max(0, low - 1);
};

// ============================================================================
// VIRTUAL LIST COMPONENT
// ============================================================================

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>
) {
  const {
    items,
    renderItem,
    itemHeight,
    overscan = 5,
    className = '',
    containerClassName = '',
    onEndReached,
    onEndReachedThreshold = 0.8,
    ListHeaderComponent,
    ListFooterComponent,
    ListEmptyComponent,
    keyExtractor,
    getItemKey,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const endReachedCalledRef = useRef(false);

  // Calculate item offsets and total height
  const { itemOffsets, totalHeight } = useMemo(() => {
    const offsets: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      offsets.push(total);
      total += getItemHeight(itemHeight, items[i], i);
    }

    return { itemOffsets: offsets, totalHeight: total };
  }, [items, itemHeight]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    const start = findStartIndex(scrollTop, itemOffsets);
    let end = start;

    let currentHeight = 0;
    while (end < items.length && currentHeight < containerHeight + scrollTop - itemOffsets[start]) {
      currentHeight += getItemHeight(itemHeight, items[end], end);
      end++;
    }

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, containerHeight, items, itemHeight, itemOffsets, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Check for end reached
    const scrollPercentage =
      (target.scrollTop + target.clientHeight) / target.scrollHeight;

    if (scrollPercentage > onEndReachedThreshold && !endReachedCalledRef.current) {
      endReachedCalledRef.current = true;
      onEndReached?.();
    } else if (scrollPercentage < onEndReachedThreshold) {
      endReachedCalledRef.current = false;
    }
  }, [onEndReached, onEndReachedThreshold]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number, options = {}) => {
      const container = containerRef.current;
      if (!container || index < 0 || index >= items.length) return;

      const offset = itemOffsets[index];
      const itemSize = getItemHeight(itemHeight, items[index], index);
      let scrollPosition = offset;

      if (options.align === 'center') {
        scrollPosition = offset - containerHeight / 2 + itemSize / 2;
      } else if (options.align === 'end') {
        scrollPosition = offset - containerHeight + itemSize;
      }

      container.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    },
    scrollToTop: () => {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    scrollToBottom: () => {
      containerRef.current?.scrollTo({
        top: totalHeight,
        behavior: 'smooth',
      });
    },
  }), [items, itemHeight, itemOffsets, containerHeight, totalHeight]);

  // Get key for item
  const getKey = useCallback((item: T, index: number): string => {
    if (getItemKey) return getItemKey(item, index);
    if (keyExtractor) return keyExtractor(item, index);
    return `virtual-item-${index}`;
  }, [getItemKey, keyExtractor]);

  // Render visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, i) => {
      const index = startIndex + i;
      const offset = itemOffsets[index];
      const height = getItemHeight(itemHeight, item, index);

      return (
        <div
          key={getKey(item, index)}
          className="absolute left-0 right-0"
          style={{
            transform: `translateY(${offset}px)`,
            height,
            willChange: 'transform',
          }}
        >
          {renderItem(item, index)}
        </div>
      );
    });
  }, [items, startIndex, endIndex, itemOffsets, itemHeight, renderItem, getKey]);

  // Empty state
  if (items.length === 0 && ListEmptyComponent) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        {ListEmptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ overscrollBehavior: 'contain' }}
    >
      {ListHeaderComponent}

      <div
        className={`relative ${containerClassName}`}
        style={{ height: totalHeight }}
      >
        {visibleItems}
      </div>

      {ListFooterComponent}
    </div>
  );
}

export const VirtualList = memo(forwardRef(VirtualListInner)) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListRef> }
) => React.ReactElement;

// ============================================================================
// VIRTUAL GRID COMPONENT
// ============================================================================

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  rowHeight: number;
  gap?: number;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  keyExtractor?: (item: T, index: number) => string;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  columnCount,
  rowHeight,
  gap = 0,
  overscan = 2,
  className = '',
  onEndReached,
  keyExtractor,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const rowCount = Math.ceil(items.length / columnCount);
  const totalRowHeight = rowHeight + gap;
  const totalHeight = rowCount * totalRowHeight - gap;

  // Calculate visible rows
  const { startRow, endRow } = useMemo(() => {
    const start = Math.floor(scrollTop / totalRowHeight);
    const visibleRows = Math.ceil(containerHeight / totalRowHeight);

    return {
      startRow: Math.max(0, start - overscan),
      endRow: Math.min(rowCount, start + visibleRows + overscan),
    };
  }, [scrollTop, containerHeight, totalRowHeight, rowCount, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // Check for end reached
    if (
      target.scrollTop + target.clientHeight >=
      target.scrollHeight - totalRowHeight * 2
    ) {
      onEndReached?.();
    }
  }, [onEndReached, totalRowHeight]);

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      setContainerHeight(entries[0]?.contentRect.height || 0);
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Render visible rows
  const visibleRows = useMemo(() => {
    const rows: React.ReactNode[] = [];

    for (let row = startRow; row < endRow; row++) {
      const rowItems: React.ReactNode[] = [];
      const startIndex = row * columnCount;

      for (let col = 0; col < columnCount; col++) {
        const index = startIndex + col;
        if (index >= items.length) break;

        const item = items[index];
        const key = keyExtractor ? keyExtractor(item, index) : `grid-item-${index}`;

        rowItems.push(
          <div
            key={key}
            className="flex-shrink-0"
            style={{
              width: `calc((100% - ${(columnCount - 1) * gap}px) / ${columnCount})`,
            }}
          >
            {renderItem(item, index)}
          </div>
        );
      }

      rows.push(
        <div
          key={`row-${row}`}
          className="absolute left-0 right-0 flex"
          style={{
            transform: `translateY(${row * totalRowHeight}px)`,
            height: rowHeight,
            gap,
          }}
        >
          {rowItems}
        </div>
      );
    }

    return rows;
  }, [
    startRow,
    endRow,
    columnCount,
    items,
    renderItem,
    keyExtractor,
    totalRowHeight,
    rowHeight,
    gap,
  ]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ overscrollBehavior: 'contain' }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleRows}
      </div>
    </div>
  );
}

// ============================================================================
// CONVERSATION LIST (Specialized Virtual List)
// ============================================================================

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isTyping?: boolean;
}

export interface ConversationListProps {
  conversations: Conversation[];
  onConversationClick: (conversation: Conversation) => void;
  className?: string;
}

export const VirtualConversationList = memo<ConversationListProps>(({
  conversations,
  onConversationClick,
  className = '',
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  };

  const renderConversation = useCallback(
    (conversation: Conversation) => (
      <button
        onClick={() => onConversationClick(conversation)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
      >
        <div className="relative flex-shrink-0">
          <img
            src={conversation.userPhoto}
            alt={conversation.userName}
            className="w-14 h-14 rounded-full object-cover"
            loading="lazy"
          />
          {conversation.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-gray-900 truncate">
              {conversation.userName}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatTime(conversation.lastMessageTime)}
            </span>
          </div>

          <p
            className={`text-sm truncate ${
              conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
            }`}
          >
            {conversation.isTyping ? (
              <span className="text-pink-500 italic">Typing...</span>
            ) : (
              conversation.lastMessage
            )}
          </p>
        </div>
      </button>
    ),
    [onConversationClick]
  );

  return (
    <VirtualList
      items={conversations}
      renderItem={renderConversation}
      itemHeight={82}
      className={className}
      keyExtractor={(conv) => conv.id}
      ListEmptyComponent={
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-gray-500 text-center">No conversations yet</p>
          <p className="text-gray-400 text-sm text-center mt-1">Start swiping to find matches!</p>
        </div>
      }
    />
  );
});

VirtualConversationList.displayName = 'VirtualConversationList';

// ============================================================================
// MATCHES GRID (Specialized Virtual Grid)
// ============================================================================

export interface Match {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  matchedAt: Date;
  isNew?: boolean;
}

export interface MatchesGridProps {
  matches: Match[];
  onMatchClick: (match: Match) => void;
  className?: string;
}

export const VirtualMatchesGrid = memo<MatchesGridProps>(({
  matches,
  onMatchClick,
  className = '',
}) => {
  const renderMatch = useCallback(
    (match: Match) => (
      <button
        onClick={() => onMatchClick(match)}
        className="relative aspect-square rounded-xl overflow-hidden group"
      >
        <img
          src={match.userPhoto}
          alt={match.userName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white font-medium text-sm truncate">{match.userName}</p>
        </div>
        {match.isNew && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-pink-500 text-white text-xs font-medium rounded-full">
            New
          </span>
        )}
      </button>
    ),
    [onMatchClick]
  );

  return (
    <VirtualGrid
      items={matches}
      renderItem={renderMatch}
      columnCount={2}
      rowHeight={180}
      gap={12}
      className={className}
      keyExtractor={(match) => match.id}
    />
  );
});

VirtualMatchesGrid.displayName = 'VirtualMatchesGrid';

export default VirtualList;
