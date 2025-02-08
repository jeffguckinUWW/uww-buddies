import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const { user } = useAuth();
  console.log("AdminDashboard user:", user);
  const navigate = useNavigate();

  const calculateStudentProgress = (student, course) => {
    if (!student || !course || !course?.trainingRecord || !course.studentRecords?.[student.uid]?.progress) {
      return 0;
    }
  
    const progress = course.studentRecords[student.uid].progress;
    let totalSkills = 0;
    let completedSkills = 0;
  
    course.trainingRecord.sections.forEach(section => {
      if (section.subsections) {
        // Handle sections with subsections
        section.subsections.forEach(subsection => {
          totalSkills += subsection.skills.length;
          completedSkills += Object.keys(progress[subsection.title] || {}).length;
        });
      } else {
        // Handle regular sections
        totalSkills += section.skills.length;
        completedSkills += Object.keys(progress[section.title] || {}).length;
      }
    });
  
    return totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
  };

  // Fetch all users and their course end reports
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch all user profiles
        const querySnapshot = await getDocs(collection(db, 'profiles'));
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch all courses with end reports
        const coursesQuery = query(
          collection(db, 'courses'),
          where('courseEndReport', '!=', null)
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        const courseReports = {};

        coursesSnapshot.docs.forEach(doc => {
          const course = doc.data();
          if (!courseReports[course.instructorId]) {
            courseReports[course.instructorId] = [];
          }
          courseReports[course.instructorId].push({
            courseId: doc.id,
            ...course
          });
        });

        // Combine user data with their course reports
        const enrichedUsers = usersData.map(user => ({
          ...user,
          courseEndReports: courseReports[user.id] || []
        }));

        // Sort users - instructors first, then by those with pending reports
        const sortedUsers = enrichedUsers.sort((a, b) => {
          if (a.instructorAccess?.hasAccess && !b.instructorAccess?.hasAccess) return -1;
          if (!a.instructorAccess?.hasAccess && b.instructorAccess?.hasAccess) return 1;
          if (a.courseEndReports.length > 0 && b.courseEndReports.length === 0) return -1;
          if (a.courseEndReports.length === 0 && b.courseEndReports.length > 0) return 1;
          return 0;
        });

        setUsers(sortedUsers);
      } catch (err) {
        setError('Error loading users');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleLoyaltyAccess = async (userId, currentAccess) => {
    if (!window.confirm(
      currentAccess 
        ? 'Are you sure you want to revoke loyalty program access?' 
        : 'Are you sure you want to grant loyalty program access?'
    )) return;
  
    try {
      const userRef = doc(db, 'profiles', userId);
      let updateData; // Declare the variable first
  
      if (currentAccess) {
        // Removing access
        updateData = {
          loyaltyAccess: null
        };
      } else {
        // Granting access - initialize loyalty profile
        updateData = {
          loyaltyAccess: {
            hasAccess: true,
            grantedAt: Timestamp.now(),
            grantedBy: user.email
          },
          // Add loyalty program initialization data
          joinDate: Timestamp.now(),
          lifetimePoints: 0,
          redeemablePoints: 0,
          lastExpirationCheck: Timestamp.now(),
          yearlyPointsEarned: {
            [new Date().getFullYear()]: 0
          }
        };
      }
  
      await updateDoc(userRef, updateData);
  
      setUsers(users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            ...updateData
          };
        }
        return u;
      }));
    } catch (err) {
      setError('Error updating loyalty program access');
      console.error('Error:', err);
    }
  };

  

  const toggleInstructorAccess = async (userId, currentAccess) => {
    if (!window.confirm(
      currentAccess 
        ? 'Are you sure you want to revoke instructor access?' 
        : 'Are you sure you want to grant instructor access?'
    )) return;

    try {
      const userRef = doc(db, 'profiles', userId);
      const updateData = {
        instructorAccess: currentAccess 
          ? null
          : {
              hasAccess: true,
              grantedAt: Timestamp.now(),
              grantedBy: user.email
            }
      };
      
      await updateDoc(userRef, updateData);

      setUsers(users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            instructorAccess: updateData.instructorAccess
          };
        }
        return u;
      }));
    } catch (err) {
      setError('Error updating instructor access');
      console.error('Error:', err);
    }
  };

  const handleViewReports = (instructor) => {
    setSelectedInstructor(instructor);
    setShowReportsModal(true);
  };

  const handleFinalizeReport = async (courseId, instructorId) => {
    if (!window.confirm('Are you sure you want to mark this report as paid and finalized?')) {
      return;
    }

    try {
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        'courseEndReport.finalized': true,
        'courseEndReport.finalizedAt': Timestamp.now(),
        'courseEndReport.finalizedBy': user.email
      });

      // Update local state
      setUsers(users.map(u => {
        if (u.id === instructorId) {
          const updatedReports = u.courseEndReports.map(report => {
            if (report.courseId === courseId) {
              return {
                ...report,
                courseEndReport: {
                  ...report.courseEndReport,
                  finalized: true,
                  finalizedAt: Timestamp.now(),
                  finalizedBy: user.email
                }
              };
            }
            return report;
          });
          return { ...u, courseEndReports: updatedReports };
        }
        return u;
      }));
    } catch (err) {
      setError('Error finalizing report');
      console.error('Error:', err);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <div className="flex space-x-4">
          {user?.loyaltyAccess?.hasAccess && (
            <Button
              onClick={() => navigate('/loyalty')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Loyalty Program</span>
            </Button>
          )}
        </div>
      </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certification Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyalty Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instructor Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending Reports
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className={user.instructorAccess?.hasAccess ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name || 'No name'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.email || 'No email'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.certificationLevel || 'Not set'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={!!user.loyaltyAccess?.hasAccess}
                        onChange={() => toggleLoyaltyAccess(user.id, user.loyaltyAccess?.hasAccess)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {user.loyaltyAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={!!user.instructorAccess?.hasAccess}
                        onChange={() => toggleInstructorAccess(user.id, user.instructorAccess?.hasAccess)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {user.instructorAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.instructorAccess?.hasAccess && (
                      <div className="flex items-center">
                        {user.courseEndReports.length > 0 ? (
                          <Button
                            onClick={() => handleViewReports(user)}
                            variant="outline"
                            className="flex items-center space-x-2"
                          >
                            <span>View Reports</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              {user.courseEndReports.filter(r => !r.courseEndReport?.finalized).length}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">No reports</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course End Reports Modal */}
<Dialog open={showReportsModal} onOpenChange={setShowReportsModal}>
  <DialogContent className="max-w-3xl bg-white p-0 rounded-lg">
    <div className="border-b p-4 bg-white rounded-t-lg">
      <DialogTitle className="text-xl font-semibold">
        Course End Reports - {selectedInstructor?.name}
      </DialogTitle>
    </div>
    <div className="p-6 bg-white space-y-4 max-h-[60vh] overflow-y-auto">
      {selectedInstructor?.courseEndReports.map((course) => (
        <div 
          key={course.courseId}
          className="border rounded-lg p-6 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-4 w-full">
              <div>
                <h4 className="text-2xl font-semibold mb-2">{course.name}</h4>
                <div className="grid gap-2 text-gray-600">
                  <p>Location: {course.location}</p>
                  <p>Start Date: {new Date(course.startDate).toLocaleDateString()}</p>
                  <p>End Date: {new Date(course.endDate).toLocaleDateString()}</p>
                  <p>Completed: {course.completedAt ? 
                    new Date(course.completedAt.seconds * 1000).toLocaleDateString() : 
                    'Not completed'}</p>
                </div>
              </div>

              <div>
                <h5 className="font-semibold mb-2">Students:</h5>
                <div className="space-y-2 bg-gray-50 p-4 rounded-md">
                  {course.students?.map((student, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{student.displayName}</span>
                      <span>
                        {calculateStudentProgress(student, course)}% Complete
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {course.courseEndReport?.creditAllocations?.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2">Credit Allocations:</h5>
                  <div className="bg-gray-50 p-4 rounded-md space-y-2">
                    {course.courseEndReport.creditAllocations.map((allocation, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{allocation.name}</span>
                        <span>{allocation.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {course.courseEndReport?.additionalNotes && (
                <div>
                  <h5 className="font-semibold mb-2">Additional Notes:</h5>
                  <div className="bg-gray-50 p-4 rounded-md">
                    {course.courseEndReport.additionalNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-4">
              {!course.courseEndReport?.finalized ? (
                <Button
                  onClick={() => handleFinalizeReport(course.courseId, selectedInstructor.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Mark as Paid & Finalize
                </Button>
              ) : (
                <div className="text-sm">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    Finalized
                  </span>
                  <p className="mt-2 text-gray-600">
                    {course.courseEndReport.finalizedAt?.toDate().toLocaleDateString()}
                    <br />
                    By: {course.courseEndReport.finalizedBy}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default AdminDashboard;