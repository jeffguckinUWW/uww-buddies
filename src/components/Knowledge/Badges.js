// src/components/Knowledge/Badges.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle, Star, Zap, Trophy, Flame, Shell, BookOpen } from 'lucide-react';

// Badge definitions
const BADGES = {
  FIRST_QUIZ: {
    id: 'first_quiz',
    name: 'First Dive',
    description: 'Completed your first knowledge quiz',
    icon: <CheckCircle size={24} className="text-green-500" />,
    color: 'bg-green-100',
  },
  PERFECT_SCORE: {
    id: 'perfect_score',
    name: 'Perfect Dive',
    description: 'Achieved a perfect score on a quiz',
    icon: <Star size={24} className="text-yellow-500" />,
    color: 'bg-yellow-100',
  },
  CATEGORY_MASTER: {
    id: 'category_master',
    name: 'Category Master',
    description: 'Completed all quizzes in a category',
    icon: <Trophy size={24} className="text-purple-500" />,
    color: 'bg-purple-100',
  },
  QUICK_LEARNER: {
    id: 'quick_learner',
    name: 'Quick Learner',
    description: 'Completed 5 quizzes in a single day',
    icon: <Zap size={24} className="text-blue-500" />,
    color: 'bg-blue-100',
  },
  FIVE_DAY_STREAK: {
    id: 'five_day_streak',
    name: '5-Day Streak',
    description: 'Completed quizzes for 5 consecutive days',
    icon: <Flame size={24} className="text-orange-500" />,
    color: 'bg-orange-100',
  },
  MARINE_EXPERT: {
    id: 'marine_expert',
    name: 'Marine Expert',
    description: 'Achieved high scores on all Marine Life quizzes',
    icon: <Shell size={24} className="text-indigo-500" />,
    color: 'bg-indigo-100',
  },
  DIVE_PHYSICS_PRO: {
    id: 'dive_physics_pro',
    name: 'Physics Pro',
    description: 'Mastered all Dive Physics quizzes',
    icon: <BookOpen size={24} className="text-red-500" />,
    color: 'bg-red-100',
  },
};

// Badge checker functions
const checkBadges = async (user, quizHistory, quizzes, categories) => {
  const earnedBadges = [];
  
  // First quiz badge
  if (quizHistory.length === 1) {
    earnedBadges.push(BADGES.FIRST_QUIZ);
  }
  
  // Perfect score badge
  const hasPerfectScore = quizHistory.some(history => history.score === 100);
  if (hasPerfectScore) {
    earnedBadges.push(BADGES.PERFECT_SCORE);
  }
  
  // Category master badge
  const categoryCompletions = {};
  categories.forEach(category => {
    categoryCompletions[category.id] = {
      total: 0,
      completed: 0
    };
  });
  
  quizzes.forEach(quiz => {
    if (categoryCompletions[quiz.categoryId]) {
      categoryCompletions[quiz.categoryId].total += 1;
    }
  });
  
  quizHistory.forEach(history => {
    const quiz = quizzes.find(q => q.id === history.quizId);
    if (quiz && categoryCompletions[quiz.categoryId]) {
      categoryCompletions[quiz.categoryId].completed += 1;
    }
  });
  
  Object.keys(categoryCompletions).forEach(categoryId => {
    const category = categoryCompletions[categoryId];
    if (category.total > 0 && category.completed === category.total) {
      earnedBadges.push({
        ...BADGES.CATEGORY_MASTER,
        id: `category_master_${categoryId}`,
        name: `${categories.find(c => c.id === categoryId)?.title || 'Category'} Master`,
      });
    }
  });
  
  // Quick learner badge
  const quizzesByDate = {};
  quizHistory.forEach(history => {
    const date = new Date(history.completedAt).toDateString();
    if (!quizzesByDate[date]) {
      quizzesByDate[date] = 0;
    }
    quizzesByDate[date] += 1;
  });
  
  const hasQuickLearnerBadge = Object.values(quizzesByDate).some(count => count >= 5);
  if (hasQuickLearnerBadge) {
    earnedBadges.push(BADGES.QUICK_LEARNER);
  }
  
  // Check for streak badge
  const dates = quizHistory.map(history => new Date(history.completedAt).toDateString());
  const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(a) - new Date(b));
  
  let maxStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffTime = currDate - prevDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }
    
    maxStreak = Math.max(maxStreak, currentStreak);
  }
  
  if (maxStreak >= 5) {
    earnedBadges.push(BADGES.FIVE_DAY_STREAK);
  }
  
  // Check for Marine Expert badge
  const marineCategory = categories.find(c => c.id === 'marine');
  if (marineCategory) {
    const marineQuizzes = quizzes.filter(q => q.categoryId === 'marine');
    const marineQuizIds = marineQuizzes.map(q => q.id);
    
    const marineHistories = quizHistory.filter(h => marineQuizIds.includes(h.quizId));
    const allMarineCompleted = marineQuizIds.length > 0 && 
      marineQuizIds.every(id => marineHistories.some(h => h.quizId === id));
    
    const highMarineScores = marineHistories.every(h => h.score >= 85);
    
    if (allMarineCompleted && highMarineScores) {
      earnedBadges.push(BADGES.MARINE_EXPERT);
    }
  }
  
  // Check for Physics Pro badge
  const physicsCategory = categories.find(c => c.id === 'physics');
  if (physicsCategory) {
    const physicsQuizzes = quizzes.filter(q => q.categoryId === 'physics');
    const physicsQuizIds = physicsQuizzes.map(q => q.id);
    
    const physicsHistories = quizHistory.filter(h => physicsQuizIds.includes(h.quizId));
    const allPhysicsCompleted = physicsQuizIds.length > 0 && 
      physicsQuizIds.every(id => physicsHistories.some(h => h.quizId === id));
    
    const highPhysicsScores = physicsHistories.every(h => h.score >= 80);
    
    if (allPhysicsCompleted && highPhysicsScores) {
      earnedBadges.push(BADGES.DIVE_PHYSICS_PRO);
    }
  }
  
  return earnedBadges;
};

// Main component - renamed to match the file name
const Badges = ({ showAll = false }) => {
  const [badges, setBadges] = useState([]);
  const [newBadge, setNewBadge] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        // Fetch user profile with badges
        const userProfileRef = doc(db, 'profiles', user.uid);
        const userProfile = await getDoc(userProfileRef);
        
        if (userProfile.exists()) {
          const profileData = userProfile.data();
          const earnedBadges = profileData.badges || [];
          
          // Map badge IDs to full badge objects
          const badgeObjects = earnedBadges.map(badgeId => {
            // Handle category master badges
            if (badgeId.startsWith('category_master_')) {
              const categoryId = badgeId.replace('category_master_', '');
              return {
                ...BADGES.CATEGORY_MASTER,
                id: badgeId,
                name: `${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Master`,
              };
            }
            
            // Return standard badge
            return Object.values(BADGES).find(badge => badge.id === badgeId) || {
              id: badgeId,
              name: 'Mystery Badge',
              description: 'A mysterious badge',
              icon: <Award size={24} className="text-gray-500" />,
              color: 'bg-gray-100'
            };
          });
          
          setBadges(badgeObjects);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching badges:', error);
        setLoading(false);
      }
    };

    fetchBadges();
  }, [user.uid]);

  // Check for new badges after quiz completion
  useEffect(() => {
    const checkForNewBadges = async () => {
      // Only run if we've just completed a quiz (check URL or localStorage flag)
      const justCompletedQuiz = localStorage.getItem('justCompletedQuiz');
      
      if (justCompletedQuiz) {
        localStorage.removeItem('justCompletedQuiz');
        
        try {
          // Fetch all data needed for badge checking
          const userProfileRef = doc(db, 'profiles', user.uid);
          const userProfile = await getDoc(userProfileRef);
          
          if (userProfile.exists()) {
            const profileData = userProfile.data();
            const quizHistory = profileData.quizHistory || [];
            const earnedBadges = profileData.badges || [];
            
            // Fetch all quizzes and categories
            const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
            const quizzes = quizzesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            const categoriesSnapshot = await getDocs(collection(db, 'quizCategories'));
            const categories = categoriesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Check for new badges
            const potentialBadges = await checkBadges(user, quizHistory, quizzes, categories);
            
            // Find badges that haven't been earned yet
            const newEarnedBadges = potentialBadges.filter(
              badge => !earnedBadges.includes(badge.id)
            );
            
            if (newEarnedBadges.length > 0) {
              // Update user profile with new badges
              const badgeIds = newEarnedBadges.map(badge => badge.id);
              
              await updateDoc(userProfileRef, {
                badges: arrayUnion(...badgeIds)
              });
              
              // Show new badge modal
              setNewBadge(newEarnedBadges[0]);
              setShowBadgeModal(true);
              
              // Update local state
              setBadges(prev => [...prev, ...newEarnedBadges]);
            }
          }
        } catch (error) {
          console.error('Error checking for new badges:', error);
        }
      }
    };
    
    checkForNewBadges();
  }, [user, user.uid]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <Award className="mr-2 text-blue-500" size={20} />
        Your Badges
      </h3>
      
      {badges.length === 0 ? (
        <div className="text-center bg-gray-50 p-6 rounded-lg">
          <div className="mb-2 text-gray-400">
            <Award size={48} className="mx-auto" />
          </div>
          <p className="text-gray-500">Complete quizzes to earn badges!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {badges.slice(0, showAll ? badges.length : 4).map(badge => (
            <div 
              key={badge.id} 
              className={`${badge.color} p-3 rounded-lg flex flex-col items-center shadow-sm transition-transform hover:scale-105`}
            >
              <div className="mb-2">
                {badge.icon}
              </div>
              <p className="font-medium text-sm text-center">{badge.name}</p>
              {showAll && (
                <p className="text-xs text-center mt-1 text-gray-600">{badge.description}</p>
              )}
            </div>
          ))}
          
          {!showAll && badges.length > 4 && (
            <div 
              className="bg-gray-100 p-3 rounded-lg flex flex-col items-center justify-center cursor-pointer shadow-sm hover:bg-gray-200"
              onClick={() => navigate('/profile')}
            >
              <p className="font-medium text-sm text-center text-gray-700">
                +{badges.length - 4} more
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* New Badge Modal */}
      <Dialog open={showBadgeModal} onOpenChange={setShowBadgeModal}>
        <DialogContent className="bg-white p-6 rounded-lg max-w-md mx-auto text-center">
          <DialogTitle className="text-2xl font-bold mb-6">
            New Badge Earned!
          </DialogTitle>
          
          {newBadge && (
            <div className="flex flex-col items-center">
              <div className={`${newBadge.color} p-6 rounded-full mb-4 animate-pulse`}>
                {React.cloneElement(newBadge.icon, { size: 48 })}
              </div>
              
              <h3 className="text-xl font-bold mb-2">{newBadge.name}</h3>
              <p className="text-gray-600 mb-6">{newBadge.description}</p>
              
              <button
                onClick={() => setShowBadgeModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md"
              >
                Awesome!
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Badges;