/**
 * Advanced Search UI Component
 * Modern, comprehensive search interface with filters and presets
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiSearch,
  FiSliders,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiTrash2,
  FiRotateCcw,
  FiMapPin,
  FiUser,
  FiHeart,
  FiBookmark,
  FiFilter,
} from 'react-icons/fi';

export interface SearchFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  minHeight?: number;
  maxHeight?: number;
  education?: string[];
  occupation?: string[];
  religion?: string[];
  interests?: string[];
  relationshipGoals?: string[];
  lifestyle?: {
    drinking?: string;
    smoking?: string;
    exercise?: string;
    diet?: string;
  };
  dealbreakers?: {
    noSmokers?: boolean;
    noDrinkers?: boolean;
    noChildren?: boolean;
    noPets?: boolean;
  };
  verifiedOnly?: boolean;
  onlineNow?: boolean;
  hasPhoto?: boolean;
  hasBio?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  isDefault: boolean;
  createdAt: Date;
}

interface AdvancedSearchUIProps {
  initialFilters?: SearchFilters;
  presets: FilterPreset[];
  onApply: (filters: SearchFilters) => void;
  onSavePreset: (name: string, filters: SearchFilters) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
  onClose?: () => void;
  isOpen?: boolean;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.3s ease;
`;

const Panel = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transform: ${props => props.isOpen ? 'translateX(0)' : 'translateX(100%)'};
  transition: transform 0.3s ease;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);

  @media (max-width: 480px) {
    max-width: 100%;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: #FF6B6B;
  }
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const PresetsSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PresetsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PresetChip = styled.button<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: ${props => props.active
    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  border: 1px solid ${props => props.active ? 'transparent' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active
      ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
      : 'rgba(255, 255, 255, 0.15)'
    };
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const FilterSection = styled.div<{ expanded?: boolean }>`
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
  animation: ${fadeIn} 0.2s ease-out;
`;

const FilterHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    font-weight: 600;

    svg {
      width: 18px;
      height: 18px;
      color: #4ECDC4;
    }
  }

  .chevron {
    color: rgba(255, 255, 255, 0.5);

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

const FilterContent = styled.div<{ expanded: boolean }>`
  padding: ${props => props.expanded ? '0 16px 16px' : '0'};
  max-height: ${props => props.expanded ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
`;

const RangeSlider = styled.div`
  margin-bottom: 16px;

  .label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }

  .value {
    color: #FF6B6B;
    font-weight: 600;
  }

  input[type="range"] {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
    }
  }
`;

const DualRangeContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;

  input {
    flex: 1;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-size: 14px;
    text-align: center;
    outline: none;

    &:focus {
      border-color: rgba(255, 107, 107, 0.5);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }
  }

  span {
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
  }
`;

const ChipsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ selected?: boolean }>`
  padding: 8px 14px;
  background: ${props => props.selected ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.selected ? 'rgba(78, 205, 196, 0.4)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 20px;
  color: ${props => props.selected ? '#4ECDC4' : 'rgba(255, 255, 255, 0.7)'};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.selected ? 'rgba(78, 205, 196, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
  }
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  .label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const Toggle = styled.button<{ active: boolean }>`
  width: 48px;
  height: 26px;
  background: ${props => props.active ? '#4ECDC4' : 'rgba(255, 255, 255, 0.1)'};
  border: none;
  border-radius: 13px;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${props => props.active ? '25px' : '3px'};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: left 0.2s;
  }
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: ${props => props.variant === 'primary'
    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.variant === 'primary'
      ? '0 8px 24px rgba(255, 107, 107, 0.3)'
      : 'none'
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SavePresetModal = styled.div`
  position: absolute;
  bottom: 100px;
  left: 20px;
  right: 20px;
  background: #2a2a4e;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.2s ease-out;

  .title {
    font-size: 14px;
    font-weight: 600;
    color: white;
    margin-bottom: 12px;
  }

  input {
    width: 100%;
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: white;
    font-size: 14px;
    outline: none;
    margin-bottom: 12px;

    &:focus {
      border-color: rgba(255, 107, 107, 0.5);
    }
  }

  .buttons {
    display: flex;
    gap: 8px;

    button {
      flex: 1;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;

      &.cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
      }

      &.save {
        background: #FF6B6B;
        border: none;
        color: white;
      }
    }
  }
`;

// Filter options
const educationOptions = [
  'High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'PhD', 'Trade School'
];

const religionOptions = [
  'Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Atheist', 'Agnostic', 'Spiritual', 'Other'
];

const relationshipGoalOptions = [
  'Casual Dating', 'Long-term', 'Marriage', 'Friendship', 'Not Sure'
];

const interestOptions = [
  'Travel', 'Photography', 'Cooking', 'Music', 'Art', 'Sports', 'Fitness', 'Reading',
  'Movies', 'Gaming', 'Hiking', 'Dancing', 'Yoga', 'Running', 'Swimming', 'Foodie'
];

const defaultFilters: SearchFilters = {
  minAge: 18,
  maxAge: 99,
  maxDistance: 50,
  dealbreakers: {},
  verifiedOnly: false,
  onlineNow: false,
  hasPhoto: true,
  hasBio: false,
};

export const AdvancedSearchUI: React.FC<AdvancedSearchUIProps> = ({
  initialFilters,
  presets,
  onApply,
  onSavePreset,
  onDeletePreset,
  onClose,
  isOpen = true,
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || defaultFilters);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basics']));
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePresetId(null);
  };

  const toggleArrayValue = (key: keyof SearchFilters, value: string) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateFilter(key, newValues as any);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    setActivePresetId(preset.id);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    setSaving(true);
    try {
      await onSavePreset(presetName, filters);
      setShowSaveModal(false);
      setPresetName('');
    } catch (error) {
      console.error('Failed to save preset:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setActivePresetId(null);
  };

  const handleApply = () => {
    onApply(filters);
    onClose?.();
  };

  return (
    <>
      <Overlay isOpen={isOpen} onClick={onClose} />
      <Panel isOpen={isOpen}>
        <Header>
          <Title>
            <FiSliders />
            Advanced Search
          </Title>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </Header>

        <Content>
          {/* Presets Section */}
          {presets.length > 0 && (
            <PresetsSection>
              <SectionTitle>
                <FiBookmark />
                Saved Presets
              </SectionTitle>
              <PresetsList>
                {presets.map(preset => (
                  <PresetChip
                    key={preset.id}
                    active={activePresetId === preset.id}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.name}
                    {activePresetId === preset.id && <FiCheck />}
                  </PresetChip>
                ))}
              </PresetsList>
            </PresetsSection>
          )}

          {/* Basic Filters */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('basics')}>
              <span className="title">
                <FiUser />
                Basic Preferences
              </span>
              <span className="chevron">
                {expandedSections.has('basics') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('basics')}>
              <RangeSlider>
                <div className="label">
                  <span>Age Range</span>
                  <span className="value">{filters.minAge} - {filters.maxAge}</span>
                </div>
                <DualRangeContainer>
                  <input
                    type="number"
                    value={filters.minAge}
                    onChange={(e) => updateFilter('minAge', Math.max(18, parseInt(e.target.value) || 18))}
                    min={18}
                    max={99}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={filters.maxAge}
                    onChange={(e) => updateFilter('maxAge', Math.min(99, parseInt(e.target.value) || 99))}
                    min={18}
                    max={99}
                  />
                </DualRangeContainer>
              </RangeSlider>

              <RangeSlider>
                <div className="label">
                  <span>Maximum Distance</span>
                  <span className="value">{filters.maxDistance} km</span>
                </div>
                <input
                  type="range"
                  value={filters.maxDistance}
                  onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
                  min={1}
                  max={500}
                />
              </RangeSlider>

              <RangeSlider>
                <div className="label">
                  <span>Height Range (cm)</span>
                  <span className="value">
                    {filters.minHeight || 'Any'} - {filters.maxHeight || 'Any'}
                  </span>
                </div>
                <DualRangeContainer>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minHeight || ''}
                    onChange={(e) => updateFilter('minHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                    min={120}
                    max={220}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxHeight || ''}
                    onChange={(e) => updateFilter('maxHeight', e.target.value ? parseInt(e.target.value) : undefined)}
                    min={120}
                    max={220}
                  />
                </DualRangeContainer>
              </RangeSlider>
            </FilterContent>
          </FilterSection>

          {/* Interests */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('interests')}>
              <span className="title">
                <FiHeart />
                Interests
              </span>
              <span className="chevron">
                {expandedSections.has('interests') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('interests')}>
              <ChipsGrid>
                {interestOptions.map(interest => (
                  <Chip
                    key={interest}
                    selected={filters.interests?.includes(interest)}
                    onClick={() => toggleArrayValue('interests', interest)}
                  >
                    {interest}
                  </Chip>
                ))}
              </ChipsGrid>
            </FilterContent>
          </FilterSection>

          {/* Background */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('background')}>
              <span className="title">
                <FiMapPin />
                Background
              </span>
              <span className="chevron">
                {expandedSections.has('background') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('background')}>
              <SectionTitle style={{ marginTop: 8 }}>Education</SectionTitle>
              <ChipsGrid>
                {educationOptions.map(edu => (
                  <Chip
                    key={edu}
                    selected={filters.education?.includes(edu)}
                    onClick={() => toggleArrayValue('education', edu)}
                  >
                    {edu}
                  </Chip>
                ))}
              </ChipsGrid>

              <SectionTitle style={{ marginTop: 16 }}>Religion</SectionTitle>
              <ChipsGrid>
                {religionOptions.map(religion => (
                  <Chip
                    key={religion}
                    selected={filters.religion?.includes(religion)}
                    onClick={() => toggleArrayValue('religion', religion)}
                  >
                    {religion}
                  </Chip>
                ))}
              </ChipsGrid>
            </FilterContent>
          </FilterSection>

          {/* Relationship Goals */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('goals')}>
              <span className="title">
                <FiHeart />
                Looking For
              </span>
              <span className="chevron">
                {expandedSections.has('goals') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('goals')}>
              <ChipsGrid>
                {relationshipGoalOptions.map(goal => (
                  <Chip
                    key={goal}
                    selected={filters.relationshipGoals?.includes(goal)}
                    onClick={() => toggleArrayValue('relationshipGoals', goal)}
                  >
                    {goal}
                  </Chip>
                ))}
              </ChipsGrid>
            </FilterContent>
          </FilterSection>

          {/* Profile Quality */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('quality')}>
              <span className="title">
                <FiFilter />
                Profile Quality
              </span>
              <span className="chevron">
                {expandedSections.has('quality') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('quality')}>
              <ToggleRow>
                <span className="label">Verified profiles only</span>
                <Toggle
                  active={filters.verifiedOnly || false}
                  onClick={() => updateFilter('verifiedOnly', !filters.verifiedOnly)}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">Online now</span>
                <Toggle
                  active={filters.onlineNow || false}
                  onClick={() => updateFilter('onlineNow', !filters.onlineNow)}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">Has photos</span>
                <Toggle
                  active={filters.hasPhoto || false}
                  onClick={() => updateFilter('hasPhoto', !filters.hasPhoto)}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">Has bio</span>
                <Toggle
                  active={filters.hasBio || false}
                  onClick={() => updateFilter('hasBio', !filters.hasBio)}
                />
              </ToggleRow>
            </FilterContent>
          </FilterSection>

          {/* Dealbreakers */}
          <FilterSection>
            <FilterHeader onClick={() => toggleSection('dealbreakers')}>
              <span className="title">
                <FiX />
                Dealbreakers
              </span>
              <span className="chevron">
                {expandedSections.has('dealbreakers') ? <FiChevronUp /> : <FiChevronDown />}
              </span>
            </FilterHeader>
            <FilterContent expanded={expandedSections.has('dealbreakers')}>
              <ToggleRow>
                <span className="label">No smokers</span>
                <Toggle
                  active={filters.dealbreakers?.noSmokers || false}
                  onClick={() => updateFilter('dealbreakers', {
                    ...filters.dealbreakers,
                    noSmokers: !filters.dealbreakers?.noSmokers
                  })}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">No drinkers</span>
                <Toggle
                  active={filters.dealbreakers?.noDrinkers || false}
                  onClick={() => updateFilter('dealbreakers', {
                    ...filters.dealbreakers,
                    noDrinkers: !filters.dealbreakers?.noDrinkers
                  })}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">No children</span>
                <Toggle
                  active={filters.dealbreakers?.noChildren || false}
                  onClick={() => updateFilter('dealbreakers', {
                    ...filters.dealbreakers,
                    noChildren: !filters.dealbreakers?.noChildren
                  })}
                />
              </ToggleRow>
              <ToggleRow>
                <span className="label">No pets</span>
                <Toggle
                  active={filters.dealbreakers?.noPets || false}
                  onClick={() => updateFilter('dealbreakers', {
                    ...filters.dealbreakers,
                    noPets: !filters.dealbreakers?.noPets
                  })}
                />
              </ToggleRow>
            </FilterContent>
          </FilterSection>
        </Content>

        <Footer>
          <Button variant="secondary" onClick={handleReset}>
            <FiRotateCcw />
            Reset
          </Button>
          <Button variant="secondary" onClick={() => setShowSaveModal(true)}>
            <FiSave />
            Save
          </Button>
          <Button variant="primary" onClick={handleApply}>
            <FiSearch />
            Apply
          </Button>
        </Footer>

        {/* Save Preset Modal */}
        {showSaveModal && (
          <SavePresetModal>
            <div className="title">Save Filter Preset</div>
            <input
              type="text"
              placeholder="Preset name (e.g., My Ideal Match)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              autoFocus
            />
            <div className="buttons">
              <button className="cancel" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button className="save" onClick={handleSavePreset} disabled={saving || !presetName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </SavePresetModal>
        )}
      </Panel>
    </>
  );
};

export default AdvancedSearchUI;
