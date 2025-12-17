/**
 * Call State Selectors
 * Memoized selectors for call state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectCallState = (state: RootState) => state.call;

// Memoized selectors
export const selectActiveCall = createSelector(
  [selectCallState],
  (call) => call.activeCall
);

export const selectIncomingCall = createSelector(
  [selectCallState],
  (call) => call.incomingCall
);

export const selectCallHistory = createSelector(
  [selectCallState],
  (call) => call.callHistory
);

export const selectNetworkQuality = createSelector(
  [selectCallState],
  (call) => call.networkQuality
);

export const selectIsMuted = createSelector(
  [selectCallState],
  (call) => call.isMuted
);

export const selectIsVideoEnabled = createSelector(
  [selectCallState],
  (call) => call.isVideoEnabled
);

export const selectIsScreenSharing = createSelector(
  [selectCallState],
  (call) => call.isScreenSharing
);

export const selectRecordingConsent = createSelector(
  [selectCallState],
  (call) => call.recordingConsent
);

export const selectIsInCall = createSelector(
  [selectActiveCall],
  (activeCall) => activeCall !== null
);

export const selectCallDuration = createSelector(
  [selectActiveCall],
  (activeCall) => activeCall?.duration || 0
);

export const selectCallType = createSelector(
  [selectActiveCall],
  (activeCall) => activeCall?.callType
);

export const selectCallParticipant = createSelector(
  [selectActiveCall],
  (activeCall) => activeCall?.participant
);

export const selectHasIncomingCall = createSelector(
  [selectIncomingCall],
  (incomingCall) => incomingCall !== null
);

export const selectRecentCallHistory = createSelector(
  [selectCallHistory],
  (history) => history.slice(0, 10) // Get last 10 calls
);

export const selectMissedCallsCount = createSelector(
  [selectCallHistory],
  (history) => history.filter((call) => call.status === 'missed').length
);
