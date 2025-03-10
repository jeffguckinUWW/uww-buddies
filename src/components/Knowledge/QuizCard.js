import React from 'react';
import { 
  Compass, Book, Anchor, Thermometer, Fish, 
  CloudLightning, Mountain, Shell, Map, Award
} from 'lucide-react';

const QuizCard = ({ title, description, iconName, count, onClick }) => {
  // Map icon names to Lucide React components
  const getIcon = (name) => {
    const icons = {
      compass: Compass,
      book: Book,
      anchor: Anchor,
      thermometer: Thermometer,
      fish: Fish,
      weather: CloudLightning,
      topography: Mountain,
      marine: Shell,
      navigation: Map,
      certification: Award
    };
    
    const IconComponent = icons[name?.toLowerCase()] || Book;
    return <IconComponent size={24} className="text-blue-500" />;
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start mb-2">
        <div className="p-2 bg-blue-50 rounded-full mr-3">
          {getIcon(iconName)}
        </div>
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-gray-500">{count} quizzes</p>
        </div>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

export default QuizCard;