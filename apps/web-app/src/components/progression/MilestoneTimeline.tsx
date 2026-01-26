/**
 * Milestone Timeline Component
 * Visual timeline of relationship milestones and achievements
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMilestones, useTimeline } from '../../hooks/useRelationshipProgression';
import {
  Milestone,
  MilestoneTemplate,
  CelebrationPrompt,
} from '../../services/relationship-progression.service';

interface MilestoneTimelineProps {
  progressionId: string;
  onCelebrate?: (milestone: Milestone) => void;
}

const sparkle = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
`;

const Container = styled.div`
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-md);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MilestoneCount = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 4px 10px;
  border-radius: 12px;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
  }
`;

const Timeline = styled.div`
  position: relative;
  padding-left: 30px;

  &::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(
      180deg,
      var(--color-primary) 0%,
      var(--color-secondary) 50%,
      var(--color-border) 100%
    );
  }
`;

const MilestoneItem = styled.div<{ $hasCelebration?: boolean }>`
  position: relative;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--color-background);
  border-radius: 12px;
  border: ${(props) =>
    props.$hasCelebration ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'};
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateX(4px);
    box-shadow: var(--shadow-sm);
  }

  &::before {
    content: '';
    position: absolute;
    left: -26px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${(props) =>
      props.$hasCelebration ? 'var(--color-primary)' : 'var(--color-surface)'};
    border: 3px solid var(--color-primary);
    z-index: 1;
  }
`;

const MilestoneHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const MilestoneInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MilestoneEmoji = styled.span`
  font-size: 24px;
`;

const MilestoneDetails = styled.div``;

const MilestoneTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
`;

const MilestoneDate = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const MilestoneDescription = styled.p`
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 8px 0 0 0;
  line-height: 1.5;
`;

const CelebrationBanner = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(0, 217, 165, 0.1));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CelebrationText = styled.div`
  font-size: 13px;
  color: var(--color-text-secondary);

  span {
    animation: ${sparkle} 1.5s ease-in-out infinite;
    display: inline-block;
  }
`;

const CelebrateButton = styled.button`
  padding: 6px 12px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

const CelebratedBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-success);
  font-weight: 500;
`;

const MemoriesSection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
`;

const MemoriesTitle = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
`;

const MemoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-surface);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  margin-bottom: 6px;
`;

const MemoryIcon = styled.span`
  opacity: 0.7;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
`;

const EmptyEmoji = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  margin-bottom: 8px;
`;

const EmptySubtext = styled.div`
  font-size: 14px;
  opacity: 0.8;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const TemplateGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const TemplateCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s,
    transform 0.2s;

  &:hover {
    border-color: var(--color-primary);
    transform: translateX(4px);
  }
`;

const TemplateEmoji = styled.span`
  font-size: 28px;
`;

const TemplateInfo = styled.div``;

const TemplateName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
`;

const TemplateDesc = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary);
`;

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  progressionId,
  onCelebrate,
}) => {
  const { milestones, templates, celebrationPrompts, isLoading, createMilestone, celebrate } =
    useMilestones(progressionId);
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Loading milestones...</LoadingState>
      </Container>
    );
  }

  const getTemplateForMilestone = (type: string): MilestoneTemplate | undefined => {
    return templates.find((t) => t.type === type);
  };

  const getCelebrationPrompt = (milestoneId: string): CelebrationPrompt | undefined => {
    return celebrationPrompts.find((p) => p.milestoneId === milestoneId);
  };

  const handleCelebrate = async (milestone: Milestone) => {
    await celebrate(milestone.id);
    onCelebrate?.(milestone);
  };

  const handleAddMilestone = async (template: MilestoneTemplate) => {
    await createMilestone(template.type, template.title, template.description);
    setShowAddModal(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'photo':
        return '📸';
      case 'voice':
        return '🎤';
      case 'location':
        return '📍';
      default:
        return '💫';
    }
  };

  return (
    <>
      <Container>
        <Header>
          <Title>
            ✨ Milestones
            <MilestoneCount>{milestones.length} achieved</MilestoneCount>
          </Title>
          <AddButton onClick={() => setShowAddModal(true)}>+ Add Milestone</AddButton>
        </Header>

        {milestones.length === 0 ? (
          <EmptyState>
            <EmptyEmoji>🌟</EmptyEmoji>
            <EmptyText>Your journey is just beginning</EmptyText>
            <EmptySubtext>Milestones will appear here as you grow together</EmptySubtext>
          </EmptyState>
        ) : (
          <Timeline>
            {milestones.map((milestone) => {
              const template = getTemplateForMilestone(milestone.type);
              const celebrationPrompt = getCelebrationPrompt(milestone.id);
              const hasCelebrated = milestone.celebratedBy.length > 0;

              return (
                <MilestoneItem key={milestone.id} $hasCelebration={!!celebrationPrompt}>
                  <MilestoneHeader>
                    <MilestoneInfo>
                      <MilestoneEmoji>{template?.iconEmoji || '✨'}</MilestoneEmoji>
                      <MilestoneDetails>
                        <MilestoneTitle>{milestone.title}</MilestoneTitle>
                        <MilestoneDate>{formatDate(milestone.achievedAt)}</MilestoneDate>
                      </MilestoneDetails>
                    </MilestoneInfo>
                    {hasCelebrated && <CelebratedBadge>🎉 Celebrated</CelebratedBadge>}
                  </MilestoneHeader>

                  {milestone.description && (
                    <MilestoneDescription>{milestone.description}</MilestoneDescription>
                  )}

                  {celebrationPrompt && !hasCelebrated && (
                    <CelebrationBanner>
                      <CelebrationText>
                        <span>✨</span> Time to celebrate this moment!
                      </CelebrationText>
                      <CelebrateButton onClick={() => handleCelebrate(milestone)}>
                        Celebrate 🎉
                      </CelebrateButton>
                    </CelebrationBanner>
                  )}

                  {milestone.memories.length > 0 && (
                    <MemoriesSection>
                      <MemoriesTitle>Memories</MemoriesTitle>
                      {milestone.memories.map((memory) => (
                        <MemoryItem key={memory.id}>
                          <MemoryIcon>{getMemoryIcon(memory.type)}</MemoryIcon>
                          {memory.content}
                        </MemoryItem>
                      ))}
                    </MemoriesSection>
                  )}
                </MilestoneItem>
              );
            })}
          </Timeline>
        )}
      </Container>

      {showAddModal && (
        <ModalOverlay onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Add a Milestone</ModalTitle>
            <TemplateGrid>
              {templates
                .filter((t) => !t.autoDetectable)
                .map((template) => (
                  <TemplateCard key={template.type} onClick={() => handleAddMilestone(template)}>
                    <TemplateEmoji>{template.iconEmoji}</TemplateEmoji>
                    <TemplateInfo>
                      <TemplateName>{template.title}</TemplateName>
                      <TemplateDesc>{template.description}</TemplateDesc>
                    </TemplateInfo>
                  </TemplateCard>
                ))}
            </TemplateGrid>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default MilestoneTimeline;
