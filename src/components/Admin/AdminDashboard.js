import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, Timestamp, query, where } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const { user } = useAuth();

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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
        
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
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>
        Course End Reports - {selectedInstructor?.name}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {selectedInstructor?.courseEndReports.map((course) => (
        <div 
          key={course.courseId}
          className="border rounded-lg p-4 bg-white"
        >
          <div className="space-y-3">
            {/* Course Info */}
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-lg">{course.name}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Location: {course.location}</p>
                  <p>Start Date: {new Date(course.startDate).toLocaleDateString()}</p>
                  <p>End Date: {new Date(course.endDate).toLocaleDateString()}</p>
                  <p>Completed: {course.completedAt ? new Date(course.completedAt).toLocaleDateString() : 'Date not available'}</p>
                </div>
              </div>
              {!course.courseEndReport?.finalized ? (
                <Button
                  onClick={() => handleFinalizeReport(course.courseId, selectedInstructor.id)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark as Paid & Finalize
                </Button>
              ) : (
                <div className="text-sm text-gray-600">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Finalized
                  </span>
                  <p className="mt-1">
                    {course.courseEndReport.finalizedAt?.toDate().toLocaleDateString()}
                  </p>
                  <p>By: {course.courseEndReport.finalizedBy}</p>
                </div>
              )}
            </div>

            {/* Students Section */}
            <div className="mt-4">
              <h5 className="font-medium text-sm mb-2">Students:</h5>
              <div className="space-y-1">
                {course.students?.map((student, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{student.displayName}</span>
                    <span className="text-gray-600">
                      {course.studentRecords?.[student.uid]?.signOff?.locked 
                        ? "Complete" 
                        : "Incomplete"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Allocations */}
            {course.courseEndReport?.creditAllocations?.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium text-sm mb-2">Credit Allocations:</h5>
                <div className="bg-gray-50 p-3 rounded-md space-y-1">
                  {course.courseEndReport.creditAllocations.map((allocation, index) => (
                    <p key={index} className="text-sm">
                      <span className="font-medium">{allocation.name}:</span> {allocation.percentage}%
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {course.courseEndReport?.additionalNotes && (
              <div className="mt-4">
                <h5 className="font-medium text-sm mb-2">Additional Notes:</h5>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    {course.courseEndReport.additionalNotes}
                  </p>
                </div>
              </div>
            )}
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