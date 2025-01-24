import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { generateTrainingRecordPDF } from '../../services/ExportService';

const StudentTrainingRecord = ({ 
    isOpen, 
    onClose, 
    student, 
    course,
    trainingRecord,
    instructorProfile,
    onProgressUpdate,
    readOnly = false
  }) => {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localNotes, setLocalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [instructorPin, setInstructorPin] = useState('');
  const [isRecordLocked, setIsRecordLocked] = useState(false);
  const [signOffData, setSignOffData] = useState(null);
  const [courseData, setCourseData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!course?.id) {
        console.error('No valid course ID found:', course);
        setError('Invalid course data');
        return;
      }
  
      try {
        const courseRef = doc(db, 'courses', course.id);
        const courseDoc = await getDoc(courseRef);
        
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
  
          // Fetch instructor profile data including certifications
          if (courseData.instructorId) {
            const instructorRef = doc(db, 'profiles', courseData.instructorId);
            const instructorDoc = await getDoc(instructorRef);
            
            if (instructorDoc.exists()) {
              const instructorProfile = instructorDoc.data();
              console.log('Loaded instructor profile:', instructorProfile);
              
              // Update course data with full instructor profile
              courseData.instructor = {
                ...courseData.instructor,
                ...instructorProfile,
                uid: courseData.instructorId,
                name: instructorProfile.name,
                displayName: instructorProfile.name || instructorProfile.displayName,
                instructorCertifications: instructorProfile.instructorCertifications || []
              };
            }
          }
  
          const studentRecord = courseData.studentRecords?.[student.uid];
          setProgress(studentRecord?.progress || {});
          setLocalNotes(studentRecord?.notes || '');
          setIsRecordLocked(!!studentRecord?.signOff?.locked);
          setSignOffData(studentRecord?.signOff);
          setCourseData(courseData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading progress:', err);
        setError('Failed to load training record');
        setLoading(false);
      }
    };
  
    if (isOpen) {
      loadData();
    }
  }, [isOpen, course, student?.uid]);

  const handleSkillToggle = async (sectionTitle, skillName) => {
    if (readOnly) return;
    if (isRecordLocked) {
      setError('Record is locked. Contact instructor to make changes.');
      return;
    }
    
    try {
      const now = new Date();
      const newProgress = { ...progress };
      
      if (newProgress[sectionTitle]?.[skillName]) {
        delete newProgress[sectionTitle][skillName];
        if (Object.keys(newProgress[sectionTitle]).length === 0) {
          delete newProgress[sectionTitle];
        }
      } else {
        if (!newProgress[sectionTitle]) {
          newProgress[sectionTitle] = {};
        }
        newProgress[sectionTitle][skillName] = {
          date: now.toISOString(),
          instructorName: instructorProfile?.name || 'Unknown Instructor',
          instructorId: instructorProfile?.uid || 'unknown',
          verifiedAt: now.toISOString()
        };
      }

      const courseRef = doc(db, 'courses', course.id);
      await updateDoc(courseRef, {
        [`studentRecords.${student.uid}.progress`]: newProgress
      });

      setProgress(newProgress);
      onProgressUpdate({
        ...course,
        studentRecords: {
          ...course.studentRecords,
          [student.uid]: {
            ...course.studentRecords?.[student.uid],
            progress: newProgress
          }
        }
      });
    } catch (err) {
      console.error('Error updating skill:', err);
      setError('Failed to update skill verification');
    }
  };

  const handleDateChange = async (sectionTitle, skillName, newDate) => {
    if (isRecordLocked) {
      setError('Record is locked. Contact instructor to make changes.');
      return;
    }
    
    try {
      const newProgress = { ...progress };
      if (newProgress[sectionTitle]?.[skillName]) {
        newProgress[sectionTitle][skillName] = {
          ...newProgress[sectionTitle][skillName],
          date: new Date(newDate).toISOString(),
          lastModified: new Date().toISOString()
        };
  
        const courseRef = doc(db, 'courses', course.id);
        await updateDoc(courseRef, {
          [`studentRecords.${student.uid}.progress`]: newProgress
        });
  
        setProgress(newProgress);
      }
    } catch (err) {
      console.error('Error updating date:', err);
      setError('Failed to update date');
    }
  };
  
  const handleInstructorChange = async (sectionTitle, skillName, newInstructorName) => {
    if (isRecordLocked) {
      setError('Record is locked. Contact instructor to make changes.');
      return;
    }
    
    try {
      const newProgress = { ...progress };
      if (newProgress[sectionTitle]?.[skillName]) {
        newProgress[sectionTitle][skillName] = {
          ...newProgress[sectionTitle][skillName],
          instructorName: newInstructorName,
          lastModified: new Date().toISOString()
        };
  
        const courseRef = doc(db, 'courses', course.id);
        await updateDoc(courseRef, {
          [`studentRecords.${student.uid}.progress`]: newProgress
        });
  
        setProgress(newProgress);
      }
    } catch (err) {
      console.error('Error updating instructor:', err);
      setError('Failed to update instructor');
    }
  };

  const debouncedSave = useCallback(
    async (notes) => {
      if (isRecordLocked) {
        setError('Record is locked. Contact instructor to make changes.');
        return;
      }
      
      try {
        setIsSaving(true);
        const courseRef = doc(db, 'courses', course.id);
        await updateDoc(courseRef, {
          [`studentRecords.${student.uid}.notes`]: notes
        });
      } catch (err) {
        console.error('Error updating notes:', err);
        setError('Failed to update notes');
      } finally {
        setIsSaving(false);
      }
    },
    [course.id, student.uid, isRecordLocked]
  );

  const handleSignOff = async () => {
    try {
      if (!instructorProfile?.uid) {
        setError('Missing instructor information');
        return;
      }
  
      const instructorRef = doc(db, 'profiles', String(instructorProfile.uid));
      const instructorDoc = await getDoc(instructorRef);
      
      if (!instructorDoc.exists() || instructorDoc.data().instructorPin?.pin !== instructorPin) {
        setError('Invalid PIN');
        return;
      }
  
      const currentDate = new Date().toISOString();
      const signOffInfo = {
        instructorId: instructorProfile.uid,
        instructorName: instructorProfile.name || 'Unknown Instructor',
        date: currentDate,
        locked: true,
        verificationText: "I certify that I have completed the training or verified the completion of the training on this record and that the student has performed all the skills listed to a satisfactory level."
      };
  
      const courseRef = doc(db, `courses/${String(course.id)}`);
      const updateData = {
        [`studentRecords.${String(student.uid)}.signOff`]: signOffInfo,
        [`studentRecords.${String(student.uid)}.lastModified`]: currentDate
      };
  
      await updateDoc(courseRef, updateData);
  
      setSignOffData(signOffInfo);
      setIsRecordLocked(true);
  
      onProgressUpdate({
        ...course,
        studentRecords: {
          ...course.studentRecords,
          [student.uid]: {
            ...(course.studentRecords?.[student.uid] || {}),
            signOff: signOffInfo,
            lastModified: currentDate
          }
        }
      });
  
      setIsSignOffModalOpen(false);
      setInstructorPin('');
      setError(null);
  
    } catch (err) {
      console.error('Error in handleSignOff:', err);
      setError('Failed to sign off record. Please try again.');
    }
  };

  const handleUnlock = async () => {
    try {
      const instructorRef = doc(db, 'profiles', instructorProfile.uid);
      const instructorDoc = await getDoc(instructorRef);
      
      if (!instructorDoc.exists() || 
          instructorDoc.data().instructorPin?.pin !== instructorPin) {
        setError('Invalid PIN');
        return;
      }

      const courseRef = doc(db, 'courses', course.id);
      await updateDoc(courseRef, {
        [`studentRecords.${student.uid}.signOff.locked`]: false
      });

      setIsRecordLocked(false);
      setIsSignOffModalOpen(false);
      setInstructorPin('');
    } catch (err) {
      console.error('Error unlocking record:', err);
      setError('Failed to unlock record');
    }
  };

  const renderSkillItem = (section, skill, verification) => (
    <div 
      key={skill} 
      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors bg-white"
    >
      <div className="flex items-center space-x-3">
        {readOnly ? (
          <div className="h-5 w-5 flex items-center justify-center">
            {verification ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ) : (
          <input
            type="checkbox"
            checked={!!verification}
            onChange={() => handleSkillToggle(section.title, skill)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isRecordLocked}
          />
        )}
        <span className="text-gray-900">{skill}</span>
      </div>
      {verification && (
        <div className="flex items-center space-x-4">
          {!readOnly && (
            <>
              <input
                type="date"
                value={verification.date.split('T')[0]}
                onChange={(e) => handleDateChange(section.title, skill, e.target.value)}
                className="text-sm border rounded px-2 py-1"
                disabled={isRecordLocked}
              />
              <input
                type="text"
                value={verification.instructorName}
                onChange={(e) => handleInstructorChange(section.title, skill, e.target.value)}
                placeholder="Instructor"
                className="text-sm border rounded px-2 py-1 w-32"
                disabled={isRecordLocked}
              />
            </>
          )}
          {readOnly && (
            <span className="text-sm text-gray-600">
              Verified {new Date(verification.date).toLocaleDateString()} by {verification.instructorName}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderSection = (section) => {
    if (section.subsections) {
      return (
        <div key={section.title} className="bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {section.title}
            </h3>
            <div className="space-y-8">
              {section.subsections.map(subsection => (
                <div key={subsection.title} className="border-l-4 border-gray-200 pl-4">
                  <h4 className="text-base font-semibold text-gray-700 mb-3">
                    {subsection.title}
                  </h4>
                  <div className="divide-y divide-gray-200 rounded-md border bg-white">
                    {subsection.skills.map(skill => 
                      renderSkillItem(subsection, skill, progress[subsection.title]?.[skill])
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 text-right">
                    {Object.keys(progress[subsection.title] || {}).length} of {subsection.skills.length} completed
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={section.title} className="bg-white border rounded-lg shadow-sm">
        <div className="px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {section.title}
          </h3>
          {section.subheader && (
            <p className="text-sm text-gray-600 mb-4 italic">{section.subheader}</p>
          )}
          <div className="divide-y divide-gray-200 rounded-md border bg-white">
            {section.skills.map(skill => 
              renderSkillItem(section, skill, progress[section.title]?.[skill])
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600 text-right">
            {Object.keys(progress[section.title] || {}).length} of {section.skills.length} completed
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <div className="bg-white">
          <DialogHeader className="bg-white border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900">Training Record</DialogTitle>
            <DialogDescription className="mt-2 space-y-1">
              <span className="text-lg font-semibold text-gray-900 block">{trainingRecord?.name}</span>
              <span className="text-sm text-gray-500 block">{course?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Student Information Card */}
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="mt-1 text-sm text-gray-900">{student?.displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="mt-1 text-sm text-gray-900">{student?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Sections */}
            {trainingRecord.sections.map(section => renderSection(section))}

            {/* Instructor Notes */}
            <div className="bg-white border rounded-lg shadow-sm mt-6">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Instructor Notes and Observations
                </h3>
                <textarea
                  value={localNotes}
                  onChange={(e) => {
                    setLocalNotes(e.target.value);
                    const timeoutId = setTimeout(() => {
                      debouncedSave(e.target.value);
                    }, 1000);
                    return () => clearTimeout(timeoutId);
                  }}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Add notes and observations here..."
                  disabled={isRecordLocked}
                />
                {isSaving && (
                  <p className="text-sm text-gray-500 mt-1">Saving...</p>
                )}
              </div>
            </div>

            {/* Instructor Sign Off Section */}
            <div className="bg-white border rounded-lg shadow-sm mt-6">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Instructor Sign Off
                </h3>
                {!isRecordLocked ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      I certify that I have completed the training or verified the completion of 
                      the training on this record and that the student has performed all the 
                      skills listed to a satisfactory level.
                    </p>
                    <Button 
                      onClick={() => setIsSignOffModalOpen(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Sign Off Record
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Record Locked and Signed Off by:
                      </p>
                      <p className="font-medium">{signOffData?.instructorName}</p>
                      <p className="text-sm text-gray-600">
                        Date: {new Date(signOffData?.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      onClick={() => setIsSignOffModalOpen(true)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Unlock Record
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t pt-4 flex justify-end space-x-2 bg-white">
            <Button variant="outline" onClick={onClose} className="bg-white">
              Close
            </Button>
            <Button 
              onClick={() => {
                console.log('Exporting with course data:', courseData);
                console.log('Instructor certifications:', courseData?.instructor?.instructorCertifications);
                
                generateTrainingRecordPDF(
                  courseData || course,
                  student,
                  trainingRecord,
                  progress,
                  signOffData,
                  localNotes, 
                  {
                    name: courseData?.instructor?.name || course?.instructor?.name,
                    displayName: courseData?.instructor?.displayName || course?.instructor?.displayName,
                    instructorCertifications: courseData?.instructor?.instructorCertifications || [],
                    certText: courseData?.instructor?.instructorCertifications?.map(cert => 
                      `${cert.agency} Instructor #${cert.number}`
                    ).join('\n') || ''
                  }
                );
              }} 
              variant="outline" 
              className="bg-white"
            >
              Export Record
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Sign Off/Unlock Modal */}
      <Dialog open={isSignOffModalOpen} onOpenChange={setIsSignOffModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isRecordLocked ? 'Unlock Record' : 'Instructor Sign Off'}
            </DialogTitle>
            <DialogDescription>
              {isRecordLocked 
                ? "Enter your instructor PIN to unlock this student's training record. Once unlocked, you can make changes to the record."
                : "Enter your instructor PIN to sign off on this student's training record. This will lock the record from further changes."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input
              type="password"
              placeholder="Enter PIN"
              value={instructorPin}
              onChange={(e) => setInstructorPin(e.target.value)}
              className="w-full p-2 border rounded"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSignOffModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={isRecordLocked ? handleUnlock : handleSignOff}
              className={isRecordLocked ? "bg-yellow-600" : "bg-green-600"}
            >
              {isRecordLocked ? 'Unlock Record' : 'Sign Off'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default StudentTrainingRecord;