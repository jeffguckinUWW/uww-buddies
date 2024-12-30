import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import InstructorPinSetup from './InstructorPinSetup';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: ""
  });
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchStudents = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'profiles');
      const searchTermLower = searchTerm.toLowerCase();
      
      // Get all users (we'll filter on client side for more flexible search)
      const querySnapshot = await getDocs(usersRef);
      const users = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Check if user is not already in the course
        const isAlreadyInCourse = selectedCourse?.students?.some(
          student => student.uid === doc.id
        );
        
        if (!isAlreadyInCourse && // Skip if already in course
            userData.role !== 'instructor' && // Skip instructors
            (userData.email?.toLowerCase().includes(searchTermLower) || // Search email
             userData.name?.toLowerCase().includes(searchTermLower))) { // Search name using the name field
          users.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.name || 'Unnamed User' // Use the name field
          });
        }
      });
      
      setSearchResults(users);
    } catch (err) {
      console.error('Error searching for students:', err);
      setError('Failed to search for students');
    } finally {
      setIsSearching(false);
    }
  };

  const addStudentToCourse = async (student) => {
    try {
      // Get the latest profile data to ensure we have the most recent name
      const profileRef = doc(db, 'profiles', student.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();

      const studentData = {
        ...student,
        displayName: profileData.name || student.displayName || 'Unnamed User'
      };

      const courseRef = doc(db, 'courses', selectedCourse.id);
      const updatedStudents = [...(selectedCourse.students || []), studentData];
      
      await updateDoc(courseRef, {
        students: updatedStudents
      });

      // Update local state
      setCourses(courses.map(course => 
        course.id === selectedCourse.id 
          ? { ...course, students: updatedStudents }
          : course
      ));
      setSelectedCourse({ ...selectedCourse, students: updatedStudents });
      
      // Clear search results after adding
      setSearchResults([]);
      setStudentSearch('');
      
      // Update student's training data
      const trainingRef = doc(db, 'profiles', student.uid);
      const trainingSnap = await getDoc(trainingRef);
      
      if (trainingSnap.exists()) {
        const currentTraining = trainingSnap.data().training || [];
        await updateDoc(trainingRef, {
          training: [...currentTraining, {
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            status: selectedCourse.status,
            startDate: selectedCourse.startDate,
            endDate: selectedCourse.endDate,
            location: selectedCourse.location,
            instructorId: user.uid
          }]
        });
      }
    } catch (err) {
      console.error('Error adding student to course:', err);
      setError('Failed to add student to course');
    }
  };

  const removeStudentFromCourse = async (studentToRemove) => {
    if (window.confirm('Are you sure you want to remove this student from the course?')) {
      try {
        const courseRef = doc(db, 'courses', selectedCourse.id);
        const updatedStudents = selectedCourse.students.filter(
          student => student.uid !== studentToRemove.uid
        );
        
        await updateDoc(courseRef, {
          students: updatedStudents
        });

        // Update local state
        setCourses(courses.map(course => 
          course.id === selectedCourse.id 
            ? { ...course, students: updatedStudents }
            : course
        ));
        setSelectedCourse({ ...selectedCourse, students: updatedStudents });
        
        // Remove course from student's training data
        const trainingRef = doc(db, 'profiles', studentToRemove.uid);
        const trainingSnap = await getDoc(trainingRef);
        
        if (trainingSnap.exists()) {
          const currentTraining = trainingSnap.data().training || [];
          await updateDoc(trainingRef, {
            training: currentTraining.filter(t => t.courseId !== selectedCourse.id)
          });
        }
      } catch (err) {
        console.error('Error removing student from course:', err);
        setError('Failed to remove student from course');
      }
    }
  };

  const checkInstructorPin = async () => {
    if (user?.uid) {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setHasPin(!!userData.instructorPin?.pin);
          
          // If user has a PIN but no role, update their role
          if (userData.instructorPin?.pin && (!userData.role || userData.role !== 'instructor')) {
            try {
              await updateDoc(docRef, {
                role: 'instructor'
              });
              console.log('Instructor role updated successfully');
            } catch (updateErr) {
              console.error('Error updating instructor role:', updateErr);
            }
          }
        }
      } catch (err) {
        console.error('Error checking instructor PIN:', err);
        setError('Error loading instructor dashboard');
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchCourses = async () => {
    if (user?.uid) {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().role === 'instructor') {
          const coursesRef = collection(db, 'courses');
          const q = query(coursesRef, where('instructorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const coursesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCourses(coursesData);
        } else {
          console.error('User is not an instructor');
          setError('Access denied: User is not an instructor');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Error loading courses');
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkInstructorPin();
      await fetchCourses();
    };
    
    init();
  }, [user]);

  const handleCreateCourse = async () => {
    try {
      const courseData = {
        ...newCourse,
        instructorId: user.uid,
        status: 'active',
        students: [],
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'courses'), courseData);
      const newCourseWithId = { id: docRef.id, ...courseData };
      setCourses([...courses, newCourseWithId]);
      setIsNewCourseModalOpen(false);
      setNewCourse({ name: "", location: "", startDate: "", endDate: "" });
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Failed to create course');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const courseRef = doc(db, 'courses', courseId);
        await deleteDoc(courseRef);
        setCourses(courses.filter(course => course.id !== courseId));
        setIsManageModalOpen(false);
        setSelectedCourse(null);
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
          ? { ...course, status: 'completed' }
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

        {/* Manage Course Modal */}
        {isManageModalOpen && selectedCourse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Manage Course: {selectedCourse.name}</h3>
                <button
                  onClick={() => {
                    setIsManageModalOpen(false);
                    setSelectedCourse(null);
                    setSearchResults([]);
                    setStudentSearch('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Location: {selectedCourse.location}<br />
                    Start Date: {new Date(selectedCourse.startDate).toLocaleDateString()}<br />
                    End Date: {new Date(selectedCourse.endDate).toLocaleDateString()}<br />
                    Students: {selectedCourse.students?.length || 0}
                  </p>
                </div>

                {/* Student Management Section */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-semibold mb-4">Manage Students</h4>
                  
                  {/* Search Students */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search students by name or email"
                        className="flex-1 p-2 border rounded"
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          searchStudents(e.target.value);
                        }}
                      />
                    </div>
                    
                    {/* Search Results */}
                    {isSearching ? (
                      <div className="mt-2 text-sm text-gray-600">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                        {searchResults.map(student => (
                          <div 
                            key={student.uid}
                            className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                          >
                            <div>
                              <div className="font-medium">{student.displayName}</div>
                              <div className="text-sm text-gray-600">{student.email}</div>
                            </div>
                            <button
                              onClick={() => addStudentToCourse(student)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Add to Course
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : studentSearch && (
                      <div className="mt-2 text-sm text-gray-600">No students found</div>
                    )}
                  </div>

                  {/* Current Students List */}
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
                              <div className="text-sm text-gray-600">{student.email}</div>
                            </div>
                            <button
                              onClick={() => removeStudentFromCourse(student)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
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
                
                <div className="border-t pt-4 space-y-2">
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
                courses.filter(course => course.status === 'active').map(course => (
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
                          Manage All
                        </button>
                        <button className="text-sm text-gray-600 hover:text-blue-600">
                          Records
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
                courses.filter(course => course.status === 'completed').map(course => (
                  <div key={course.id} className="bg-gray-50 border rounded-lg p-4">
                    <div className="mb-2">
                      <h4 className="text-lg font-semibold">{course.name}</h4>
                      <p className="text-sm text-gray-600">
                        {course.location} • Completed {new Date(course.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button className="text-sm text-gray-600 hover:text-blue-600">
                        View Records
                      </button>
                      <button className="text-sm text-gray-600 hover:text-blue-600">
                        Course End Report
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
          <button
            onClick={() => setHasPin(false)}
            className="text-blue-700 hover:text-blue-900 underline"
          >
            Reset PIN
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;