import React, { useRef, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const FileUpload = ({ onFileSelect, children, isSmallScreen = false }) => {
  const fileInputRef = useRef(null);
  const [isTouched, setIsTouched] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 10MB');
      return;
    }

    onFileSelect(file);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  // Touch event handlers for mobile feedback
  const handleTouchStart = () => {
    setIsTouched(true);
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />
      <div 
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`${isTouched ? 'opacity-80' : 'opacity-100'} transition-opacity ${
          isSmallScreen ? 'touch-target' : ''
        } no-tap-highlight`}
        role="button"
        aria-label="Attach file"
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
};

export default FileUpload;