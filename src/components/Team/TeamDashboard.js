// src/components/Team/TeamDashboard.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Users, Calendar, Clock, ArrowLeftRight, CalendarDays } from 'lucide-react';
import TeamScheduling from './TeamScheduling';
import TimeOffRequest from './TimeOffRequest';
import ShiftSwapManager from '../Admin/ShiftSwapManager';
import SimpleTeamCalendarView from './SimpleTeamCalendarView';
import HybridScheduleManager from '../Admin/HybridScheduleManager';
import AdminTimeOffManager from '../Admin/AdminTimeOffManager';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

const TeamDashboard = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if current user is an admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;
      
      // Check for admin based on email (matching your Firebase rules)
      setIsAdmin(user.email === 'jeff@diveuww.com');
    };
    
    checkAdminAccess();
  }, [user]);
  
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        // Fetch all users with team access
        const staffQuery = query(
          collection(db, 'profiles'),
          where('teamAccess.hasAccess', '==', true)
        );
        const staffSnapshot = await getDocs(staffQuery);
        const staffList = staffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStaffMembers(staffList);
      } catch (err) {
        setError('Error loading staff members');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStaffMembers();
  }, []);
  
  if (loading) {
    return <LoadingSpinner message="Loading team data..." />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="border-red-200">
          <div className="p-6">
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="w-full px-4 pb-6 sm:px-6 lg:px-8">
      <Card className="border-0 shadow-md bg-white">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg p-4">
          <h1 className="text-2xl font-bold text-gray-900">Team Portal</h1>
          <p className="text-sm text-gray-600 mt-1">Manage staff, schedules, and time-off requests</p>
        </div>
        
        <div className="p-0">
          <Tabs defaultValue="directory" className="w-full">
            <TabsList className="w-full flex border-b justify-start overflow-x-auto no-scrollbar mt-2 p-0">
              <TabsTrigger value="directory" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <Users size={18} className="mr-2" />
                <span>Staff Directory</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <Calendar size={18} className="mr-2" />
                <span>Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <CalendarDays size={18} className="mr-2" />
                <span>Team Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="timeoff" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <Clock size={18} className="mr-2" />
                <span>Time Off</span>
              </TabsTrigger>
              <TabsTrigger value="shiftswap" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                <ArrowLeftRight size={18} className="mr-2" />
                <span>Shift Swaps</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="directory" className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {staffMembers.map(staff => (
                  <Card key={staff.id} className="overflow-hidden">
                    <div className="p-4">
                      <h3 className="font-medium">{staff.name || 'No name'}</h3>
                      <p className="text-sm text-gray-500">{staff.email || 'No email'}</p>
                      {staff.phone && <p className="text-sm">Phone: {staff.phone}</p>}
                      {staff.certificationLevel && (
                        <div className="mt-2">
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full">
                            {staff.certificationLevel}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                
                {staffMembers.length === 0 && (
                  <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No staff members found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Staff members will appear here once they have been granted Team Portal access
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="schedule" className="p-4">
              {isAdmin ? (
                <HybridScheduleManager />
              ) : (
                <TeamScheduling />
              )}
            </TabsContent>

            <TabsContent value="calendar" className="p-4">
              <SimpleTeamCalendarView currentUserProfile={user} />
            </TabsContent>
            
            <TabsContent value="timeoff" className="p-4">
              {isAdmin ? (
                <Tabs defaultValue="my-requests" className="w-full">
                  <TabsList className="w-full flex border-b justify-start overflow-x-auto no-scrollbar mt-2 p-0">
                    <TabsTrigger value="my-requests" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                      <Clock size={18} className="mr-2" />
                      <span>My Time-Off Requests</span>
                    </TabsTrigger>
                    <TabsTrigger value="manage-requests" className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                      <Users size={18} className="mr-2" />
                      <span>Manage Team Requests</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="my-requests" className="p-4">
                    <TimeOffRequest />
                  </TabsContent>
                  
                  <TabsContent value="manage-requests" className="p-4">
                    <AdminTimeOffManager />
                  </TabsContent>
                </Tabs>
              ) : (
                <TimeOffRequest />
              )}
            </TabsContent>

            <TabsContent value="shiftswap" className="p-4">
              <ShiftSwapManager />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default TeamDashboard;