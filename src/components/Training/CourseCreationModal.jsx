import React, { useState } from 'react';

const CourseCreationModal = ({ 
  isOpen, 
  onClose, 
  newCourse, 
  setNewCourse, 
  handleCreateCourse,
  selectedTrainingRecord,
  setIsTrainingRecordSelectorOpen 
}) => {
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  
  const courseOptions = [
    'Try SCUBA',
    'Open Water SCUBA Diver (NAUI)',
    'Open Water SCUBA Diver (SDI)',
    'Open Water SCUBA Diver Certification Dives',
    'Advanced Open Water Diver (NAUI)',
    'Advanced Open Water Diver (SDI)',
    'Custom Course'
  ];

  const handleCourseSelection = (selectedValue) => {
    if (selectedValue === 'Custom Course') {
      setIsCustomCourse(true);
      setNewCourse({...newCourse, name: ''});
    } else {
      setIsCustomCourse(false);
      setNewCourse({...newCourse, name: selectedValue});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Create New Course</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <select
              className="w-full p-2 border rounded mb-2"
              value={isCustomCourse ? 'Custom Course' : newCourse.name}
              onChange={(e) => handleCourseSelection(e.target.value)}
            >
              <option value="">Select a Course</option>
              {courseOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            
            {isCustomCourse && (
              <input
                type="text"
                placeholder="Enter Custom Course Name"
                className="w-full p-2 border rounded"
                value={newCourse.name}
                onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
              />
            )}
          </div>

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

          <div className="border rounded p-4">
            <h4 className="text-sm font-medium mb-2">Training Record</h4>
            {selectedTrainingRecord ? (
              <div className="flex justify-between items-center">
                <span>{selectedTrainingRecord.name}</span>
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
                Select Training Record
              </button>
            )}
          </div>

          <button
            onClick={handleCreateCourse}
            disabled={!newCourse.name}
            className={`w-full p-2 rounded ${
              !newCourse.name 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Create Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCreationModal;