// src/components/Admin/TestCreator.js
// If this file already exists, just add the SDI test creation functionality to it

import React, { useState } from 'react';
import createNAUIOpenWaterTest from '../../utils/createNAUITest';
import createSDIOpenWaterTest from '../../utils/createSDITest'; // Import the new SDI test function
import { Button } from '../ui/button'; 

const TestCreator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [testType, setTestType] = useState(''); // To track which test is being created

  const handleCreateNAUITest = async () => {
    setIsLoading(true);
    setTestType('NAUI');
    try {
      const success = await createNAUIOpenWaterTest();
      if (success) {
        setResult({ success: true, message: "NAUI Open Water test created successfully!" });
      } else {
        setResult({ success: false, message: "Failed to create NAUI test, see console for details." });
      }
    } catch (error) {
      console.error("Error creating NAUI test:", error);
      setResult({ success: false, message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSDITest = async () => {
    setIsLoading(true);
    setTestType('SDI');
    try {
      const success = await createSDIOpenWaterTest();
      if (success) {
        setResult({ success: true, message: "SDI Open Water test created successfully!" });
      } else {
        setResult({ success: false, message: "Failed to create SDI test, see console for details." });
      }
    } catch (error) {
      console.error("Error creating SDI test:", error);
      setResult({ success: false, message: `Error: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Certification Test Creator</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Button
          onClick={handleCreateNAUITest}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && testType === 'NAUI' ? "Creating NAUI Test..." : "Create NAUI Open Water Test"}
        </Button>
        
        <Button
          onClick={handleCreateSDITest}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading && testType === 'SDI' ? "Creating SDI Test..." : "Create SDI Open Water Test"}
        </Button>
      </div>
      
      {result && (
        <div className={`p-3 rounded mt-4 ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default TestCreator;