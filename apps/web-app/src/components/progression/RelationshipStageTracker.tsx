/**
 * Relationship Stage Tracker Component
 * Visual progression through relationship stages with current status
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useProgression } from '../../hooks/useRelationshipProgression';
import { RelationshipStage, StageInfo } from '../../services/relationship-progression.service';

interface RelationshipStageTrackerProps {
  conversationId: string;
  onStageChange?: (newStage: RelationshipStage) => void;
  compact?: boolean;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
`;

const Container = styled.div<{ $compact?: boolean }>`
  background: var(--color-surface);
  border-radius: 16px;
  padding: ${(props) => (props.$compact ? '16px' : '24px')};
  box-shadow: var(--shadow-md);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
`;

const DaysCounter = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text-secondary);

  span {
    font-weight: 600;
    color: var(--color-primary);
  }
`;

const StagesContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: ${(props) => (props.$compact ? '0' : '0 10px')};

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--color-border);
    transform: translateY(-50%);
    z-index: 0;
  }
`;

const ProgressLine = styled.div<{ $progress: number }>`
  position: absolute;
  top: 50%;
  left: 0;
  width: ${(props) => props.$progress}%;
  height: 4px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transform: translateY(-50%);
  z-index: 1;
  transition: width 0.5s ease;
`;

const StageItem = styled.div<{ $isActive: boolean; $isPast: boolean; $isFuture: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 2;
  cursor: ${(props) => (props.$isFuture ? 'default' : 'pointer')};
  opacity: ${(props) => (props.$isFuture ? 0.5 : 1)};
`;

const StageCircle = styled.div<{ $isActive: boolean; $isPast: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${(props) =>
    props.$isActive
      ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
      : props.$isPast
        ? 'var(--color-primary)'
        : 'var(--color-surface)'};
  border: 3px solid
    ${(props) => (props.$isActive || props.$isPast ? 'transparent' : 'var(--color-border)')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  animation: ${(props) => (props.$isActive ? pulse : 'none')} 2s ease-in-out infinite;
  box-shadow: ${(props) => (props.$isActive ? '0 0 20px rgba(236, 72, 153, 0.4)' : 'none')};
  transition: all 0.3s ease;
`;

const StageLabel = styled.span<{ $isActive: boolean; $compact?: boolean }>`
  font-size: ${(props) => (props.$compact ? '10px' : '12px')};
  font-weight: ${(props) => (props.$isActive ? '600' : '400')};
  color: ${(props) => (props.$isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)')};
  text-align: center;
  max-width: 70px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CurrentStageInfo = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(0, 217, 165, 0.1));
  border-radius: 12px;
  text-align: center;
`;

const CurrentStageTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
`;

const CurrentStageDescription = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
`;

const HealthMetrics = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 20px;
`;

const Metric = styled.div`
  flex: 1;
  padding: 12px;
  background: var(--color-background);
  border-radius: 10px;
  text-align: center;
`;

const MetricValue = styled.div<{ $color: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => props.$color};
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary);
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: var(--color-error);
  text-align: center;
`;

export const RelationshipStageTracker: React.FC<RelationshipStageTrackerProps> = ({
  conversationId,
  onStageChange,
  compact = false,
}) => {
  const { progression, stages, isLoading, error, updateStage } = useProgression(conversationId);

  if (isLoading) {
    return (
      <Container $compact={compact}>
        <LoadingContainer>Loading relationship progress...</LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container $compact={compact}>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (!progression) {
    return (
      <Container $compact={compact}>
        <LoadingContainer>No progression data found</LoadingContainer>
      </Container>
    );
  }

  const currentStageIndex = stages.findIndex((s) => s.stage === progression.currentStage);
  const progressPercent = (currentStageIndex / (stages.length - 1)) * 100;
  const currentStageInfo = stages[currentStageIndex];

  const totalDays = Math.floor(
    (Date.now() - new Date(progression.startedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleStageClick = async (stage: StageInfo, index: number) => {
    if (index <= currentStageIndex) return; // Can only advance forward
    if (index > currentStageIndex + 1) return; // Can only advance one step at a time

    await updateStage(stage.stage);
    onStageChange?.(stage.stage);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)';
    if (score >= 60) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  // Show fewer stages in compact mode
  const displayStages = compact
    ? stages.filter((_, i) => i % 2 === 0 || i === currentStageIndex)
    : stages;

  return (
    <Container $compact={compact}>
      <Header>
        <Title>Your Journey Together</Title>
        <DaysCounter>
          <span>{totalDays}</span> days connected
        </DaysCounter>
      </Header>

      <StagesContainer $compact={compact}>
        <ProgressLine $progress={progressPercent} />
        {displayStages.map((stage, index) => {
          const actualIndex = stages.findIndex((s) => s.stage === stage.stage);
          const isActive = actualIndex === currentStageIndex;
          const isPast = actualIndex < currentStageIndex;
          const isFuture = actualIndex > currentStageIndex;

          return (
            <StageItem
              key={stage.stage}
              $isActive={isActive}
              $isPast={isPast}
              $isFuture={isFuture}
              onClick={() => handleStageClick(stage, actualIndex)}
            >
              <StageCircle $isActive={isActive} $isPast={isPast}>
                {stage.emoji}
              </StageCircle>
              {!compact && (
                <StageLabel $isActive={isActive} $compact={compact}>
                  {stage.title}
                </StageLabel>
              )}
            </StageItem>
          );
        })}
      </StagesContainer>

      {!compact && currentStageInfo && (
        <>
          <CurrentStageInfo>
            <CurrentStageTitle>
              {currentStageInfo.emoji} {currentStageInfo.title}
            </CurrentStageTitle>
            <CurrentStageDescription>{currentStageInfo.description}</CurrentStageDescription>
          </CurrentStageInfo>

          <HealthMetrics>
            <Metric>
              <MetricValue $color={getHealthColor(progression.healthScore)}>
                {progression.healthScore}%
              </MetricValue>
              <MetricLabel>Relationship Health</MetricLabel>
            </Metric>
            <Metric>
              <MetricValue $color={getHealthColor(progression.mutualEngagement)}>
                {progression.mutualEngagement}%
              </MetricValue>
              <MetricLabel>Mutual Engagement</MetricLabel>
            </Metric>
          </HealthMetrics>
        </>
      )}
    </Container>
  );
};

export default RelationshipStageTracker;
