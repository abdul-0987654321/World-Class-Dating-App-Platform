/**
 * View Toggle Component
 * Toggle between Grid and Swipe card views
 */

import React from 'react';
import styled from 'styled-components';
import { FiGrid, FiLayers } from 'react-icons/fi';

export type DiscoveryViewMode = 'swipe' | 'grid';

interface ViewToggleProps {
  currentView: DiscoveryViewMode;
  onViewChange: (view: DiscoveryViewMode) => void;
  disabled?: boolean;
}

const ToggleContainer = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ToggleButton = styled.button<{ active: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  background: ${(props) =>
    props.active ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)' : 'transparent'};
  color: ${(props) => (props.active ? 'white' : 'rgba(255, 255, 255, 0.6)')};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.active
        ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
        : 'rgba(255, 255, 255, 0.1)'};
    color: white;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 12px;

    span {
      display: none;
    }
  }
`;

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  disabled = false,
}) => {
  return (
    <ToggleContainer>
      <ToggleButton
        active={currentView === 'swipe'}
        onClick={() => onViewChange('swipe')}
        disabled={disabled}
        title="Swipe View"
      >
        <FiLayers />
        <span>Cards</span>
      </ToggleButton>
      <ToggleButton
        active={currentView === 'grid'}
        onClick={() => onViewChange('grid')}
        disabled={disabled}
        title="Grid View"
      >
        <FiGrid />
        <span>Grid</span>
      </ToggleButton>
    </ToggleContainer>
  );
};

export default ViewToggle;
