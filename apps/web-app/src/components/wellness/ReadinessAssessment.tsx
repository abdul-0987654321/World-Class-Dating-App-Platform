/**
 * ReadinessAssessment Component
 * Displays relationship readiness assessment results and recommendations
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useReadiness } from '../../hooks/useWellness';
import { ReadinessAssessment as ReadinessData } from '../../services/wellness.service';

interface ReadinessAssessmentProps {
  onTakeAssessment?: () => void;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  animation: ${fadeIn} 0.3s ease-out;
`;

const Section = styled.section`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TitleIcon = styled.span`
  font-size: 24px;
`;

const RetakeButton = styled.button`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ScoreSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const ScoreCircle = styled.div`
  position: relative;
  width: 140px;
  height: 140px;
  flex-shrink: 0;
`;

const ScoreRing = styled.svg`
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`;

const ScoreBackground = styled.circle`
  fill: none;
  stroke: ${({ theme }) => theme.colors.border};
  stroke-width: 10;
`;

const ScoreProgress = styled.circle<{ $score: number }>`
  fill: none;
  stroke: url(#readinessGradient);
  stroke-width: 10;
  stroke-linecap: round;
  stroke-dasharray: ${({ $score }) => `${$score * 2.83} 283`};
  transition: stroke-dasharray 1s ease-out;
`;

const ScoreValue = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;

const ScoreNumber = styled.div`
  font-size: 40px;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  background: linear-gradient(135deg, #ec4899 0%, #7b61ff 50%, #2ed4ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
`;

const ScoreDetails = styled.div`
  flex: 1;
`;

const ReadinessLevel = styled.div<{ $level: ReadinessData['readinessLevel'] }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  background: ${({ $level }) => {
    switch ($level) {
      case 'ready':
        return 'rgba(0, 217, 165, 0.15)';
      case 'almost_ready':
        return 'rgba(59, 130, 246, 0.15)';
      case 'needs_work':
        return 'rgba(245, 158, 11, 0.15)';
      default:
        return 'rgba(239, 68, 68, 0.15)';
    }
  }};
  color: ${({ $level }) => {
    switch ($level) {
      case 'ready':
        return '#00d9a5';
      case 'almost_ready':
        return '#3b82f6';
      case 'needs_work':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  }};
`;

const LevelDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
  line-height: 1.6;
`;

const DimensionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const DimensionCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
`;

const DimensionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const DimensionName = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  text-transform: capitalize;
`;

const DimensionScore = styled.span<{ $score: number }>`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ $score }) => ($score >= 70 ? '#00d9a5' : $score >= 50 ? '#f59e0b' : '#ef4444')};
`;

const ProgressBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Progress = styled.div<{ $value: number }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  background: ${({ $value }) =>
    $value >= 70
      ? 'linear-gradient(90deg, #00d9a5, #22c55e)'
      : $value >= 50
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : 'linear-gradient(90deg, #ef4444, #f87171)'};
  border-radius: 3px;
  transition: width 0.5s ease-out;
`;

const DimensionFeedback = styled.p`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

const InsightsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const InsightCard = styled.div<{ $type: 'strength' | 'growth' }>`
  background: ${({ $type }) =>
    $type === 'strength' ? 'rgba(0, 217, 165, 0.08)' : 'rgba(245, 158, 11, 0.08)'};
  border-left: 3px solid ${({ $type }) => ($type === 'strength' ? '#00d9a5' : '#f59e0b')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const InsightTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InsightList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const InsightItem = styled.li`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 4px 0;

  &:before {
    content: '•';
    margin-right: 8px;
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const ActionsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionsTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ActionNumber = styled.span`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.gradient};
  border-radius: 50%;
  color: white;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  flex-shrink: 0;
`;

const ActionText = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  flex: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg};
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const StartButton = styled.button`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  background: ${({ theme }) => theme.colors.gradient};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: white;
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(236, 72, 153, 0.3);
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const levelMessages: Record<ReadinessData['readinessLevel'], string> = {
  ready:
    "You're well-prepared for a healthy relationship! Your emotional intelligence and self-awareness are excellent foundations.",
  almost_ready:
    "You're close to being fully ready. A few areas could use some attention, but you're in a good place overall.",
  needs_work:
    'There are some areas to work on before diving into dating. Taking time to address these will lead to better connections.',
  not_ready:
    "It might be helpful to focus on personal growth right now. There's no rush - take the time you need.",
};

const formatDimensionName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

export const ReadinessAssessmentComponent: React.FC<ReadinessAssessmentProps> = ({
  onTakeAssessment,
}) => {
  const { assessment, isLoading } = useReadiness();

  if (isLoading) {
    return (
      <Container>
        <Section>
          <LoadingContainer>
            <LoadingSpinner />
            <p style={{ marginTop: '16px', color: '#9ca3af' }}>Loading your assessment...</p>
          </LoadingContainer>
        </Section>
      </Container>
    );
  }

  if (!assessment) {
    return (
      <Container>
        <Section>
          <EmptyState>
            <EmptyIcon>🌱</EmptyIcon>
            <EmptyTitle>Discover Your Relationship Readiness</EmptyTitle>
            <EmptyDescription>
              Take a quick assessment to understand your emotional availability, communication
              style, and readiness for meaningful connections.
            </EmptyDescription>
            <StartButton onClick={onTakeAssessment}>Start Assessment</StartButton>
          </EmptyState>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <Header>
          <Title>
            <TitleIcon>🌱</TitleIcon>
            Relationship Readiness
          </Title>
          <RetakeButton onClick={onTakeAssessment}>Retake Assessment</RetakeButton>
        </Header>

        <ScoreSection>
          <ScoreCircle>
            <ScoreRing viewBox="0 0 100 100">
              <defs>
                <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#7B61FF" />
                  <stop offset="100%" stopColor="#2ED4FF" />
                </linearGradient>
              </defs>
              <ScoreBackground cx="50" cy="50" r="45" />
              <ScoreProgress cx="50" cy="50" r="45" $score={assessment.overallScore} />
            </ScoreRing>
            <ScoreValue>
              <ScoreNumber>{assessment.overallScore}</ScoreNumber>
              <ScoreLabel>out of 100</ScoreLabel>
            </ScoreValue>
          </ScoreCircle>

          <ScoreDetails>
            <ReadinessLevel $level={assessment.readinessLevel}>
              {assessment.readinessLevel === 'ready' && '✨ '}
              {assessment.readinessLevel.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </ReadinessLevel>
            <LevelDescription>{levelMessages[assessment.readinessLevel]}</LevelDescription>
          </ScoreDetails>
        </ScoreSection>

        <DimensionsGrid>
          {Object.entries(assessment.dimensions).map(([key, data]) => (
            <DimensionCard key={key}>
              <DimensionHeader>
                <DimensionName>{formatDimensionName(key)}</DimensionName>
                <DimensionScore $score={data.score}>{data.score}</DimensionScore>
              </DimensionHeader>
              <ProgressBar>
                <Progress $value={data.score} />
              </ProgressBar>
              <DimensionFeedback>{data.feedback}</DimensionFeedback>
            </DimensionCard>
          ))}
        </DimensionsGrid>

        <InsightsSection>
          <InsightCard $type="strength">
            <InsightTitle>
              <span>💪</span>
              Your Strengths
            </InsightTitle>
            <InsightList>
              {assessment.strengths.map((strength, index) => (
                <InsightItem key={index}>{strength}</InsightItem>
              ))}
            </InsightList>
          </InsightCard>

          <InsightCard $type="growth">
            <InsightTitle>
              <span>🌱</span>
              Growth Areas
            </InsightTitle>
            <InsightList>
              {assessment.growthAreas.map((area, index) => (
                <InsightItem key={index}>{area}</InsightItem>
              ))}
            </InsightList>
          </InsightCard>
        </InsightsSection>

        <ActionsSection>
          <ActionsTitle>
            <span>🎯</span>
            Recommended Actions
          </ActionsTitle>
          {assessment.recommendedActions.map((action, index) => (
            <ActionCard key={index}>
              <ActionNumber>{index + 1}</ActionNumber>
              <ActionText>{action}</ActionText>
            </ActionCard>
          ))}
        </ActionsSection>
      </Section>
    </Container>
  );
};

export default ReadinessAssessmentComponent;
