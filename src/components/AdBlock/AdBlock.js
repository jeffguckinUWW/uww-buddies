import React, { useState, useEffect } from 'react';

const AdBlock = ({ ads = [], interval = 3000, title = '' }) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % ads.length);
    }, interval);

    return () => clearInterval(timer);
  }, [ads.length, interval]);

  if (ads.length === 0) return null;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <img
        src={ads[currentAdIndex]}
        alt={`Advertisement ${currentAdIndex + 1}`}
        className="w-full h-auto rounded-lg shadow-md"
      />
      
      {/* Navigation dots - only show if there's more than one ad */}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          {ads.map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentAdIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentAdIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdBlock;