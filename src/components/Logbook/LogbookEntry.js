// LogbookEntry.js
import React from 'react';
import { Sun, Cloud, CloudRain, Wind, Thermometer, Clock, Droplet } from 'lucide-react';

const LogbookEntry = ({ formData, setFormData, readOnly, handleTimeChange }) => {
    const weatherIcons = {
      sunny: <Sun className="w-6 h-6 text-yellow-500" />,
      cloudy: <Cloud className="w-6 h-6 text-gray-500" />,
      rainy: <CloudRain className="w-6 h-6 text-blue-500" />,
      windy: <Wind className="w-6 h-6 text-gray-500" />
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
      <div className="bg-white rounded-lg p-6">
        <div className="paper-texture bg-white border-2 border-gray-200 rounded-lg p-8">
          {/* Basic Information Section */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Dive #</label>
                <input
                  type="number"
                  value={formData.diveNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, diveNumber: e.target.value }))}
                  className="mt-1 w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  readOnly={readOnly}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Date</label>
                <input
                  type="date"
                  value={formData.diveDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, diveDate: e.target.value }))}
                  className="mt-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  readOnly={readOnly}
                  required
                />
              </div>
            </div>
          </div>
  
          {/* Main Content Following Specified Order */}
          <div className="space-y-6">
            {/* Location and Buddy */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  readOnly={readOnly}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Dive Buddy</label>
                <input
                  type="text"
                  value={formData.buddy}
                  onChange={(e) => setFormData(prev => ({ ...prev, buddy: e.target.value }))}
                  className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter buddy's name"
                  readOnly={readOnly}
                />
              </div>
            </div>
  
            {/* Dive Times */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 flex items-center">
                <Clock className="w-5 h-5 text-gray-500 mr-2" />
                Dive Times
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Time In (optional)</label>
                    <input
                      type="time"
                      name="timeIn"
                      value={formData.timeIn}
                      onChange={handleTimeChange}
                      className="mt-1 w-full p-2 border rounded"
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Time Out (optional)</label>
                    <input
                      type="time"
                      name="timeOut"
                      value={formData.timeOut}
                      onChange={handleTimeChange}
                      className="mt-1 w-full p-2 border rounded"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Bottom Time (minutes)</label>
                  <input
                    type="number"
                    value={formData.bottomTime}
                    onChange={handleBottomTimeChange}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="Enter bottom time"
                    min="0"
                    required
                    readOnly={readOnly}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter either Time In/Out OR Bottom Time directly
                  </p>
                </div>
              </div>
            </div>
  
            {/* Tank Information */}
<div className="border rounded-lg p-4">
  <h3 className="font-semibold mb-3">Tank Information</h3>
  <div className="grid grid-cols-3 gap-4">  {/* Changed to grid-cols-3 */}
    <div>
      <label className="text-sm text-gray-600">Tank Start (PSI)</label>
      <input
        type="number"
        value={formData.tankPressureStart}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          tankPressureStart: e.target.value
        }))}
        className="mt-1 w-full p-2 border rounded"
        min="0"
        readOnly={readOnly}
      />
    </div>
    <div>
      <label className="text-sm text-gray-600">Tank End (PSI)</label>
      <input
        type="number"
        value={formData.tankPressureEnd}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          tankPressureEnd: e.target.value
        }))}
        className="mt-1 w-full p-2 border rounded"
        min="0"
        readOnly={readOnly}
      />
    </div>
    <div>
      <label className="text-sm text-gray-600">Tank Size (cu ft)</label>
      <input
        type="number"
        value={formData.tankVolume}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          tankVolume: e.target.value
        }))}
        className="mt-1 w-full p-2 border rounded"
        min="0"
        readOnly={readOnly}
      />
    </div>
  </div>
</div>
  
            {/* Dive Type */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Dive Type</h3>
              <div className="grid grid-cols-4 gap-2">
                {formData.diveType && Object.entries(formData.diveType).map(([type, checked]) => (
                  <label key={type} className="flex items-center space-x-2">
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
                      className="rounded border-gray-300"
                      disabled={readOnly}
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
  
            {/* Weather Conditions */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Weather Conditions</h3>
              <div className="flex gap-4 justify-around mb-4">
                {Object.entries(weatherIcons).map(([condition, icon]) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      weather: { ...prev.weather, condition }
                    }))}
                    className={`p-2 rounded-full ${
                      formData.weather.condition === condition 
                        ? 'bg-blue-100' 
                        : 'hover:bg-gray-100'
                    }`}
                    disabled={readOnly}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm text-gray-600">Wind Speed (knots)</label>
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
                  className="mt-1 w-full p-2 border rounded"
                  min="0"
                  readOnly={readOnly}
                />
              </div>
            </div>
  
            {/* Depth and Temperature */}
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Droplet className="w-5 h-5 text-blue-500 mr-2" />
                  Depth Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Max Depth (ft)</label>
                    <input
                      type="number"
                      value={formData.maxDepth}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        maxDepth: e.target.value 
                      }))}
                      className="mt-1 w-full p-2 border rounded"
                      min="0"
                      required
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Visibility (ft)</label>
                    <input
                      type="number"
                      value={formData.visibility}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        visibility: e.target.value 
                      }))}
                      className="mt-1 w-full p-2 border rounded"
                      min="0"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
  
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Thermometer className="w-5 h-5 text-red-500 mr-2" />
                  Temperature
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Water (°F)</label>
                    <input
                      type="number"
                      value={formData.waterTemp}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        waterTemp: e.target.value 
                      }))}
                      className="mt-1 w-full p-2 border rounded"
                      readOnly={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Air (°F)</label>
                    <input
                      type="number"
                      value={formData.airTemp}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        airTemp: e.target.value 
                      }))}
                      className="mt-1 w-full p-2 border rounded"
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
  
            {/* Equipment */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Equipment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(formData.equipment).map(([gear, checked]) => (
                  <label key={gear} className="flex items-center space-x-2">
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
                      className="rounded border-gray-300"
                      disabled={readOnly}
                    />
                    <span className="text-sm capitalize">{gear}</span>
                  </label>
                ))}
              </div>
            </div>
  
            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Notes & Comments
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border rounded-lg min-h-[100px]"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default LogbookEntry;