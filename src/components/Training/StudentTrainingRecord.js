import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const StudentTrainingRecord = ({ 
  isOpen, 
  onClose, 
  student, 
  course,
  trainingRecord,
  instructorProfile,
  onProgressUpdate
}) => {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [instructorNotes, setInstructorNotes] = useState('');

  // Load existing progress data
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const courseRef = doc(db, 'courses', course.id);
        const courseDoc = await getDoc(courseRef);
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          setProgress(courseData.studentRecords?.[student.uid]?.progress || {});
          setInstructorNotes(courseData.studentRecords?.[student.uid]?.notes || '');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading progress:', err);
        setError('Failed to load training record');
        setLoading(false);
      }
    };

    if (isOpen) {
      loadProgress();
    }
  }, [course.id, student.uid, isOpen]);

  const handleSkillToggle = async (sectionTitle, skillName) => {
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

  const handleNotesChange = async (newNotes) => {
    try {
      const courseRef = doc(db, 'courses', course.id);
      await updateDoc(courseRef, {
        [`studentRecords.${student.uid}.notes`]: newNotes
      });
      setInstructorNotes(newNotes);
    } catch (err) {
      console.error('Error updating notes:', err);
      setError('Failed to update notes');
    }
  };

  const renderSkillItem = (section, skill, verification) => (
    <div 
      key={skill} 
      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors bg-white"
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={!!verification}
          onChange={() => handleSkillToggle(section.title, skill)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-gray-900">{skill}</span>
      </div>
      <div className="flex items-center space-x-4">
        {verification && (
          <>
            <input
              type="date"
              value={verification.date.split('T')[0]}
              onChange={(e) => handleDateChange(section.title, skill, e.target.value)}
              className="text-sm border rounded px-2 py-1"
            />
            <input
              type="text"
              value={verification.instructorName}
              onChange={(e) => handleInstructorChange(section.title, skill, e.target.value)}
              placeholder="Instructor"
              className="text-sm border rounded px-2 py-1 w-32"
            />
          </>
        )}
      </div>
    </div>
  );

  const renderSection = (section) => {
    if (section.subsections) {
      return (
        <div key={section.title} className="bg-white border rounded-lg shadow-sm">
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {section.title}
            </h3>
            <div className="space-y-4">
              {section.subsections.map(subsection => (
                <div key={subsection.title} className="pl-4 border-l-2 border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    {subsection.title}
                  </h4>
                  <div className="divide-y divide-gray-200 rounded-md border bg-white">
                    {subsection.skills.map(skill => 
                      renderSkillItem(subsection, skill, progress[subsection.title]?.[skill])
                    )}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
        </div>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <div className="bg-white">
          <DialogHeader className="bg-white border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900">Training Record</DialogTitle>
            <DialogDescription>
              <div className="mt-2 space-y-1">
                <p className="text-lg font-semibold text-gray-900">{trainingRecord?.name}</p>
                <p className="text-sm text-gray-500">{course?.name}</p>
              </div>
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
                  value={instructorNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full h-32 p-2 border rounded-md"
                  placeholder="Add notes and observations here..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t pt-4 flex justify-end space-x-2 bg-white">
            <Button variant="outline" onClick={onClose} className="bg-white">
              Close
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="bg-white">
              Print Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentTrainingRecord;