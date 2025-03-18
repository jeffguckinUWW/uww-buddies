import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Lock, Filter } from 'lucide-react';

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const { categoryId } = useParams();
  const navigate = useNavigate();

  // Define experience levels
  const experienceLevels = [
    { id: 'all', label: 'All Levels' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        // Fetch category details
        const categoryRef = collection(db, 'quizCategories');
        const categorySnap = await getDocs(query(categoryRef, where('id', '==', categoryId)));
        
        if (!categorySnap.empty) {
          setCategoryTitle(categorySnap.docs[0].data().title);
        }
        
        // Fetch quizzes in this category
        const quizzesCollection = collection(db, 'quizzes');
        const quizQuery = query(quizzesCollection, where('categoryId', '==', categoryId));
        const quizSnapshot = await getDocs(quizQuery);
        
        const quizList = quizSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          level: doc.data().difficulty || 'beginner' // Default to beginner if level isn't set
        }));
        
        setQuizzes(quizList);
        setFilteredQuizzes(quizList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [categoryId]);

  // Filter quizzes when level selection changes
  useEffect(() => {
    if (selectedLevel === 'all') {
      setFilteredQuizzes(quizzes);
    } else {
      setFilteredQuizzes(quizzes.filter(quiz => quiz.difficulty === selectedLevel));
    }
  }, [selectedLevel, quizzes]);

  const handleQuizSelect = (quizId) => {
    navigate(`/knowledge/quiz/${quizId}`);
  };

  const handleLevelChange = (level) => {
    setSelectedLevel(level);
  };

  // Function to get appropriate badge color for each level
  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-blue-100 text-blue-700';
      case 'advanced':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center mb-4">
        <button 
          className="mr-2 p-2 hover:bg-gray-100 rounded-full"
          onClick={() => navigate('/knowledge')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">{categoryTitle || 'Quizzes'}</h1>
      </div>
      
      {/* Level filter */}
      <div className="mb-4 bg-white p-3 rounded-lg shadow">
        <div className="flex items-center mb-2">
          <Filter size={16} className="mr-2 text-gray-500" />
          <span className="text-sm font-medium">Filter by Level:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {experienceLevels.map(level => (
            <button
              key={level.id}
              onClick={() => handleLevelChange(level.id)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedLevel === level.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center mt-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map(quiz => (
              <div 
                key={quiz.id}
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => !quiz.locked && handleQuizSelect(quiz.id)}
              >
                <div>
                  <h3 className={`font-medium ${quiz.locked ? 'text-gray-400' : ''}`}>
                    {quiz.title}
                  </h3>
                  <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelBadgeColor(quiz.difficulty)}`}>
                    {quiz.difficulty ? quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1) : 'Beginner'}
                  </span>
                    <span className="mx-2 text-gray-300">•</span>
                    <p className="text-sm text-gray-500">{quiz.questionCount || 0} questions</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {quiz.completed ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : quiz.locked ? (
                    <Lock size={20} className="text-gray-400" />
                  ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      Start
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                {quizzes.length > 0 
                  ? 'No quizzes available for the selected level.' 
                  : 'No quizzes available in this category yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizList;