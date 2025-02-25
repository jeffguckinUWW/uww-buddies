import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, addDoc, collection, updateDoc, serverTimestamp, writeBatch, query, where, getDocs, onSnapshot, } from 'firebase/firestore';
import CourseMessaging from '../Messaging/course/CourseMessaging';
import StudentTrainingRecord from './StudentTrainingRecord';
import { generateTrainingRecordPDF } from '../../services/ExportService';
import Badges from '../../components/Profile/Badges';

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
    if (!courseId) {
      console.log('No courseId provided');
      setDetailsError('Invalid course ID');
      setDetailsLoading(false);
      return;
    }
    
    try {
      console.log('Starting course fetch:', { courseId, userId: user?.uid });
      setDetailsLoading(true);
      setDetailsError('');
  
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (courseSnap.exists()) {
        const data = courseSnap.data();
        console.log('FULL COURSE DATA:', JSON.stringify(data, null, 2));

        console.log('Access Check Details:', {
          courseId,
          userId: user.uid,
          isUserInStudents: data.students?.map(s => s.uid),
          studentCount: data.students?.length,
          firstStudent: data.students?.[0],
        });
        
        // Check if user is a student in the course
        const isStudent = data.students?.some(student => student.uid === user.uid);
        const isAssistant = data.assistants?.some(assistant => assistant.uid === user.uid);
        const isInstructor = data.instructorId === user.uid;
  
        console.log('Access check:', {
          isStudent,
          isAssistant,
          isInstructor,
          userId: user.uid
        });
  
        if (isStudent || isAssistant || isInstructor) {
          // Get the student's training record if they're a student
          const studentRecord = isStudent ? data.studentRecords?.[user.uid] : null;
          
          // Get instructor profile if needed
          let instructorProfile = data.instructor || {};
          if (data.instructorId) {
            try {
              const instructorRef = doc(db, 'profiles', data.instructorId);
              const instructorSnap = await getDoc(instructorRef);
              
              if (instructorSnap.exists()) {
                const instructorData = instructorSnap.data();
                instructorProfile = {
                  ...data.instructor,
                  ...instructorData,
                  uid: data.instructorId,
                  name: instructorData.name || data.instructor.displayName,
                  displayName: instructorData.name || data.instructor.displayName,
                  instructorCertifications: instructorData.instructorCertifications || [],
                };
              }
            } catch (err) {
              console.warn('Failed to fetch instructor profile:', err);
            }
          }

          // Fetch profile data for students and assistants
          const studentsWithProfiles = await Promise.all(
            (data.students || []).map(async (student) => {
              const profileRef = doc(db, 'profiles', student.uid);
              const profileSnap = await getDoc(profileRef);
              const profileData = profileSnap.exists() ? profileSnap.data() : {};
              return {
                ...student,
                hideEmail: profileData.hideEmail || false,
                hidePhone: profileData.hidePhone || false
              };
            })
          );

          const assistantsWithProfiles = await Promise.all(
            (data.assistants || []).map(async (assistant) => {
              const profileRef = doc(db, 'profiles', assistant.uid);
              const profileSnap = await getDoc(profileRef);
              const profileData = profileSnap.exists() ? profileSnap.data() : {};
              return {
                ...assistant,
                hideEmail: profileData.hideEmail || false,
                hidePhone: profileData.hidePhone || false
              };
            })
          );
  
          // Construct the complete course data
          const courseData = {
            ...data,
            id: courseId,
            instructor: instructorProfile,
            students: studentsWithProfiles,
            assistants: assistantsWithProfiles,
            studentRecords: data.studentRecords || {},
            trainingRecord: data.trainingRecord
          };
  
          console.log('Course data prepared:', {
            hasTrainingRecord: !!courseData.trainingRecord,
            hasStudentRecords: !!courseData.studentRecords,
            studentRecordExists: !!studentRecord,
          });
  
          setCourseDetails(courseData);
          setDetailsError('');
        } else {
          setDetailsError('You do not have access to this course.');
        }
      } else {
        // Handle deleted course cleanup
        try {
          const userRef = doc(db, 'profiles', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const updatedTraining = userData.training?.filter(t => t.courseId !== courseId) || [];
            await updateDoc(userRef, { training: updatedTraining });
            setTrainings(updatedTraining);
          }
          
          setDetailsError('This course has been deleted and removed from your training history.');
        } catch (err) {
          console.error('Error cleaning up deleted course:', err);
          setDetailsError('This course no longer exists.');
        }
      }
    } catch (err) {
      console.error('Error fetching course details:', err);
      
      if (err.code === 'permission-denied') {
        setDetailsError('You do not have permission to view this course.');
      } else {
        setDetailsError('Failed to load course details. Please try again.');
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
    const [unreadCount, setUnreadCount] = useState({
      messages: 0,
      broadcasts: 0
    });
    const [buddyStatuses, setBuddyStatuses] = useState({});
    const { user } = useAuth();
  
    useEffect(() => {
      const fetchBuddyStatuses = async () => {
        if (!details || !user) return;
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const buddyList = userDoc.data()?.buddyList || {};
            setBuddyStatuses(buddyList);
          }
        } catch (err) {
          console.error('Error fetching buddy statuses:', err);
        }
      };
      fetchBuddyStatuses();
    }, [details, user]);
  
    // Listen for unread messages and broadcasts
    useEffect(() => {
      if (!training.courseId || !user) return;
  
      const messagesQuery = query(
        collection(db, 'notifications'),
        where('toUser', '==', user.uid),
        where('courseId', '==', training.courseId),
        where('type', '==', 'course_message'),
        where('read', '==', false)
      );
  
      const broadcastsQuery = query(
        collection(db, 'notifications'),
        where('toUser', '==', user.uid),
        where('courseId', '==', training.courseId),
        where('type', '==', 'course_broadcast'),
        where('read', '==', false)
      );
  
      const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
        setUnreadCount(prev => ({ ...prev, messages: snapshot.size }));
      });
  
      const unsubBroadcasts = onSnapshot(broadcastsQuery, (snapshot) => {
        setUnreadCount(prev => ({ ...prev, broadcasts: snapshot.size }));
      });
  
      return () => {
        unsubMessages();
        unsubBroadcasts();
      };
    }, [training.courseId, user]);
  
    const markNotificationsAsRead = useCallback(async () => {
      if (!training.courseId || !user) return;
  
      try {
        const batch = writeBatch(db);
        
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('toUser', '==', user.uid),
          where('courseId', '==', training.courseId),
          where('type', 'in', ['course_message', 'course_broadcast']),
          where('read', '==', false)
        );
  
        const snapshot = await getDocs(notificationsQuery);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
  
        await batch.commit();
      } catch (err) {
        console.error('Error marking notifications as read:', err);
      }
    }, [training.courseId, user]);
  
    const sendBuddyRequest = async (buddy) => {
      try {
        // Check if request already exists
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const buddyList = userDoc.data()?.buddyList || {};
        
        if (buddyList[buddy.uid]) {
          console.log('Buddy request already exists');
          return;
        }
  
        // Update sender's buddy list
        await updateDoc(userRef, {
          [`buddyList.${buddy.uid}`]: {
            status: 'pending',
            timestamp: serverTimestamp(),
            initiator: true
          }
        });
  
        // Update recipient's buddy list
        const recipientRef = doc(db, 'users', buddy.uid);
        await updateDoc(recipientRef, {
          [`buddyList.${user.uid}`]: {
            status: 'pending',
            timestamp: serverTimestamp(),
            initiator: false
          }
        });
  
        // Create notification
        await addDoc(collection(db, 'notifications'), {
          type: 'buddy_request',
          fromUser: user.uid,
          fromUserName: user.displayName,
          toUser: buddy.uid,
          timestamp: serverTimestamp(),
          read: false
        });
  
      } catch (err) {
        console.error('Error sending buddy request:', err);
      }
    };
  
    useEffect(() => {
      if (activeTab === 'messages' || activeTab === 'broadcasts') {
        markNotificationsAsRead();
      }
    }, [activeTab, markNotificationsAsRead]);
  
    return (
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {/* Course Header */}
        <div className="p-4">
          <div className="mb-2">
            <div className="flex items-start gap-2">
              <h4 className="text-lg font-semibold">{training.courseName}</h4>
              {(unreadCount.messages > 0 || unreadCount.broadcasts > 0) && (
                <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  {unreadCount.messages + unreadCount.broadcasts} new
                </span>
              )}
            </div>
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
  
                    {details?.trainingRecord && (
                      <button
                        onClick={() => setActiveTab('training')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                          activeTab === 'training'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Training Record
                      </button>
                    )}
  
                    {/* Show Broadcasts tab only for instructors */}
                    {details?.instructorId === user.uid && (
                      <button
                        onClick={() => setActiveTab('broadcasts')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                          activeTab === 'broadcasts'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Broadcasts
                        {unreadCount.broadcasts > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {unreadCount.broadcasts}
                          </span>
                        )}
                      </button>
                    )}
  
                    <div className="relative">
                      <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 ${
                          activeTab === 'messages'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Messages
                        {unreadCount.messages > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                            {unreadCount.messages}
                          </span>
                        )}
                      </button>
                    </div>
                  </nav>
                </div>
  
                {/* Tab Content */}
                {activeTab === 'details' ? (
                  <div className="p-4 space-y-4">
                    {/* Instructor Info */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Instructor</h5>
                      {details.instructor ? (
                        <div className="flex justify-between items-center">
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
                          {details.instructor.uid !== user.uid && (
                            buddyStatuses[details.instructor.uid]?.status === 'accepted' ? (
                              <button
                                onClick={() => setActiveTab('messages')}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Message Instructor
                              </button>
                            ) : buddyStatuses[details.instructor.uid]?.status === 'pending' ? (
                              <span className="text-sm text-gray-500 italic">
                                Buddy Request Pending
                              </span>
                            ) : (
                              <button
                                onClick={() => sendBuddyRequest(details.instructor)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                Add Buddy
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">Instructor information not available</p>
                      )}
                    </div>
  
                    {/* Course Assistants */}
                    {details.assistants?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Course Assistants</h5>
                        <div className="border rounded max-h-40 overflow-y-auto">
                          {details.assistants.map(assistant => (
                            <div 
                              key={assistant.uid}
                              className="p-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  {assistant.photoURL ? (
                                    <img 
                                      src={assistant.photoURL} 
                                      alt={assistant.displayName}
                                      className="w-full h-full rounded-full"
                                    />
                                  ) : (
                                    <span className="text-gray-600">
                                      {assistant.displayName?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{assistant.displayName}</div>
                                  {!assistant.hideEmail && assistant.email && (
                                    <div className="text-sm text-gray-600">{assistant.email}</div>
                                  )}
                                  {!assistant.hidePhone && assistant.phone && (
                                    <div className="text-sm text-gray-600">Phone: {assistant.phone}</div>
                                  )}
                                </div>
                              </div>
                              {buddyStatuses[assistant.uid]?.status === 'accepted' ? (
                                <button
                                  onClick={() => setActiveTab('messages')}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Message Buddy
                                </button>
                              ) : buddyStatuses[assistant.uid]?.status === 'pending' ? (
                                <span className="text-sm text-gray-500 italic">
                                  Buddy Request Pending
                                </span>
                              ) : (
                                <button
                                  onClick={() => sendBuddyRequest(assistant)}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  Add Buddy
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
  
                    {/* Fellow Students */}
                    {details.students?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Fellow Students</h5>
                        <div className="border rounded max-h-60 overflow-y-auto">
                          {details.students
                            .filter(student => student.uid !== user.uid)
                            .map(student => (
                              <div 
                                key={student.uid} 
                                className="p-2 hover:bg-gray-50 flex justify-between items-start border-b last:border-b-0"
                              >
                                <div className="flex items-center space-x-3">
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
                                    <div className="font-medium">{student.displayName}</div>
                                    <Badges
                                      certificationLevel={student.certificationLevel}
                                      specialties={student.specialties}
                                      numberOfDives={student.numberOfDives}
                                      size="small"
                                      showSections={false}
                                    />
                                    {!student.hideEmail && student.email && (
                                      <div className="text-sm text-gray-600">{student.email}</div>
                                    )}
                                    {!student.hidePhone && student.phone && (
                                      <div className="text-sm text-gray-600">Phone: {student.phone}</div>
                                    )}
                                  </div>
                                </div>
                                {buddyStatuses[student.uid]?.status === 'accepted' ? (
                                  <button
                                    onClick={() => setActiveTab('messages')}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    Message Buddy
                                  </button>
                                ) : buddyStatuses[student.uid]?.status === 'pending' ? (
                                  <span className="text-sm text-gray-500 italic">
                                    Buddy Request Pending
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => sendBuddyRequest(student)}
                                    className="text-blue-600 hover:text-blue-700 text-sm"
                                  >
                                    Add Buddy
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'broadcasts' ? (
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
                        instructorId: details.instructorId,
                        students: details.students,
                        assistants: details.assistants
                      }}
                      isOpen={true}
                      onClose={() => setActiveTab('details')}
                      messageType="course_broadcast"
                      defaultView="broadcasts"
                    />
                  </div>
                ) : activeTab === 'messages' ? (
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
                        instructorId: details.instructorId,
                        students: details.students,
                        assistants: details.assistants
                      }}
                      isOpen={true}
                      onClose={() => setActiveTab('details')}
                      defaultView={details.instructorId === user.uid ? undefined : "combined"}
                      showBroadcasts={details.instructorId !== user.uid}
                    />
                  </div>
                ) : activeTab === 'training' && details?.trainingRecord && (
                  <div className="p-4">
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => generateTrainingRecordPDF(
                          details,
                          { 
                            uid: user.uid, 
                            displayName: details.students?.find(s => s.uid === user.uid)?.displayName, 
                            email: details.students?.find(s => s.uid === user.uid)?.email 
                          },
                          details.trainingRecord,
                          details.studentRecords?.[user.uid]?.progress || {},
                          details.studentRecords?.[user.uid]?.signOff,
                          details.studentRecords?.[user.uid]?.notes,
                          {
                            name: details.instructor?.name || details.instructor?.displayName,
                            displayName: details.instructor?.displayName,
                            instructorCertifications: details.instructor?.instructorCertifications || []
                          }
                        )}
                        variant="outline"
                      >
                        Export Record
                      </button>
                    </div>
                    <StudentTrainingRecord
                      isOpen={activeTab === 'training'}
                      onClose={() => setActiveTab('details')}
                      student={{ 
                        uid: user.uid,
                        displayName: details.students?.find(s => s.uid === user.uid)?.displayName,
                        email: details.students?.find(s => s.uid === user.uid)?.email
                      }}
                      course={details}
                      trainingRecord={details.trainingRecord}
                      readOnly={true}
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