// src/components/Admin/TestCreator.js
import React, { useState } from 'react';
import createNAUIOpenWaterTest from '../../utils/createNAUITest';
import createSDIOpenWaterTest from '../../utils/createSDITest';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/card';
import { Loader2, Check, AlertCircle } from 'lucide-react';

const TestCreator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [testType, setTestType] = useState('');

  const handleCreateNAUITest = async () => {
    setIsLoading(true);
    setTestType('NAUI');
    setResult(null);
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
    setResult(null);
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
    <Card className="bg-white shadow-sm border border-gray-100">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-xl font-bold flex items-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 mr-2 text-blue-600"
          >
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1"></path>
            <path d="M17 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"></path>
            <path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M12 12v8"></path>
            <path d="M8 16h8"></path>
          </svg>
          Certification Test Creator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleCreateNAUITest}
            disabled={isLoading}
            className="flex-1 h-16 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex items-center justify-center">
              {isLoading && testType === 'NAUI' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Creating NAUI Test...</span>
                </>
              ) : (
                <>
                  <svg 
                    className="w-6 h-6 mr-2 text-blue-100"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Create NAUI Open Water Test</span>
                </>
              )}
            </div>
          </Button>
          
          <Button
            onClick={handleCreateSDITest}
            disabled={isLoading}
            className="flex-1 h-16 relative overflow-hidden group"
            variant="outline"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex items-center justify-center group-hover:text-white">
              {isLoading && testType === 'SDI' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Creating SDI Test...</span>
                </>
              ) : (
                <>
                  <svg 
                    className="w-6 h-6 mr-2 text-indigo-600 group-hover:text-white transition-colors duration-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M15 8H15.01M9 8H9.01M15 16H15.01M9 16H9.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15.5 8C15.5 8.27614 15.2761 8.5 15 8.5C14.7239 8.5 14.5 8.27614 14.5 8C14.5 7.72386 14.7239 7.5 15 7.5C15.2761 7.5 15.5 7.72386 15.5 8ZM9.5 8C9.5 8.27614 9.27614 8.5 9 8.5C8.72386 8.5 8.5 8.27614 8.5 8C8.5 7.72386 8.72386 7.5 9 7.5C9.27614 7.5 9.5 7.72386 9.5 8ZM15.5 16C15.5 16.2761 15.2761 16.5 15 16.5C14.7239 16.5 14.5 16.2761 14.5 16C14.5 15.7239 14.7239 15.5 15 15.5C15.2761 15.5 15.5 15.7239 15.5 16ZM9.5 16C9.5 16.2761 9.27614 16.5 9 16.5C8.72386 16.5 8.5 16.2761 8.5 16C8.5 15.7239 8.72386 15.5 9 15.5C9.27614 15.5 9.5 15.7239 9.5 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Create SDI Open Water Test</span>
                </>
              )}
            </div>
          </Button>
        </div>
      </CardContent>
      
      {result && (
        <CardFooter className="pt-0">
          <div className={`p-4 rounded-md w-full mt-4 flex items-start ${
            result.success ? 'bg-green-50 text-green-800 border border-green-200' : 
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {result.success ? (
              <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default TestCreator;