import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, where, deleteDoc, } from 'firebase/firestore';
import InstructorPinSetup from './InstructorPinSetup';
import CourseMessaging from '/Users/jeffguckin/uww-buddies/src/components/Messaging/course/CourseMessaging.jsx';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [instructorProfile, setInstructorProfile] = useState(null);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const init = async () => {
      if (user?.uid) {
        try {
          const profileRef = doc(db, 'profiles', user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            setInstructorProfile(profileData);
            setHasPin(!!profileData.instructorPin?.pin);
            
            if (profileData.instructorPin?.pin && (!profileData.role || profileData.role !== 'instructor')) {
              await updateDoc(profileRef, { role: 'instructor' });
            }
          }

          const coursesRef = collection(db, 'courses');
          const q = query(coursesRef, where('instructorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const coursesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCourses(coursesData);

        } catch (err) {
          console.error('Error initializing dashboard:', err);
          setError('Error loading instructor dashboard');
        } finally {
          setLoading(false);
        }
      }
    };
    
    init();
  }, [user]);
  const searchUsers = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'profiles');
      const searchTermLower = searchTerm.toLowerCase();
      
      const querySnapshot = await getDocs(usersRef);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const isAlreadyInCourse = selectedCourse?.students?.some(
          student => student.uid === doc.id
        );
        const isAlreadyAssistant = selectedCourse?.assistants?.some(
          assistant => assistant.uid === doc.id
        );
        
        if (!isAlreadyInCourse && !isAlreadyAssistant &&
            userData.role !== 'instructor' &&
            (userRole === 'student' ? userData.role !== 'assistant' : true) &&
            (userData.email?.toLowerCase().includes(searchTermLower) || 
             userData.name?.toLowerCase().includes(searchTermLower))) {
          users.push({
            uid: doc.id,
            email: userData.email,
            phone: userData.phone || '',
            displayName: userData.name || 'Unnamed User'
          });
        }
      });
      
      setSearchResults(users);
    } catch (err) {
      console.error('Error searching for users:', err);
      setError('Failed to search for users');
    } finally {
      setIsSearching(false);
    }
  };

  const addUserToCourse = async (user, role = 'student') => {
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();
      
      const userData = {
        ...user,
        displayName: profileData.name || user.displayName || 'Unnamed User',
        phone: profileData.phone || ''
      };
  
      const courseRef = doc(db, 'courses', selectedCourse.id);
      let updatedCourse;
  
      if (role === 'assistant') {
        const updatedAssistants = [...(selectedCourse.assistants || []), userData];
        updatedCourse = { ...selectedCourse, assistants: updatedAssistants };
        await updateDoc(courseRef, { assistants: updatedAssistants });
      } else {
        const updatedStudents = [...(selectedCourse.students || []), userData];
        updatedCourse = { ...selectedCourse, students: updatedStudents };
        await updateDoc(courseRef, { students: updatedStudents });
      }
  
      setCourses(courses.map(course => 
        course.id === selectedCourse.id ? updatedCourse : course
      ));
      setSelectedCourse(updatedCourse);
      
      setSearchResults([]);
      setStudentSearch('');
      
      if (profileSnap.exists()) {
        try {
          const currentTraining = profileData.training || [];
          
          const newTrainingEntry = {
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            status: 'active',
            startDate: selectedCourse.startDate,
            endDate: selectedCourse.endDate,
            location: selectedCourse.location,
            role: role,
            instructorId: selectedCourse.instructorId,
            instructorEmail: selectedCourse.instructor?.email,
            addedAt: new Date().toISOString()
          };
  
          const profileUpdate = {
            training: [...currentTraining, newTrainingEntry]
          };
  
          await updateDoc(profileRef, profileUpdate);
  
        } catch (err) {
          console.error('Error updating training array:', err);
          throw err;
        }
      }
    } catch (err) {
      console.error('Error in addUserToCourse:', err);
      setError(`Failed to add ${role} to course`);
    }
  };

  const removeUserFromCourse = async (userToRemove, role = 'student') => {
    if (window.confirm(`Are you sure you want to remove this ${role} from the course?`)) {
      try {
        const courseRef = doc(db, 'courses', selectedCourse.id);
        let updatedCourse;

        if (role === 'assistant') {
          const updatedAssistants = selectedCourse.assistants.filter(
            assistant => assistant.uid !== userToRemove.uid
          );
          updatedCourse = { ...selectedCourse, assistants: updatedAssistants };
          await updateDoc(courseRef, { assistants: updatedAssistants });
        } else {
          const updatedStudents = selectedCourse.students.filter(
            student => student.uid !== userToRemove.uid
          );
          updatedCourse = { ...selectedCourse, students: updatedStudents };
          await updateDoc(courseRef, { students: updatedStudents });
        }

        setCourses(courses.map(course => 
          course.id === selectedCourse.id ? updatedCourse : course
        ));
        setSelectedCourse(updatedCourse);
        
        const userRef = doc(db, 'profiles', userToRemove.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const updatedTraining = (userData.training || []).filter(training => {
            return training.courseId !== selectedCourse.id;
          });
          
          await updateDoc(userRef, { training: updatedTraining });
        }
      } catch (err) {
        console.error(`Error removing ${role} from course:`, err);
        setError(`Failed to remove ${role} from course`);
      }
    }
  };
  const handleCreateCourse = async () => {
    try {
      const courseData = {
        ...newCourse,
        instructorId: user.uid,
        instructor: {
          uid: user.uid,
          email: instructorProfile.email,
          displayName: instructorProfile.name || 'Unnamed Instructor'
        },
        status: 'active',
        students: [],
        assistants: [],
        createdAt: new Date(),
      };
  
      const docRef = await addDoc(collection(db, 'courses'), courseData);
      const newCourseWithId = { id: docRef.id, ...courseData };
      setCourses([...courses, newCourseWithId]);
      setIsNewCourseModalOpen(false);
      setNewCourse({ 
        name: "", 
        location: "", 
        startDate: "", 
        endDate: "",
      });
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Failed to create course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        if (courseSnap.exists()) {
          const courseData = courseSnap.data();
          const updatePromises = [];

          if (courseData.students && courseData.students.length > 0) {
            courseData.students.forEach(student => {
              const studentRef = doc(db, 'profiles', student.uid);
              updatePromises.push(
                getDoc(studentRef).then(studentSnap => {
                  if (studentSnap.exists()) {
                    const studentData = studentSnap.data();
                    const updatedTraining = (studentData.training || []).filter(
                      t => t.courseId !== courseId
                    );
                    return updateDoc(studentRef, { training: updatedTraining });
                  }
                })
              );
            });
          }

          if (courseData.assistants && courseData.assistants.length > 0) {
            courseData.assistants.forEach(assistant => {
              const assistantRef = doc(db, 'profiles', assistant.uid);
              updatePromises.push(
                getDoc(assistantRef).then(assistantSnap => {
                  if (assistantSnap.exists()) {
                    const assistantData = assistantSnap.data();
                    const updatedTraining = (assistantData.training || []).filter(
                      t => t.courseId !== courseId
                    );
                    return updateDoc(assistantRef, { training: updatedTraining });
                  }
                })
              );
            });
          }

          await Promise.all(updatePromises);
          await deleteDoc(courseRef);
          setCourses(courses.filter(course => course.id !== courseId));
          setIsManageModalOpen(false);
          setSelectedCourse(null);
        }
      } catch (err) {
        console.error('Error deleting course:', err);
        setError('Failed to delete course');
      }
    }
  };

  const handleManageCourse = (course) => {
    setSelectedCourse(course);
    setIsManageModalOpen(true);
  };

  const handleCompleteCourse = async (courseId) => {
    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        status: 'completed',
        completedAt: new Date()
      });

      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, status: 'completed', completedAt: new Date() }
          : course
      ));
    } catch (err) {
      console.error('Error completing course:', err);
      setError('Failed to complete course');
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

  if (!hasPin) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-yellow-50 p-4 rounded-md mb-4">
          <p className="text-yellow-700">
            Welcome to the Instructor Portal! Please set up your PIN to continue.
          </p>
        </div>
        <InstructorPinSetup onPinSet={() => setHasPin(true)} />
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h2>
          <button
            onClick={() => setIsNewCourseModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Course
          </button>
        </div>

        {/* New Course Modal */}
        {isNewCourseModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Create New Course</h3>
        <button
          onClick={() => setIsNewCourseModalOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Course Name"
          className="w-full p-2 border rounded"
          value={newCourse.name}
          onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
        />
        <input
          type="text"
          placeholder="Location"
          className="w-full p-2 border rounded"
          value={newCourse.location}
          onChange={(e) => setNewCourse({...newCourse, location: e.target.value})}
        />
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className="p-2 border rounded"
            value={newCourse.startDate}
            onChange={(e) => setNewCourse({...newCourse, startDate: e.target.value})}
          />
          <input
            type="date"
            className="p-2 border rounded"
            value={newCourse.endDate}
            onChange={(e) => setNewCourse({...newCourse, endDate: e.target.value})}
          />
        </div>
        <button
          onClick={handleCreateCourse}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Create Course
        </button>
      </div>
    </div>
  </div>
)}

        {/* Course Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Courses */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Courses</h3>
            <div className="space-y-4">
              {courses.filter(course => course.status === 'active').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No active courses yet.</p>
                </div>
              ) : (
                courses
                  .filter(course => course.status === 'active')
                  .map(course => (
                    <div key={course.id} className="bg-white border rounded-lg shadow-sm p-4">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold">{course.name}</h4>
                        <p className="text-sm text-gray-600">
                          {course.location} • {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4">
                          <button className="text-sm text-gray-600 hover:text-blue-600">
                            {course.students?.length || 0} Students
                          </button>
                          <button 
                            onClick={() => handleManageCourse(course)}
                            className="text-sm text-gray-600 hover:text-blue-600"
                          >
                            Manage Course
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCourse(course);
                              setIsMessageModalOpen(true);
                            }}
                            className="text-sm text-gray-600 hover:text-blue-600"
                          >
                            Message Course
                          </button>
                        </div>
                        <button 
                          onClick={() => handleCompleteCourse(course.id)}
                          className="text-sm text-green-600 hover:text-green-700"
                        >
                          Complete Course
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Completed Courses */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Completed Courses</h3>
            <div className="space-y-4">
              {courses.filter(course => course.status === 'completed').length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600">No completed courses yet.</p>
                </div>
              ) : (
                courses
                  .filter(course => course.status === 'completed')
                  .map(course => (
                    <div key={course.id} className="bg-gray-50 border rounded-lg p-4">
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold">{course.name}</h4>
                        <p className="text-sm text-gray-600">
                          {course.location} • Completed {course.completedAt ? new Date(course.completedAt).toLocaleDateString() : 'Date not available'}
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handleManageCourse(course)}
                          className="text-sm text-gray-600 hover:text-blue-600"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
        {/* Manage Course Modal */}
        {isManageModalOpen && selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manage Course: {selectedCourse.name}</h3>
                <button
                  onClick={() => {
                    setIsManageModalOpen(false);
                    setSelectedCourse(null);
                    setSearchResults([]);
                    setStudentSearch('');
                    setUserRole('student');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Course Info Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Course Information</h4>
                  <p className="text-sm text-gray-600">
                    Location: {selectedCourse.location}<br />
                    Start Date: {new Date(selectedCourse.startDate).toLocaleDateString()}<br />
                    End Date: {new Date(selectedCourse.endDate).toLocaleDateString()}<br />
                    Instructor: {selectedCourse.instructor?.displayName || instructorProfile?.name || 'Unknown'} 
                    ({selectedCourse.instructor?.email || instructorProfile?.email || 'No email'})<br />
                    Students: {selectedCourse.students?.length || 0}<br />
                    Assistants: {selectedCourse.assistants?.length || 0}
                  </p>
                </div>

                {/* User Management Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold">Manage Course Users</h4>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="p-2 border rounded"
                    >
                      <option value="student">Add Student</option>
                      <option value="assistant">Add Assistant</option>
                    </select>
                  </div>
                  
                  {/* Search Users */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={`Search ${userRole}s by name or email`}
                      className="w-full p-2 border rounded"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        searchUsers(e.target.value);
                      }}
                    />
                    
                    {/* Search Results */}
                    {isSearching ? (
                      <div className="mt-2 text-sm text-gray-600">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                        {searchResults.map(user => (
                          <div 
                            key={user.uid}
                            className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                          >
                            <div>
                              <div className="font-medium">{user.displayName}</div>
                              <div className="text-sm text-gray-600">
                                {user.email}
                                {userRole === 'student' && user.phone && (
                                  <div className="text-gray-500">Phone: {user.phone}</div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => addUserToCourse(user, userRole)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Add as {userRole}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : studentSearch && (
                      <div className="mt-2 text-sm text-gray-600">No users found</div>
                    )}
                  </div>

                  {/* Assistants List */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Course Assistants</h5>
                    <div className="border rounded max-h-40 overflow-y-auto">
                      {selectedCourse.assistants?.length > 0 ? (
                        selectedCourse.assistants.map(assistant => (
                          <div 
                            key={assistant.uid}
                            className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                          >
                            <div>
                              <div className="font-medium">{assistant.displayName}</div>
                              <div className="text-sm text-gray-600">{assistant.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedCourse({...selectedCourse, messageRecipient: assistant});
                                  setIsManageModalOpen(false);
                                  setIsMessageModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Message
                              </button>
                              <button
                                onClick={() => removeUserFromCourse(assistant, 'assistant')}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-gray-600 text-center">
                          No assistants assigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Enrolled Students</h5>
                    <div className="border rounded max-h-60 overflow-y-auto">
                      {selectedCourse.students?.length > 0 ? (
                        selectedCourse.students.map(student => (
                          <div 
                            key={student.uid}
                            className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                          >
                            <div>
                              <div className="font-medium">{student.displayName}</div>
                              <div className="text-sm text-gray-600">
                                {student.email}
                                {student.phone && (
                                  <div className="text-gray-500">Phone: {student.phone}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">

                              <button
                                onClick={() => {
                                  setSelectedCourse({...selectedCourse, messageRecipient: student});
                                  setIsManageModalOpen(false);
                                  setIsMessageModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Message
                              </button>
                              <button
                                onClick={() => removeUserFromCourse(student, 'student')}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-sm text-gray-600 text-center">
                          No students enrolled yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Course Actions */}
                <div className="border-t pt-4 space-y-2">
                  <button
                    onClick={() => {
                      setIsManageModalOpen(false);
                      setIsMessageModalOpen(true);
                    }}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
                  >
                    Message Course
                  </button>

                  <button
                    onClick={() => handleDeleteCourse(selectedCourse.id)}
                    className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
                  >
                    Delete Course
                  </button>
                  
                  {selectedCourse.status === 'active' && (
                    <button
                      onClick={() => {
                        handleCompleteCourse(selectedCourse.id);
                        setIsManageModalOpen(false);
                        setSelectedCourse(null);
                      }}
                      className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
          <button
            onClick={() => setHasPin(false)}
            className="text-blue-700 hover:text-blue-900 underline"
          >
            Reset PIN
          </button>
        </div>

        {/* Course Messaging Modal */}
        {selectedCourse && (
          <CourseMessaging
            course={selectedCourse}
            isOpen={isMessageModalOpen}
            onClose={() => {
              setIsMessageModalOpen(false);
              if (selectedCourse.messageRecipient) {
                setSelectedCourse({
                  ...selectedCourse,
                  messageRecipient: undefined
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default InstructorDashboard;