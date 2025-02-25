import React, { useRef } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const FileUpload = ({ onFileSelect, children }) => {
  const fileInputRef = useRef(null);

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

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
      />
      <div onClick={handleClick}>
        {children}
      </div>
    </>
  );
};

export default FileUpload;