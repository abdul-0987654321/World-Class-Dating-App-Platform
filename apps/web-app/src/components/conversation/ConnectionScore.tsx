/**
 * ConnectionScore Component
 * Displays the connection score and analysis for a conversation
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useConnectionScore } from '../../hooks/useConversationIntelligence';

interface ConnectionScoreProps {
  conversationId: string;
  compact?: boolean;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`;

const Container = styled.div<{ $compact?: boolean }>`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing.md : theme.spacing.lg)};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const TrendBadge = styled.span<{ $trend: 'rising' | 'stable' | 'falling' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  background: ${({ $trend }) =>
    $trend === 'rising'
      ? 'rgba(0, 217, 165, 0.15)'
      : $trend === 'falling'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(255, 255, 255, 0.1)'};
  color: ${({ $trend }) =>
    $trend === 'rising' ? '#00d9a5' : $trend === 'falling' ? '#ef4444' : '#9ca3af'};
`;

const ScoreCircle = styled.div<{ $score: number }>`
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto ${({ theme }) => theme.spacing.lg};
`;

const ScoreRing = styled.svg`
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
`;

const ScoreBackground = styled.circle`
  fill: none;
  stroke: ${({ theme }) => theme.colors.border};
  stroke-width: 8;
`;

const ScoreProgress = styled.circle<{ $score: number }>`
  fill: none;
  stroke: url(#scoreGradient);
  stroke-width: 8;
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
  font-size: 32px;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1;
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px;
`;

const DimensionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const DimensionItem = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const DimensionLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 4px;
  text-transform: capitalize;
`;

const DimensionBar = styled.div`
  height: 6px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const DimensionProgress = styled.div<{ $value: number }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  background: ${({ theme }) => theme.colors.gradient};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: width 0.5s ease-out;
`;

const DimensionValue = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  float: right;
`;

const HighlightsSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.lg};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const HighlightsTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
`;

const HighlightItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  }
`;

const HighlightIcon = styled.span<{ $type: string }>`
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: ${({ $type }) =>
    $type === 'shared_interest'
      ? 'rgba(59, 130, 246, 0.2)'
      : $type === 'humor_match'
        ? 'rgba(251, 191, 36, 0.2)'
        : $type === 'deep_topic'
          ? 'rgba(168, 85, 247, 0.2)'
          : $type === 'future_planning'
            ? 'rgba(0, 217, 165, 0.2)'
            : 'rgba(236, 72, 153, 0.2)'};
`;

const HighlightText = styled.p`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${pulse} 1s linear infinite;
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.errorLight};
  color: ${({ theme }) => theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const highlightIcons: Record<string, string> = {
  shared_interest: '🎯',
  humor_match: '😄',
  deep_topic: '💭',
  future_planning: '📅',
  vulnerability: '💜',
};

export const ConnectionScore: React.FC<ConnectionScoreProps> = ({
  conversationId,
  compact = false,
}) => {
  const { score, analysis, isLoading, error } = useConnectionScore(conversationId);

  if (isLoading) {
    return (
      <Container $compact={compact}>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
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

  if (!score) {
    return null;
  }

  return (
    <Container $compact={compact}>
      <Header>
        <Title>Connection Score</Title>
        <TrendBadge $trend={score.trend}>
          {score.trend === 'rising' ? '↑' : score.trend === 'falling' ? '↓' : '→'}
          {score.trend.charAt(0).toUpperCase() + score.trend.slice(1)}
        </TrendBadge>
      </Header>

      <ScoreCircle $score={score.overallScore}>
        <ScoreRing viewBox="0 0 100 100">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#7B61FF" />
              <stop offset="100%" stopColor="#2ED4FF" />
            </linearGradient>
          </defs>
          <ScoreBackground cx="50" cy="50" r="45" />
          <ScoreProgress cx="50" cy="50" r="45" $score={score.overallScore} />
        </ScoreRing>
        <ScoreValue>
          <ScoreNumber>{score.overallScore}</ScoreNumber>
          <ScoreLabel>out of 100</ScoreLabel>
        </ScoreValue>
      </ScoreCircle>

      {!compact && (
        <>
          <DimensionsGrid>
            {Object.entries(score.dimensions).map(([key, value]) => (
              <DimensionItem key={key}>
                <DimensionLabel>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                  <DimensionValue>{value}</DimensionValue>
                </DimensionLabel>
                <DimensionBar>
                  <DimensionProgress $value={value} />
                </DimensionBar>
              </DimensionItem>
            ))}
          </DimensionsGrid>

          {score.highlights.length > 0 && (
            <HighlightsSection>
              <HighlightsTitle>Connection Highlights</HighlightsTitle>
              {score.highlights.slice(0, 3).map((highlight, index) => (
                <HighlightItem key={index}>
                  <HighlightIcon $type={highlight.type}>
                    {highlightIcons[highlight.type] || '✨'}
                  </HighlightIcon>
                  <HighlightText>{highlight.description}</HighlightText>
                </HighlightItem>
              ))}
            </HighlightsSection>
          )}
        </>
      )}
    </Container>
  );
};

export default ConnectionScore;
