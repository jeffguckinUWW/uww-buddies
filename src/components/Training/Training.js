import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import CourseMessaging from '/Users/jeffguckin/uww-buddies/src/components/Messaging/course/CourseMessaging.jsx';


const Training = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainings, setTrainings] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const cleanupTrainingData = useCallback(async (trainingData) => {
    console.log('Starting cleanup of training data:', trainingData);
    if (!trainingData || trainingData.length === 0) {
      console.log('No training data to clean up');
      return [];
    }

    const updatedTraining = [...trainingData];
    const invalidCourses = [];

    for (const training of trainingData) {
      try {
        console.log('Checking course:', {
          courseId: training.courseId,
          courseName: training.courseName,
          status: training.status
        });

        const courseRef = doc(db, 'courses', training.courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (!courseSnap.exists()) {
          console.log('Course does not exist:', training.courseId);
          invalidCourses.push(training.courseId);
        } else {
          const courseData = courseSnap.data();
          console.log('Course exists:', {
            courseId: training.courseId,
            status: courseData.status,
            students: courseData.students?.length || 0
          });
        }
      } catch (err) {
        console.log('Error checking course:', {
          courseId: training.courseId,
          error: err.message
        });
        // Don't mark as invalid on permission errors
        if (err.code !== 'permission-denied') {
          invalidCourses.push(training.courseId);
        }
      }
    }

    // Only remove courses we're sure don't exist
    if (invalidCourses.length > 0) {
      const filteredTraining = updatedTraining.filter(
        training => !invalidCourses.includes(training.courseId)
      );
      
      try {
        console.log('Removing invalid courses:', {
          removing: invalidCourses,
          remaining: filteredTraining.length
        });
        const userRef = doc(db, 'profiles', user.uid);
        await updateDoc(userRef, { training: filteredTraining });
        return filteredTraining;
      } catch (err) {
        console.error('Error updating profile:', err);
        return updatedTraining;
      }
    }

    return updatedTraining;
  }, [user?.uid]);

  const fetchCourseDetails = async (courseId) => {
    if (!courseId) return;
    
    try {
      setDetailsLoading(true);
      setDetailsError('');
  
      console.log('Fetching details for course:', courseId);
      const courseRef = doc(db, 'courses', courseId);
      
      try {
        const courseSnap = await getDoc(courseRef);
        console.log('Course snapshot exists:', courseSnap.exists());
        
        if (courseSnap.exists()) {
          const data = courseSnap.data();
          console.log('Course data retrieved:', {
            id: courseId,
            students: data.students?.length || 0,
            instructorId: data.instructorId,
            status: data.status
          });
          
          // Check if user is enrolled
          const isStudent = data.students?.some(student => student.uid === user.uid);
          const isAssistant = data.assistants?.some(assistant => assistant.uid === user.uid);
          
          console.log('Access check:', {
            isStudent,
            isAssistant,
            userId: user.uid
          });
  
          if (isStudent || isAssistant) {
            // Fetch instructor details if needed
            let instructorData = data.instructor;
            if (!instructorData && data.instructorId) {
              console.log('Fetching instructor details');
              try {
                const instructorRef = doc(db, 'profiles', data.instructorId);
                const instructorSnap = await getDoc(instructorRef);
                if (instructorSnap.exists()) {
                  instructorData = {
                    uid: data.instructorId,
                    email: instructorSnap.data().email,
                    displayName: instructorSnap.data().name || instructorSnap.data().displayName,
                    photoURL: instructorSnap.data().photoURL
                  };
                }
              } catch (instructorErr) {
                console.warn('Failed to fetch instructor details:', instructorErr);
                // Continue without instructor details
              }
            }
  
            setCourseDetails({
              ...data,
              id: courseId,
              instructor: instructorData,
              instructorId: data.instructorId
            });
          } else {
            console.log('User not enrolled in course');
            setDetailsError('You are not enrolled in this course.');
          }
        } else {
          console.log('Course not found, cleaning up training data');
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
        console.error('Error fetching course:', {
          courseId,
          error: err.message,
          code: err.code
        });
        throw err;
      }
    } catch (err) {
      console.error('Error in fetchCourseDetails:', err);
      if (err.code === 'permission-denied') {
        setDetailsError('Unable to access course details. Please try again in a moment.');
      } else {
        setDetailsError('Failed to load course details. Please try again later.');
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleDetails = async (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      setCourseDetails(null);
    } else {
      setExpandedCourseId(courseId);
      try {
        await debugCourseAccess(courseId);
        await fetchCourseDetails(courseId);
      } catch (error) {
        console.error('Toggle details error:', error);
      }
    }
  };

  useEffect(() => {
    const fetchTraining = async () => {
      if (user?.uid) {
        console.log('Fetching training for user:', user.uid);
        try {
          const userRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(userRef);
          
          console.log('User profile exists:', docSnap.exists());
          
          if (docSnap.exists()) {
            const userData = docSnap.data();
            console.log('Full user profile data:', userData);
            console.log('Training data from profile:', userData.training);
            
            const trainingData = userData.training || [];
            const validTraining = await cleanupTrainingData(trainingData);
            setTrainings(validTraining);
          } else {
            console.log('No user profile document found');
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
  }, [user, cleanupTrainingData]);

  const debugCourseAccess = async (courseId) => {
    try {
      console.log('=== DEBUG START ===');
      console.log('Debugging course access for:', courseId);
      console.log('Current user:', {
        uid: user?.uid,
        email: user?.email
      });
      
      // First, try to get the user's profile
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      console.log('User profile:', {
        exists: profileSnap.exists(),
        data: profileSnap.exists() ? profileSnap.data() : null
      });
  
      console.log('Training array from profile:', 
        profileSnap.exists() ? profileSnap.data().training : null
      );
      
      // Then, try to get the course data
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (!courseSnap.exists()) {
        console.log('Course does not exist');
        return;
      }
      
      const courseData = courseSnap.data();
      
      // Log all the relevant course data
      console.log('Course data:', {
        id: courseId,
        instructorId: courseData.instructorId,
        studentsLength: courseData.students?.length || 0,
        assistantsLength: courseData.assistants?.length || 0,
        hasStudents: !!courseData.students,
        hasAssistants: !!courseData.assistants
      });
  
      if (courseData.students) {
        console.log('Student check:', {
          userUid: user.uid,
          studentCount: courseData.students.length,
          studentUids: courseData.students.map(s => s.uid),
          isStudentFound: courseData.students.some(s => s.uid === user.uid),
          firstStudent: courseData.students[0]
        });
      }
  
      if (courseData.assistants) {
        console.log('Assistant check:', {
          userUid: user.uid,
          assistantCount: courseData.assistants.length,
          assistantUids: courseData.assistants.map(a => a.uid),
          isAssistantFound: courseData.assistants.some(a => a.uid === user.uid)
        });
      }
  
      console.log('Access summary:', {
        isInstructor: courseData.instructorId === user.uid,
        isStudent: courseData.students?.some(s => s.uid === user.uid) || false,
        isAssistant: courseData.assistants?.some(a => a.uid === user.uid) || false
      });
      console.log('=== DEBUG END ===');
      
    } catch (error) {
      console.error('Debug error:', {
        code: error.code,
        message: error.message,
        fullError: error,
        errorStack: error.stack
      });
    }
  };

  const CourseCard = ({ training, isExpanded, onToggle, details, isLoading, error }) => {
    const [activeTab, setActiveTab] = useState('details');
  
    return (
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {/* Course Header */}
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
          </div>
        </div>

        {/* Expandable Section */}
        {isExpanded && (
          <div className="border-t bg-gray-50">
            {isLoading ? (
              <div className="p-4 text-center text-gray-600">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">{error}</div>
            ) : details ? (
              <div>
                {/* Tabs */}
                <div className="border-b">
                  <nav className="flex">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'details'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setActiveTab('messages')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 ${
                        activeTab === 'messages'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Messages
                    </button>
                  </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'details' ? (
                  <div className="p-4 space-y-4">
                    {/* Instructor Info */}
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
                  </div>
                ) : (
                  <div className="p-4">
                    <CourseMessaging 
                      course={{
                        id: training.courseId,
                        name: training.courseName,
                        instructor: {
                          id: details.instructor?.uid,
                          displayName: details.instructor?.displayName,
                          email: details.instructor?.email
                        },
                        instructorId: details.instructorId
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-600">No details available</div>
            )}
          </div>
        )}
      </div>
    );
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