// src/components/Knowledge/Leaderboard.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Medal, TrendingUp, Share2, Users } from 'lucide-react';
import { Button } from '../ui/button';

const Leaderboard = ({ quizId, categoryId }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quiz');
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        let leaderboardQuery;
        
        if (activeTab === 'quiz' && quizId) {
          // Fetch leaderboard for specific quiz
          leaderboardQuery = query(
            collection(db, 'quizResults'),
            where('quizId', '==', quizId),
            orderBy('score', 'desc'),
            limit(10)
          );
        } else {
          // Fetch leaderboard for category
          leaderboardQuery = query(
            collection(db, 'quizResults'),
            where('categoryId', '==', categoryId),
            orderBy('score', 'desc'),
            limit(10)
          );
        }
        
        const snapshot = await getDocs(leaderboardQuery);
        
        // Get user data for each entry
        const leaderboardEntries = [];
        for (const doc of snapshot.docs) {
          const result = doc.data();
          
          // Fetch user profile
          const userRef = await getDocs(
            query(collection(db, 'profiles'), where('uid', '==', result.userId))
          );
          
          let userData = { name: 'Anonymous Diver' };
          if (!userRef.empty) {
            userData = userRef.docs[0].data();
          }
          
          leaderboardEntries.push({
            id: doc.id,
            ...result,
            user: userData
          });
        }
        
        setLeaderboardData(leaderboardEntries);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [quizId, categoryId, activeTab]);

  const getMedalIcon = (position) => {
    switch (position) {
      case 0:
        return <Medal size={20} className="text-yellow-500" />;
      case 1:
        return <Medal size={20} className="text-gray-400" />;
      case 2:
        return <Medal size={20} className="text-amber-700" />;
      default:
        return null;
    }
  };

  const handleShare = (position, name, score) => {
    const shareText = `I'm ranked #${position + 1} on the ${
      activeTab === 'quiz' ? 'quiz' : 'category'
    } leaderboard with a score of ${score}%! Can you beat me? #SCUBADiving #KnowledgeHub`;
    
    // Check if Web Share API is available
    if (navigator.share) {
      navigator.share({
        title: 'SCUBA Knowledge Challenge',
        text: shareText,
        url: window.location.href,
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <TrendingUp size={20} className="text-blue-500 mr-2" />
          Leaderboard
        </h2>
        
        <div className="flex space-x-2 text-sm">
          <button
            className={`px-3 py-1 rounded-full ${
              activeTab === 'quiz' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('quiz')}
          >
            This Quiz
          </button>
          <button
            className={`px-3 py-1 rounded-full ${
              activeTab === 'category' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('category')}
          >
            Category
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {leaderboardData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="mx-auto mb-2 text-gray-400" size={32} />
              <p>No entries yet! Be the first to complete this quiz.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.userId === user.uid 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 text-center font-semibold text-gray-600">
                      {getMedalIcon(index) || `#${index + 1}`}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{entry.user?.name || "Anonymous Diver"}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.timestamp?.toDate()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      entry.score >= 90 ? 'bg-green-100 text-green-700' :
                      entry.score >= 75 ? 'bg-blue-100 text-blue-700' :
                      entry.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {entry.score}%
                    </span>
                    
                    {entry.userId === user.uid && (
                      <button
                        onClick={() => handleShare(index, entry.user?.name, entry.score)}
                        className="ml-2 p-1 text-gray-500 hover:text-blue-500"
                      >
                        <Share2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex justify-between">
            <p className="text-sm text-gray-500">
              {activeTab === 'quiz' 
                ? 'Top scores for this quiz' 
                : 'Top average scores in this category'}
            </p>
            
            {leaderboardData.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={() => handleShare(
                  leaderboardData.findIndex(entry => entry.userId === user.uid),
                  user.displayName,
                  leaderboardData.find(entry => entry.userId === user.uid)?.score || 0
                )}
              >
                <Share2 size={14} className="mr-1" />
                Share Results
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;