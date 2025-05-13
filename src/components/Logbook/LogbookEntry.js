// Enhanced LogbookEntry.js with professional styling
import React from 'react';
import { Sun, Cloud, CloudRain, Wind, Thermometer, Clock, Droplet, LifeBuoy, Bookmark, MapPin, UserCircle } from 'lucide-react';

const LogbookEntry = ({ formData, setFormData, readOnly, handleTimeChange }) => {
    const weatherIcons = {
      sunny: <Sun className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />,
      cloudy: <Cloud className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />,
      rainy: <CloudRain className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />,
      windy: <Wind className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
    };
  
    // Validate and handle bottom time changes
    const handleBottomTimeChange = (e) => {
      const value = e.target.value;
      // Only allow positive numbers
      if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
        setFormData(prev => ({
          ...prev,
          bottomTime: value,
          // Clear time in/out if directly entering bottom time
          ...(value !== '' && { timeIn: '', timeOut: '' })
        }));
      }
    };
  
    return (
      <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl p-3 sm:p-5 shadow-lg">
        <div className="bg-white border border-blue-100 rounded-lg p-4 sm:p-6 md:p-8 shadow-sm">
          {/* Header and Basic Information Section */}
          <div className="mb-8 border-b border-blue-100 pb-4">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Dive Log Entry</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-2">
              <div className="flex gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Dive #</label>
                  <input
                    type="number"
                    value={formData.diveNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, diveNumber: e.target.value }))}
                    className="w-20 sm:w-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    readOnly={readOnly}
                    min="1"
                    required
                  />
                </div>
                <div className="flex-grow">
                  <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.diveDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, diveDate: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    readOnly={readOnly}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
  
          {/* Main Content Following Specified Order */}
          <div className="space-y-8">
            {/* Location and Buddy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  readOnly={readOnly}
                  required
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4 flex flex-col">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <UserCircle className="w-4 h-4 mr-2 text-blue-600" />
                  Dive Buddy
                </label>
                <input
                  type="text"
                  value={formData.buddy}
                  onChange={(e) => setFormData(prev => ({ ...prev, buddy: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter buddy's name"
                  readOnly={readOnly}
                />
              </div>
            </div>
  
            {/* Dive Times */}
            <div className="border border-blue-100 rounded-lg p-5 bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                Dive Times
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Time In (optional)</label>
                    <input
                      type="time"
                      name="timeIn"
                      value={formData.timeIn}
                      onChange={handleTimeChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Time Out (optional)</label>
                    <input
                      type="time"
                      name="timeOut"
                      value={formData.timeOut}
                      onChange={handleTimeChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Bottom Time (minutes)</label>
                  <input
                    type="number"
                    value={formData.bottomTime}
                    onChange={handleBottomTimeChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                    placeholder="Enter bottom time"
                    min="0"
                    required
                    readOnly={readOnly}
                  />
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Enter either Time In/Out OR Bottom Time directly
                  </p>
                </div>
              </div>
            </div>
  
            {/* Tank Information */}
            <div className="border border-blue-100 rounded-lg p-5 bg-white">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                <LifeBuoy className="w-5 h-5 text-blue-600 mr-2" />
                Tank Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Tank Start (PSI)</label>
                  <input
                    type="number"
                    value={formData.tankPressureStart}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tankPressureStart: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="0"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Tank End (PSI)</label>
                  <input
                    type="number"
                    value={formData.tankPressureEnd}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tankPressureEnd: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="0"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-1">Tank Size (cu ft)</label>
                  <input
                    type="number"
                    value={formData.tankVolume}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tankVolume: e.target.value
                    }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min="0"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>
  
            {/* Dive Type */}
            <div className="border border-blue-100 rounded-lg p-5 bg-gray-50">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                <Bookmark className="w-5 h-5 text-blue-600 mr-2" />
                Dive Type
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {formData.diveType && Object.entries(formData.diveType).map(([type, checked]) => (
                  <label key={type} className={`flex items-center p-2 border rounded-md ${checked ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        diveType: {
                          ...prev.diveType,
                          [type]: !prev.diveType[type]
                        }
                      }))}
                      className="rounded text-blue-600 border-gray-300 h-4 w-4 focus:ring-blue-500"
                      disabled={readOnly}
                    />
                    <span className="text-sm ml-2 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
  
            {/* Weather Conditions */}
            <div className="border border-blue-100 rounded-lg p-5 bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-4">Weather Conditions</h3>
              <div className="flex flex-wrap gap-4 justify-around mb-5">
                {Object.entries(weatherIcons).map(([condition, icon]) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      weather: { ...prev.weather, condition }
                    }))}
                    className={`p-3 rounded-lg transition-all ${
                      formData.weather.condition === condition 
                        ? 'bg-white shadow-md border border-blue-200 scale-110' 
                        : 'bg-white/50 hover:bg-white hover:shadow-sm'
                    }`}
                    disabled={readOnly}
                  >
                    {icon}
                    <span className="block text-xs font-medium capitalize mt-1">{condition}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">Wind Speed (knots)</label>
                <input
                  type="number"
                  value={formData.weather.windSpeed}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    weather: {
                      ...prev.weather,
                      windSpeed: e.target.value
                    }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  min="0"
                  readOnly={readOnly}
                />
              </div>
            </div>
  
            {/* Depth and Temperature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="border border-blue-100 rounded-lg p-5 bg-white">
                <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                  <Droplet className="w-5 h-5 text-blue-600 mr-2" />
                  Depth Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Max Depth (ft)</label>
                    <input
                      type="number"
                      value={formData.maxDepth}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        maxDepth: e.target.value 
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      min="0"
                      required
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Visibility (ft)</label>
                    <input
                      type="number"
                      value={formData.visibility}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        visibility: e.target.value 
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      min="0"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
  
              <div className="border border-blue-100 rounded-lg p-5 bg-white">
                <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                  <Thermometer className="w-5 h-5 text-red-500 mr-2" />
                  Temperature
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Water (°F)</label>
                    <input
                      type="number"
                      value={formData.waterTemp}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        waterTemp: e.target.value 
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">Air (°F)</label>
                    <input
                      type="number"
                      value={formData.airTemp}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        airTemp: e.target.value 
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
  
            {/* Equipment */}
            <div className="border border-blue-100 rounded-lg p-5 bg-gray-50">
              <h3 className="font-semibold text-blue-800 mb-4">Equipment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(formData.equipment).map(([gear, checked]) => (
                  <label key={gear} className={`flex items-center p-2 border rounded-md ${checked ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        equipment: {
                          ...prev.equipment,
                          [gear]: !prev.equipment[gear]
                        }
                      }))}
                      className="rounded text-blue-600 border-gray-300 h-4 w-4 focus:ring-blue-500"
                      disabled={readOnly}
                    />
                    <span className="text-sm ml-2 capitalize">{gear}</span>
                  </label>
                ))}
              </div>
            </div>
  
            {/* Notes Section */}
            <div className="border border-blue-100 rounded-lg p-5 bg-white">
              <label className="flex items-center text-sm font-semibold text-blue-800 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Notes & Comments
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default LogbookEntry;