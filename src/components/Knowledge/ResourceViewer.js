// src/components/Knowledge/ResourceViewer.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Book, Bookmark, Share2, Printer, 
  Download, ThumbsUp, MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import ReactMarkdown from 'react-markdown';

const ResourceViewer = () => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const { resourceId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const resourceRef = doc(db, 'learningResources', resourceId);
        const resourceSnap = await getDoc(resourceRef);
        
        if (resourceSnap.exists()) {
          setResource(resourceSnap.data());
        } else {
          setError('Resource not found');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching resource:', err);
        setError('Failed to load resource');
        setLoading(false);
      }
    };

    fetchResource();
  }, [resourceId]);

  const handleBookmark = () => {
    // In a real implementation, this would save to the user's bookmarks in Firestore
    setBookmarked(!bookmarked);
  };

  const handleShare = () => {
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: resource.title,
        text: resource.description,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Function to render content based on type
  const renderContent = () => {
    const content = resource.content;
    
    if (!content) return null;
    
    switch (resource.contentType) {
      case 'markdown':
        return (
          <div className="prose max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        );
      case 'html':
        return <div dangerouslySetInnerHTML={{ __html: content }} />;
      case 'image':
        return (
          <div className="flex justify-center">
            <img 
              src={content} 
              alt={resource.title} 
              className="max-w-full rounded-lg shadow-md"
            />
          </div>
        );
      case 'iframe':
        return (
          <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
            <iframe 
              src={content} 
              title={resource.title}
              className="w-full h-full border-0" 
              allowFullScreen
            ></iframe>
          </div>
        );
      default:
        return <p className="text-gray-700">{content}</p>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="flex-1 p-4">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <p className="text-red-600">{error || 'Resource not available'}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => navigate('/knowledge/resources')}
          >
            Back to Resources
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 max-w-4xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center mb-4">
        <button 
          className="mr-2 p-2 hover:bg-gray-100 rounded-full"
          onClick={() => navigate('/knowledge/resources')}
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-gray-500">
          Learning Resources / {resource.category}
        </span>
      </div>
      
      {/* Article Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{resource.title}</h1>
        
        <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4 gap-4">
          {resource.author && (
            <span>By {resource.author}</span>
          )}
          {resource.updatedAt && (
            <span>Updated: {formatDate(resource.updatedAt)}</span>
          )}
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
            {resource.category}
          </span>
        </div>
        
        {resource.description && (
          <p className="text-lg text-gray-600 italic mb-6">{resource.description}</p>
        )}
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBookmark}
            className={bookmarked ? "bg-blue-50" : ""}
          >
            <Bookmark size={16} className={`mr-1 ${bookmarked ? "fill-blue-500 text-blue-500" : ""}`} />
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 size={16} className="mr-1" />
            Share
          </Button>
          
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer size={16} className="mr-1" />
            Print
          </Button>
          
          {resource.downloadUrl && (
            <Button variant="outline" size="sm" as="a" href={resource.downloadUrl} download>
              <Download size={16} className="mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      {/* Featured Image */}
      {resource.imageUrl && (
        <div className="mb-8">
          <img 
            src={resource.imageUrl} 
            alt={resource.title}
            className="w-full rounded-lg shadow-md object-cover max-h-96"
          />
        </div>
      )}
      
      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        {renderContent()}
      </div>
      
      {/* Related Resources */}
      {resource.relatedResources && resource.relatedResources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Related Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resource.relatedResources.map((relatedId, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/knowledge/resources/${relatedId}`)}
              >
                <div className="flex items-center">
                  <Book size={18} className="text-blue-500 mr-2" />
                  <span className="text-blue-600 hover:underline">
                    {relatedId} 
                    {/* In a real implementation, you'd fetch the title */}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Feedback & Engagement */}
      <div className="border-t border-gray-200 pt-4 flex flex-wrap items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <button className="flex items-center text-gray-600 hover:text-blue-600">
            <ThumbsUp size={16} className="mr-1" />
            Helpful
          </button>
          <button className="flex items-center text-gray-600 hover:text-blue-600">
            <MessageSquare size={16} className="mr-1" />
            Feedback
          </button>
        </div>
        
        <span className="text-gray-500">
          {resource.viewCount 
            ? `${resource.viewCount.toLocaleString()} views` 
            : 'New content'}
        </span>
      </div>
    </div>
  );
};

export default ResourceViewer;