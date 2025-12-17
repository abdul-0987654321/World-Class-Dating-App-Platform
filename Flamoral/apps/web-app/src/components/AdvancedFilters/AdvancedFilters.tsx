/**
 * Advanced Filters Component
 * Comprehensive filtering for discovery feed
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

interface AdvancedFiltersProps {
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
}

interface SearchFilters {
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
  dealbreakers?: {
    noSmokers?: boolean;
    noDrinkers?: boolean;
    noChildren?: boolean;
    noPets?: boolean;
  };
  verifiedOnly?: boolean;
}

const educationOptions = [
  { value: 'high_school', label: 'High School' },
  { value: 'some_college', label: 'Some College' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'other', label: 'Other' },
];

const religionOptions = [
  { value: 'christian', label: 'Christian' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'atheist', label: 'Atheist' },
  { value: 'agnostic', label: 'Agnostic' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'other', label: 'Other' },
];

const relationshipGoalOptions = [
  { value: 'casual', label: 'Casual Dating' },
  { value: 'long_term', label: 'Long-term Relationship' },
  { value: 'marriage', label: 'Marriage' },
  { value: 'friendship', label: 'Friendship' },
  { value: 'not_sure', label: 'Not Sure Yet' },
];

const commonInterests = [
  'Travel', 'Photography', 'Cooking', 'Music', 'Art', 'Sports',
  'Fitness', 'Reading', 'Movies', 'Gaming', 'Hiking', 'Dancing',
  'Yoga', 'Running', 'Swimming', 'Cycling', 'Camping', 'Foodie',
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  onApply,
  onClose,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    minAge: 18,
    maxAge: 100,
    maxDistance: 50,
    dealbreakers: {},
  });

  const [savedPresets, setSavedPresets] = useState<any[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  useEffect(() => {
    loadSavedPresets();
  }, []);

  const loadSavedPresets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/search/filters', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedPresets(response.data.filters || []);
    } catch (error) {
      console.error('Failed to load saved presets:', error);
    }
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      minAge: 18,
      maxAge: 100,
      maxDistance: 50,
      dealbreakers: {},
    });
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/search/filters',
        { name: presetName, filters },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Filter preset saved!');
      setPresetName('');
      setShowSavePreset(false);
      loadSavedPresets();
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset');
    }
  };

  const handleLoadPreset = (preset: any) => {
    setFilters(preset.filters);
  };

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm('Delete this preset?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/search/filters/${presetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      loadSavedPresets();
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  const toggleArrayValue = (field: keyof SearchFilters, value: string) => {
    const currentValues = (filters[field] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    setFilters({ ...filters, [field]: newValues });
  };

  return (
    <Overlay>
      <Container>
        <Header>
          <Title>Advanced Filters</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>

        <Content>
          {/* Saved Presets */}
          {savedPresets.length > 0 && (
            <Section>
              <SectionTitle>Saved Presets</SectionTitle>
              <PresetGrid>
                {savedPresets.map((preset) => (
                  <Preset key={preset.id}>
                    <PresetName onClick={() => handleLoadPreset(preset)}>
                      {preset.name}
                    </PresetName>
                    <DeleteButton onClick={() => handleDeletePreset(preset.id)}>
                      ✕
                    </DeleteButton>
                  </Preset>
                ))}
              </PresetGrid>
            </Section>
          )}

          {/* Age Range */}
          <Section>
            <SectionTitle>Age Range</SectionTitle>
            <RangeContainer>
              <RangeInput>
                <Label>Min Age: {filters.minAge}</Label>
                <Slider
                  type="range"
                  min="18"
                  max="100"
                  value={filters.minAge}
                  onChange={(e) =>
                    setFilters({ ...filters, minAge: parseInt(e.target.value) })
                  }
                />
              </RangeInput>
              <RangeInput>
                <Label>Max Age: {filters.maxAge}</Label>
                <Slider
                  type="range"
                  min="18"
                  max="100"
                  value={filters.maxAge}
                  onChange={(e) =>
                    setFilters({ ...filters, maxAge: parseInt(e.target.value) })
                  }
                />
              </RangeInput>
            </RangeContainer>
          </Section>

          {/* Distance */}
          <Section>
            <SectionTitle>Maximum Distance: {filters.maxDistance} km</SectionTitle>
            <Slider
              type="range"
              min="1"
              max="500"
              value={filters.maxDistance}
              onChange={(e) =>
                setFilters({ ...filters, maxDistance: parseInt(e.target.value) })
              }
            />
          </Section>

          {/* Height Range */}
          <Section>
            <SectionTitle>Height Range (cm)</SectionTitle>
            <RangeContainer>
              <Input
                type="number"
                placeholder="Min Height"
                value={filters.minHeight || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minHeight: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
              <span>to</span>
              <Input
                type="number"
                placeholder="Max Height"
                value={filters.maxHeight || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxHeight: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </RangeContainer>
          </Section>

          {/* Education */}
          <Section>
            <SectionTitle>Education</SectionTitle>
            <ChipGrid>
              {educationOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={filters.education?.includes(option.value)}
                  onClick={() => toggleArrayValue('education', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* Religion */}
          <Section>
            <SectionTitle>Religion</SectionTitle>
            <ChipGrid>
              {religionOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={filters.religion?.includes(option.value)}
                  onClick={() => toggleArrayValue('religion', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* Relationship Goals */}
          <Section>
            <SectionTitle>Relationship Goals</SectionTitle>
            <ChipGrid>
              {relationshipGoalOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={filters.relationshipGoals?.includes(option.value)}
                  onClick={() => toggleArrayValue('relationshipGoals', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* Interests */}
          <Section>
            <SectionTitle>Interests</SectionTitle>
            <ChipGrid>
              {commonInterests.map((interest) => (
                <Chip
                  key={interest}
                  selected={filters.interests?.includes(interest)}
                  onClick={() => toggleArrayValue('interests', interest)}
                >
                  {interest}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          {/* Dealbreakers */}
          <Section>
            <SectionTitle>Dealbreakers</SectionTitle>
            <CheckboxGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={filters.dealbreakers?.noSmokers || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dealbreakers: {
                        ...filters.dealbreakers,
                        noSmokers: e.target.checked,
                      },
                    })
                  }
                />
                <span>No Smokers</span>
              </CheckboxLabel>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={filters.dealbreakers?.noDrinkers || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dealbreakers: {
                        ...filters.dealbreakers,
                        noDrinkers: e.target.checked,
                      },
                    })
                  }
                />
                <span>No Drinkers</span>
              </CheckboxLabel>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={filters.dealbreakers?.noChildren || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dealbreakers: {
                        ...filters.dealbreakers,
                        noChildren: e.target.checked,
                      },
                    })
                  }
                />
                <span>No Children</span>
              </CheckboxLabel>

              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={filters.dealbreakers?.noPets || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dealbreakers: {
                        ...filters.dealbreakers,
                        noPets: e.target.checked,
                      },
                    })
                  }
                />
                <span>No Pets</span>
              </CheckboxLabel>
            </CheckboxGroup>
          </Section>

          {/* Verified Only */}
          <Section>
            <CheckboxLabel>
              <input
                type="checkbox"
                checked={filters.verifiedOnly || false}
                onChange={(e) =>
                  setFilters({ ...filters, verifiedOnly: e.target.checked })
                }
              />
              <span>Show only verified users</span>
            </CheckboxLabel>
          </Section>

          {/* Save Preset */}
          {showSavePreset ? (
            <Section>
              <SectionTitle>Save Filter Preset</SectionTitle>
              <Input
                type="text"
                placeholder="Preset name (e.g., My Ideal Match)"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <ButtonRow>
                <SecondaryButton onClick={() => setShowSavePreset(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton onClick={handleSavePreset}>
                  Save Preset
                </PrimaryButton>
              </ButtonRow>
            </Section>
          ) : (
            <Section>
              <SecondaryButton onClick={() => setShowSavePreset(true)}>
                Save as Preset
              </SecondaryButton>
            </Section>
          )}
        </Content>

        <Footer>
          <SecondaryButton onClick={handleReset}>Reset All</SecondaryButton>
          <PrimaryButton onClick={handleApply}>Apply Filters</PrimaryButton>
        </Footer>
      </Container>
    </Overlay>
  );
};

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
`;

const Container = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: #333;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
`;

const RangeContainer = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const RangeInput = styled.div`
  flex: 1;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
`;

const Slider = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff6b6b;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff6b6b;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: none;
  }
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #ff6b6b;
  }
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button<{ selected?: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.selected ? '#ff6b6b' : '#e0e0e0'};
  background: ${props => props.selected ? '#ff6b6b' : 'white'};
  color: ${props => props.selected ? 'white' : '#333'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ff6b6b;
    background: ${props => props.selected ? '#ff5555' : '#fff5f5'};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const Preset = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
`;

const PresetName = styled.span`
  font-size: 14px;
  color: #333;
  cursor: pointer;
  flex: 1;

  &:hover {
    color: #ff6b6b;
  }
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #ff6b6b;
  }
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e0e0e0;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
`;

const PrimaryButton = styled.button`
  flex: 1;
  padding: 14px 24px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #ff5555;
  }
`;

const SecondaryButton = styled.button`
  flex: 1;
  padding: 14px 24px;
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ff6b6b;
    color: #ff6b6b;
  }
`;
