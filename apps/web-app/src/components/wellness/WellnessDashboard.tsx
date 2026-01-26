/**
 * WellnessDashboard Component
 * Displays wellness metrics, mood tracking, and self-care recommendations
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useWellness } from '../../hooks/useWellness';
import { MoodCheckin } from '../../services/wellness.service';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
  animation: ${fadeIn} 0.3s ease-out;
`;

const Section = styled.section`
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TrendBadge = styled.span<{ $trend: 'improving' | 'stable' | 'declining' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  background: ${({ $trend }) =>
    $trend === 'improving'
      ? 'rgba(0, 217, 165, 0.15)'
      : $trend === 'declining'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(255, 255, 255, 0.1)'};
  color: ${({ $trend }) =>
    $trend === 'improving' ? '#00d9a5' : $trend === 'declining' ? '#ef4444' : '#9ca3af'};
`;

const ScoreDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const MainScore = styled.div`
  text-align: center;
  min-width: 100px;
`;

const ScoreValue = styled.div<{ $score: number }>`
  font-size: 48px;
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  background: ${({ $score }) =>
    $score >= 70
      ? 'linear-gradient(135deg, #00d9a5 0%, #22c55e 100%)'
      : $score >= 40
        ? 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
        : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ScoreLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DimensionsContainer = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const DimensionCard = styled.div`
  background: ${({ theme }) => theme.colors.backgroundTertiary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const DimensionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const DimensionName = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: capitalize;
`;

const DimensionValue = styled.span<{ $value: number }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ $value }) => ($value >= 70 ? '#00d9a5' : $value >= 40 ? '#f59e0b' : '#ef4444')};
`;

const ProgressBar = styled.div`
  height: 4px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 2px;
  overflow: hidden;
`;

const Progress = styled.div<{ $value: number }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  background: ${({ $value }) =>
    $value >= 70
      ? 'linear-gradient(90deg, #00d9a5, #22c55e)'
      : $value >= 40
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : 'linear-gradient(90deg, #ef4444, #f87171)'};
  border-radius: 2px;
  transition: width 0.5s ease-out;
`;

const StreaksRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const StreakCard = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const StreakIcon = styled.span`
  font-size: 24px;
`;

const StreakInfo = styled.div``;

const StreakValue = styled.div`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`;

const StreakLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// Mood Check-in Section
const MoodSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const MoodPrompt = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

const MoodOptions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const MoodButton = styled.button<{ $selected?: boolean; $mood: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary : theme.colors.background};
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const MoodEmoji = styled.span`
  font-size: 24px;
`;

const MoodLabel = styled.span<{ $selected?: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ $selected, theme }) => ($selected ? '#ffffff' : theme.colors.textSecondary)};
`;

// Recent Moods
const RecentMoods = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const MoodHistoryItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
  }
`;

const MoodTime = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const MoodNote = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

// Alerts Section
const AlertCard = styled.div<{ $severity: 'low' | 'medium' | 'high' }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ $severity }) =>
    $severity === 'high'
      ? 'rgba(239, 68, 68, 0.1)'
      : $severity === 'medium'
        ? 'rgba(245, 158, 11, 0.1)'
        : 'rgba(59, 130, 246, 0.1)'};
  border-left: 3px solid
    ${({ $severity }) =>
      $severity === 'high' ? '#ef4444' : $severity === 'medium' ? '#f59e0b' : '#3b82f6'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const AlertIcon = styled.span`
  font-size: 20px;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertMessage = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 ${({ theme }) => theme.spacing.xs};
`;

const AlertAction = styled.button`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.colors.primary};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

// Recommendations
const RecommendationCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const RecommendationCategory = styled.span<{ $priority: 'high' | 'medium' | 'low' }>`
  display: inline-block;
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ $priority }) =>
    $priority === 'high' ? '#EC4899' : $priority === 'medium' ? '#f59e0b' : '#3b82f6'};
  margin-bottom: 4px;
`;

const RecommendationTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0 0 4px;
`;

const RecommendationDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textSecondary};
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

const moodEmojis: Record<string, string> = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  low: '😔',
  struggling: '😢',
};

const formatTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
};

export const WellnessDashboard: React.FC = () => {
  const { dashboard, metrics, isLoading, error, recordMoodCheckin, dismissAlert } = useWellness();
  const [selectedMood, setSelectedMood] = useState<MoodCheckin['mood'] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMoodSelect = async (mood: MoodCheckin['mood']) => {
    setSelectedMood(mood);
    setIsSubmitting(true);
    try {
      await recordMoodCheckin({ mood, energyLevel: 5 });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSelectedMood(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Section>
          <LoadingContainer>
            <LoadingSpinner />
            <p>Loading wellness data...</p>
          </LoadingContainer>
        </Section>
      </Container>
    );
  }

  if (error || !metrics || !dashboard) {
    return (
      <Container>
        <Section>
          <p style={{ color: '#ef4444' }}>{error || 'Failed to load wellness data'}</p>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      {/* Wellness Score Section */}
      <Section>
        <SectionHeader>
          <SectionTitle>
            <span>🌱</span> Dating Wellness
          </SectionTitle>
          <TrendBadge $trend={metrics.trend}>
            {metrics.trend === 'improving' ? '↑' : metrics.trend === 'declining' ? '↓' : '→'}
            {metrics.trend.charAt(0).toUpperCase() + metrics.trend.slice(1)}
          </TrendBadge>
        </SectionHeader>

        <ScoreDisplay>
          <MainScore>
            <ScoreValue $score={metrics.overallScore}>{metrics.overallScore}</ScoreValue>
            <ScoreLabel>Wellness Score</ScoreLabel>
          </MainScore>

          <DimensionsContainer>
            {Object.entries(metrics.dimensions).map(([key, value]) => (
              <DimensionCard key={key}>
                <DimensionHeader>
                  <DimensionName>{key.replace(/([A-Z])/g, ' $1').trim()}</DimensionName>
                  <DimensionValue $value={value}>{value}</DimensionValue>
                </DimensionHeader>
                <ProgressBar>
                  <Progress $value={value} />
                </ProgressBar>
              </DimensionCard>
            ))}
          </DimensionsContainer>
        </ScoreDisplay>

        <StreaksRow>
          <StreakCard>
            <StreakIcon>🔥</StreakIcon>
            <StreakInfo>
              <StreakValue>{metrics.streaks.positiveDays}</StreakValue>
              <StreakLabel>Positive Days</StreakLabel>
            </StreakInfo>
          </StreakCard>
          <StreakCard>
            <StreakIcon>💬</StreakIcon>
            <StreakInfo>
              <StreakValue>{metrics.streaks.activeEngagement}</StreakValue>
              <StreakLabel>Days Active</StreakLabel>
            </StreakInfo>
          </StreakCard>
        </StreaksRow>
      </Section>

      {/* Mood Check-in Section */}
      <Section>
        <SectionTitle>
          <span>💭</span> How are you feeling?
        </SectionTitle>

        <MoodSection>
          <MoodPrompt>Take a moment to check in with yourself</MoodPrompt>
          <MoodOptions>
            {Object.entries(moodEmojis).map(([mood, emoji]) => (
              <MoodButton
                key={mood}
                $mood={mood}
                $selected={selectedMood === mood}
                onClick={() => handleMoodSelect(mood as MoodCheckin['mood'])}
                disabled={isSubmitting}
              >
                <MoodEmoji>{emoji}</MoodEmoji>
                <MoodLabel $selected={selectedMood === mood}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </MoodLabel>
              </MoodButton>
            ))}
          </MoodOptions>
        </MoodSection>

        {dashboard.recentMoodCheckins.length > 0 && (
          <RecentMoods>
            <SectionTitle style={{ fontSize: '14px', marginBottom: '8px' }}>
              Recent Check-ins
            </SectionTitle>
            {dashboard.recentMoodCheckins.slice(0, 3).map((checkin) => (
              <MoodHistoryItem key={checkin.id}>
                <span>{moodEmojis[checkin.mood]}</span>
                <MoodNote>{checkin.notes || `Feeling ${checkin.mood}`}</MoodNote>
                <MoodTime>{formatTimeAgo(checkin.timestamp)}</MoodTime>
              </MoodHistoryItem>
            ))}
          </RecentMoods>
        )}
      </Section>

      {/* Alerts Section */}
      {dashboard.alerts.filter((a) => !a.dismissed).length > 0 && (
        <Section>
          <SectionTitle>
            <span>⚡</span> Wellness Alerts
          </SectionTitle>

          {dashboard.alerts
            .filter((a) => !a.dismissed)
            .map((alert) => (
              <AlertCard key={alert.id} $severity={alert.severity}>
                <AlertIcon>
                  {alert.severity === 'high' ? '⚠️' : alert.severity === 'medium' ? '💡' : 'ℹ️'}
                </AlertIcon>
                <AlertContent>
                  <AlertMessage>{alert.message}</AlertMessage>
                  <AlertAction>{alert.actionSuggestion}</AlertAction>
                </AlertContent>
                <DismissButton onClick={() => dismissAlert(alert.id)}>✕</DismissButton>
              </AlertCard>
            ))}
        </Section>
      )}

      {/* Recommendations Section */}
      <Section>
        <SectionTitle>
          <span>✨</span> Recommendations
        </SectionTitle>

        {dashboard.recommendations.map((rec, index) => (
          <RecommendationCard key={index}>
            <RecommendationCategory $priority={rec.priority}>{rec.category}</RecommendationCategory>
            <RecommendationTitle>{rec.title}</RecommendationTitle>
            <RecommendationDescription>{rec.description}</RecommendationDescription>
          </RecommendationCard>
        ))}
      </Section>
    </Container>
  );
};

export default WellnessDashboard;
