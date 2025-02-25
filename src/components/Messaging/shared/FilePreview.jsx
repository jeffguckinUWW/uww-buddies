// src/components/Messaging/shared/FilePreview.jsx

import React, { useState } from 'react';
import { File, FileText, Image, Video, Music, Download } from 'lucide-react';

const FilePreview = ({ fileAttachment }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!fileAttachment) return null;

  const { name, url, type, size } = fileAttachment;
  
  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file icon based on mime type
  const getFileIcon = () => {
    if (type.startsWith('image/')) return <Image size={24} />;
    if (type.startsWith('video/')) return <Video size={24} />;
    if (type.startsWith('audio/')) return <Music size={24} />;
    if (type.includes('pdf')) return <FileText size={24} />;
    return <File size={24} />;
  };

  // Check if file is an image
  const isImage = type.startsWith('image/') && !imageError;
  
  // Check if file is video or audio
  const isMedia = type.startsWith('video/') || type.startsWith('audio/');

  return (
    <div className="mt-2 max-w-full">
      {isImage ? (
        <div className="relative overflow-hidden rounded-lg">
          <img 
            src={url} 
            alt={name}
            className="max-w-full max-h-64 object-contain rounded"
            onError={() => setImageError(true)}
          />
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80"
            title="Open in new tab"
          >
            <Download size={16} />
          </a>
        </div>
      ) : isMedia ? (
        <div className="max-w-full">
          {type.startsWith('video/') && (
            <video controls className="max-w-full max-h-64 rounded">
              <source src={url} type={type} />
              Your browser does not support the video tag.
            </video>
          )}
          {type.startsWith('audio/') && (
            <audio controls className="max-w-full">
              <source src={url} type={type} />
              Your browser does not support the audio tag.
            </audio>
          )}
        </div>
      ) : (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
        >
          <div className="text-gray-500">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">{name}</div>
            <div className="text-xs text-gray-500">{formatSize(size)}</div>
          </div>
          <Download size={16} className="text-gray-400" />
        </a>
      )}
    </div>
  );
};

export default FilePreview;