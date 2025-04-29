import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RefreshCw, Calendar, ArrowLeftRight } from 'lucide-react';
import ShiftSwapRequest from '../Team/ShiftSwapRequest';
import ShiftSwapAvailable from '../Team/ShiftSwapAvailable';

const ShiftSwapManager = () => {
  const [activeTab, setActiveTab] = useState('my-requests');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-medium flex items-center">
            <ArrowLeftRight className="h-5 w-5 mr-2" />
            Shift Swap System
          </h2>
          <p className="text-sm text-gray-600">
            Request coverage for your shifts or accept shifts from other team members
          </p>
        </div>
      </div>

      <Tabs 
        defaultValue="my-requests" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full flex justify-start mb-6 border-b">
          <TabsTrigger 
            value="my-requests" 
            className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
          >
            <Calendar className="h-4 w-4 mr-2" />
            My Swap Requests
          </TabsTrigger>
          <TabsTrigger 
            value="available-shifts" 
            className="flex items-center py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Available Shifts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests">
          <ShiftSwapRequest />
        </TabsContent>

        <TabsContent value="available-shifts">
          <ShiftSwapAvailable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShiftSwapManager;