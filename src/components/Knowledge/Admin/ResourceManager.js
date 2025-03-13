import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { 
  Plus, Edit, Trash2, FileText, Globe, 
  Image as ImageIcon, Download,
  Info, AlertTriangle, CheckCircle2, ExternalLink
} from 'lucide-react';

const ResourceManager = ({
  learningResources,
  setLearningResources,
  db,
  storage,
  user
}) => {
  // Learning Resources states
  const [showNewResourceModal, setShowNewResourceModal] = useState(false);
  const [showEditResourceModal, setShowEditResourceModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [newResourceData, setNewResourceData] = useState({
    title: '',
    description: '',
    category: 'Dive Physics',
    icon: 'book',
    content: '',
    contentType: 'markdown',
    imageUrl: null,
    author: '',
    certificationLevel: 'all',
    downloadUrl: '',
    relatedResources: []
  });
  
  // Image upload states
  const [uploadProgress, setUploadProgress] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResourceImageUpload = (file) => {
    if (!file) return;
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `resource_images/${Date.now()}_${file.name}`);
    
    // Start the upload task
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Set initial progress
    setUploadProgress(prev => ({
      ...prev,
      resourceImage: 0
    }));
    
    // Listen for state changes, errors, and completion
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Get upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({
          ...prev,
          resourceImage: progress
        }));
      },
      (error) => {
        console.error('Error uploading image:', error);
        setUploadProgress(prev => ({
          ...prev,
          resourceImage: null
        }));
      },
      () => {
        // Upload completed, get download URL
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          // Save the image URL to the resource
          setNewResourceData({
            ...newResourceData,
            imageUrl: downloadURL
          });
          
          // Clear the progress when done
          setUploadProgress(prev => ({
            ...prev,
            resourceImage: null
          }));
        });
      }
    );
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `resource_files/${Date.now()}_${file.name}`);
    
    // Start the upload task
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Set initial progress
    setUploadProgress(prev => ({
      ...prev,
      resourceFile: 0
    }));
    
    // Listen for state changes, errors, and completion
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Get upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(prev => ({
          ...prev,
          resourceFile: progress
        }));
      },
      (error) => {
        console.error('Error uploading file:', error);
        setUploadProgress(prev => ({
          ...prev,
          resourceFile: null
        }));
      },
      () => {
        // Upload completed, get download URL
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          // Save the file URL to the resource
          setNewResourceData({
            ...newResourceData,
            downloadUrl: downloadURL
          });
          
          // Clear the progress when done
          setUploadProgress(prev => ({
            ...prev,
            resourceFile: null
          }));
        });
      }
    );
  };

  const validateResource = () => {
    // Check if title is empty
    if (!newResourceData.title.trim()) {
      alert('Please enter a resource title');
      return false;
    }

    // Check if content is empty
    if (!newResourceData.content.trim() && !newResourceData.imageUrl && !newResourceData.downloadUrl) {
      alert('Please add some content, an image, or a downloadable file');
      return false;
    }

    return true;
  };

  const handleCreateResource = async () => {
    if (!validateResource()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate ID from title
      const resourceId = newResourceData.title.toLowerCase().replace(/\s+/g, '-');
      
      // Create resource document
      await setDoc(doc(db, 'learningResources', resourceId), {
        id: resourceId,
        title: newResourceData.title,
        description: newResourceData.description,
        category: newResourceData.category,
        icon: newResourceData.icon,
        content: newResourceData.content,
        contentType: newResourceData.contentType,
        imageUrl: newResourceData.imageUrl,
        author: newResourceData.author || user.email,
        certificationLevel: newResourceData.certificationLevel,
        downloadUrl: newResourceData.downloadUrl,
        relatedResources: newResourceData.relatedResources || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        viewCount: 0
      });

      // Add to local state
      setLearningResources([
        ...learningResources,
        {
          id: resourceId,
          title: newResourceData.title,
          description: newResourceData.description,
          category: newResourceData.category,
          icon: newResourceData.icon,
          content: newResourceData.content,
          contentType: newResourceData.contentType,
          imageUrl: newResourceData.imageUrl,
          author: newResourceData.author || user.email,
          certificationLevel: newResourceData.certificationLevel,
          downloadUrl: newResourceData.downloadUrl,
          relatedResources: newResourceData.relatedResources || [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          viewCount: 0
        }
      ]);

      // Reset form
      setNewResourceData({
        title: '',
        description: '',
        category: 'Dive Physics',
        icon: 'book',
        content: '',
        contentType: 'markdown',
        imageUrl: null,
        author: '',
        certificationLevel: 'all',
        downloadUrl: '',
        relatedResources: []
      });
      
      setShowNewResourceModal(false);
    } catch (err) {
      console.error('Error creating resource:', err);
      alert('Error creating resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateResource = async () => {
    if (!validateResource()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!selectedResource) return;
      
      // Update resource document
      await updateDoc(doc(db, 'learningResources', selectedResource.id), {
        title: newResourceData.title,
        description: newResourceData.description,
        category: newResourceData.category,
        icon: newResourceData.icon,
        content: newResourceData.content,
        contentType: newResourceData.contentType,
        imageUrl: newResourceData.imageUrl,
        author: newResourceData.author,
        certificationLevel: newResourceData.certificationLevel,
        downloadUrl: newResourceData.downloadUrl,
        relatedResources: newResourceData.relatedResources,
        updatedAt: Timestamp.now()
      });

      // Update local state
      setLearningResources(learningResources.map(resource => {
        if (resource.id === selectedResource.id) {
          return {
            ...resource,
            title: newResourceData.title,
            description: newResourceData.description,
            category: newResourceData.category,
            icon: newResourceData.icon,
            content: newResourceData.content,
            contentType: newResourceData.contentType,
            imageUrl: newResourceData.imageUrl,
            author: newResourceData.author,
            certificationLevel: newResourceData.certificationLevel,
            downloadUrl: newResourceData.downloadUrl,
            relatedResources: newResourceData.relatedResources,
            updatedAt: Timestamp.now()
          };
        }
        return resource;
      }));

      setShowEditResourceModal(false);
      setSelectedResource(null);
    } catch (err) {
      console.error('Error updating resource:', err);
      alert('Error updating resource. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      // Delete the resource
      await deleteDoc(doc(db, 'learningResources', resourceId));

      // Update local state
      setLearningResources(learningResources.filter(resource => resource.id !== resourceId));
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert('Error deleting resource. Please try again.');
    }
  };

  const handleEditResource = (resource) => {
    setSelectedResource(resource);
    setNewResourceData({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      icon: resource.icon || 'book',
      content: resource.content,
      contentType: resource.contentType || 'markdown',
      imageUrl: resource.imageUrl,
      author: resource.author,
      certificationLevel: resource.certificationLevel || 'all',
      downloadUrl: resource.downloadUrl || '',
      relatedResources: resource.relatedResources || []
    });
    setShowEditResourceModal(true);
  };

  const getFormattedDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp instanceof Timestamp ? 
        timestamp.toDate() : 
        timestamp instanceof Date ? 
          timestamp : 
          new Date(timestamp);
      
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Invalid date';
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Learning Resources</h3>
          <Button 
            onClick={() => {
              setNewResourceData({
                title: '',
                description: '',
                category: 'Dive Physics',
                icon: 'book',
                content: '',
                contentType: 'markdown',
                imageUrl: null,
                author: user.email,
                certificationLevel: 'all',
                downloadUrl: '',
                relatedResources: []
              });
              setShowNewResourceModal(true);
            }}
            className="flex items-center gap-2 text-sm sm:text-base"
            size="sm"
          >
            <Plus size={16} /> 
            <span className="hidden sm:inline">Add Resource</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {learningResources.map(resource => (
            <div key={resource.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {resource.imageUrl && (
                  <div className="w-full sm:w-1/4 max-w-xs">
                    <img 
                      src={resource.imageUrl} 
                      alt={resource.title}
                      className="w-full h-32 sm:h-full object-cover"
                    />
                  </div>
                )}
                <div className={`p-3 sm:p-4 flex-grow ${resource.imageUrl ? 'sm:w-3/4' : 'w-full'}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="pr-10 sm:pr-0">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900">{resource.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mt-1 mb-2">
                        {resource.description}
                      </p>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center">
                          {resource.category}
                        </span>
                        <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {getResourceIconComponent(resource.contentType)}
                          <span className="ml-1">
                            {resource.contentType.charAt(0).toUpperCase() + resource.contentType.slice(1)}
                          </span>
                        </span>
                        {resource.downloadUrl && (
                          <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <Download size={12} className="mr-1" />
                            Downloadable
                          </span>
                        )}
                        {resource.certificationLevel && resource.certificationLevel !== 'all' && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                            {resource.certificationLevel.charAt(0).toUpperCase() + resource.certificationLevel.slice(1)} Level
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-3">
                        <span>By {resource.author || 'Unknown'}</span>
                        <span>Created {getFormattedDate(resource.createdAt)}</span>
                        <span>{resource.viewCount || 0} views</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex space-x-2">
                  <button 
                    onClick={() => handleEditResource(resource)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    aria-label={`Edit ${resource.title}`}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteResource(resource.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    aria-label={`Delete ${resource.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {learningResources.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText size={36} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No learning resources available. Create your first resource!</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Learning Resource Modal */}
      <Dialog open={showNewResourceModal || showEditResourceModal} onOpenChange={() => {
        setShowNewResourceModal(false);
        setShowEditResourceModal(false);
      }}>
        <DialogContent className="bg-white p-0 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="border-b p-4 bg-white rounded-t-lg sticky top-0 z-10 flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold">
              {showNewResourceModal ? 'Add New Learning Resource' : 'Edit Learning Resource'}
            </DialogTitle>
            <DialogClose className="h-6 w-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800">
              ×
            </DialogClose>
          </div>
          <div className="p-5 overflow-y-auto flex-grow space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newResourceData.title}
                  onChange={(e) => setNewResourceData({...newResourceData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Understanding Dive Tables"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newResourceData.description}
                  onChange={(e) => setNewResourceData({...newResourceData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  placeholder="Brief description of this resource"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newResourceData.category}
                    onChange={(e) => setNewResourceData({...newResourceData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Dive Physics">Dive Physics</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Marine Life">Marine Life</option>
                    <option value="Safety Procedures">Safety Procedures</option>
                    <option value="Navigation">Navigation</option>
                    <option value="Dive Planning">Dive Planning</option>
                    <option value="Environment">Environment</option>
                    <option value="Techniques">Techniques</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <select
                    value={newResourceData.icon}
                    onChange={(e) => setNewResourceData({...newResourceData, icon: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="book">Book</option>
                    <option value="compass">Compass</option>
                    <option value="flask">Flask</option>
                    <option value="droplet">Droplet</option>
                    <option value="thermometer">Thermometer</option>
                    <option value="waves">Waves</option>
                    <option value="shield-alert">Shield Alert</option>
                    <option value="anchor">Anchor</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Type
                  </label>
                  <select
                    value={newResourceData.contentType}
                    onChange={(e) => setNewResourceData({...newResourceData, contentType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="image">Image URL</option>
                    <option value="iframe">Embed (iframe)</option>
                    <option value="text">Plain Text</option>
                  </select>
                  <div className="flex items-center text-xs text-blue-600 mt-1">
                    <Info size={12} className="mr-1" />
                    <span>
                      {newResourceData.contentType === 'markdown' ? 
                        'Supports formatting like **bold** and *italic*' : 
                        newResourceData.contentType === 'html' ? 
                          'Supports HTML tags for formatting' : 
                          newResourceData.contentType === 'iframe' ? 
                            'For embedding videos or other content' : 
                            'Simple text content'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certification Level
                  </label>
                  <select
                    value={newResourceData.certificationLevel}
                    onChange={(e) => setNewResourceData({...newResourceData, certificationLevel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>
              
              {/* Featured Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image (optional)
                </label>
                {newResourceData.imageUrl ? (
                  <div className="relative">
                    <img 
                      src={newResourceData.imageUrl} 
                      alt="Featured" 
                      className="w-full h-40 object-cover rounded-md mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => setNewResourceData({...newResourceData, imageUrl: null})}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      aria-label="Remove image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center">
                      <input
                        type="file"
                        accept="image/*"
                        id="resource-image-upload"
                        className="hidden"
                        onChange={(e) => handleResourceImageUpload(e.target.files[0])}
                      />
                      <label
                        htmlFor="resource-image-upload"
                        className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center text-sm"
                      >
                        <ImageIcon size={16} className="mr-2" />
                        Select Image
                      </label>
                    </div>
                    {uploadProgress.resourceImage != null && (
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${uploadProgress.resourceImage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(uploadProgress.resourceImage)}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                  {newResourceData.contentType === 'markdown' && (
                    <span className="text-xs text-blue-600 ml-2">
                      (Supports Markdown formatting)
                    </span>
                  )}
                  {newResourceData.contentType === 'iframe' && (
                    <span className="text-xs text-blue-600 ml-2 flex items-center">
                      <ExternalLink size={12} className="mr-1" />
                      (Enter embed URL or full iframe code)
                    </span>
                  )}
                </label>
                <textarea
                  value={newResourceData.content}
                  onChange={(e) => setNewResourceData({...newResourceData, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  rows="10"
                  placeholder={
                    newResourceData.contentType === 'markdown' 
                      ? "# Title\nContent with **bold** and *italic* text" 
                      : newResourceData.contentType === 'html'
                      ? "<h1>Title</h1><p>Your content here</p>"
                      : newResourceData.contentType === 'image'
                      ? "https://example.com/image.jpg"
                      : newResourceData.contentType === 'iframe'
                      ? "https://www.youtube.com/embed/12345"
                      : "Your content here"
                  }
                />
                {newResourceData.contentType === 'iframe' && (
                  <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
                    <AlertTriangle size={16} className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      For YouTube videos, use the format: <code className="bg-yellow-100 px-1 py-0.5 rounded">https://www.youtube.com/embed/VIDEO_ID</code>
                    </p>
                  </div>
                )}
              </div>
              
              {/* Downloadable File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Downloadable File (optional)
                </label>
                {newResourceData.downloadUrl ? (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <Download size={18} className="text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate max-w-xs">
                        {newResourceData.downloadUrl.split('/').pop()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewResourceData({...newResourceData, downloadUrl: ''})}
                      className="text-red-500 hover:text-red-600 p-1"
                      aria-label="Remove downloadable file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center">
                      <input
                        type="file"
                        id="resource-file-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files[0])}
                      />
                      <label
                        htmlFor="resource-file-upload"
                        className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center text-sm"
                      >
                        <Download size={16} className="mr-2" />
                        Select File
                      </label>
                    </div>
                    {uploadProgress.resourceFile != null && (
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${uploadProgress.resourceFile}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(uploadProgress.resourceFile)}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Upload PDF, DOCX, or other files that users can download
                </p>
              </div>
              
              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={newResourceData.author}
                  onChange={(e) => setNewResourceData({...newResourceData, author: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={user.email}
                />
              </div>
            </div>
          </div>
            
          <div className="flex justify-between p-4 space-x-3 border-t sticky bottom-0 bg-white mt-auto">
            <div className="flex items-center">
              {!newResourceData.content && !newResourceData.imageUrl && !newResourceData.downloadUrl && (
                <div className="flex items-center text-amber-600 text-xs">
                  <AlertTriangle size={14} className="mr-1" />
                  <span>Add content, image, or file</span>
                </div>
              )}
              {(newResourceData.content || newResourceData.imageUrl || newResourceData.downloadUrl) && (
                <div className="flex items-center text-green-600 text-xs">
                  <CheckCircle2 size={14} className="mr-1" />
                  <span>Resource has content</span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewResourceModal(false);
                  setShowEditResourceModal(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={showNewResourceModal ? handleCreateResource : handleUpdateResource}
                disabled={isSubmitting || (!newResourceData.content && !newResourceData.imageUrl && !newResourceData.downloadUrl)}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {showNewResourceModal ? 'Creating...' : 'Updating...'}
                  </span>
                ) : (
                  showNewResourceModal ? 'Create Resource' : 'Update Resource'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper function to render resource content type icon
const getResourceIconComponent = (contentType) => {
  switch (contentType) {
    case 'html':
      return <Globe size={12} className="flex-shrink-0" />;
    case 'image':
      return <ImageIcon size={12} className="flex-shrink-0" />;
    case 'iframe':
      return <Globe size={12} className="flex-shrink-0" />;
    case 'markdown':
      return <FileText size={12} className="flex-shrink-0" />;
    default:
      return <FileText size={12} className="flex-shrink-0" />;
  }
};

export default ResourceManager;