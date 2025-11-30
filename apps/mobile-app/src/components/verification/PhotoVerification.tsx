import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Button } from '../common/Button';

// Note: In production, would use react-native-camera for actual camera functionality
// This shows the interface structure and verification flow

export type VerificationStep = 'intro' | 'position' | 'capture' | 'processing' | 'result';

export type LivenessChallenge = 'smile' | 'blink' | 'turn-left' | 'turn-right' | 'nod';

export interface VerificationResult {
  success: boolean;
  verificationId?: string;
  photoUrl?: string;
  failureReason?: string;
  retryAllowed?: boolean;
}

interface PhotoVerificationProps {
  visible: boolean;
  onClose: () => void;
  onVerificationComplete: (result: VerificationResult) => void;
  onUploadPhoto: (photoData: string) => Promise<VerificationResult>;
}

export const PhotoVerification: React.FC<PhotoVerificationProps> = ({
  visible,
  onClose,
  onVerificationComplete,
  onUploadPhoto,
}) => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('intro');
  const [currentChallenge, setCurrentChallenge] = useState<LivenessChallenge>('smile');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [remainingTime, setRemainingTime] = useState(10);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const challengeTimer = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (challengeTimer.current) {
        clearInterval(challengeTimer.current);
      }
    };
  }, []);

  // Pulse animation for the face outline
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (currentStep === 'position' || currentStep === 'capture') {
      pulse.start();
    } else {
      pulse.stop();
      pulseAnim.setValue(1);
    }

    return () => pulse.stop();
  }, [currentStep]);

  // Countdown timer for challenge
  useEffect(() => {
    if (currentStep === 'capture') {
      setRemainingTime(10);

      challengeTimer.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            handleChallengeTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (challengeTimer.current) {
          clearInterval(challengeTimer.current);
        }
      };
    }
  }, [currentStep]);

  const handleChallengeTimeout = () => {
    if (challengeTimer.current) {
      clearInterval(challengeTimer.current);
    }

    Alert.alert(
      'Time's Up',
      'You ran out of time. Please try again.',
      [
        {
          text: 'Retry',
          onPress: () => {
            setCurrentStep('position');
            setCurrentChallenge(getRandomChallenge());
          },
        },
      ]
    );
  };

  const getRandomChallenge = (): LivenessChallenge => {
    const challenges: LivenessChallenge[] = ['smile', 'blink', 'turn-left', 'turn-right', 'nod'];
    return challenges[Math.floor(Math.random() * challenges.length)];
  };

  const getChallengeInstruction = (challenge: LivenessChallenge): string => {
    switch (challenge) {
      case 'smile':
        return 'Smile for the camera! 😊';
      case 'blink':
        return 'Blink your eyes twice';
      case 'turn-left':
        return 'Turn your head left';
      case 'turn-right':
        return 'Turn your head right';
      case 'nod':
        return 'Nod your head';
      default:
        return 'Follow the instruction';
    }
  };

  const getChallengeIcon = (challenge: LivenessChallenge): string => {
    switch (challenge) {
      case 'smile':
        return '😊';
      case 'blink':
        return '👀';
      case 'turn-left':
        return '⬅️';
      case 'turn-right':
        return '➡️';
      case 'nod':
        return '⬇️';
      default:
        return '📸';
    }
  };

  const handleStartVerification = () => {
    setCurrentStep('position');
    setCurrentChallenge(getRandomChallenge());
  };

  const handlePositionConfirmed = () => {
    setCurrentStep('capture');
  };

  const handleCaptureComplete = () => {
    if (challengeTimer.current) {
      clearInterval(challengeTimer.current);
    }

    // In production, this would be the actual captured photo data
    const mockPhotoData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
    setCapturedPhoto(mockPhotoData);

    setCurrentStep('processing');
    processVerification(mockPhotoData);
  };

  const processVerification = async (photoData: string) => {
    setIsProcessing(true);

    try {
      // Simulate API call to verification service
      const result = await onUploadPhoto(photoData);

      setVerificationResult(result);
      setCurrentStep('result');

      if (result.success) {
        setTimeout(() => {
          onVerificationComplete(result);
          handleCloseModal();
        }, 2000);
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Something went wrong. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setCurrentStep('position');
              setCurrentChallenge(getRandomChallenge());
            },
          },
          { text: 'Cancel', onPress: handleCloseModal, style: 'cancel' },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setCapturedPhoto(null);
    setVerificationResult(null);
    setCurrentStep('position');
    setCurrentChallenge(getRandomChallenge());
  };

  const handleCloseModal = () => {
    // Reset state
    setCurrentStep('intro');
    setCapturedPhoto(null);
    setVerificationResult(null);
    setRemainingTime(10);

    if (challengeTimer.current) {
      clearInterval(challengeTimer.current);
    }

    onClose();
  };

  const renderIntroStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.introIcon}>
        <Text style={styles.introIconText}>📸</Text>
      </View>

      <Text style={styles.stepTitle}>Verify Your Photos</Text>
      <Text style={styles.stepDescription}>
        Let's make sure you're a real person! We'll take a quick selfie to verify your
        identity.
      </Text>

      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Why verify?</Text>

        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Build trust with your matches</Text>
        </View>

        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Get a verified badge on your profile</Text>
        </View>

        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Stand out from the crowd</Text>
        </View>

        <View style={styles.benefit}>
          <Text style={styles.benefitIcon}>✓</Text>
          <Text style={styles.benefitText}>Safer dating experience</Text>
        </View>
      </View>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>What to expect:</Text>
        <Text style={styles.instructionText}>1. Position your face in the frame</Text>
        <Text style={styles.instructionText}>2. Follow a simple instruction</Text>
        <Text style={styles.instructionText}>3. We'll verify it's really you</Text>
      </View>

      <Button
        title="Start Verification"
        onPress={handleStartVerification}
        fullWidth
        style={styles.primaryButton}
      />

      <TouchableOpacity onPress={handleCloseModal} style={styles.skipButton}>
        <Text style={styles.skipButtonText}>Maybe Later</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPositionStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.cameraContainer}>
        {/* Camera view would go here - react-native-camera */}
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderText}>Camera View</Text>
        </View>

        {/* Face outline overlay */}
        <Animated.View
          style={[
            styles.faceOutline,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        <View style={styles.positionOverlay}>
          <Text style={styles.positionInstruction}>
            Position your face in the oval
          </Text>
          <Text style={styles.positionSubtext}>
            Make sure your face is well-lit and clearly visible
          </Text>
        </View>
      </View>

      <Button
        title="I'm Ready"
        onPress={handlePositionConfirmed}
        fullWidth
        style={styles.primaryButton}
      />
    </View>
  );

  const renderCaptureStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderText}>Camera View</Text>
        </View>

        <Animated.View
          style={[
            styles.faceOutline,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        <View style={styles.challengeOverlay}>
          <View style={styles.challengeCard}>
            <Text style={styles.challengeIcon}>{getChallengeIcon(currentChallenge)}</Text>
            <Text style={styles.challengeText}>
              {getChallengeInstruction(currentChallenge)}
            </Text>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{remainingTime}s</Text>
            </View>
          </View>
        </View>
      </View>

      <Button
        title="Capture"
        onPress={handleCaptureComplete}
        fullWidth
        style={styles.primaryButton}
      />
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.processingTitle}>Verifying Your Photo</Text>
        <Text style={styles.processingText}>
          This will only take a moment...
        </Text>

        <View style={styles.processingSteps}>
          <View style={styles.processingStep}>
            <Text style={styles.processingStepIcon}>✓</Text>
            <Text style={styles.processingStepText}>Checking image quality</Text>
          </View>
          <View style={styles.processingStep}>
            <Text style={styles.processingStepIcon}>✓</Text>
            <Text style={styles.processingStepText}>Detecting liveness</Text>
          </View>
          <View style={styles.processingStep}>
            <Text style={styles.processingStepIcon}>⏳</Text>
            <Text style={styles.processingStepText}>Comparing with profile photos</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderResultStep = () => {
    if (!verificationResult) return null;

    if (verificationResult.success) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Verification Successful!</Text>
            <Text style={styles.successText}>
              You're all set! Your profile now has a verified badge.
            </Text>

            <View style={styles.badgePreview}>
              <Text style={styles.badgePreviewIcon}>✓</Text>
              <Text style={styles.badgePreviewText}>Verified</Text>
            </View>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.failureContainer}>
            <View style={styles.failureIcon}>
              <Text style={styles.failureIconText}>✕</Text>
            </View>

            <Text style={styles.failureTitle}>Verification Failed</Text>
            <Text style={styles.failureText}>
              {verificationResult.failureReason ||
                "We couldn't verify your photo. Please try again."}
            </Text>

            <View style={styles.failureTips}>
              <Text style={styles.failureTipsTitle}>Tips for success:</Text>
              <Text style={styles.failureTip}>• Ensure good lighting</Text>
              <Text style={styles.failureTip}>• Look directly at the camera</Text>
              <Text style={styles.failureTip}>• Remove sunglasses or hats</Text>
              <Text style={styles.failureTip}>• Match the pose in your profile photos</Text>
            </View>

            {verificationResult.retryAllowed !== false && (
              <Button
                title="Try Again"
                onPress={handleRetry}
                fullWidth
                style={styles.primaryButton}
              />
            )}

            <TouchableOpacity onPress={handleCloseModal} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntroStep();
      case 'position':
        return renderPositionStep();
      case 'capture':
        return renderCaptureStep();
      case 'processing':
        return renderProcessingStep();
      case 'result':
        return renderResultStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCloseModal}
    >
      <View style={styles.container}>
        {/* Header */}
        {currentStep !== 'processing' && currentStep !== 'result' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Photo Verification</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        {/* Progress Indicator */}
        {currentStep !== 'intro' && currentStep !== 'result' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      currentStep === 'position'
                        ? '33%'
                        : currentStep === 'capture'
                        ? '66%'
                        : '100%',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Step Content */}
        <View style={styles.content}>{renderStepContent()}</View>

        {/* Privacy Notice */}
        {currentStep === 'intro' && (
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyNoticeIcon}>🔒</Text>
            <Text style={styles.privacyNoticeText}>
              Your verification photo is encrypted and only used to confirm your identity. It
              won't be shown on your profile.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  // Intro Step
  introIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 40,
  },
  introIconText: {
    fontSize: 48,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  benefitText: {
    fontSize: 15,
    color: '#666',
  },
  instructionsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryButton: {
    marginBottom: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  // Camera Steps
  cameraContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholderText: {
    color: '#FFF',
    fontSize: 16,
  },
  faceOutline: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    width: '60%',
    height: '40%',
    borderWidth: 3,
    borderColor: '#E91E63',
    borderRadius: 200,
  },
  positionOverlay: {
    position: 'absolute',
    top: '65%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  positionInstruction: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  positionSubtext: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  challengeOverlay: {
    position: 'absolute',
    top: '10%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  challengeCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 250,
  },
  challengeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  challengeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  timerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  // Processing Step
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  processingSteps: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  processingStepIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  processingStepText: {
    fontSize: 15,
    color: '#666',
  },
  // Result Steps
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 48,
    color: '#FFF',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  badgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  badgePreviewIcon: {
    fontSize: 20,
    color: '#2196F3',
    marginRight: 8,
  },
  badgePreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  failureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  failureIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  failureIconText: {
    fontSize: 48,
    color: '#FFF',
  },
  failureTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  failureText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  failureTips: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  failureTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12,
  },
  failureTip: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 22,
    marginBottom: 4,
  },
  // Privacy Notice
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#C8E6C9',
  },
  privacyNoticeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
});
