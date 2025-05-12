import React from 'react';

const CERTIFICATION_BADGES = {
  "Student Diver": "Student.png",
  "SCUBA Diver": "SCUBA.png",
  "Advanced SCUBA Diver": "Advanced.png",
  "Rescue Diver": "Rescue.png",
  "Advanced Rescue Diver": "Rescue.png",
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
  "Drysuit Diver": "Drysuit.png"
};

const DIVE_COUNT_BADGES = [
  { count: 1000, image: "1000.png" },
  { count: 900, image: "900.png" },
  { count: 800, image: "800.png" },
  { count: 700, image: "700.png" },
  { count: 600, image: "600.png" },
  { count: 500, image: "500.png" },
  { count: 400, image: "400.png" },
  { count: 350, image: "350.png" },
  { count: 300, image: "300.png" },
  { count: 250, image: "250.png" },
  { count: 200, image: "200.png" },
  { count: 150, image: "150.png" },
  { count: 100, image: "100.png" },
  { count: 75, image: "75.png" },
  { count: 50, image: "50.png" },
  { count: 25, image: "25.png" }
];

const Badge = ({ name, imageName, description, size = "full" }) => {
  // Size classes for different display contexts - refined for more compact mobile display
  const sizeClasses = {
    tiny: "w-7 h-7 p-0.5",
    small: "w-8 h-8 p-0.5",
    medium: "w-10 h-10 p-1",
    large: "w-12 h-12 p-1",
    full: "w-14 h-14 p-1"
  }[size];

  return (
    <div className="relative group">
      <div className={`rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-colors border border-blue-100 ${sizeClasses}`}>
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
      {/* Improved tooltip that's more subtle */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block z-50">
        <div className="bg-gray-800 text-white text-xs rounded py-0.5 px-1.5 whitespace-nowrap shadow-lg">
          {name}
          {description && (
            <div className="text-gray-300 text-xs font-light">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const BadgeSection = ({ title, badges, showTitle = true, size }) => {
  if (!badges || badges.length === 0) return null;

  return (
    <div className={showTitle ? "mb-4" : "inline"}>
      {showTitle && (
        <h4 className="text-xs font-medium text-gray-700 mb-2">{title}</h4>
      )}
      <div className="flex flex-wrap gap-1.5">
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
  showSections = true // whether to show section titles and separate sections
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
  const diveCountBadge = DIVE_COUNT_BADGES
    .find(badge => numberOfDives >= badge.count);
    
  const diveCountBadges = diveCountBadge 
    ? [{
        name: `${diveCountBadge.count}+ Dives`,
        image: diveCountBadge.image,
        description: `Completed ${diveCountBadge.count}+ dives`
      }]
    : [];

  if (certificationBadges.length === 0 && specialtyBadges.length === 0 && diveCountBadges.length === 0) {
    return null;
  }

  if (showSections) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Achievements</h3>
        <BadgeSection title="Certification Level" badges={certificationBadges} size={size} />
        <BadgeSection title="Specialties" badges={specialtyBadges} size={size} />
        <BadgeSection title="Experience" badges={diveCountBadges} size={size} />
      </div>
    );
  }

  // Compact display for mini version - improved spacing
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {certificationBadges.length > 0 && (
        <BadgeSection badges={certificationBadges} showTitle={false} size={size} />
      )}
      {specialtyBadges.length > 0 && (
        <BadgeSection badges={specialtyBadges} showTitle={false} size={size} />
      )}
      {diveCountBadges.length > 0 && (
        <BadgeSection badges={diveCountBadges} showTitle={false} size={size} />
      )}
    </div>
  );
};

export default Badges;