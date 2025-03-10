import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, HelpCircle, Award } from 'lucide-react';

const QuizQuestion = () => {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [includeInLeaderboard, setIncludeInLeaderboard] = useState(true);
  const { quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const quizRef = doc(db, 'quizzes', quizId);
        const quizSnap = await getDoc(quizRef);
        
        if (quizSnap.exists()) {
          setQuiz(quizSnap.data());
        } else {
          console.error('Quiz not found');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleAnswerSelect = (answerIndex) => {
    if (isAnswered) return;
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const isCorrect = answerIndex === quiz.questions[currentQuestion].correctAnswer;
    
    // Add to user answers array
    setUserAnswers([...userAnswers, {
      questionIndex: currentQuestion,
      selectedAnswer: answerIndex,
      isCorrect
    }]);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      // Calculate score
      const correctAnswers = userAnswers.filter(answer => answer.isCorrect).length;
      const totalQuestions = quiz.questions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);
      
      // Save results to Firestore
      saveQuizResults(score, correctAnswers, totalQuestions);
      
      // Navigate to results
      navigate(`/knowledge/results`, { 
        state: { 
          quizId,
          categoryId: quiz.categoryId,
          score,
          correctAnswers,
          totalQuestions,
          userAnswers,
          quizTitle: quiz.title,
          includeInLeaderboard
        } 
      });
    }
  };

  const saveQuizResults = async (score, correctAnswers, totalQuestions) => {
    try {
      // Update user's quiz history
      const userQuizRef = doc(db, 'profiles', user.uid);
      await updateDoc(userQuizRef, {
        quizHistory: arrayUnion({
          quizId,
          quizTitle: quiz.title,
          score,
          correctAnswers,
          totalQuestions,
          completedAt: new Date().toISOString()
        }),
        totalQuizzesCompleted: increment(1)
      });
      
      // Update quiz completion status
      const quizRef = doc(db, 'quizzes', quizId);
      await updateDoc(quizRef, {
        completedBy: arrayUnion(user.uid)
      });
    } catch (error) {
      console.error('Error saving quiz results:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="flex-1 p-4">
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">This quiz is not available or has no questions.</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => navigate('/knowledge')}
          >
            Back to Knowledge Hub
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center mb-4">
        <button 
          className="mr-2 p-2 hover:bg-gray-100 rounded-full"
          onClick={() => navigate('/knowledge')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">{quiz.title}</h1>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${(currentQuestion / quiz.questions.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Question */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <p className="text-gray-500 mb-2 text-sm">
          Question {currentQuestion + 1} of {quiz.questions.length}
        </p>
        <h2 className="text-lg font-medium mb-6">{currentQuestionData.question}</h2>
        
        {/* Display question image if available */}
        {currentQuestionData.imageUrl && (
          <div className="mb-4">
            <img 
              src={currentQuestionData.imageUrl} 
              alt="Question" 
              className="w-full max-h-60 object-contain rounded-lg shadow-md"
            />
          </div>
        )}
        
        {/* Answers */}
        <div className="space-y-3">
          {currentQuestionData.answers.map((answer, index) => (
            <div 
              key={index}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedAnswer === index 
                  ? (index === currentQuestionData.correctAnswer 
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300')
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleAnswerSelect(index)}
            >
              {answer}
            </div>
          ))}
        </div>
        
        {/* Explanation (shows when answered) */}
        {isAnswered && currentQuestionData.explanation && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start">
            <HelpCircle size={20} className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 text-sm">{currentQuestionData.explanation}</p>
          </div>
        )}
      </div>
      
      {/* Next button with leaderboard option on last question */}
      <div className="flex justify-between items-center">
        {isLastQuestion && isAnswered ? (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="leaderboardOption"
              checked={includeInLeaderboard}
              onChange={(e) => setIncludeInLeaderboard(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="leaderboardOption" className="text-sm text-gray-600 flex items-center">
              <Award size={16} className="mr-1 text-blue-500" />
              Include my score on the leaderboard
            </label>
          </div>
        ) : (
          <div />
        )}
        
        <button
          className={`px-6 py-2 rounded-lg font-medium ${
            isAnswered 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          onClick={handleNextQuestion}
          disabled={!isAnswered}
        >
          {currentQuestion < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizQuestion;