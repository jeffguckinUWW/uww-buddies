// src/components/Knowledge/QuizResults.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, XCircle, Award, Share2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import Leaderboard from './Leaderboard';

const QuizResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { 
    score, 
    correctAnswers, 
    totalQuestions, 
    quizTitle, 
    quizId, 
    categoryId,
    includeInLeaderboard = true // Default to true for backward compatibility
  } = location.state || {};

  // Set flag for badge checking
  useEffect(() => {
    // Set flag to trigger badge check when results are shown
    localStorage.setItem('justCompletedQuiz', 'true');
    
    // Clean up when component unmounts
    return () => {
      // We don't remove the flag here so Badges component can check it
    };
  }, []);

  useEffect(() => {
    // If no results data, redirect to knowledge hub
    if (!score && score !== 0) {
      navigate('/knowledge');
    }
  }, [score, navigate]);

  // Determine badge based on score
  const getBadge = (score) => {
    if (score >= 90) return { icon: <Award size={40} className="text-yellow-500" />, text: 'Expert' };
    if (score >= 75) return { icon: <Award size={40} className="text-blue-500" />, text: 'Advanced' };
    if (score >= 60) return { icon: <Award size={40} className="text-green-500" />, text: 'Proficient' };
    return { icon: <Award size={40} className="text-gray-500" />, text: 'Beginner' };
  };

  const badge = getBadge(score);

  const handleShare = () => {
    const shareText = `I scored ${score}% on the "${quizTitle}" quiz! #SCUBADiving #KnowledgeHub`;
    
    // Check if Web Share API is available
    if (navigator.share) {
      navigator.share({
        title: 'SCUBA Knowledge Quiz Results',
        text: shareText,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Results copied to clipboard!');
      });
    }
  };

  // Save result to leaderboard only if user opted in
  useEffect(() => {
    const saveToLeaderboard = async () => {
      if (score && quizId && categoryId && includeInLeaderboard) {
        try {
          // Save to leaderboard collection
          const quizResultRef = collection(db, 'quizResults');
          await addDoc(quizResultRef, {
            userId: user.uid,
            quizId,
            categoryId,
            score,
            completedAt: new Date(),
            timestamp: Timestamp.now()  // For sorting
          });
        } catch (error) {
          console.error('Error saving to leaderboard:', error);
        }
      }
    };
    
    saveToLeaderboard();
  }, [score, quizId, categoryId, user.uid, includeInLeaderboard]);

  if (!score && score !== 0) {
    return (
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isPassing = score >= 75;

  return (
    <div className="flex-1 p-4">
      <div className="bg-white rounded-lg shadow-md p-6 text-center mb-6">
        <h1 className="text-xl font-bold mb-1">{quizTitle}</h1>
        <p className="text-gray-500 mb-6">Quiz Completed</p>
        
        {/* Score circle */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-full flex items-center justify-center border-8 border-blue-100">
              <span className="text-3xl font-bold text-blue-600">{score}%</span>
            </div>
            <div className="absolute -right-2 -bottom-2 bg-white rounded-full p-1">
              {badge.icon}
            </div>
          </div>
        </div>
        
        <p className="font-medium text-lg mb-1">
          {isPassing ? 'Congratulations!' : 'Good effort!'}
        </p>
        <p className="text-gray-600 mb-6">
          {isPassing 
            ? "You've mastered this topic!" 
            : "Keep learning and try again to improve your score."}
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex justify-center mb-2">
              <CheckCircle size={24} className="text-green-500" />
            </div>
            <p className="font-bold text-green-800">{correctAnswers}</p>
            <p className="text-sm text-green-600">Correct</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex justify-center mb-2">
              <XCircle size={24} className="text-red-500" />
            </div>
            <p className="font-bold text-red-800">{totalQuestions - correctAnswers}</p>
            <p className="text-sm text-red-600">Incorrect</p>
          </div>
        </div>
        
        {/* Share button */}
        <div className="mb-8">
          <Button 
            onClick={handleShare}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Share2 size={16} />
            <span>Share Results</span>
          </Button>
        </div>
        
        {/* Action buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/knowledge')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Return to Knowledge Hub
          </Button>
          {!isPassing && (
            <Button 
              onClick={() => navigate(-2)} // Go back to the quiz
              variant="outline"
              className="w-full px-4 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium"
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
      
      {/* Leaderboard Section - Only show if user opted in */}
      {includeInLeaderboard && quizId && categoryId && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center text-lg">
              <TrendingUp size={20} className="text-blue-500 mr-2" />
              Leaderboard
            </h2>
            <Button 
              variant="ghost" 
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              size="sm"
            >
              {showLeaderboard ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showLeaderboard && (
            <Leaderboard quizId={quizId} categoryId={categoryId} />
          )}
          
          {!showLeaderboard && (
            <p className="text-center text-gray-500 py-4">
              Click "Show" to view the leaderboard and see how you compare.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizResults;