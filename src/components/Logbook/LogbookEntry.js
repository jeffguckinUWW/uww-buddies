// components/Logbook/LogbookEntry.js
import React, { useState } from 'react';
import { Sun, Cloud, CloudRain, Wind, Thermometer, Clock, Droplet } from 'lucide-react';

const LogbookEntry = ({ formData, setFormData, readOnly }) => {
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [diveType, setDiveType] = useState({
    lake: false,
    river: false,
    ocean: false,
    shore: false,
    boat: false,
    wreck: false,
    drift: false,
    night: false
  });

  const weatherIcons = {
    sunny: <Sun className="w-6 h-6 text-yellow-500" />,
    cloudy: <Cloud className="w-6 h-6 text-gray-500" />,
    rainy: <CloudRain className="w-6 h-6 text-blue-500" />,
    windy: <Wind className="w-6 h-6 text-gray-500" />
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="paper-texture bg-white border-2 border-gray-200 rounded-lg p-8">
        {/* Header Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Dive #</label>
                <input
                  type="number"
                  value={formData.diveNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, diveNumber: e.target.value }))}
                  className="mt-1 w-24 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  readOnly={readOnly}
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
                />
              </div>
            </div>
          </div>
          
          {/* Weather Section */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex gap-4 justify-around mb-2">
              {Object.entries(weatherIcons).map(([condition, icon]) => (
                <button
                  key={condition}
                  onClick={() => setWeatherCondition(condition)}
                  className={`p-2 rounded-full ${weatherCondition === condition ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  disabled={readOnly}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="text-sm font-semibold text-gray-600">Wind Speed</label>
              <input
                type="number"
                className="ml-2 w-20 p-1 border rounded"
                placeholder="knots"
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-gray-600">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="mt-1 w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                readOnly={readOnly}
              />
            </div>

            {/* Time Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center mb-2">
                <Clock className="w-5 h-5 text-gray-500 mr-2" />
                <span className="font-semibold">Dive Times</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Time In</label>
                  <input
                    type="time"
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Time Out</label>
                  <input
                    type="time"
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>

            {/* Tank Info Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Tank Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Start Pressure</label>
                  <input
                    type="number"
                    value={formData.tankPressureStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, tankPressureStart: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="PSI"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">End Pressure</label>
                  <input
                    type="number"
                    value={formData.tankPressureEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, tankPressureEnd: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    placeholder="PSI"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>

            {/* Dive Type Checkboxes */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Dive Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(diveType).map(([type, checked]) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setDiveType(prev => ({ ...prev, [type]: !prev[type] }))}
                      className="rounded border-gray-300"
                      disabled={readOnly}
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Depth Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center mb-2">
                <Droplet className="w-5 h-5 text-blue-500 mr-2" />
                <span className="font-semibold">Depth & Conditions</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Max Depth (ft)</label>
                  <input
                    type="number"
                    value={formData.maxDepth}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDepth: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Visibility (ft)</label>
                  <input
                    type="number"
                    value={formData.visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>

            {/* Temperature Section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Thermometer className="w-5 h-5 text-red-500 mr-2" />
                <span className="font-semibold">Temperature</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Air (°F)</label>
                  <input
                    type="number"
                    value={formData.airTemp}
                    onChange={(e) => setFormData(prev => ({ ...prev, airTemp: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Water (°F)</label>
                  <input
                    type="number"
                    value={formData.waterTemp}
                    onChange={(e) => setFormData(prev => ({ ...prev, waterTemp: e.target.value }))}
                    className="mt-1 w-full p-2 border rounded"
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </div>

            {/* Equipment Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Equipment</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={readOnly}
                  />
                  <span className="text-sm">Wetsuit</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={readOnly}
                  />
                  <span className="text-sm">Drysuit</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={readOnly}
                  />
                  <span className="text-sm">Hood</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    disabled={readOnly}
                  />
                  <span className="text-sm">Gloves</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-600 mb-2">Notes & Comments</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border rounded-lg min-h-[100px]"
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default LogbookEntry;