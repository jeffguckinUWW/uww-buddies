import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

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

const CourseEndReport = ({ course, onSubmit, onCancel }) => {
  // Initialize state for form data
  const [formData, setFormData] = useState({
    creditAllocations: course.assistants?.map(assistant => ({
      name: assistant.displayName,
      uid: assistant.uid,
      percentage: ''
    })) || [],
    additionalNotes: ''
  });

  // Validation state
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Validate credit allocations (total should not exceed 100%)
    const totalCredit = formData.creditAllocations.reduce((sum, allocation) => {
      return sum + (parseFloat(allocation.percentage) || 0);
    }, 0);

    if (totalCredit > 100) {
      newErrors.creditAllocations = 'Total credit allocation cannot exceed 100%';
    }

    // Validate individual percentages
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
    // Clear error for this field
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Course End Report</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Details Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-4">Course Details</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Course:</span>
                  <div className="font-medium">{course.name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Location:</span>
                  <div className="font-medium">{course.location}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Start Date:</span>
                  <div className="font-medium">
                    {new Date(course.startDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">End Date:</span>
                  <div className="font-medium">
                    {new Date(course.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-gray-500">Instructor:</span>
                <div className="font-medium">{course.instructor?.displayName}</div>
              </div>
            </div>
          </div>

          {/* Students Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Students</h3>
                <div className="space-y-1">
                    {course.students?.map((student, index) => (
                    <div key={index} className="text-sm flex justify-between">
                        <span>• {student.displayName}</span>
                        <span className="text-gray-500">
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
            <div>
              <Label className="text-base font-medium">Credit Allocation</Label>
              <p className="text-sm text-gray-500 mb-2">
                Would you like to apply any of your credit to an assistant or DM?
              </p>
              {errors.creditAllocations && (
                <p className="text-sm text-red-500 mb-2">{errors.creditAllocations}</p>
              )}
              {formData.creditAllocations.map((allocation, index) => (
                <div key={index} className="flex items-center gap-4 mb-2">
                  <div className="flex-grow">
                    <Label htmlFor={`credit-${index}`}>{allocation.name}</Label>
                  </div>
                  <div className="w-32 flex items-center">
                    <Input
                      id={`credit-${index}`}
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={allocation.percentage}
                      onChange={(e) => handleCreditAllocationChange(index, e.target.value)}
                      className={errors[`percentage_${index}`] ? 'border-red-500' : ''}
                    />
                    <span className="ml-2">%</span>
                  </div>
                  {errors[`percentage_${index}`] && (
                    <p className="text-sm text-red-500">{errors[`percentage_${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
              placeholder="Any additional comments or observations?"
              className="h-32"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Course
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CourseEndReport;