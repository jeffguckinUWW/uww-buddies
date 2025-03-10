import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import QuizCategoryManager from './QuizCategoryManager';
import QuizManager from './QuizManager';
import ResourceManager from './ResourceManager';

const KnowledgeAdmin = ({ 
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
  // Initial tab selection
  initialTab = 'quizzes'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="quizzes">Quiz Management</TabsTrigger>
        <TabsTrigger value="resources">Learning Resources</TabsTrigger>
      </TabsList>
      
      <TabsContent value="quizzes">
        <div className="space-y-8">
          <QuizCategoryManager 
            quizCategories={quizCategories}
            setQuizCategories={setQuizCategories}
            quizzes={quizzes}
            setQuizzes={setQuizzes}
            db={db}
          />
          
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
      
      <TabsContent value="resources">
        <ResourceManager 
          learningResources={learningResources}
          setLearningResources={setLearningResources}
          db={db}
          storage={storage}
          user={user}
        />
      </TabsContent>
    </Tabs>
  );
};

export default KnowledgeAdmin;