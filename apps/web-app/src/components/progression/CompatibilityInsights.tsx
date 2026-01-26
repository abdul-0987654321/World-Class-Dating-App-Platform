/**
 * Compatibility Insights Component
 * Shows relationship compatibility scores and growth areas
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useCompatibility } from '../../hooks/useRelationshipProgression';

interface CompatibilityInsightsProps {
  progressionId: string;
}

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
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

const LastUpdated = styled.span`
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const ScoreSection = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(0, 217, 165, 0.1));
  border-radius: 12px;
`;

const ScoreCircle = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
`;

const ScoreSvg = styled.svg`
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`;

const ScoreBackground = styled.circle`
  fill: none;
  stroke: var(--color-border);
  stroke-width: 8;
`;

const ScoreProgress = styled.circle<{ $score: number }>`
  fill: none;
  stroke: url(#scoreGradient);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: ${(props) => `${(props.$score / 100) * 251.2} 251.2`};
  transition: stroke-dasharray 1s ease;
`;

const ScoreValue = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ScoreNumber = styled.span`
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
`;

const ScoreLabel = styled.span`
  font-size: 10px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ScoreDescription = styled.div`
  flex: 1;
`;

const ScoreTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 6px;
`;

const ScoreSubtitle = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
`;

const DimensionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const DimensionCard = styled.div`
  padding: 16px;
  background: var(--color-background);
  border-radius: 10px;
`;

const DimensionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const DimensionName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
`;

const DimensionScore = styled.span<{ $score: number }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => {
    if (props.$score >= 80) return 'var(--color-success)';
    if (props.$score >= 60) return 'var(--color-warning)';
    return 'var(--color-error)';
  }};
`;

const DimensionBar = styled.div`
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
`;

const DimensionProgress = styled.div<{ $score: number }>`
  height: 100%;
  width: ${(props) => props.$score}%;
  background: ${(props) => {
    if (props.$score >= 80) return 'var(--color-success)';
    if (props.$score >= 60)
      return 'linear-gradient(90deg, var(--color-warning), var(--color-success))';
    return 'linear-gradient(90deg, var(--color-error), var(--color-warning))';
  }};
  border-radius: 3px;
  transition: width 0.8s ease;
`;

const InsightsSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const InsightCard = styled.div<{ $type: 'strength' | 'growth' }>`
  padding: 16px;
  background: ${(props) =>
    props.$type === 'strength' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
  border-radius: 10px;
  border-left: 3px solid
    ${(props) => (props.$type === 'strength' ? 'var(--color-success)' : 'var(--color-warning)')};
`;

const InsightTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InsightList = styled.ul`
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
`;

const TipsSection = styled.div`
  padding: 16px;
  background: linear-gradient(90deg, rgba(236, 72, 153, 0.05) 0%, rgba(0, 217, 165, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 3s linear infinite;
  border-radius: 10px;
`;

const TipsTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TipItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const TipIcon = styled.span`
  font-size: 16px;
`;

const TipText = styled.span`
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--color-text-secondary);
`;

const ErrorState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-error);
`;

const dimensionLabels: Record<string, string> = {
  communicationStyle: 'Communication',
  sharedInterests: 'Shared Interests',
  valueAlignment: 'Value Alignment',
  emotionalConnection: 'Emotional Bond',
  futureGoals: 'Future Goals',
};

export const CompatibilityInsights: React.FC<CompatibilityInsightsProps> = ({ progressionId }) => {
  const { compatibility, isLoading, error } = useCompatibility(progressionId);

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Analyzing compatibility...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>{error}</ErrorState>
      </Container>
    );
  }

  if (!compatibility) {
    return (
      <Container>
        <LoadingState>No compatibility data available yet</LoadingState>
      </Container>
    );
  }

  const getScoreDescription = (score: number): { title: string; subtitle: string } => {
    if (score >= 85)
      return {
        title: 'Excellent Match!',
        subtitle: "You two have remarkable compatibility. Keep nurturing what's working!",
      };
    if (score >= 70)
      return {
        title: 'Great Potential',
        subtitle: 'Strong foundation with room to grow even closer together.',
      };
    if (score >= 55)
      return {
        title: 'Building Connection',
        subtitle: 'Focus on the growth areas to strengthen your bond.',
      };
    return {
      title: 'Early Days',
      subtitle: 'Keep getting to know each other to build compatibility.',
    };
  };

  const scoreInfo = getScoreDescription(compatibility.overallScore);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Container>
      <Header>
        <Title>💫 Compatibility Insights</Title>
        <LastUpdated>Updated {formatDate(compatibility.lastUpdated)}</LastUpdated>
      </Header>

      <ScoreSection>
        <ScoreCircle>
          <ScoreSvg viewBox="0 0 100 100">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-secondary)" />
              </linearGradient>
            </defs>
            <ScoreBackground cx="50" cy="50" r="40" />
            <ScoreProgress cx="50" cy="50" r="40" $score={compatibility.overallScore} />
          </ScoreSvg>
          <ScoreValue>
            <ScoreNumber>{compatibility.overallScore}</ScoreNumber>
            <ScoreLabel>Score</ScoreLabel>
          </ScoreValue>
        </ScoreCircle>
        <ScoreDescription>
          <ScoreTitle>{scoreInfo.title}</ScoreTitle>
          <ScoreSubtitle>{scoreInfo.subtitle}</ScoreSubtitle>
        </ScoreDescription>
      </ScoreSection>

      <DimensionsGrid>
        {Object.entries(compatibility.dimensions).map(([key, value]) => (
          <DimensionCard key={key}>
            <DimensionHeader>
              <DimensionName>{dimensionLabels[key] || key}</DimensionName>
              <DimensionScore $score={value}>{value}%</DimensionScore>
            </DimensionHeader>
            <DimensionBar>
              <DimensionProgress $score={value} />
            </DimensionBar>
          </DimensionCard>
        ))}
      </DimensionsGrid>

      <InsightsSection>
        <InsightCard $type="strength">
          <InsightTitle>💪 Your Strengths</InsightTitle>
          <InsightList>
            {compatibility.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </InsightList>
        </InsightCard>

        <InsightCard $type="growth">
          <InsightTitle>🌱 Growth Areas</InsightTitle>
          <InsightList>
            {compatibility.growthAreas.map((area, index) => (
              <li key={index}>{area}</li>
            ))}
          </InsightList>
        </InsightCard>
      </InsightsSection>

      <TipsSection>
        <TipsTitle>💡 Tips to Strengthen Your Connection</TipsTitle>
        {compatibility.tips.map((tip, index) => (
          <TipItem key={index}>
            <TipIcon>{['🎯', '💬', '❤️'][index % 3]}</TipIcon>
            <TipText>{tip}</TipText>
          </TipItem>
        ))}
      </TipsSection>
    </Container>
  );
};

export default CompatibilityInsights;
