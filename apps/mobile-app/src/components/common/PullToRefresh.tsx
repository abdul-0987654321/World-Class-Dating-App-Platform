import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';

interface PullToRefreshProps extends Partial<RefreshControlProps> {
  refreshing: boolean;
  onRefresh: () => void;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  refreshing,
  onRefresh,
  ...props
}) => {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#FF6B6B"
      colors={['#FF6B6B']}
      progressBackgroundColor="#FFFFFF"
      {...props}
    />
  );
};

export default PullToRefresh;
