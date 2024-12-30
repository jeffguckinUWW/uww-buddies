import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const Training = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trainings, setTrainings] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [courseDetails, setCourseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  useEffect(() => {
    const fetchTraining = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setTrainings(userData.training || []);
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
        
        // Check if the user is enrolled in the course
        const isEnrolled = data.students && data.students[user.uid] === true;
  
        if (isEnrolled) {
          // Fetch instructor details
          const instructorRef = doc(db, 'profiles', data.instructorId);
          const instructorSnap = await getDoc(instructorRef);
          const instructorData = instructorSnap.exists() ? instructorSnap.data() : null;
  
          setCourseDetails({
            ...data,
            instructor: instructorData
          });
        } else {
          setDetailsError('You are not enrolled in this course.');
        }
      } else {
        setDetailsError('Course not found.');
      }
    } catch (err) {
      console.error('Error fetching course details:', err);
      setDetailsError('Failed to load course details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (courseId) => {
    setSelectedCourseId(courseId);
    setShowDetails(true);
    fetchCourseDetails(courseId);
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
                    <div key={training.courseId} className="bg-white border rounded-lg shadow-sm p-4">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold">{training.courseName}</h4>
                        <p className="text-sm text-gray-600">
                          {training.location} • {new Date(training.startDate).toLocaleDateString()} - {new Date(training.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handleViewDetails(training.courseId)}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          View Details
                        </button>
                        <button className="text-sm text-gray-600 hover:text-blue-600">
                          View Records
                        </button>
                      </div>
                    </div>
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
                    <div key={training.courseId} className="bg-gray-50 border rounded-lg p-4">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold">{training.courseName}</h4>
                        <p className="text-sm text-gray-600">
                          {training.location} • Completed {training.completedAt ? new Date(training.completedAt).toLocaleDateString() : 'Date not available'}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handleViewDetails(training.courseId)}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          View Details
                        </button>
                        <button className="text-sm text-gray-600 hover:text-blue-600">
                          Training Records
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Course Details Section */}
        {showDetails && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Course Details</h3>
            {detailsLoading ? (
              <div>Loading...</div>
            ) : detailsError ? (
              <div className="text-red-600">{detailsError}</div>
            ) : courseDetails ? (
              <div>
                <h4 className="text-lg font-bold">{courseDetails.name}</h4>
                <p className="text-gray-600 mt-2">
                  {courseDetails.location} • {new Date(courseDetails.startDate).toLocaleDateString()} - {new Date(courseDetails.endDate).toLocaleDateString()}
                </p>
                {/* Instructor Section */}
                <div className="mt-6">
                  <h5 className="text-lg font-semibold mb-2">Instructor</h5>
                  {courseDetails.instructor ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {courseDetails.instructor.photoURL ? (
                          <img 
                            src={courseDetails.instructor.photoURL} 
                            alt={courseDetails.instructor.displayName}
                            className="w-full h-full rounded-full"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {courseDetails.instructor.displayName?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{courseDetails.instructor.displayName}</p>
                        <p className="text-sm text-gray-600">{courseDetails.instructor.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">Instructor information not available</p>
                  )}
                </div>
                {/* Enrolled Students Section */}
                <div className="mt-6">
                  <h5 className="text-lg font-semibold mb-2">
                    Enrolled Students ({courseDetails.students?.length || 0})
                  </h5>
                  <div className="space-y-3">
                    {courseDetails.students?.length > 0 ? (
                      courseDetails.students.map(student => (
                        <div key={student.uid} className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {student.photoURL ? (
                              <img 
                                src={student.photoURL} 
                                alt={student.displayName}
                                className="w-full h-full rounded-full"
                              />
                            ) : (
                              <span className="text-gray-600">
                                {student.displayName?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{student.displayName}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600">No students enrolled yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>No course details available</div>
            )}
            <button
              className="mt-4 px-4 py-2 bg-gray-200 rounded-md text-gray-800"
              onClick={() => setShowDetails(false)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Training;