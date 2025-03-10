import React, { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';
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

  const handleCreateCategory = async () => {
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
          <h3 className="text-xl font-bold">Quiz Categories</h3>
          <Button 
            onClick={() => setShowNewCategoryModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Category
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizCategories.map(category => (
            <div key={category.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between mb-2">
                <h4 className="text-lg font-semibold flex items-center">
                  {getIconComponent(category.icon)}
                  <span className="ml-2">{category.title}</span>
                </h4>
                <button 
                  onClick={() => handleDeleteCategory(category.id)} 
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-2">{category.description}</p>
              <p className="text-sm">
                <span className="font-medium">{category.quizCount || 0}</span> quizzes
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add New Category Modal */}
      <Dialog open={showNewCategoryModal} onOpenChange={setShowNewCategoryModal}>
        <DialogContent className="bg-white p-0 rounded-lg">
          <div className="border-b p-4 bg-white rounded-t-lg">
            <DialogTitle className="text-xl font-semibold">
              Add New Quiz Category
            </DialogTitle>
          </div>
          <div className="p-6 bg-white space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Title
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
              </div>
            </div>
            
            <div className="flex justify-end pt-4 space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowNewCategoryModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                disabled={!newCategoryData.title}
              >
                Create Category
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
      return <Anchor size={20} className="text-blue-500" />;
    case 'compass':
      return <Compass size={20} className="text-blue-500" />;
    case 'thermometer':
      return <Info size={20} className="text-blue-500" />;
    case 'fish':
      return <AlertCircle size={20} className="text-blue-500" />;
    case 'weather':
      return <AlertCircle size={20} className="text-blue-500" />;
    case 'navigation':
      return <Compass size={20} className="text-blue-500" />;
    case 'marine':
      return <AlertCircle size={20} className="text-blue-500" />;
    case 'certification':
      return <Award size={20} className="text-blue-500" />;
    case 'book':
    default:
      return <Book size={20} className="text-blue-500" />;
  }
};

export default QuizCategoryManager;