import React, { useState } from 'react';

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

const CourseEndReport = ({ course, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    creditAllocations: course.assistants?.map(assistant => ({
      name: assistant.displayName,
      uid: assistant.uid,
      percentage: ''
    })) || [],
    additionalNotes: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    const totalCredit = formData.creditAllocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.percentage) || 0);
    }, 0);

    if (totalCredit > 100) {
      newErrors.creditAllocations = 'Total credit allocation cannot exceed 100%';
    }

    formData.creditAllocations.forEach((allocation, index) => {
      if (allocation.percentage && (isNaN(allocation.percentage) || allocation.percentage < 0 || allocation.percentage > 100)) {
        newErrors[`percentage_${index}`] = 'Percentage must be between 0 and 100';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreditAllocationChange = (index, value) => {
    const newAllocations = [...formData.creditAllocations];
    newAllocations[index] = {
      ...newAllocations[index],
      percentage: value
    };
    setFormData({
      ...formData,
      creditAllocations: newAllocations
    });
    if (errors[`percentage_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`percentage_${index}`];
      setErrors(newErrors);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        creditAllocations: formData.creditAllocations.filter(allocation => 
          allocation.percentage && parseFloat(allocation.percentage) > 0
        ),
        additionalNotes: formData.additionalNotes,
        submittedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="bg-white rounded-lg w-full">
      <div className="flex justify-between items-center border-b p-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Course End Report</h3>
          <p className="text-sm text-gray-600">Complete and finalize course details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Course Details Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Course:</span>
              <div className="font-medium text-gray-900">{course.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Location:</span>
              <div className="font-medium text-gray-900">{course.location}</div>
            </div>
            <div>
              <span className="text-gray-600">Start Date:</span>
              <div className="font-medium text-gray-900">
                {new Date(course.startDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-gray-600">End Date:</span>
              <div className="font-medium text-gray-900">
                {new Date(course.endDate).toLocaleDateString()}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Instructor:</span>
              <div className="font-medium text-gray-900">{course.instructor?.displayName}</div>
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Students</h4>
          <div className="space-y-2">
            {course.students?.map((student, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-900">• {student.displayName}</span>
                <span className="text-gray-600">
                  {course.trainingRecord ? 
                    `${calculateStudentProgress(student, course)}% Complete` : 
                    'No Training Record'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Allocation Section */}
        {formData.creditAllocations.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Credit Allocation</h4>
            <p className="text-sm text-gray-600 mb-4">
              Would you like to apply any of your credit to an assistant or DM?
            </p>
            {errors.creditAllocations && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                {errors.creditAllocations}
              </div>
            )}
            {formData.creditAllocations.map((allocation, index) => (
              <div key={index} className="flex items-center gap-4 mb-4">
                <div className="flex-grow">
                  <label className="text-gray-900">{allocation.name}</label>
                </div>
                <div className="w-32 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={allocation.percentage}
                    onChange={(e) => handleCreditAllocationChange(index, e.target.value)}
                    className={`w-full p-2 border rounded ${
                      errors[`percentage_${index}`] ? 'border-red-500' : 'border-gray-200'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Notes */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-2">
            Additional Notes
          </label>
          <textarea
            value={formData.additionalNotes}
            onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
            placeholder="Any additional comments or observations?"
            className="w-full p-2 border border-gray-200 rounded-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Complete Course
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseEndReport;