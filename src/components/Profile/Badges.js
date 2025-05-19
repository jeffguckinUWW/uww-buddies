import React from 'react';

const CERTIFICATION_BADGES = {
  "Student Diver": "Student.png",
  "SCUBA Diver": "SCUBA.png",
  "Advanced SCUBA Diver": "Advanced.png",
  "Rescue Diver": "Rescue.png",
  "Advanced Rescue Diver": "AdvancedRescue.png",
  "Master SCUBA Diver": "Master.png",
  "Divemaster": "Master.png",
  "Assistant Instructor": "Master.png",
  "Instructor": "Master.png"
};

const SPECIALTY_BADGES = {
  "Nitrox Diver": "Nitrox.png",
  "Deep Diver": "Deep.png",
  "Underwater Navigator": "Navigator.png",
  "Solo Diver": "Solo.png",
  "Drysuit Diver": "Drysuit.png",
  "First Aid/CPR": "FirstAid.png",
  "Emergency Oxygen Provider": "O2.png",
  "Equipment Specialist": "Equipment.png",
  "Night Diver": "Night.png",
  "Wreck Diver": "Wreck.png"
};

// Updated dive count badges with new values
const DIVE_COUNT_BADGES = [
  { count: 500, image: "500.png" },
  { count: 450, image: "450.png" },
  { count: 400, image: "400.png" },
  { count: 350, image: "350.png" },
  { count: 300, image: "300.png" },
  { count: 250, image: "250.png" },
  { count: 200, image: "200.png" },
  { count: 150, image: "150.png" },
  { count: 100, image: "100.png" },
  { count: 75, image: "75.png" },
  { count: 50, image: "50.png" },
  { count: 25, image: "25.png" },
  { count: 15, image: "15.png" },
  { count: 10, image: "10.png" },
  { count: 5, image: "5.png" }
];

const Badge = ({ name, imageName, description, size = "full", responsive = false }) => {
  // Size classes for different display contexts
  const sizeClasses = {
    tiny: "w-10 h-10",    
    small: "w-14 h-14",   
    medium: "w-16 h-16",    
    large: "w-20 h-20",     
    full: "w-24 h-24"       
  };
  
  // Add responsive size option that adapts to screen size
  const responsiveClass = "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20";
  
  const sizeClass = responsive ? responsiveClass : (sizeClasses[size] || sizeClasses.full);

  return (
    <div className="relative group">
      {/* Removed blue circular background - the badge itself is the main element */}
      <div className={`rounded-full overflow-hidden ${sizeClass}`}>
        <img 
          src={`/images/badges/${imageName}`}
          alt={name}
          className="w-full h-full object-contain" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/images/badges/placeholder.png";
          }}
        />
      </div>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-50">
        <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
          <strong>{name}</strong>
          {description && (
            <div className="text-gray-300 text-xs font-light">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const BadgeSection = ({ title, badges, showTitle = true, size, gridLayout = false }) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className={showTitle ? "mb-4" : "inline"}>
      {showTitle && (
        <h4 className="text-xs font-medium text-gray-700 mb-2">{title}</h4>
      )}
      <div className={gridLayout 
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" 
        : "flex flex-wrap gap-3"}>
        {badges.map((badge, index) => (
          <Badge
            key={index}
            name={badge.name}
            imageName={badge.image}
            description={badge.description}
            size={size}
          />
        ))}
      </div>
    </div>
  );
};

const Badges = ({ 
  certificationLevel, 
  specialties = [], 
  numberOfDives = 0,
  size = "full", // "tiny", "small", "medium", "large", or "full"
  showSections = true, // whether to show section titles and separate sections
  gridLayout = false, // whether to use grid layout for badges
  responsive = false // whether to use responsive sizing
}) => {
  // Get certification badges
  const certificationBadges = certificationLevel && CERTIFICATION_BADGES[certificationLevel] 
    ? [{
        name: certificationLevel,
        image: CERTIFICATION_BADGES[certificationLevel],
        description: `Certified ${certificationLevel}`
      }]
    : [];

  // Get specialty badges
  const specialtyBadges = specialties
    .filter(specialty => SPECIALTY_BADGES[specialty])
    .map(specialty => ({
      name: specialty,
      image: SPECIALTY_BADGES[specialty],
      description: `Certified ${specialty}`
    }));

  // Get dive count badge (only get the highest achieved)
  // Don't show any badge for less than 5 dives
  const diveCountBadge = numberOfDives >= 5 
    ? DIVE_COUNT_BADGES.find(badge => numberOfDives >= badge.count)
    : null;
    
  const diveCountBadges = diveCountBadge 
    ? [{
        name: diveCountBadge.count === 500 && numberOfDives > 500 
          ? `${diveCountBadge.count}+ Dives` 
          : `${diveCountBadge.count} Dives`,
        image: diveCountBadge.image,
        description: diveCountBadge.count === 500 && numberOfDives > 500
          ? `Completed ${diveCountBadge.count}+ dives`
          : `Completed ${diveCountBadge.count} dives`
      }]
    : [];

  if (certificationBadges.length === 0 && specialtyBadges.length === 0 && diveCountBadges.length === 0) {
    return null;
  }

  // If showing full sections with titles
  if (showSections) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Achievements</h3>
        <BadgeSection 
          title="Certification Level" 
          badges={certificationBadges} 
          size={size} 
          gridLayout={gridLayout} 
        />
        <BadgeSection 
          title="Specialties" 
          badges={specialtyBadges} 
          size={size}
          gridLayout={gridLayout} 
        />
        <BadgeSection 
          title="Experience" 
          badges={diveCountBadges} 
          size={size}
          gridLayout={gridLayout} 
        />
      </div>
    );
  }

  // Compact display for mini version - improved spacing
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {certificationBadges.length > 0 && (
        <BadgeSection 
          badges={certificationBadges} 
          showTitle={false} 
          size={size} 
        />
      )}
      {specialtyBadges.length > 0 && (
        <BadgeSection 
          badges={specialtyBadges} 
          showTitle={false} 
          size={size} 
        />
      )}
      {diveCountBadges.length > 0 && (
        <BadgeSection 
          badges={diveCountBadges} 
          showTitle={false} 
          size={size} 
        />
      )}
    </div>
  );
};

export default Badges;