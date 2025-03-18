// src/components/Admin/TestCreator.js
import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Loader2, Check, AlertCircle, Database } from 'lucide-react';

const TestCreator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [testType, setTestType] = useState('');

  // Fix quiz counts function
  const handleFixQuizCounts = async () => {
    setIsLoading(true);
    setTestType('FixCounts');
    setResult(null);
    try {
      // Step 1: Get all categories
      const categoriesSnapshot = await getDocs(collection(db, 'quizCategories'));
      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Step 2: Get all quizzes
      const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
      const quizzes = quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        categoryId: doc.data().categoryId,
        ...doc.data()
      }));
      
      // Step 3: Count quizzes per category
      const categoryQuizCounts = {};
      categories.forEach(category => {
        categoryQuizCounts[category.id] = 0;
      });
      
      quizzes.forEach(quiz => {
        if (quiz.categoryId && categoryQuizCounts.hasOwnProperty(quiz.categoryId)) {
          categoryQuizCounts[quiz.categoryId]++;
        }
      });
      
      // Step 4: Update each category with the correct count
      let updateCount = 0;
      const updateDetails = [];
      
      for (const category of categories) {
        const currentCount = category.quizCount || 0;
        const actualCount = categoryQuizCounts[category.id] || 0;
        
        if (currentCount !== actualCount) {
          const categoryRef = doc(db, 'quizCategories', category.id);
          await updateDoc(categoryRef, {
            quizCount: actualCount
          });
          
          updateDetails.push(`"${category.title}": ${currentCount} → ${actualCount}`);
          updateCount++;
        }
      }
      
      if (updateCount > 0) {
        setResult({ 
          success: true, 
          message: `Fixed ${updateCount} categories with incorrect quiz counts:\n${updateDetails.join('\n')}`
        });
      } else {
        setResult({ 
          success: true, 
          message: "All quiz counts are correct. No updates needed."
        });
      }
    } catch (error) {
      console.error("Error fixing quiz counts:", error);
      setResult({ success: false, message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-100">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-xl font-bold flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 mr-2 text-blue-600"
          >
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1"></path>
            <path d="M17 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"></path>
            <path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M12 12v8"></path>
            <path d="M8 16h8"></path>
          </svg>
          Knowledge Creator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Database maintenance button */}
        <div className="mb-6">
          <Button
            onClick={handleFixQuizCounts}
            disabled={isLoading}
            className="w-full h-12 relative overflow-hidden group bg-gray-100 hover:bg-gray-200 text-gray-800"
            variant="outline"
          >
            <div className="relative z-10 flex items-center justify-center">
              {isLoading && testType === 'FixCounts' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Fixing Quiz Counts...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2 text-gray-600" />
                  <span>Fix Quiz Category Counts</span>
                </>
              )}
            </div>
          </Button>
        </div>

        {/* Placeholder for future quiz buttons */}
        <div className="text-center text-gray-400 py-8">
          <p>Add quiz creation buttons here when needed</p>
        </div>
        
      </CardContent>
      
      {result && (
        <CardFooter className="pt-0">
          <div className={`p-4 rounded-md w-full mt-4 flex items-start ${
            result.success ? 'bg-green-50 text-green-800 border border-green-200' : 
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {result.success ? (
              <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div className="whitespace-pre-line">{result.message}</div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default TestCreator;