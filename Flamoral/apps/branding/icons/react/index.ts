/**
 * Flamoral Icon Library
 * Complete icon set for the dating app
 */

export { FlameHeart, type IconProps } from './FlameHeart';
export { Spark } from './Spark';
export { CrownPremium } from './CrownPremium';
export { ShieldHeart } from './ShieldHeart';
export { ChatBubble } from './ChatBubble';
export { Lightning } from './Lightning';
export { Ticket } from './Ticket';
export { OnlineDot } from './OnlineDot';
export { VerifiedBadge } from './VerifiedBadge';
export { LocationPin } from './LocationPin';

// Default export all icons as object
const icons = {
  FlameHeart: require('./FlameHeart').default,
  Spark: require('./Spark').default,
  CrownPremium: require('./CrownPremium').default,
  ShieldHeart: require('./ShieldHeart').default,
  ChatBubble: require('./ChatBubble').default,
  Lightning: require('./Lightning').default,
  Ticket: require('./Ticket').default,
  OnlineDot: require('./OnlineDot').default,
  VerifiedBadge: require('./VerifiedBadge').default,
  LocationPin: require('./LocationPin').default,
};

export default icons;
