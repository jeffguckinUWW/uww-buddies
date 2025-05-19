import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import TrainingRecordSelector from '../Training/TrainingRecordSelector';
import StudentTrainingRecord from '../Training/StudentTrainingRecord';
import CourseCreationModal from '../Training/CourseCreationModal';
import CourseEndReport from './CourseEndReport';
import NotificationService from '../../services/NotificationService';
import UnifiedMessaging from '../Messaging/shared/UnifiedMessaging';


const CourseSection = ({ user, instructorProfile }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });
  const [messageModalState, setMessageModalState] = useState({
    isOpen: false,
    course: null,
    recipient: null
  });
  const [showCourseEndReport, setShowCourseEndReport] = useState(false);
  const [courseToComplete, setCourseToComplete] = useState(null);
  const [isTrainingRecordSelectorOpen, setIsTrainingRecordSelectorOpen] = useState(false);
  const [selectedTrainingRecord, setSelectedTrainingRecord] = useState(null);
  const [isTrainingRecordModalOpen, setIsTrainingRecordModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [courseNotifications, setCourseNotifications] = useState({});

  useEffect(() => {
    const loadCourses = async () => {
      if (user?.uid) {
        try {
          const coursesRef = collection(db, 'courses');
          const q = query(coursesRef, where('instructorId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          const coursesData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setCourses(coursesData);
        } catch (err) {
          console.error('Error loading courses:', err);
          setError('Error loading courses');
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadCourses();
  }, [user]);

  // Subscribe to notifications for each course
  useEffect(() => {
    if (!user?.uid || !courses.length) return;
    
    const unsubscribers = {};
    
    // Subscribe to notifications for each course
    courses.forEach(course => {
      unsubscribers[course.id] = NotificationService.subscribeToItemNotifications(
        user.uid,
        'course',
        course.id,
        (notificationData) => {
          setCourseNotifications(prev => ({
            ...prev,
            [course.id]: notificationData
          }));
        }
      );
    });
    
    // Cleanup subscriptions when component unmounts or courses change
    return () => {
      Object.values(unsubscribers).forEach(unsubscribe => unsubscribe());
    };
  }, [user, courses]);

  const calculateStudentProgress = (student, course) => {
    if (!student || !course || !course?.trainingRecord || !course.studentRecords?.[student.uid]?.progress) {
      return 0;
    }
  
    const progress = course.studentRecords[student.uid].progress;
    let totalSkills = 0;
    let completedSkills = 0;
  
    course.trainingRecord.sections.forEach(section => {
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          totalSkills += subsection.skills.length;
          completedSkills += Object.keys(progress[subsection.title] || {}).length;
        });
      } else {
        totalSkills += section.skills.length;
        completedSkills += Object.keys(progress[section.title] || {}).length;
      }
    });
  
    return totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
  };

  const clearCourseNotifications = async (courseId, tabType = 'all') => {
    if (!user?.uid || !courseId) return;
    
    try {
      if (tabType === 'all') {
        // Clear broadcast notifications
        await NotificationService.markTabNotificationsAsRead(user.uid, 'course', courseId, 'broadcast');
        // Clear discussion notifications
        await NotificationService.markTabNotificationsAsRead(user.uid, 'course', courseId, 'discussion');
        // Clear direct message notifications
        await NotificationService.markTabNotificationsAsRead(user.uid, 'course', courseId, 'direct');
      } else {
        // Clear specific tab notifications
        await NotificationService.markTabNotificationsAsRead(user.uid, 'course', courseId, tabType);
      }
    } catch (err) {
      console.error('Error clearing course notifications:', err);
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
        trainingRecord: selectedTrainingRecord,
        studentRecords: {}
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
      setSelectedTrainingRecord(null);
    } catch (err) {
      console.error('Error creating course:', err);
      setError('Failed to create course');
    }
  };

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
  
          await updateDoc(profileRef, {
            training: [...currentTraining, newTrainingEntry]
          });
  
          await addDoc(collection(db, 'notifications'), {
            type: 'course_enrollment',
            toUser: user.uid,
            fromUser: instructorProfile.uid,
            fromUserName: instructorProfile.name || 'Unknown Instructor',
            courseName: selectedCourse.name,
            timestamp: serverTimestamp(),
            read: false
          });
  
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
  
          await addDoc(collection(db, 'notifications'), {
            type: 'course_removal',
            toUser: userToRemove.uid,
            fromUser: instructorProfile.uid,
            fromUserName: instructorProfile.name || 'Unknown Instructor',
            courseName: selectedCourse.name,
            timestamp: serverTimestamp(),
            read: false
          });
        }
      } catch (err) {
        console.error(`Error removing ${role} from course:`, err);
        setError(`Failed to remove ${role} from course`);
      }
    }
  };

  const handleCompleteCourse = async (courseId, setActive = false) => {
    try {
      const currentCourse = courses.find(c => c.id === courseId);
      
      if (!setActive) {
        const hasUnlockedRecords = currentCourse.students.some(student => {
          const studentRecord = currentCourse.studentRecords?.[student.uid];
          return !studentRecord?.signOff?.locked;
        });

        if (hasUnlockedRecords) {
          alert('All student training records must be locked before completing the course.');
          return;
        }

        setCourseToComplete(currentCourse);
        setShowCourseEndReport(true);
        return;
      }

      const completedAt = new Date().toISOString();
      const courseRef = doc(db, 'courses', courseId);
      
      const updatePromises = currentCourse.students.map(async (student) => {
        const studentRef = doc(db, 'profiles', student.uid);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const updatedTraining = studentData.training.map(t => 
            t.courseId === courseId 
              ? { ...t, status: setActive ? 'active' : 'completed', completedAt: setActive ? null : completedAt } 
              : t
          );
          
          return updateDoc(studentRef, { training: updatedTraining });
        }
      });

      if (currentCourse.assistants) {
        const assistantPromises = currentCourse.assistants.map(async (assistant) => {
          const assistantRef = doc(db, 'profiles', assistant.uid);
          const assistantSnap = await getDoc(assistantRef);
          
          if (assistantSnap.exists()) {
            const assistantData = assistantSnap.data();
            const updatedTraining = assistantData.training.map(t => 
              t.courseId === courseId 
                ? { ...t, status: setActive ? 'active' : 'completed', completedAt: setActive ? null : completedAt } 
                : t
            );
            
            return updateDoc(assistantRef, { training: updatedTraining });
          }
        });
        
        updatePromises.push(...assistantPromises);
      }

      const notificationPromises = [...(currentCourse.students || []), ...(currentCourse.assistants || [])].map(user =>
        addDoc(collection(db, 'notifications'), {
          type: 'course_completed',
          toUser: user.uid,
          fromUser: instructorProfile.uid,
          fromUserName: instructorProfile.name || 'Unknown Instructor',
          courseName: currentCourse.name,
          timestamp: serverTimestamp(),
          read: false
        })
      );

      await Promise.all([
        updateDoc(courseRef, {
          status: setActive ? 'active' : 'completed',
          completedAt: setActive ? null : completedAt
        }),
        ...updatePromises,
        ...notificationPromises
      ]);

      setCourses(courses.map(course => 
        course.id === courseId 
          ? { 
              ...course, 
              status: setActive ? 'active' : 'completed', 
              completedAt: setActive ? null : completedAt 
            } 
          : course
      ));
    } catch (err) {
      console.error('Error updating course status:', err);
      setError('Failed to update course status');
    }
  };

  const handleCourseEndReportSubmit = async (reportData) => {
    try {
      const courseId = courseToComplete.id;
      const completedAt = new Date().toISOString();

      const courseRef = doc(db, 'courses', courseId);
      
      // Update enrolled students' training arrays
      const updatePromises = courseToComplete.students.map(async (student) => {
        const studentRef = doc(db, 'profiles', student.uid);
        const studentSnap = await getDoc(studentRef);
        
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          const updatedTraining = studentData.training.map(t => 
            t.courseId === courseId 
              ? { ...t, status: 'completed', completedAt: completedAt } 
              : t
          );
          return updateDoc(studentRef, { training: updatedTraining });
        }
      });

      // Update assistants' training arrays
      if (courseToComplete.assistants) {
        const assistantPromises = courseToComplete.assistants.map(async (assistant) => {
          const assistantRef = doc(db, 'profiles', assistant.uid);
          const assistantSnap = await getDoc(assistantRef);
          
          if (assistantSnap.exists()) {
            const assistantData = assistantSnap.data();
            const updatedTraining = assistantData.training.map(t => 
              t.courseId === courseId 
                ? { ...t, status: 'completed', completedAt: completedAt } 
                : t
            );
            return updateDoc(assistantRef, { training: updatedTraining });
          }
        });
        updatePromises.push(...assistantPromises);
      }

      // Add the course end report data
      await updateDoc(courseRef, {
        status: 'completed',
        completedAt: completedAt,
        courseEndReport: reportData
      });

      setCourses(courses.map(course => 
        course.id === courseId 
          ? { 
              ...course, 
              status: 'completed', 
              completedAt: completedAt,
              courseEndReport: reportData
            } 
          : course
      ));

      setShowCourseEndReport(false);
      setCourseToComplete(null);
      setIsManageModalOpen(false);
      setSelectedCourse(null);

    } catch (err) {
      console.error('Error completing course:', err);
      setError('Failed to complete course');
    }
  };

  const handleManageCourse = (course) => {
    setSelectedCourse(course);
    setIsManageModalOpen(true);
    clearCourseNotifications(course.id, 'all');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex justify-between items-center">
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
                      <h4 className="text-lg font-semibold">
                        {course.name}
                        {courseNotifications[course.id]?.totalCount > 0 && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {courseNotifications[course.id].totalCount}
                          </span>
                        )}
                      </h4>
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
                            setMessageModalState({
                              isOpen: true,
                              course: course,
                              recipient: null
                            });
                            clearCourseNotifications(course.id, 'all');
                          }}
                          className="text-sm text-gray-600 hover:text-blue-600 relative"
                        >
                          Message Course
                          {courseNotifications[course.id]?.totalCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                          )}
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
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to reactivate this course?')) {
                            handleCompleteCourse(course.id, true);
                          }
                        }}
                        className="text-sm text-green-600 hover:text-green-700"
                      >
                        Reactivate Course
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Course Creation Modal */}
      {isNewCourseModalOpen && (
        <CourseCreationModal
          isOpen={isNewCourseModalOpen}
          onClose={() => setIsNewCourseModalOpen(false)}
          newCourse={newCourse}
          setNewCourse={setNewCourse}
          handleCreateCourse={handleCreateCourse}
          selectedTrainingRecord={selectedTrainingRecord}
          setIsTrainingRecordSelectorOpen={setIsTrainingRecordSelectorOpen}
        />
      )}

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
                  setIsTrainingRecordModalOpen(false);
                  setSelectedStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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
                Assistants: {selectedCourse.assistants?.length || 0}<br />
                Training Record: {selectedCourse.trainingRecord?.name || 'None'}<br />
              </p>
            </div>

            {/* Training Record Section */}
            <div className="border-t pt-4">
              <h4 className="text-md font-semibold mb-4">Training Record</h4>
              <div className="bg-white border rounded p-4">
                {selectedCourse.trainingRecord ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedCourse.trainingRecord.name}</p>
                      <p className="text-sm text-gray-600">{selectedCourse.trainingRecord.description}</p>
                    </div>
                    <button
                      onClick={() => setIsTrainingRecordSelectorOpen(true)}
                      className="text-blue-600 text-sm"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsTrainingRecordSelectorOpen(true)}
                    className="w-full text-center text-blue-600 p-2 border border-dashed rounded hover:bg-blue-50"
                  >
                    Add Training Record
                  </button>
                )}
              </div>
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
                              setMessageModalState({
                                isOpen: true,
                                course: selectedCourse,
                                recipient: assistant
                              });
                              setIsManageModalOpen(false);
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
                        className="p-2 hover:bg-gray-50 flex justify-between items-start border-b last:border-b-0"
                      >
                        <div>
                          <div className="font-medium">{student.displayName}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {student.email && (
                              <div>{student.email}{student.hideEmail && " (Hidden from other students)"}</div>
                            )}
                            {student.phone && (
                              <div>Phone: {student.phone}{student.hidePhone && " (Hidden from other students)"}</div>
                            )}
                          </div>
                          {selectedCourse.trainingRecord && (
                            <div className="text-sm font-medium text-gray-900 mt-1">
                              Progress: {calculateStudentProgress(student, selectedCourse)}% Complete
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {selectedCourse && selectedCourse.trainingRecord && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsTrainingRecordModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Training Record
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setMessageModalState({
                                isOpen: true,
                                course: selectedCourse,
                                recipient: student
                              });
                              setIsManageModalOpen(false);
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
                  setMessageModalState({
                    isOpen: true,
                    course: selectedCourse,
                    recipient: null
                  });
                  setIsManageModalOpen(false);
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
      )}

      {/* Course Messaging Modal */}
      {messageModalState.course && (
  <UnifiedMessaging
    context={messageModalState.course}
    contextType="course"
    isOpen={messageModalState.isOpen}
    onClose={() => {
      setMessageModalState({
        isOpen: false,
        course: null,
        recipient: null
      });
    }}
    recipient={messageModalState.recipient}
    defaultTab={messageModalState.recipient ? 'private' : 'discussion'}
  />
)}

      {/* Training Record Modal */}
      {isTrainingRecordModalOpen && selectedStudent && (
        <StudentTrainingRecord
          isOpen={isTrainingRecordModalOpen}
          onClose={() => {
            setIsTrainingRecordModalOpen(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
          course={selectedCourse}
          trainingRecord={selectedCourse.trainingRecord}
          instructorProfile={instructorProfile}
          onProgressUpdate={(updatedCourse) => {
            setSelectedCourse(updatedCourse);
            setCourses(courses.map(c => 
              c.id === updatedCourse.id ? updatedCourse : c
            ));
          }}
        />
      )}

      {/* Course End Report Modal */}
      {showCourseEndReport && courseToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CourseEndReport 
              course={courseToComplete}
              onSubmit={handleCourseEndReportSubmit}
              onCancel={() => {
                setShowCourseEndReport(false);
                setCourseToComplete(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Training Record Selector */}
      <TrainingRecordSelector
        isOpen={isTrainingRecordSelectorOpen}
        onClose={() => setIsTrainingRecordSelectorOpen(false)}
        onSelect={(recordType) => {
          setSelectedTrainingRecord(recordType);
          setIsTrainingRecordSelectorOpen(false);
        }}
      />
    </div>
  );
};

export default CourseSection;