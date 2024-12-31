import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const Training = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainings, setTrainings] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const cleanupTrainingData = async (trainingData) => {
    const updatedTraining = [];
    const invalidCourses = [];

    for (const training of trainingData) {
      try {
        const courseRef = doc(db, 'courses', training.courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (courseSnap.exists()) {
          updatedTraining.push(training);
        } else {
          invalidCourses.push(training.courseId);
        }
      } catch (err) {
        console.error('Error checking course:', training.courseId, err);
        invalidCourses.push(training.courseId);
      }
    }

    // If we found invalid courses, update the user's profile
    if (invalidCourses.length > 0) {
      try {
        const userRef = doc(db, 'profiles', user.uid);
        await updateDoc(userRef, { training: updatedTraining });
        console.log('Removed invalid courses:', invalidCourses);
      } catch (err) {
        console.error('Error updating user profile:', err);
      }
    }

    return updatedTraining;
  };

  const CourseCard = ({ training, isExpanded, onToggle, details, isLoading, error }) => {
    return (
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {/* Course Header - Always visible */}
        <div className="p-4">
          <div className="mb-2">
            <h4 className="text-lg font-semibold">{training.courseName}</h4>
            <p className="text-sm text-gray-600">
              {training.location} • {new Date(training.startDate).toLocaleDateString()} - {new Date(training.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onToggle}
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Hide Details
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  View Details
                </>
              )}
            </button>
            <button className="text-sm text-gray-600 hover:text-blue-600">
              View Records
            </button>
          </div>
        </div>
  
        {/* Expandable Details Section */}
        {isExpanded && (
          <div className="border-t bg-gray-50">
            {isLoading ? (
              <div className="p-4 text-center text-gray-600">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">{error}</div>
            ) : details ? (
              <div className="p-4 space-y-4">
                {/* Instructor Section */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Instructor</h5>
                  {details.instructor ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {details.instructor.photoURL ? (
                          <img 
                            src={details.instructor.photoURL} 
                            alt={details.instructor.displayName}
                            className="w-full h-full rounded-full"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {details.instructor.displayName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{details.instructor.displayName}</p>
                        <p className="text-sm text-gray-600">{details.instructor.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Instructor information not available</p>
                  )}
                </div>
  
                {/* Students Section */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">
                    Enrolled Students ({details.students?.length || 0})
                  </h5>
                  <div className="space-y-2">
                    {details.students?.length > 0 ? (
                      details.students.map(student => (
                        <div key={student.uid} className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                            {student.photoURL ? (
                              <img 
                                src={student.photoURL} 
                                alt={student.displayName}
                                className="w-full h-full rounded-full"
                              />
                            ) : (
                              <span className="text-sm text-gray-600">
                                {student.displayName?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{student.displayName}</p>
                            <p className="text-xs text-gray-600">{student.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">No students enrolled yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600">No details available</div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchTraining = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            const trainingData = userData.training || [];
            
            // Clean up any invalid training entries
            const validTraining = await cleanupTrainingData(trainingData);
            setTrainings(validTraining);
          }
        } catch (err) {
          console.error('Error fetching training:', err);
          setError('Error loading training data');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchTraining();
  }, [user]);

  const fetchCourseDetails = async (courseId) => {
    if (!courseId) return;
    
    try {
      setDetailsLoading(true);
      setDetailsError('');
  
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
  
      if (courseSnap.exists()) {
        const data = courseSnap.data();
        
        console.log('Course data:', data);
        console.log('Current user:', user.uid);
        
        // Check if the user is enrolled in the course - handle array with numeric indices
        const isStudent = data.students && 
          data.students.some(student => student.uid === user.uid);
        const isAssistant = data.assistants && 
          data.assistants.some(assistant => assistant.uid === user.uid);
  
        console.log('Is student:', isStudent);
        console.log('Is assistant:', isAssistant);
  
        if (isStudent || isAssistant) {
          // Fetch instructor details if not already included
          let instructorData = data.instructor;
          if (!instructorData && data.instructorId) {
            const instructorRef = doc(db, 'profiles', data.instructorId);
            const instructorSnap = await getDoc(instructorRef);
            if (instructorSnap.exists()) {
              instructorData = {
                uid: data.instructorId,
                email: instructorSnap.data().email,
                name: instructorSnap.data().name || instructorSnap.data().displayName,
                photoURL: instructorSnap.data().photoURL
              };
            }
          }
  
          setCourseDetails({
            ...data,
            id: courseId,
            instructor: instructorData
          });
        } else {
          setDetailsError('You are not enrolled in this course.');
        }
      } else {
        // If the course doesn't exist, clean up user's training data
        const userRef = doc(db, 'profiles', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const updatedTraining = userData.training?.filter(t => t.courseId !== courseId) || [];
          await updateDoc(userRef, { training: updatedTraining });
          setTrainings(updatedTraining);
        }
        
        setDetailsError('This course has been deleted. It has been removed from your training history.');
      }
    } catch (err) {
      console.error('Error fetching course details:', err);
      if (err.code === 'permission-denied') {
        setDetailsError('You do not have permission to view this course.');
      } else {
        setDetailsError('Failed to load course details. Please try again later.');
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleDetails = (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setCourseDetails(null);
    } else {
      setExpandedCourseId(courseId);
      fetchCourseDetails(courseId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">My Training</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Training */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Training</h3>
            <div className="space-y-4">
              {trainings.filter(training => training.status === 'active').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No active training courses.</p>
                </div>
              ) : (
                trainings
                  .filter(training => training.status === 'active')
                  .map(training => (
                    <CourseCard
                      key={training.courseId}
                      training={training}
                      isExpanded={expandedCourseId === training.courseId}
                      onToggle={() => handleToggleDetails(training.courseId)}
                      details={expandedCourseId === training.courseId ? courseDetails : null}
                      isLoading={detailsLoading}
                      error={detailsError}
                    />
                  ))
              )}
            </div>
          </div>

          {/* Completed Training */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Completed Training</h3>
            <div className="space-y-4">
              {trainings.filter(training => training.status === 'completed').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No completed training courses.</p>
                </div>
              ) : (
                trainings
                  .filter(training => training.status === 'completed')
                  .map(training => (
                    <CourseCard
                      key={training.courseId}
                      training={training}
                      isExpanded={expandedCourseId === training.courseId}
                      onToggle={() => handleToggleDetails(training.courseId)}
                      details={expandedCourseId === training.courseId ? courseDetails : null}
                      isLoading={detailsLoading}
                      error={detailsError}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;