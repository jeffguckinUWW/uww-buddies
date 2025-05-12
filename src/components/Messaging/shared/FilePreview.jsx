// src/components/Messaging/shared/FilePreview.jsx

import React, { useState } from 'react';
import { File, FileText, Image, Video, Music, Download } from 'lucide-react';

const FilePreview = ({ fileAttachment, isSmallScreen = false }) => {
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
    const iconSize = isSmallScreen ? 28 : 24;
    
    if (type.startsWith('image/')) return <Image size={iconSize} />;
    if (type.startsWith('video/')) return <Video size={iconSize} />;
    if (type.startsWith('audio/')) return <Music size={iconSize} />;
    if (type.includes('pdf')) return <FileText size={iconSize} />;
    return <File size={iconSize} />;
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
            className={`absolute bottom-2 right-2 bg-black/60 text-white ${
              isSmallScreen ? 'p-2' : 'p-1'
            } rounded-full hover:bg-black/80 touch-target no-tap-highlight`}
            title="Download image"
            aria-label="Download image"
          >
            <Download size={isSmallScreen ? 20 : 16} />
          </a>
        </div>
      ) : isMedia ? (
        <div className="max-w-full">
          {type.startsWith('video/') && (
            <div className="relative">
              <video 
                controls 
                className="max-w-full max-h-64 rounded"
                controlsList="nodownload" 
                playsInline
              >
                <source src={url} type={type} />
                Your browser does not support the video tag.
              </video>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                className={`absolute bottom-2 right-2 bg-black/60 text-white ${
                  isSmallScreen ? 'p-2' : 'p-1'
                } rounded-full hover:bg-black/80 touch-target no-tap-highlight`}
                title="Download video"
                aria-label="Download video"
              >
                <Download size={isSmallScreen ? 20 : 16} />
              </a>
            </div>
          )}
          {type.startsWith('audio/') && (
            <div className="max-w-full relative">
              <audio controls className="max-w-full rounded w-full bg-gray-100 p-2">
                <source src={url} type={type} />
                Your browser does not support the audio tag.
              </audio>
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                className="inline-flex items-center mt-1 text-blue-500 no-tap-highlight"
                title="Download audio"
                aria-label="Download audio"
              >
                <Download size={16} className="mr-1" />
                <span className="text-sm">Download</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`flex items-center gap-2 ${
            isSmallScreen ? 'p-4' : 'p-3'
          } bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors touch-target no-tap-highlight`}
          download
          aria-label={`Download ${name}`}
        >
          <div className="text-gray-500">
            {getFileIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-700 truncate">{name}</div>
            <div className="text-xs text-gray-500">{formatSize(size)}</div>
          </div>
          <Download size={isSmallScreen ? 20 : 16} className="text-gray-400" />
        </a>
      )}
    </div>
  );
};

export default FilePreview;