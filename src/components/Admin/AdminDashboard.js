import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../../firebase/config';
import { 
  collection, getDocs, doc, updateDoc, Timestamp, query, 
  where, deleteField
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import KnowledgeManager from '../Knowledge/Admin/KnowledgeManager';
import { User, BookOpen, Award, Users, Edit } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  
  // Knowledge Center states
  const [quizCategories, setQuizCategories] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [learningResources, setLearningResources] = useState([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper function to safely format dates
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  // Helper function to extract last name for sorting
  const getLastName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : fullName;
  };

  // Fetch users data
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

        // Sort users based on access level and last name
        const sortedUsers = enrichedUsers.sort((a, b) => {
          // First, sort by access level hierarchy
          const aAccessLevel = a.managementRights?.hasAccess ? 4 : 
                              a.teamAccess?.hasAccess ? 3 : 
                              a.instructorAccess?.hasAccess ? 2 : 1;
          
          const bAccessLevel = b.managementRights?.hasAccess ? 4 : 
                              b.teamAccess?.hasAccess ? 3 : 
                              b.instructorAccess?.hasAccess ? 2 : 1;
          
          if (aAccessLevel !== bAccessLevel) {
            return bAccessLevel - aAccessLevel; // Higher access level first
          }
          
          // If same access level, sort alphabetically by last name
          const aLastName = getLastName(a.name || '');
          const bLastName = getLastName(b.name || '');
          
          return aLastName.localeCompare(bLastName);
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

  // Fetch knowledge center data when Knowledge tab is active
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch quiz categories
        const categoriesSnapshot = await getDocs(collection(db, 'quizCategories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuizCategories(categoriesData);

        // Fetch quizzes
        const quizzesSnapshot = await getDocs(collection(db, 'quizzes'));
        const quizzesData = quizzesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuizzes(quizzesData);
        
        // Fetch learning resources
        const resourcesSnapshot = await getDocs(collection(db, 'learningResources'));
        const resourcesData = resourcesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLearningResources(resourcesData);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    if (activeTab === 'knowledge') {
      fetchData();
    }
  }, [activeTab]);

  // User management functions
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

  const toggleLoyaltyAccess = async (userId, currentAccess) => {
    if (!window.confirm(
      currentAccess 
        ? 'Are you sure you want to revoke loyalty program admin access?' 
        : 'Are you sure you want to grant loyalty program admin access?'
    )) return;
  
    try {
      const userRef = doc(db, 'profiles', userId);
      let updateData;
  
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
          // Add loyalty program initialization data if not already present
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
      setError('Error updating loyalty program admin access');
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

  // Function for Team Portal access
  const toggleTeamAccess = async (userId, currentAccess) => {
    if (!window.confirm(
      currentAccess 
        ? 'Are you sure you want to revoke team portal access?' 
        : 'Are you sure you want to grant team portal access?'
    )) return;

    try {
      const userRef = doc(db, 'profiles', userId);
      const updateData = {
        teamAccess: currentAccess 
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
            teamAccess: updateData.teamAccess
          };
        }
        return u;
      }));
    } catch (err) {
      setError('Error updating team access');
      console.error('Error:', err);
    }
  };

  // Function for Management Rights access
  const toggleManagementRights = async (userId, currentAccess) => {
    if (!window.confirm(
      currentAccess 
        ? 'Are you sure you want to revoke management rights?' 
        : 'Are you sure you want to grant management rights?'
    )) return;

    try {
      const userRef = doc(db, 'profiles', userId);
      const updateData = {
        managementRights: currentAccess 
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
            managementRights: updateData.managementRights
          };
        }
        return u;
      }));
    } catch (err) {
      setError('Error updating management rights');
      console.error('Error:', err);
    }
  };

  const resetInstructorSignature = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this instructor\'s signature? They will need to generate a new one before they can sign documents.')) {
      return;
    }

    try {
      const userRef = doc(db, 'profiles', userId);
      
      // Remove both signature and PIN
      await updateDoc(userRef, {
        instructorSignature: deleteField(),
        instructorPin: deleteField()
      });

      // Update local state
      setUsers(users.map(u => {
        if (u.id === userId) {
          // Create a new object without the signature and PIN
          const updatedUser = {...u};
          delete updatedUser.instructorSignature;
          delete updatedUser.instructorPin;
          return updatedUser;
        }
        return u;
      }));
    } catch (err) {
      setError('Error resetting instructor signature');
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

  // Filter users based on search term and filter
  const filteredUsers = users.filter(user => {
    // Filter by search term
    const searchMatch = 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by type
    if (filterBy === 'instructors') {
      return searchMatch && user.instructorAccess?.hasAccess;
    } else if (filterBy === 'pending-reports') {
      return searchMatch && 
             user.instructorAccess?.hasAccess && 
             user.courseEndReports.some(r => !r.courseEndReport?.finalized);
    } else if (filterBy === 'loyalty') {
      return searchMatch && user.loyaltyAccess?.hasAccess;
    } else if (filterBy === 'team') {
      return searchMatch && user.teamAccess?.hasAccess;
    } else if (filterBy === 'management') {
      return searchMatch && user.managementRights?.hasAccess;
    } else {
      return searchMatch;
    }
  });
  
  // This function is no longer used with the new layout
  // Removed to fix eslint warning

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pb-6 sm:px-6 lg:px-8">
      <Card className="border-0 shadow-md bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Admin Dashboard</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex border-b justify-start overflow-x-auto no-scrollbar mt-2 p-0">
              <TabsTrigger value="users" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <User size={18} className="mr-2" />
                <span>User Management</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <BookOpen size={18} className="mr-2" />
                <span>Knowledge</span>
              </TabsTrigger>
              <TabsTrigger 
                value="loyalty" 
                className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                onClick={(e) => {
                  e.preventDefault(); // Prevent the default tab behavior
                  navigate('/loyalty'); // Navigate to the loyalty page directly
                }}
              >
                <Award size={18} className="mr-2" />
                <span>Loyalty</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Users Tab Content */}
            <TabsContent value="users" className="p-4">
              {/* User Management Search & Filters */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="w-full md:w-3/4">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <Button 
                    variant={filterBy === 'all' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('all')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    All
                  </Button>
                  <Button 
                    variant={filterBy === 'instructors' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('instructors')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Instructors
                  </Button>
                  <Button 
                    variant={filterBy === 'pending-reports' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('pending-reports')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Pending Reports
                  </Button>
                  <Button 
                    variant={filterBy === 'loyalty' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('loyalty')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M12 1v4M4 5l2 2M18 5l-2 2M3 13h4M17 13h4M12 23v-4M8 17l-2 2M16 17l2 2M12 18a6 6 0 100-12 6 6 0 000 12z"/>
                    </svg>
                    Loyalty
                  </Button>
                  <Button 
                    variant={filterBy === 'team' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('team')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    <Users size={16} className="mr-2" />
                    Team
                  </Button>
                  <Button 
                    variant={filterBy === 'management' ? 'default' : 'outline'} 
                    onClick={() => setFilterBy('management')}
                    size="sm"
                    className="flex-grow md:flex-grow-0"
                  >
                    <Edit size={16} className="mr-2" />
                    Management
                  </Button>
                </div>
              </div>

              {/* Mobile Card View for Users */}
              <div className="block md:hidden">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users match your search criteria</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} className={`overflow-hidden ${user.instructorAccess?.hasAccess ? 'border-blue-200 bg-blue-50' : ''}`}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{user.name || 'No name'}</CardTitle>
                              <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {user.certificationLevel && (
                                <div className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full">
                                  {user.certificationLevel}
                                </div>
                              )}
                              {user.instructorAccess?.hasAccess && (
                                <div className="bg-blue-100 text-blue-800 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full">
                                  Instructor
                                </div>
                              )}
                              {user.loyaltyAccess?.hasAccess && (
                                <div className="bg-amber-100 text-amber-800 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full">
                                  Loyalty Admin
                                </div>
                              )}
                              {user.teamAccess?.hasAccess && (
                                <div className="bg-purple-100 text-purple-800 border border-purple-200 text-xs px-2.5 py-0.5 rounded-full">
                                  Team Portal
                                </div>
                              )}
                              {user.managementRights?.hasAccess && (
                                <div className="bg-green-100 text-green-800 border border-green-200 text-xs px-2.5 py-0.5 rounded-full">
                                  Management
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="w-full">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Instructor Portal */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Instructor Portal
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!user.instructorAccess?.hasAccess}
                                    onChange={() => toggleInstructorAccess(user.id, user.instructorAccess?.hasAccess)}
                                  />
                                  <div className={`relative w-11 h-6 rounded-full transition ${
                                    user.instructorAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                  }`}>
                                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                      user.instructorAccess?.hasAccess ? 'transform translate-x-5' : ''
                                    }`}></div>
                                  </div>
                                </label>
                                <div className="text-xs text-center mt-1">
                                  <div className="font-medium">
                                    {user.instructorAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                  </div>
                                  {user.instructorAccess?.hasAccess && user.instructorAccess?.grantedAt && (
                                    <div className="text-gray-500">
                                      {formatDate(user.instructorAccess.grantedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Instructor PIN */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Instructor PIN
                                </label>
                                <div className="w-11 h-6 flex justify-center">
                                  {user.instructorAccess?.hasAccess ? (
                                    user.instructorSignature?.code || user.instructorPin?.pin ? (
                                      <button 
                                        onClick={() => resetInstructorSignature(user.id)}
                                        className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M3 6h18"></path>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                      </button>
                                    ) : (
                                      <span className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="10"></circle>
                                          <line x1="12" y1="8" x2="12" y2="12"></line>
                                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                      </span>
                                    )
                                  ) : (
                                    <span className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                      </svg>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-center mt-1">
                                  <div className="font-medium">
                                    {user.instructorAccess?.hasAccess ? (
                                      user.instructorSignature?.code ? "Signature" :
                                      user.instructorPin?.pin ? "PIN Set" :
                                      "Not Set"
                                    ) : "N/A"}
                                  </div>
                                  {user.instructorAccess?.hasAccess && (
                                    user.instructorSignature?.createdAt ? (
                                      <div className="text-gray-500">
                                        {formatDate(user.instructorSignature.createdAt)}
                                      </div>
                                    ) : user.instructorPin?.lastUpdated ? (
                                      <div className="text-gray-500">
                                        {formatDate(user.instructorPin.lastUpdated)}
                                      </div>
                                    ) : null
                                  )}
                                </div>
                              </div>

                              {/* Team Portal */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Team Portal
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!user.teamAccess?.hasAccess}
                                    onChange={() => toggleTeamAccess(user.id, user.teamAccess?.hasAccess)}
                                  />
                                  <div className={`relative w-11 h-6 rounded-full transition ${
                                    user.teamAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                  }`}>
                                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                      user.teamAccess?.hasAccess ? 'transform translate-x-5' : ''
                                    }`}></div>
                                  </div>
                                </label>
                                <div className="text-xs text-center mt-1">
                                  <div className="font-medium">
                                    {user.teamAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                  </div>
                                  {user.teamAccess?.hasAccess && user.teamAccess?.grantedAt && (
                                    <div className="text-gray-500">
                                      {formatDate(user.teamAccess.grantedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Loyalty Admin */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Loyalty Admin
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!user.loyaltyAccess?.hasAccess}
                                    onChange={() => toggleLoyaltyAccess(user.id, user.loyaltyAccess?.hasAccess)}
                                  />
                                  <div className={`relative w-11 h-6 rounded-full transition ${
                                    user.loyaltyAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                  }`}>
                                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                      user.loyaltyAccess?.hasAccess ? 'transform translate-x-5' : ''
                                    }`}></div>
                                  </div>
                                </label>
                                <div className="text-xs text-center mt-1">
                                  <div className="font-medium">
                                    {user.loyaltyAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                  </div>
                                  {user.loyaltyAccess?.hasAccess && user.loyaltyAccess?.grantedAt && (
                                    <div className="text-gray-500">
                                      {formatDate(user.loyaltyAccess.grantedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Management Access */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Management Access
                                </label>
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!user.managementRights?.hasAccess}
                                    onChange={() => toggleManagementRights(user.id, user.managementRights?.hasAccess)}
                                  />
                                  <div className={`relative w-11 h-6 rounded-full transition ${
                                    user.managementRights?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                  }`}>
                                    <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                      user.managementRights?.hasAccess ? 'transform translate-x-5' : ''
                                    }`}></div>
                                  </div>
                                </label>
                                <div className="text-xs text-center mt-1">
                                  <div className="font-medium">
                                    {user.managementRights?.hasAccess ? 'Enabled' : 'Disabled'}
                                  </div>
                                  {user.managementRights?.hasAccess && user.managementRights?.grantedAt && (
                                    <div className="text-gray-500">
                                      {formatDate(user.managementRights.grantedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Reports */}
                              <div className="flex flex-col items-center mb-3">
                                <label className="text-sm font-medium text-center mb-1">
                                  Reports
                                </label>
                                <div className="w-11 h-6 flex justify-center">
                                  {user.instructorAccess?.hasAccess && user.courseEndReports?.length > 0 ? (
                                    <button 
                                      onClick={() => handleViewReports(user)}
                                      className="w-6 h-6 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="w-6 h-6 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                      </svg>
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-center mt-1">
                                  {user.instructorAccess?.hasAccess && user.courseEndReports?.length > 0 ? (
                                    <>
                                      <div className="font-medium">
                                        {user.courseEndReports.filter(r => !r.courseEndReport?.finalized).length} Pending
                                      </div>
                                      <div className="text-gray-500">
                                        {user.courseEndReports.length} Total
                                      </div>
                                    </>
                                  ) : (
                                    <div className="font-medium">None</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop Table View for Users */}
              <div className="hidden md:block overflow-x-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        User
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Instructor<br/>Portal
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Instructor<br/>PIN
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Team<br/>Portal
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Loyalty<br/>Admin
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Management<br/>Access
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        Reports
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No users match your search criteria
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className={user.instructorAccess?.hasAccess ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-start flex-col">
                              <div className="text-sm font-medium text-gray-900">
                                {user.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email || 'No email'}
                              </div>
                              {user.certificationLevel && (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 rounded-full mt-1">
                                  {user.certificationLevel}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Instructor Portal */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!!user.instructorAccess?.hasAccess}
                                  onChange={() => toggleInstructorAccess(user.id, user.instructorAccess?.hasAccess)}
                                />
                                <div className={`relative w-11 h-6 rounded-full transition ${
                                  user.instructorAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                    user.instructorAccess?.hasAccess ? 'transform translate-x-5' : ''
                                  }`}></div>
                                </div>
                              </label>
                              <div className="text-xs text-center mt-1">
                                <div className="font-medium">
                                  {user.instructorAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                </div>
                                {user.instructorAccess?.hasAccess && user.instructorAccess?.grantedAt && (
                                  <div className="text-gray-500">
                                    {formatDate(user.instructorAccess.grantedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Instructor PIN */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              {user.instructorAccess?.hasAccess ? (
                                <div className="space-y-2">
                                  {user.instructorSignature?.code ? (
                                    <>
                                      <div className="text-sm font-mono text-center">
                                        {user.instructorSignature.code}
                                      </div>
                                      <Button 
                                        onClick={() => resetInstructorSignature(user.id)}
                                        variant="destructive" 
                                        size="sm"
                                        className="text-xs"
                                      >
                                        Reset Signature
                                      </Button>
                                    </>
                                  ) : user.instructorPin?.pin ? (
                                    <>
                                      <div className="text-sm text-amber-600 text-center">
                                        Legacy PIN
                                      </div>
                                      <Button 
                                        onClick={() => resetInstructorSignature(user.id)}
                                        variant="destructive" 
                                        size="sm"
                                        className="text-xs"
                                      >
                                        Reset PIN
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="text-sm text-yellow-600">Not set</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">N/A</span>
                              )}
                            </div>
                          </td>

                          {/* Team Portal */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!!user.teamAccess?.hasAccess}
                                  onChange={() => toggleTeamAccess(user.id, user.teamAccess?.hasAccess)}
                                />
                                <div className={`relative w-11 h-6 rounded-full transition ${
                                  user.teamAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                    user.teamAccess?.hasAccess ? 'transform translate-x-5' : ''
                                  }`}></div>
                                </div>
                              </label>
                              <div className="text-xs text-center mt-1">
                                <div className="font-medium">
                                  {user.teamAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                </div>
                                {user.teamAccess?.hasAccess && user.teamAccess?.grantedAt && (
                                  <div className="text-gray-500">
                                    {formatDate(user.teamAccess.grantedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Loyalty Admin */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!!user.loyaltyAccess?.hasAccess}
                                  onChange={() => toggleLoyaltyAccess(user.id, user.loyaltyAccess?.hasAccess)}
                                />
                                <div className={`relative w-11 h-6 rounded-full transition ${
                                  user.loyaltyAccess?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                    user.loyaltyAccess?.hasAccess ? 'transform translate-x-5' : ''
                                  }`}></div>
                                </div>
                              </label>
                              <div className="text-xs text-center mt-1">
                                <div className="font-medium">
                                  {user.loyaltyAccess?.hasAccess ? 'Enabled' : 'Disabled'}
                                </div>
                                {user.loyaltyAccess?.hasAccess && user.loyaltyAccess?.grantedAt && (
                                  <div className="text-gray-500">
                                    {formatDate(user.loyaltyAccess.grantedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Management Access */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={!!user.managementRights?.hasAccess}
                                  onChange={() => toggleManagementRights(user.id, user.managementRights?.hasAccess)}
                                />
                                <div className={`relative w-11 h-6 rounded-full transition ${
                                  user.managementRights?.hasAccess ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-all ${
                                    user.managementRights?.hasAccess ? 'transform translate-x-5' : ''
                                  }`}></div>
                                </div>
                              </label>
                              <div className="text-xs text-center mt-1">
                                <div className="font-medium">
                                  {user.managementRights?.hasAccess ? 'Enabled' : 'Disabled'}
                                </div>
                                {user.managementRights?.hasAccess && user.managementRights?.grantedAt && (
                                  <div className="text-gray-500">
                                    {formatDate(user.managementRights.grantedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Reports */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              {user.instructorAccess?.hasAccess && (
                                <div className="flex items-center">
                                  {user.courseEndReports?.length > 0 ? (
                                    <Button
                                      onClick={() => handleViewReports(user)}
                                      variant="outline"
                                      className="flex items-center space-x-2"
                                      size="sm"
                                    >
                                      <span>View Reports</span>
                                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                        {user.courseEndReports.filter(r => !r.courseEndReport?.finalized).length}
                                      </span>
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-gray-500">No reports</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            {/* Knowledge Tab Content */}
            <TabsContent value="knowledge">
              <KnowledgeManager 
                quizCategories={quizCategories}
                setQuizCategories={setQuizCategories}
                quizzes={quizzes}
                setQuizzes={setQuizzes}
                learningResources={learningResources}
                setLearningResources={setLearningResources}
                db={db}
                storage={storage}
                user={user}
              />
            </TabsContent>
            
            {/* Loyalty Tab Content */}
            <TabsContent value="loyalty" className="p-4">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Award size={40} className="mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loyalty Program Management</h3>
                  <p className="text-gray-600 mb-6">Manage loyalty points, rewards, and member programs.</p>
                  <Button 
                    onClick={() => navigate('/loyalty')}
                    className="flex items-center mx-auto"
                  >
                    <Award size={16} className="mr-2" />
                    Go to Loyalty Dashboard
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Course End Reports Modal - Improved for mobile */}
      <Dialog open={showReportsModal} onOpenChange={setShowReportsModal}>
        <DialogContent className="max-w-4xl bg-white p-0 rounded-lg max-h-[90vh] overflow-hidden flex flex-col sm:max-w-3xl">
          <div className="border-b p-4 bg-white rounded-t-lg flex justify-between items-center sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">
              Course End Reports - {selectedInstructor?.name}
            </DialogTitle>
            <DialogClose className="h-6 w-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800">
              ×
            </DialogClose>
          </div>
          
          <div className="p-4 overflow-y-auto flex-grow">
            <div className="space-y-6">
              {selectedInstructor?.courseEndReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No reports available</p>
                </div>
              ) : (
                selectedInstructor?.courseEndReports.map((course) => (
                  <Card 
                    key={course.courseId}
                    className={`overflow-hidden border ${course.courseEndReport?.finalized ? 'border-green-200' : 'border-amber-200'}`}
                  >
                    <CardHeader className={`pb-2 ${course.courseEndReport?.finalized ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-xl">{course.name}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div>
                          {!course.courseEndReport?.finalized ? (
                            <Button
                              onClick={() => handleFinalizeReport(course.courseId, selectedInstructor.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              Mark as Paid & Finalize
                            </Button>
                          ) : (
                            <div className="text-sm text-right">
                              <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-0.5 rounded-full text-xs">
                                Finalized
                              </span>
                              <p className="mt-1 text-gray-600 text-xs">
                                {course.courseEndReport?.finalizedAt ? formatDate(course.courseEndReport.finalizedAt) : 'N/A'}
                                <br />
                                By: {course.courseEndReport?.finalizedBy || 'Unknown'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-4">
                      <div className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Course Details</h4>
                            <div className="bg-gray-50 p-3 rounded-md text-sm space-y-1">
                              <p>Location: {course.location}</p>
                              <p>Completed: {course.completedAt ? 
                                formatDate(course.completedAt) : 
                                'Not completed'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Students ({course.students?.length || 0})</h4>
                            <div className="bg-gray-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                              {course.students?.map((student, index) => (
                                <div key={index} className="flex justify-between mb-1 last:mb-0">
                                  <span>{student.displayName}</span>
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full
                                    ${calculateStudentProgress(student, course) >= 100 ? 'bg-green-50 text-green-700 border border-green-200' : 
                                      calculateStudentProgress(student, course) >= 50 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                                      'bg-amber-50 text-amber-700 border border-amber-200'}
                                  `}>
                                    {calculateStudentProgress(student, course)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {(course.courseEndReport?.creditAllocations?.length > 0 || course.courseEndReport?.additionalNotes) && (
                          <div className="pt-4 space-y-4 border-t mt-4">
                            {course.courseEndReport?.creditAllocations?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Credit Allocations:</h4>
                                <div className="bg-gray-50 p-3 rounded-md space-y-1">
                                  {course.courseEndReport.creditAllocations.map((allocation, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{allocation.name}</span>
                                      <span>{allocation.percentage}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {course.courseEndReport?.additionalNotes && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">Additional Notes:</h4>
                                <div className="bg-gray-50 p-3 rounded-md text-sm whitespace-pre-wrap">
                                  {course.courseEndReport.additionalNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;