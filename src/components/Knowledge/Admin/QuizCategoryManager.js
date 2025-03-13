import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Plus, Trash2, Book, Award, Info, AlertCircle, Compass, Anchor } from 'lucide-react';

const QuizCategoryManager = ({ 
  quizCategories, 
  setQuizCategories,
  quizzes,
  setQuizzes,
  db
}) => {
  // State for category management
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    title: '',
    description: '',
    icon: 'book'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const categoryId = newCategoryData.title.toLowerCase().replace(/\s+/g, '-');
      
      await setDoc(doc(db, 'quizCategories', categoryId), {
        id: categoryId,
        title: newCategoryData.title,
        description: newCategoryData.description,
        icon: newCategoryData.icon,
        quizCount: 0
      });

      // Update local state
      setQuizCategories([
        ...quizCategories,
        {
          id: categoryId,
          title: newCategoryData.title,
          description: newCategoryData.description,
          icon: newCategoryData.icon,
          quizCount: 0
        }
      ]);

      // Reset form
      setNewCategoryData({
        title: '',
        description: '',
        icon: 'book'
      });
      
      setShowNewCategoryModal(false);
    } catch (err) {
      console.error('Error creating category:', err);
      alert('Error creating category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This will delete all quizzes in this category as well.')) {
      return;
    }

    try {
      // Delete the category
      await deleteDoc(doc(db, 'quizCategories', categoryId));

      // Find and delete all quizzes in this category
      const categoryQuizzes = quizzes.filter(quiz => quiz.categoryId === categoryId);
      for (const quiz of categoryQuizzes) {
        await deleteDoc(doc(db, 'quizzes', quiz.id));
      }

      // Update local state
      setQuizCategories(quizCategories.filter(category => category.id !== categoryId));
      setQuizzes(quizzes.filter(quiz => quiz.categoryId !== categoryId));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Error deleting category. Please try again.');
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Quiz Categories</h3>
          <Button 
            onClick={() => setShowNewCategoryModal(true)}
            className="flex items-center gap-2 text-sm sm:text-base"
            size="sm"
          >
            <Plus size={16} /> 
            <span className="hidden sm:inline">Add Category</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {quizCategories.map(category => (
            <div key={category.id} className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-200 relative">
              <div className="flex justify-between mb-2">
                <h4 className="text-base sm:text-lg font-semibold flex items-center pr-6 truncate">
                  {getIconComponent(category.icon)}
                  <span className="ml-2 truncate">{category.title}</span>
                </h4>
                <button 
                  onClick={() => handleDeleteCategory(category.id)} 
                  className="text-red-500 hover:text-red-700 absolute top-3 right-3"
                  aria-label={`Delete ${category.title} category`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">{category.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm">
                  <span className="font-medium">{category.quizCount || 0}</span> {category.quizCount === 1 ? 'quiz' : 'quizzes'}
                </p>
                {category.quizCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
          
          {quizCategories.length === 0 && (
            <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
              <Book size={36} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">No categories available. Create your first category!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Category Modal */}
      <Dialog open={showNewCategoryModal} onOpenChange={setShowNewCategoryModal}>
        <DialogContent className="bg-white p-0 rounded-lg max-w-md w-full mx-auto">
          <div className="border-b p-4 bg-white rounded-t-lg flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Add New Quiz Category
            </DialogTitle>
            <DialogClose className="h-6 w-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800">
              ×
            </DialogClose>
          </div>
          <div className="p-5 bg-white space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryData.title}
                  onChange={(e) => setNewCategoryData({...newCategoryData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Dive Equipment"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({...newCategoryData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Describe this quiz category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <select
                  value={newCategoryData.icon}
                  onChange={(e) => setNewCategoryData({...newCategoryData, icon: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="book">Book</option>
                  <option value="anchor">Anchor</option>
                  <option value="compass">Compass</option>
                  <option value="thermometer">Thermometer</option>
                  <option value="fish">Fish</option>
                  <option value="weather">Weather</option>
                  <option value="navigation">Navigation</option>
                  <option value="marine">Marine</option>
                  <option value="certification">Certification</option>
                </select>
                <div className="mt-2 flex items-center">
                  <span className="mr-2 text-sm text-gray-600">Preview:</span>
                  {getIconComponent(newCategoryData.icon)}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowNewCategoryModal(false)}
                className="px-4"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategoryData.title || isSubmitting}
                className="px-4"
              >
                {isSubmitting ? 
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span> : 
                  'Create Category'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function to render icon based on name
const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'anchor':
      return <Anchor size={20} className="text-blue-500 flex-shrink-0" />;
    case 'compass':
      return <Compass size={20} className="text-blue-500 flex-shrink-0" />;
    case 'thermometer':
      return <Info size={20} className="text-blue-500 flex-shrink-0" />;
    case 'fish':
      return <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />;
    case 'weather':
      return <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />;
    case 'navigation':
      return <Compass size={20} className="text-blue-500 flex-shrink-0" />;
    case 'marine':
      return <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />;
    case 'certification':
      return <Award size={20} className="text-blue-500 flex-shrink-0" />;
    case 'book':
    default:
      return <Book size={20} className="text-blue-500 flex-shrink-0" />;
  }
};

export default QuizCategoryManager;