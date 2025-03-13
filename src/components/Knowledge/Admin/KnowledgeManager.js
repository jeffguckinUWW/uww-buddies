import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Card } from '../../ui/card';import QuizCategoryManager from './QuizCategoryManager'; // Same directory
import QuizManager from './QuizManager'; // Same directory
import ResourceManager from './ResourceManager'; // Same directory
import { FileText, BookText } from 'lucide-react';
import TestCreator from '../../Admin/TestCreator';

const KnowledgeManager = ({ 
  // Props for quiz categories
  quizCategories, 
  setQuizCategories,
  // Props for quizzes
  quizzes,
  setQuizzes,
  // Props for learning resources
  learningResources,
  setLearningResources,
  // Other props
  db,
  storage,
  user,
}) => {
  const [activeTab, setActiveTab] = useState('quizzes');

  return (
    <div className="p-4 pb-6">
      <Card className="bg-white border-0 shadow-sm mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex border-b border-gray-200 justify-start">
            <TabsTrigger 
              value="quizzes" 
              className="flex items-center py-3 px-6 text-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-700"
            >
              <BookText size={18} className="mr-2 hidden sm:inline" />
              <span>Quiz Management</span>
            </TabsTrigger>
            <TabsTrigger 
              value="resources" 
              className="flex items-center py-3 px-6 text-gray-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-700"
            >
              <FileText size={18} className="mr-2 hidden sm:inline" />
              <span>Learning Resources</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="quizzes" className="pt-4">
            {/* TestCreator for NAUI certification tests */}
            <div className="mb-6">
              <TestCreator db={db} />
            </div>
            
            <div className="mb-8">
              <QuizCategoryManager 
                quizCategories={quizCategories}
                setQuizCategories={setQuizCategories}
                quizzes={quizzes}
                setQuizzes={setQuizzes}
                db={db}
              />
            </div>
            
            <div>
              <QuizManager 
                quizzes={quizzes}
                setQuizzes={setQuizzes}
                quizCategories={quizCategories}
                setQuizCategories={setQuizCategories}
                db={db}
                storage={storage}
                user={user}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="resources" className="pt-4">
            <ResourceManager 
              learningResources={learningResources}
              setLearningResources={setLearningResources}
              db={db}
              storage={storage}
              user={user}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default KnowledgeManager;