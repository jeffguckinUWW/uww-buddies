// src/components/Knowledge/LearningResources.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Book, Compass, Info, Droplet, Thermometer, 
  Waves, Shield, Anchor, Filter, ChevronRight, ArrowLeft
} from 'lucide-react';

// Resource Card Component
const ResourceCard = ({ title, description, icon, category, onClick }) => {
  const IconComponent = () => {
    switch (icon) {
      case 'book': return <Book size={24} className="text-blue-500" />;
      case 'compass': return <Compass size={24} className="text-blue-500" />;
      case 'flask': return <Info size={24} className="text-blue-500" />; // Replaced Flask with Info
      case 'droplet': return <Droplet size={24} className="text-blue-500" />;
      case 'thermometer': return <Thermometer size={24} className="text-blue-500" />;
      case 'waves': return <Waves size={24} className="text-blue-500" />;
      case 'shield-alert': return <Shield size={24} className="text-blue-500" />;
      case 'anchor': return <Anchor size={24} className="text-blue-500" />;
      default: return <Book size={24} className="text-blue-500" />;
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="p-2 bg-blue-50 rounded-lg mr-4">
          <IconComponent />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mb-1 line-clamp-2">{description}</p>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full inline-block">
            {category}
          </span>
        </div>
        <ChevronRight size={20} className="text-gray-400 self-center" />
      </div>
    </div>
  );
};

// Learning Resources Component
const LearningResources = () => {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResources = async () => {
      try {
        // Fetch resources from Firestore
        const resourcesCollection = collection(db, 'learningResources');
        const resourceSnapshot = await getDocs(resourcesCollection);
        
        const resourcesData = resourceSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Extract unique categories
        const uniqueCategories = [...new Set(resourcesData.map(resource => resource.category))];
        
        setResources(resourcesData);
        setCategories(uniqueCategories);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching resources:', error);
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const handleResourceClick = (resourceId) => {
    navigate(`/knowledge/resources/${resourceId}`);
  };

  // Filter resources based on search query and category
  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || resource.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center mb-4">
        <button 
          className="mr-2 p-2 hover:bg-gray-100 rounded-full"
          onClick={() => navigate('/knowledge')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Learning Resources</h1>
      </div>
      
      <p className="text-gray-600 mb-6">
        Expand your diving knowledge with these comprehensive guides and references.
      </p>
      
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search resources..."
          />
        </div>
        
        <div className="sm:w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Resources List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredResources.map(resource => (
            <ResourceCard 
              key={resource.id}
              title={resource.title}
              description={resource.description}
              icon={resource.icon}
              category={resource.category}
              onClick={() => handleResourceClick(resource.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <Book size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">
            {searchQuery || selectedCategory !== 'all' 
              ? 'No resources match your search criteria. Try adjusting your filters.'
              : 'No learning resources available yet. Check back soon!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LearningResources;