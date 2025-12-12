const fs = require('fs');
const path = require('path');

// Fix creative.service.ts - replace "love" with "romance"
const creativeServicePath = path.join(__dirname, 'src', 'domain', 'services', 'creative.service.ts');
let creativeContent = fs.readFileSync(creativeServicePath, 'utf8');
creativeContent = creativeContent.replace(/emotional_journey: \['curiosity', 'hope', 'excitement', 'love'\]/g,
  "emotional_journey: ['curiosity', 'hope', 'excitement', 'romance']");
creativeContent = creativeContent.replace(/emotional_tone: \['excitement', 'love'\]/g,
  "emotional_tone: ['excitement', 'romance']");
fs.writeFileSync(creativeServicePath, creativeContent, 'utf8');
console.log('Fixed creative.service.ts');

// Fix targeting.service.ts
const targetingServicePath = path.join(__dirname, 'src', 'domain', 'services', 'targeting.service.ts');
let targetingContent = fs.readFileSync(targetingServicePath, 'utf8');

// For RelationshipSignal type (line 72), use 'behavior'
targetingContent = targetingContent.replace(
  /{ signal_type: 'response_rate', weight: 0\.25, source: 'behavioral' }/g,
  "{ signal_type: 'response_rate', weight: 0.25, source: 'behavior' }"
);

// For InterestNode type (line 332), use 'behavioral'
targetingContent = targetingContent.replace(
  /{ interest_id: 'fitness', category: 'health', name: 'Fitness', affinity_score: 0\.85, source: 'behavior', confidence: 0\.88 }/g,
  "{ interest_id: 'fitness', category: 'health', name: 'Fitness', affinity_score: 0.85, source: 'behavioral', confidence: 0.88 }"
);

fs.writeFileSync(targetingServicePath, targetingContent, 'utf8');
console.log('Fixed targeting.service.ts');

console.log('All TypeScript errors fixed!');
