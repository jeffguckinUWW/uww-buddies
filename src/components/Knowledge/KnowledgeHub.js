// src/components/Knowledge/KnowledgeHub.js - Redesigned with tabs and collapsible sections
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import QuizCard from './QuizCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  CheckCircle, Clock, BrainCircuit, Award, TrendingUp, Medal, 
  ChevronDown, ChevronRight, FileText, ChevronUp, BookOpen, Trophy
} from 'lucide-react';
import Badges from './Badges';
import Leaderboard from './Leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const KnowledgeHub = () => {
  const [quizCategories, setQuizCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    leaderboard: false
  });
  const [topCategory, setTopCategory] = useState(null);
  const [userStats, setUserStats] = useState({
    completedQuizzes: 0,
    totalQuizzes: 0,
    avgScore: 0,
    bestCategory: '',
    recentActivity: []
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch quiz categories
        const categoriesCollection = collection(db, 'quizCategories');
        const categorySnapshot = await getDocs(categoriesCollection);
        const categories = categorySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuizCategories(categories);
        
        // Find category with most quizzes for leaderboard
        if (categories.length > 0) {
          const categoryWithMostQuizzes = categories.reduce((prev, current) => 
            (prev.quizCount || 0) > (current.quizCount || 0) ? prev : current
          );
          setTopCategory(categoryWithMostQuizzes);
        }
        
        // Fetch all quizzes for total count
        const quizzesCollection = collection(db, 'quizzes');
        const quizzesSnapshot = await getDocs(quizzesCollection);
        const quizzes = quizzesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch user profile with quiz history
        const userProfileRef = doc(db, 'profiles', user.uid);
        const userProfile = await getDoc(userProfileRef);
        
        if (userProfile.exists()) {
          const profileData = userProfile.data();
          const quizHistory = profileData.quizHistory || [];
          
          // Calculate user stats
          const totalQuizzes = quizzes.length;
          
          // Count unique quizzes completed (instead of total attempts)
          const uniqueCompletedQuizIds = new Set();
          quizHistory.forEach(history => {
            if (history.quizId) {
              uniqueCompletedQuizIds.add(history.quizId);
            }
          });
          const completedQuizzes = uniqueCompletedQuizIds.size;
          
          let totalScore = 0;
          quizHistory.forEach(history => {
            totalScore += history.score || 0;
          });
          
          // Calculate category performance
          const categoryPerformance = {};
          quizHistory.forEach(history => {
            const quiz = quizzes.find(q => q.id === history.quizId);
            if (quiz) {
              if (!categoryPerformance[quiz.categoryId]) {
                categoryPerformance[quiz.categoryId] = {
                  count: 0,
                  totalScore: 0,
                  name: categories.find(c => c.id === quiz.categoryId)?.title || ''
                };
              }
              categoryPerformance[quiz.categoryId].count += 1;
              categoryPerformance[quiz.categoryId].totalScore += history.score || 0;
            }
          });
          
          // Find best category
          let bestCategory = '';
          let bestCategoryScore = 0;
          Object.keys(categoryPerformance).forEach(catId => {
            const avgScore = categoryPerformance[catId].totalScore / categoryPerformance[catId].count;
            if (avgScore > bestCategoryScore && categoryPerformance[catId].count >= 2) {
              bestCategoryScore = avgScore;
              bestCategory = categoryPerformance[catId].name;
            }
          });
          
          // Get recent quiz activity
          const recentActivity = [...quizHistory]
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
            .slice(0, 5)
            .map(history => {
              const quiz = quizzes.find(q => q.id === history.quizId);
              return {
                quizId: history.quizId,
                quizTitle: history.quizTitle || quiz?.title || 'Unknown Quiz',
                score: history.score,
                completedAt: history.completedAt
              };
            });
          
          setUserStats({
            completedQuizzes,
            totalQuizzes,
            avgScore: quizHistory.length > 0 ? Math.round(totalScore / quizHistory.length) : 0,
            bestCategory,
            recentActivity
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user.uid]);

  const handleCategorySelect = (categoryId) => {
    navigate(`/knowledge/category/${categoryId}`);
  };

  const calculateCompletionPercentage = () => {
    if (userStats.totalQuizzes === 0) return 0;
    return Math.min(100, Math.round((userStats.completedQuizzes / userStats.totalQuizzes) * 100));
  };

  const toggleSection = (section) => {
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section]
    });
  };
  
  return (
    <div className="flex-1 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Knowledge Hub</h1>
      </div>
      
      <p className="text-gray-600 mb-6">
        Test your knowledge and expand your diving expertise with quizzes and knowledge reviews.
      </p>
      
      <Tabs defaultValue="dashboard" className="mb-6">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="dashboard" className="text-sm">
            <BrainCircuit size={16} className="mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="text-sm">
            <BookOpen size={16} className="mr-2" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-sm">
            <TrendingUp size={16} className="mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 bg-blue-50 cursor-pointer"
              onClick={() => toggleSection('stats')}
            >
              <h2 className="font-semibold flex items-center">
                <BrainCircuit className="mr-2 text-blue-500" size={20} />
                Your Knowledge Stats
              </h2>
              <button className="text-blue-500">
                {expandedSections.stats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            
            {expandedSections.stats && (
              <div className="p-4">
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {calculateCompletionPercentage()}%
                        </div>
                        <div className="text-sm text-blue-700">Completion Rate</div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${calculateCompletionPercentage()}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {userStats.completedQuizzes}
                        </div>
                        <div className="text-sm text-green-700">Completed Quizzes</div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-purple-600 mb-1">
                          {userStats.avgScore}%
                        </div>
                        <div className="text-sm text-purple-700">Average Score</div>
                      </div>
                      
                      <div className="bg-amber-50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="text-lg font-bold text-amber-600 mb-1 truncate max-w-full">
                          {userStats.bestCategory || 'Keep practicing!'}
                        </div>
                        <div className="text-sm text-amber-700">Best Category</div>
                      </div>
                    </div>
                    
                    {/* Recent Activity */}
                    {userStats.recentActivity.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                          <Clock size={16} className="mr-1" /> Recent Activity
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-3">
                          {userStats.recentActivity.map((activity, index) => (
                            <div 
                              key={index} 
                              className={`flex justify-between items-center py-2 ${
                                index !== userStats.recentActivity.length - 1 ? 'border-b border-gray-200' : ''
                              }`}
                            >
                              <div className="flex items-center">
                                <CheckCircle size={16} className="text-green-500 mr-2" />
                                <span className="text-sm">{activity.quizTitle}</span>
                              </div>
                              <div className="flex items-center">
                                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                                  activity.score >= 80 ? 'bg-green-100 text-green-700' : 
                                  activity.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {activity.score}%
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {new Date(activity.completedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Badges Section */}
          <Badges showAll={false} />
        </TabsContent>
        
        {/* Quizzes Tab */}
        <TabsContent value="quizzes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : quizCategories.length > 0 ? (
              quizCategories.map(category => (
                <QuizCard 
                  key={category.id}
                  title={category.title}
                  description={category.description}
                  iconName={category.icon}
                  count={category.quizCount || 0}
                  onClick={() => handleCategorySelect(category.id)}
                />
              ))
            ) : (
              <div className="col-span-2 text-center p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No quiz categories available yet. Check back soon!</p>
              </div>
            )}
          </div>
          {/* Learning Resources Section */}
            <div className="mt-8 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Learning Resources</h2>
                <button 
                onClick={() => navigate('/knowledge/resources')}
                className="text-sm text-blue-600 flex items-center"
                >
                View All <ChevronRight size={16} className="ml-1" />
                </button>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                <FileText className="text-blue-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-medium text-blue-800">Learning Resources Available</h3>
                    <p className="text-blue-700 mt-1">
                    Access comprehensive guides and resources about diving techniques, equipment, physics, and more. Perfect for preparing for quizzes or expanding your knowledge.
                    </p>
                    <button 
                    onClick={() => navigate('/knowledge/resources')}
                    className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                    Browse Resources
                    </button>
                </div>
                </div>
            </div>
            </div>
        </TabsContent>
        
        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Top Overall Performers Card */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="flex justify-center mb-2">
                    <Medal size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-center font-medium text-blue-800 mb-1">Overall Top Divers</h3>
                  <p className="text-xs text-center text-blue-600">Based on average scores</p>
                </div>
                
                {/* Most Active Divers Card */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="flex justify-center mb-2">
                    <Award size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-center font-medium text-green-800 mb-1">Most Active Divers</h3>
                  <p className="text-xs text-center text-green-600">Based on quizzes completed</p>
                </div>
                
                {/* Category Champions Card */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="flex justify-center mb-2">
                    <Trophy size={24} className="text-purple-600" />
                  </div>
                  <h3 className="text-center font-medium text-purple-800 mb-1">Category Champions</h3>
                  <p className="text-xs text-center text-purple-600">Leaders in each category</p>
                </div>
              </div>
              
              {/* Main Leaderboard */}
              {topCategory && (
                <Leaderboard categoryId={topCategory.id} />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeHub;