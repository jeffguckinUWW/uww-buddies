// yearlyLoyaltyCheck.js
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

const calculateTier = (lifetimePoints) => {
  return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
    if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
      return { tier, ...details };
    }
    return acc;
  }, TIER_LEVELS.OCEANIC_SILVER);
};

exports.yearlyLoyaltyCheck = functions.pubsub
  .schedule('0 0 1 1 *') // Run at midnight on January 1st
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const currentYear = new Date().getFullYear();

    try {
      // Get all loyalty program members
      const profiles = await db.collection('profiles')
        .where('joinDate', '!=', null) // Has loyalty program data
        .get();

      const batch = db.batch(); // Use batch write for multiple updates

      for (const profile of profiles.docs) {
        const data = profile.data();
        const joinYear = data.joinDate.toDate().getFullYear();
        const yearsSinceJoin = currentYear - joinYear;

        // Skip if haven't had a full year yet (joined previous year)
        if (yearsSinceJoin < 1) continue;

        // Get their current tier
        const currentTier = calculateTier(data.lifetimePoints);
        const tierMinimum = TIER_LEVELS[currentTier.tier].min;
        const requiredYearlyPoints = tierMinimum * 0.1; // 10% of tier minimum

        // Check points earned in previous year
        const lastYearPoints = data.yearlyPointsEarned?.[currentYear - 1] || 0;

        if (lastYearPoints < requiredYearlyPoints) {
          // Calculate 10% reduction
          const pointsReduction = Math.ceil(data.lifetimePoints * 0.1);
          const redeemableReduction = Math.min(data.redeemablePoints || 0, pointsReduction);

          // Add update to batch
          batch.update(profile.ref, {
            lifetimePoints: data.lifetimePoints - pointsReduction,
            redeemablePoints: (data.redeemablePoints || 0) - redeemableReduction,
            lastExpirationCheck: now,
            [`pointsExpirations.${currentYear}`]: {
              pointsReduced: pointsReduction,
              reason: `Did not meet minimum yearly requirement of ${requiredYearlyPoints} points`,
              date: now
            },
            // Reset yearly points for new year
            [`yearlyPointsEarned.${currentYear}`]: 0
          });
        }
      }

      // Commit all updates in batch
      await batch.commit();

      console.log(`Yearly loyalty check completed for ${currentYear}`);
      return null;
    } catch (error) {
      console.error('Error in yearly loyalty check:', error);
      throw error;
    }
  });