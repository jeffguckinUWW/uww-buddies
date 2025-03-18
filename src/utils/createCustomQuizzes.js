// src/utils/createCustomQuizzes.js
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Create a generic function to add a quiz to the database
const createQuiz = async (quizData) => {
  try {
    // Create quiz document
    await setDoc(doc(db, 'quizzes', quizData.id), {
      ...quizData,
      questionCount: quizData.questions.length,
      completedBy: [],
      createdAt: new Date()
    });
    
    // Update category quiz count
    const categoryRef = doc(db, 'quizCategories', quizData.categoryId);
    const categoryDoc = await getDoc(categoryRef);
    
    if (categoryDoc.exists()) {
      await updateDoc(categoryRef, {
        quizCount: (categoryDoc.data().quizCount || 0) + 1
      });
    } else {
      console.warn(`Category ${quizData.categoryId} does not exist. Quiz created but category not updated.`);
    }
    
    return true;
  } catch (error) {
    console.error("Error creating quiz:", error);
    return false;
  }
};

// Create all quizzes at once function - placeholder, can be expanded when needed
export const createAllCustomQuizzes = async () => {
  try {
    // Add quiz creation calls here when needed
    return true;
  } catch (error) {
    console.error("Error creating all custom quizzes:", error);
    return false;
  }
};

export default createAllCustomQuizzes;