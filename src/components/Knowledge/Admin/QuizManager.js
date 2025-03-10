import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Plus, Edit, Trash2, Book, Image as ImageIcon } from 'lucide-react';

const QuizManager = ({ 
  quizzes, 
  setQuizzes,
  quizCategories,
  setQuizCategories,
  db,
  storage,
  user
}) => {
  // State for quiz management
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  const [showEditQuizModal, setShowEditQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [newQuizData, setNewQuizData] = useState({
    title: '',
    categoryId: '',
    difficulty: 'beginner',
    certificationLevel: 'all',
    questions: [
      {
        question: '',
        imageUrl: null,
        answers: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
      }
    ]
  });
  
  // Image upload states
  const [uploadProgress, setUploadProgress] = useState({});
  
  // Image upload handler
  const handleImageUpload = (questionIndex, file) => {
    if (!file) return;
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `quiz_images/${Date.now()}_${file.name}`);
    
    // Start the upload task
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Set initial progress
    setUploadProgress(prev => ({
      ...prev,
      [questionIndex]: 0
    }));
    
    // Listen for state changes, errors, and completion
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Get upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({
          ...prev,
          [questionIndex]: progress
        }));
      },
      (error) => {
        console.error('Error uploading image:', error);
        setUploadProgress(prev => ({
          ...prev,
          [questionIndex]: null
        }));
      },
      () => {
        // Upload completed, get download URL
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          // Save the image URL to the question
          const updatedQuestions = [...newQuizData.questions];
          updatedQuestions[questionIndex].imageUrl = downloadURL;
          
          setNewQuizData({
            ...newQuizData,
            questions: updatedQuestions
          });
          
          // Clear the progress when done
          setUploadProgress(prev => ({
            ...prev,
            [questionIndex]: null
          }));
        });
      }
    );
  };

  // Handle image removal
  const handleRemoveImage = (questionIndex) => {
    const updatedQuestions = [...newQuizData.questions];
    updatedQuestions[questionIndex].imageUrl = null;
    
    setNewQuizData({
      ...newQuizData,
      questions: updatedQuestions
    });
  };

  const handleCreateQuiz = async () => {
    try {
      // Generate ID from title
      const quizId = newQuizData.title.toLowerCase().replace(/\s+/g, '-');
      
      // Count questions
      const questionCount = newQuizData.questions.length;
      
      // Create quiz document
      await setDoc(doc(db, 'quizzes', quizId), {
        id: quizId,
        title: newQuizData.title,
        categoryId: newQuizData.categoryId,
        difficulty: newQuizData.difficulty,
        certificationLevel: newQuizData.certificationLevel,
        questionCount,
        completedBy: [],
        questions: newQuizData.questions
      });

      // Update category quiz count
      const category = quizCategories.find(cat => cat.id === newQuizData.categoryId);
      if (category) {
        const categoryRef = doc(db, 'quizCategories', category.id);
        await updateDoc(categoryRef, {
          quizCount: (category.quizCount || 0) + 1
        });

        // Update local categories state
        setQuizCategories(quizCategories.map(cat => {
          if (cat.id === category.id) {
            return {
              ...cat,
              quizCount: (cat.quizCount || 0) + 1
            };
          }
          return cat;
        }));
      }

      // Add to local state
      setQuizzes([
        ...quizzes,
        {
          id: quizId,
          title: newQuizData.title,
          categoryId: newQuizData.categoryId,
          difficulty: newQuizData.difficulty,
          certificationLevel: newQuizData.certificationLevel,
          questionCount,
          completedBy: [],
          questions: newQuizData.questions
        }
      ]);

      // Reset form
      setNewQuizData({
        title: '',
        categoryId: '',
        difficulty: 'beginner',
        certificationLevel: 'all',
        questions: [
          {
            question: '',
            imageUrl: null,
            answers: ['', '', '', ''],
            correctAnswer: 0,
            explanation: ''
          }
        ]
      });
      
      setShowNewQuizModal(false);
    } catch (err) {
      console.error('Error creating quiz:', err);
      alert('Error creating quiz. Please try again.');
    }
  };

  const handleUpdateQuiz = async () => {
    try {
      if (!selectedQuiz) return;
      
      // Update quiz document
      await updateDoc(doc(db, 'quizzes', selectedQuiz.id), {
        title: newQuizData.title,
        categoryId: newQuizData.categoryId,
        difficulty: newQuizData.difficulty,
        certificationLevel: newQuizData.certificationLevel,
        questionCount: newQuizData.questions.length,
        questions: newQuizData.questions
      });

      // Update local state
      setQuizzes(quizzes.map(quiz => {
        if (quiz.id === selectedQuiz.id) {
          return {
            ...quiz,
            title: newQuizData.title,
            categoryId: newQuizData.categoryId,
            difficulty: newQuizData.difficulty,
            certificationLevel: newQuizData.certificationLevel,
            questionCount: newQuizData.questions.length,
            questions: newQuizData.questions
          };
        }
        return quiz;
      }));

      setShowEditQuizModal(false);
      setSelectedQuiz(null);
    } catch (err) {
      console.error('Error updating quiz:', err);
      alert('Error updating quiz. Please try again.');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) {
      return;
    }

    try {
      const quizToDelete = quizzes.find(q => q.id === quizId);
      
      // Delete the quiz
      await deleteDoc(doc(db, 'quizzes', quizId));

      // Update category quiz count
      if (quizToDelete) {
        const category = quizCategories.find(cat => cat.id === quizToDelete.categoryId);
        if (category && category.quizCount > 0) {
          const categoryRef = doc(db, 'quizCategories', category.id);
          await updateDoc(categoryRef, {
            quizCount: category.quizCount - 1
          });

          // Update local categories state
          setQuizCategories(quizCategories.map(cat => {
            if (cat.id === category.id) {
              return {
                ...cat,
                quizCount: Math.max(0, cat.quizCount - 1)
              };
            }
            return cat;
          }));
        }
      }

      // Update local state
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
    } catch (err) {
      console.error('Error deleting quiz:', err);
      alert('Error deleting quiz. Please try again.');
    }
  };

  const handleEditQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setNewQuizData({
      title: quiz.title,
      categoryId: quiz.categoryId,
      difficulty: quiz.difficulty,
      certificationLevel: quiz.certificationLevel || 'all',
      questions: [...quiz.questions]
    });
    setShowEditQuizModal(true);
  };

  const handleAddQuestion = () => {
    setNewQuizData({
      ...newQuizData,
      questions: [
        ...newQuizData.questions,
        {
          question: '',
          imageUrl: null,
          answers: ['', '', '', ''],
          correctAnswer: 0,
          explanation: ''
        }
      ]
    });
  };

  const handleRemoveQuestion = (index) => {
    const updatedQuestions = [...newQuizData.questions];
    updatedQuestions.splice(index, 1);
    setNewQuizData({
      ...newQuizData,
      questions: updatedQuestions
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...newQuizData.questions];
    
    if (field === 'answer') {
      const [answerIndex, answerValue] = value;
      updatedQuestions[index].answers[answerIndex] = answerValue;
    } else {
      updatedQuestions[index][field] = value;
    }
    
    setNewQuizData({
      ...newQuizData,
      questions: updatedQuestions
    });
  };

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Quizzes</h3>
          <Button 
            onClick={() => {
              setNewQuizData({
                title: '',
                categoryId: quizCategories.length > 0 ? quizCategories[0].id : '',
                difficulty: 'beginner',
                certificationLevel: 'all',
                questions: [
                  {
                    question: '',
                    imageUrl: null,
                    answers: ['', '', '', ''],
                    correctAnswer: 0,
                    explanation: ''
                  }
                ]
              });
              setShowNewQuizModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Quiz
          </Button>
        </div>
        
        <div className="space-y-4">
          {quizzes.map(quiz => {
            const category = quizCategories.find(c => c.id === quiz.categoryId);
            return (
              <div key={quiz.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-semibold">{quiz.title}</h4>
                    <p className="text-sm text-gray-500">
                      Category: {category?.title || 'Unknown'}
                    </p>
                    <div className="flex mt-2 items-center space-x-4">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
                      </span>
                      {quiz.certificationLevel && quiz.certificationLevel !== 'all' && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          {quiz.certificationLevel.charAt(0).toUpperCase() + quiz.certificationLevel.slice(1)}
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {quiz.questionCount} questions
                      </span>
                      <span className="text-sm text-gray-600">
                        {quiz.completedBy?.length || 0} completions
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditQuiz(quiz)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {quizzes.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Book size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No quizzes available. Create your first quiz!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Quiz Modal */}
      <Dialog open={showNewQuizModal || showEditQuizModal} onOpenChange={() => {
        setShowNewQuizModal(false);
        setShowEditQuizModal(false);
      }}>
        <DialogContent className="bg-white p-0 rounded-lg max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="border-b p-4 bg-white rounded-t-lg sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">
              {showNewQuizModal ? 'Add New Quiz' : 'Edit Quiz'}
            </DialogTitle>
          </div>
          <div className="p-6 bg-white space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={newQuizData.title}
                  onChange={(e) => setNewQuizData({...newQuizData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Basic Scuba Equipment"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newQuizData.categoryId}
                    onChange={(e) => setNewQuizData({...newQuizData, categoryId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {quizCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={newQuizData.difficulty}
                    onChange={(e) => setNewQuizData({...newQuizData, difficulty: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certification Level
                </label>
                <select
                  value={newQuizData.certificationLevel}
                  onChange={(e) => setNewQuizData({...newQuizData, certificationLevel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="openwater">Open Water</option>
                  <option value="advanced">Advanced Open Water</option>
                  <option value="rescue">Rescue Diver</option>
                  <option value="divemaster">Divemaster</option>
                  <option value="instructor">Instructor</option>
                </select>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-lg font-medium mb-4">Questions</h4>
              
              <div className="space-y-8">
                {newQuizData.questions.map((question, qIndex) => (
                  <div key={qIndex} className="border p-4 rounded-lg relative">
                    <div className="absolute top-2 right-2">
                      {newQuizData.questions.length > 1 && (
                        <button
                          onClick={() => handleRemoveQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question {qIndex + 1}
                      </label>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. What is the purpose of a BCD?"
                      />
                    </div>
                    
                    {/* Image Upload Section */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Question Image (optional)
                      </label>
                      {question.imageUrl ? (
                        <div className="relative">
                          <img 
                            src={question.imageUrl} 
                            alt="Question" 
                            className="w-full h-40 object-cover rounded-md mb-2"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(qIndex)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <input
                            type="file"
                            accept="image/*"
                            id={`image-upload-${qIndex}`}
                            className="hidden"
                            onChange={(e) => handleImageUpload(qIndex, e.target.files[0])}
                          />
                          <label
                            htmlFor={`image-upload-${qIndex}`}
                            className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                          >
                            <ImageIcon size={16} className="mr-2" />
                            Select Image
                          </label>
                          {uploadProgress[qIndex] != null && (
                            <div className="ml-4 flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${uploadProgress[qIndex]}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {Math.round(uploadProgress[qIndex])}% uploaded
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Add an image to enhance your question (e.g., equipment identification)
                      </p>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Answer Options
                      </label>
                      
                      {question.answers.map((answer, aIndex) => (
                        <div key={aIndex} className="flex items-center">
                          <input
                            type="radio"
                            checked={question.correctAnswer === aIndex}
                            onChange={() => handleQuestionChange(qIndex, 'correctAnswer', aIndex)}
                            className="mr-2"
                          />
                          <input
                            type="text"
                            value={answer}
                            onChange={(e) => handleQuestionChange(qIndex, 'answer', [aIndex, e.target.value])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Answer option ${aIndex + 1}`}
                          />
                        </div>
                      ))}
                      
                      <p className="text-sm text-gray-500 italic">
                        Select the radio button next to the correct answer
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Explanation (shown after answering)
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows="2"
                        placeholder="Explain why the correct answer is right"
                      />
                    </div>
                  </div>
                ))}
                
                <Button
                  onClick={handleAddQuestion}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Add Another Question
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 space-x-3 sticky bottom-0 bg-white pb-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewQuizModal(false);
                  setShowEditQuizModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={showNewQuizModal ? handleCreateQuiz : handleUpdateQuiz}
                disabled={!newQuizData.title || !newQuizData.categoryId || newQuizData.questions.some(q => !q.question)}
              >
                {showNewQuizModal ? 'Create Quiz' : 'Update Quiz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuizManager;