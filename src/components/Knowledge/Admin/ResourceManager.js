import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { 
  Plus, Edit, Trash2, FileText, Globe, 
  Image as ImageIcon, Download, Book
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

  const handleCreateResource = async () => {
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
    }
  };

  const handleUpdateResource = async () => {
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

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Learning Resources</h3>
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
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Add Resource
          </Button>
        </div>
        
        <div className="space-y-4">
          {learningResources.map(resource => (
            <div key={resource.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold">{resource.title}</h4>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-1">
                    {resource.description}
                  </p>
                  <div className="flex mt-2 items-center space-x-4">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {resource.category}
                    </span>
                    <span className="flex items-center text-xs text-gray-600">
                      {getResourceIconComponent(resource.contentType)}
                      <span className="ml-1">
                        {resource.contentType.charAt(0).toUpperCase() + resource.contentType.slice(1)}
                      </span>
                    </span>
                    {resource.downloadUrl && (
                      <span className="flex items-center text-xs text-green-600">
                        <Download size={14} className="mr-1" />
                        Downloadable
                      </span>
                    )}
                  </div>
                  {resource.certificationLevel && resource.certificationLevel !== 'all' && (
                    <span className="inline-block mt-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      {resource.certificationLevel.charAt(0).toUpperCase() + resource.certificationLevel.slice(1)} Level
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditResource(resource)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteResource(resource.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {resource.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={resource.imageUrl} 
                    alt={resource.title}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          ))}
          
          {learningResources.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText size={48} className="mx-auto text-gray-400 mb-3" />
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
        <DialogContent className="bg-white p-0 rounded-lg max-w-3xl max-h-[80vh] overflow-y-auto">
          <div className="border-b p-4 bg-white rounded-t-lg sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">
              {showNewResourceModal ? 'Add New Learning Resource' : 'Edit Learning Resource'}
            </DialogTitle>
          </div>
          <div className="p-6 bg-white space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Title
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
              
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-2 gap-4">
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
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
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
                      className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                    >
                      <ImageIcon size={16} className="mr-2" />
                      Select Image
                    </label>
                    {uploadProgress.resourceImage != null && (
                      <div className="ml-4 flex-1">
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
                    <span className="text-xs text-gray-500 ml-2">
                      (Supports Markdown formatting)
                    </span>
                  )}
                </label>
                <textarea
                  value={newResourceData.content}
                  onChange={(e) => setNewResourceData({...newResourceData, content: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
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
              </div>
              
              {/* Downloadable File */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Downloadable File (optional)
                </label>
                {newResourceData.downloadUrl ? (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      <Download size={18} className="text-green-600 mr-2" />
                      <span className="text-sm text-gray-700 truncate max-w-xs">
                        {newResourceData.downloadUrl.split('/').pop()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewResourceData({...newResourceData, downloadUrl: ''})}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <input
                      type="file"
                      id="resource-file-upload"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                    />
                    <label
                      htmlFor="resource-file-upload"
                      className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
                    >
                      <Download size={16} className="mr-2" />
                      Select File
                    </label>
                    {uploadProgress.resourceFile != null && (
                      <div className="ml-4 flex-1">
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
                  Author (optional)
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
            
            <div className="flex justify-end pt-4 space-x-3 sticky bottom-0 bg-white pb-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewResourceModal(false);
                  setShowEditResourceModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={showNewResourceModal ? handleCreateResource : handleUpdateResource}
                disabled={!newResourceData.title || !newResourceData.content}
              >
                {showNewResourceModal ? 'Create Resource' : 'Update Resource'}
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
      return <Globe size={14} />;
    case 'image':
      return <ImageIcon size={14} />;
    case 'iframe':
      return <Globe size={14} />;
    case 'markdown':
      return <FileText size={14} />;
    default:
      return <FileText size={14} />;
  }
};

export default ResourceManager;