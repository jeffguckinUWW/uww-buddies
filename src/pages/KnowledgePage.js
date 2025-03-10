// src/pages/KnowledgePage.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import KnowledgeHub from '../components/Knowledge/KnowledgeHub';
import QuizList from '../components/Knowledge/QuizList';
import QuizQuestion from '../components/Knowledge/QuizQuestion';
import QuizResults from '../components/Knowledge/QuizResults';

const KnowledgePage = () => {
  return (
    <Routes>
      <Route path="/" element={<KnowledgeHub />} />
      <Route path="/category/:categoryId" element={<QuizList />} />
      <Route path="/quiz/:quizId" element={<QuizQuestion />} />
      <Route path="/results" element={<QuizResults />} />
    </Routes>
  );
};

export default KnowledgePage;