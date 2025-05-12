import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Droplet, 
  Edit2, 
  Camera, 
  Trash2, 
  Save,
  X, 
  Check,
  UserCircle,
  Clipboard,
  Shield,
  Map,
  Award,
  Settings,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  AlertCircle,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import Badges from './Badges';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import SecuritySettings from '../Auth/SecuritySettings';
import RewardsSection from './RewardsSection';

// TIER_LEVELS definition moved outside component
const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

// Add the loyalty code generator function here
const generateLoyaltyCode = (name, uid) => {
  // Extract last name (or use full name if no space)
  const nameParts = name.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : name;
  
  // Get uppercase version with max 8 chars
  const namePart = lastName.toUpperCase().substring(0, 8);
  
  // Get last 6 chars of UID
  const uidPart = uid.substring(Math.max(0, uid.length - 6));
  
  // Combine name and UID part (no prefix)
  return `${namePart}${uidPart}`;
};

// PROFILE HEADER COMPONENT - FIXED VERSION
const ProfileHeader = ({ 
  profile, 
  photoURL, 
  handleEditClick, 
  isEditing,
  onImageChange,
  onDeletePhoto
}) => {
  return (
    <div className="relative">
      {/* Cover Background with gradient overlay */}
      <div className="h-36 md:h-48 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-t-lg relative overflow-hidden">
        {/* Use the CSS class for background pattern instead of an image */}
        <div className="absolute inset-0 opacity-20 dive-pattern-bg"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/30 mix-blend-overlay"></div>
      </div>
      
      {/* Profile content positioned over the cover */}
      <div className="relative px-4 md:px-8 pb-4 md:pb-6 -mt-20 md:-mt-24">
        <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-6">
          {/* Profile Image with improved error handling */}
          <div className="relative">
  {photoURL && photoURL.trim() !== '' ? (
    <div className="relative">
      {/* Add a key to force re-render when URL changes */}
      <img
        key={photoURL} 
        src={photoURL}
        alt={profile.name || "Profile"}
        className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-3 border-white object-cover shadow-md"
        onError={(e) => {
          // More robust error handling
          console.log("Image failed to load:", photoURL);
          e.target.onerror = null; // Prevent infinite loops
          e.target.style.display = 'none';
          
          // Get the fallback and ensure it's displayed
          try {
            const fallback = e.target.parentNode.querySelector('.fallback-avatar');
            if (fallback) {
              fallback.style.display = 'flex';
            }
          } catch (err) {
            console.error("Error showing fallback:", err);
          }
        }}
      />
      <div 
        className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-3 border-white bg-gradient-to-br from-blue-100 to-blue-50 items-center justify-center shadow-md fallback-avatar"
        style={{display: 'none'}}
      >
        <UserCircle className="h-12 w-12 md:h-16 md:w-16 text-blue-500" />
      </div>
    </div>
  ) : (
    <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl border-3 border-white bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-md">
      <UserCircle className="h-12 w-12 md:h-16 md:w-16 text-blue-500" />
    </div>
  )}
            
            {isEditing ? (
              <div className="absolute -bottom-2 -right-2 flex space-x-1">
                <label className="p-1.5 bg-blue-50 text-blue-700 rounded-full cursor-pointer hover:bg-blue-100 transition-colors shadow-sm border border-blue-200">
                  <Camera className="h-3.5 w-3.5" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={onImageChange} 
                  />
                </label>
                {photoURL && photoURL.trim() !== '' && (
                  <button 
                    onClick={onDeletePhoto}
                    className="p-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100 transition-colors shadow-sm border border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={handleEditClick}
                className="absolute -bottom-2 -right-2 p-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors shadow-sm border border-blue-200"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {/* Name & Basic Info */}
          <div className="flex-1 pt-3 md:pt-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {profile.name || 'New Diver'}
            </h1>
            
            {profile.certificationLevel && (
              <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium my-2 border border-blue-100">
                <Shield className="h-3.5 w-3.5 mr-1" />
                {profile.certificationLevel}
              </div>
            )}
            
            {/* Location & Contact in flex layout */}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
              {!profile.privacySettings?.hideLocation && (profile.city || profile.state) && (
                <div className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  {[profile.city, profile.state].filter(Boolean).join(', ')}
                </div>
              )}
              
              {!profile.privacySettings?.hideEmail && profile.email && (
                <div className="flex items-center">
                  <Mail className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  {profile.email}
                </div>
              )}
              
              {!profile.privacySettings?.hidePhone && profile.phone && (
                <div className="flex items-center">
                  <Phone className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  {profile.phone}
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Stats in cards format - only on desktop */}
          {!profile.privacySettings?.hideStats && profile.divingStats && (
            <div className="hidden md:flex space-x-3">
              <div className="text-center bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <Clipboard className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">Dives</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.divingStats.totalDives || 0}
                </p>
              </div>
              
              <div className="text-center bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <Droplet className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">Max Depth</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.divingStats.maxDepth || 0}ft
                </p>
              </div>
              
              <div className="text-center bg-blue-50 rounded-lg px-3 py-1.5 border border-blue-100">
                <div className="flex items-center justify-center text-blue-600 mb-1">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs font-medium">Hours</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {profile.divingStats.totalTime || 0}h
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// Enhanced ProfileCompletionIndicator with animation and cleaner design
const ProfileCompletionIndicator = ({ profile }) => {
  const calculateCompletion = () => {
    const fields = [
      'name',
      'phone',
      'email',
      'photoURL',
      'bio',
      'city',
      'state',
      'certificationLevel',
      'favoritePlace',
      'emergencyContact.name'
    ];
    
    const completedFields = fields.filter(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return profile[parent]?.[child];
      }
      return profile[field];
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const completion = calculateCompletion();
  
  // If completion is 100%, don't render anything
  if (completion === 100) {
    return null;
  }
  
  // Determine color based on completion percentage
  const getColorClass = () => {
    if (completion < 30) return "bg-red-500";
    if (completion < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="mb-5 bg-white rounded-lg p-3 md:p-4 border border-gray-100 shadow-sm">
      <div className="flex justify-between mb-2 items-center">
        <span className="text-xs font-medium text-gray-700 flex items-center">
          <Clipboard className="w-3.5 h-3.5 mr-1 text-blue-600" />
          Profile Completion
        </span>
        <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-full">
          {completion}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-2 rounded-full transition-all duration-700 ease-in-out ${getColorClass()}`}
          style={{ width: `${completion}%` }}
        />
      </div>
      {completion < 70 ? (
        <div className="mt-2 text-xs text-gray-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
          Complete your profile to unlock all features
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-600 flex items-center">
          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
          Almost there! Just a few more details to complete.
        </div>
      )}
    </div>
  );
};

// Enhanced DivingStats with better visuals
const DivingStats = ({ stats }) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-br from-blue-50 to-white rounded-lg border border-blue-100">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-700">{stats.totalDives || 0}</div>
        <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
          <Clipboard className="w-3 h-3 mr-1" />
          Total Dives
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-700">{stats.maxDepth || 0}ft</div>
        <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
          <Droplet className="w-3 h-3 mr-1" />
          Max Depth
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-700">{stats.totalTime || 0}h</div>
        <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
          <Clock className="w-3 h-3 mr-1" />
          Bottom Time
        </div>
      </div>
    </div>
  );
};

// Enhanced InfoCard component for consistent card styling
const InfoCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white rounded-lg border border-gray-100 shadow-sm p-4 ${className}`}>
    <h2 className="text-sm uppercase font-semibold text-gray-700 mb-3 flex items-center tracking-wide">
      {Icon && <Icon className="h-4 w-4 text-blue-600 mr-2" />}
      {title}
    </h2>
    {children}
  </div>
);

// Mobile-optimized ProfileView with revised section order
const ProfileView = ({ 
  profile, 
  loyaltyData, 
  handleEditClick, 
  isLogbookSynced 
}) => {
  const { user } = useAuth();

  // Calculate profile completion percentage for conditional display
  const calculateCompletion = () => {
    const fields = [
      'name',
      'phone',
      'email',
      'photoURL',
      'bio',
      'city',
      'state',
      'certificationLevel',
      'favoritePlace',
      'emergencyContact.name'
    ];
    
    const completedFields = fields.filter(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return profile[parent]?.[child];
      }
      return profile[field];
    });
    
    return Math.round((completedFields.length / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  // Get social icons based on platform
  const getSocialIcon = (platform) => {
    switch(platform) {
      case 'instagram': return Instagram;
      case 'facebook': return Facebook;
      case 'youtube': return Youtube;
      case 'twitter': return Twitter;
      default: return Globe;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg shadow-sm overflow-hidden border border-gray-100">
      {/* Profile Header Section */}
      <ProfileHeader 
        profile={profile}
        photoURL={profile.photoURL}
        handleEditClick={handleEditClick}
        isEditing={false}
      />
      
      {/* Profile Content */}
      <div className="px-4 py-5 space-y-5">
        {/* Profile Completion - Only shown if not 100% complete */}
        {completionPercentage < 100 && (
          <ProfileCompletionIndicator profile={profile} />
        )}
        
        {/* Not synced alert - Right after stats */}
        {!isLogbookSynced && (
          <div className="md:order-2 md:col-span-2">
            <Alert className="bg-blue-50 border-blue-200 text-sm p-3">
              <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
              <AlertDescription className="text-blue-700 text-xs ml-2">
                Your profile dive count is being synced with your logbook.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Using flex-col for mobile and md:grid for desktop to control section order */}
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-5 space-y-5 md:space-y-0">
          {/* ===== SECTION ORDER FOR MOBILE (follows the flex-col order) ===== */}
          
          {/* 1. Diving Stats - Shown first */}
          {!profile.privacySettings?.hideStats && profile.divingStats && (
            <div className="md:order-1">
              <InfoCard title="Diving Statistics" icon={Clipboard}>
                <DivingStats stats={profile.divingStats} />
              </InfoCard>
            </div>
          )}
          
          {/* 3. Certifications */}
          <div className="md:order-3">
            <InfoCard title="Certifications" icon={Shield}>
              {/* Main Certification */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Certification Level
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 font-medium border border-blue-100">
                    {profile.certificationLevel || 'Uncertified'}
                  </span>
                  {profile.certificationLevel === "Instructor" && 
                    profile.instructorCertifications?.map((cert, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-100">
                      {cert.agency} #{cert.number}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Specialties */}
              {profile.specialties?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Specialties
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-lg text-xs bg-green-50 text-green-700 border border-green-100">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </InfoCard>
          </div>
          
          {/* 4. Badges Section */}
          <div className="md:order-4">
            <InfoCard title="Badges & Achievements" icon={Award}>
              <Badges 
                certificationLevel={profile.certificationLevel}
                specialties={profile.specialties}
                numberOfDives={profile.divingStats?.totalDives}
                size="small"
              />
            </InfoCard>
          </div>
          
          {/* 5. Dive Experience */}
{(profile.favoritePlace || profile.diveTrips?.length > 0) && (
  <div className="md:order-5">
    <InfoCard title="Experience" icon={Map}>
      {profile.favoritePlace && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Favorite Location
          </h3>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-800">
              {profile.favoritePlace}
              {profile.favoriteDivesite && ` - ${profile.favoriteDivesite}`}
            </p>
          </div>
        </div>
      )}
      
      {profile.diveTrips?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recent Trips
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profile.diveTrips
              .sort((a, b) => b.year - a.year)
              .slice(0, 6)
              .map((trip, index) => (
                <div key={index} className="px-3 py-2 rounded-lg text-xs bg-gray-50 border border-gray-100 flex items-center">
                  <Calendar className="w-3 h-3 mr-2 text-gray-400" />
                  <span className="font-medium">{trip.year}:</span> {trip.location}
                </div>
              ))}
          </div>
        </div>
      )}
    </InfoCard>
  </div>
)}
          
          {/* 6. Bio Section */}
          {profile.bio && (
            <div className="md:order-6">
              <InfoCard title="About" icon={UserCircle}>
                <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
              </InfoCard>
            </div>
          )}
          
          {/* 7. Social Links */}
          {!profile.privacySettings?.hideSocial && 
            profile.socialLinks && 
            Object.entries(profile.socialLinks).some(([_, url]) => Boolean(url)) && (
            <div className="md:order-7">
              <InfoCard title="Connect" icon={Globe}>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(profile.socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const SocialIcon = getSocialIcon(platform);
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-800 flex items-center transition-colors border border-gray-200 text-xs"
                      >
                        <SocialIcon className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                        <span className="font-medium">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                      </a>
                    );
                  })}
                </div>
              </InfoCard>
            </div>
          )}
          
          {/* 8. Dive Rewards Section - Last as requested */}
          <div className="md:order-8 md:col-span-2">
            <RewardsSection 
              loyaltyData={loyaltyData}
              profile={profile}
              userId={user?.uid}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Improved form fields with better UX
const FormSection = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 mb-5">
    <h3 className="text-sm uppercase font-semibold text-gray-700 mb-3 flex items-center tracking-wide">
      {Icon && <Icon className="h-4 w-4 text-blue-600 mr-2" />}
      {title}
    </h3>
    {children}
  </div>
);

// Emergency Contact Fields Component
const EmergencyContactFields = ({ contact, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">Emergency Contact</h3>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={contact?.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          placeholder="Emergency Contact Name"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Relationship</label>
        <input
          type="text"
          value={contact?.relationship || ''}
          onChange={(e) => onChange('relationship', e.target.value)}
          className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          placeholder="Spouse, Parent, etc."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={contact?.phone || ''}
          onChange={(e) => onChange('phone', e.target.value)}
          className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          placeholder="Emergency Contact Phone"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={contact?.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          placeholder="Emergency Contact Email"
        />
      </div>
    </div>
  </div>
);

// Instructor Certification Fields Component
const InstructorCertificationFields = ({ certifications = [], onChange }) => {
  const agencies = ["NAUI", "SDI", "TDI", "PADI", "SSI", "Other"];

  const handleAddCertification = () => {
    onChange([...certifications, { agency: '', number: '' }]);
  };

  const handleRemoveCertification = (index) => {
    const newCerts = certifications.filter((_, i) => i !== index);
    onChange(newCerts);
  };

  const updateCertification = (index, field, value) => {
    const newCerts = [...certifications];
    newCerts[index] = { ...newCerts[index], [field]: value };
    onChange(newCerts);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Instructor Certifications</h3>
      
      {certifications.map((cert, index) => (
        <div key={index} className="flex gap-2 items-start p-2.5 bg-gray-50 rounded-lg border border-gray-100">
          <select
            value={cert.agency}
            onChange={(e) => updateCertification(index, 'agency', e.target.value)}
            className="flex-1 rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          >
            <option value="">Select Agency</option>
            {agencies.map(agency => (
              <option key={agency} value={agency}>{agency}</option>
            ))}
          </select>
          
          <input
            type="text"
            value={cert.number}
            onChange={(e) => updateCertification(index, 'number', e.target.value)}
            placeholder="Certification Number"
            className="flex-1 rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          />
          
          <button
            type="button"
            onClick={() => handleRemoveCertification(index)}
            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      
      <button
        type="button"
        onClick={handleAddCertification}
        className="flex items-center text-xs text-blue-600 hover:text-blue-800 py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors"
      >
        <Check className="h-3.5 w-3.5 mr-1" />
        Add Certification
      </button>
    </div>
  );
};

// Main Profile Component
function Profile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    photoURL: '',
    name: '',
    phone: '',
    email: user?.email || '',
    bio: '',
    city: '',
    state: '',
    diveTrips: [],     
    favoritePlace: '', 
    favoriteDivesite: '', 
    certificationLevel: '',
    specialties: [],
    numberOfDives: 0,
    syncWithLogbook: false,
    instructorCertifications: [],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    socialLinks: {
      instagram: '',
      facebook: '',
      youtube: '',
      twitter: ''
    },
    privacySettings: {
      hideEmail: false,    
      hidePhone: false,    
      hideLocation: false, 
      hideStats: false,    
      hideSocial: false   
    },
    divingStats: {
      totalDives: 0,
      maxDepth: 0,
      totalTime: 0
    }
  });

  const [loyaltyData, setLoyaltyData] = useState({
    lifetimePoints: 0,
    redeemablePoints: 0,
    currentTier: null,
    transactions: [],
    joinDate: null
  });

  const [profile, setProfile] = useState({ ...formData });
  const [isLogbookSynced, setIsLogbookSynced] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const certificationLevels = [
    "Student Diver",
    "SCUBA Diver",
    "Advanced SCUBA Diver",
    "Rescue Diver",
    "Advanced Rescue Diver",
    "Master SCUBA Diver",
    "Divemaster",
    "Assistant Instructor",
    "Instructor"
  ];

  const specialtyOptions = [
    "Nitrox Diver",
    "Drysuit Diver",
    "First Aid/CPR",
    "Emergecy Oxygen Provider",
    "Equipment Specialist",
    "Deep Diver",
    "Underwater Navigator",
    "Solo Diver",
    "Night Diver",
    "Wreck Diver",
  ];

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Memoize the calculateTier function to prevent it from causing re-renders
  const calculateTier = useCallback((lifetimePoints) => {
    return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
      if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
        return { tier, ...details };
      }
      return acc;
    }, TIER_LEVELS.OCEANIC_SILVER);
  }, []);

  const fetchDiveStats = useCallback(async () => {
    if (!user?.uid) return null;
  
    try {
      const logbookRef = collection(db, `profiles/${user.uid}/logbook`);
      const querySnapshot = await getDocs(logbookRef);
      
      if (!querySnapshot.empty) {
        const dives = querySnapshot.docs.map(doc => doc.data());
        
        // Calculate total dives
        const totalDives = dives.length;
        
        // Find max depth (assuming depth is stored in feet)
        const maxDepth = Math.max(...dives.map(dive => dive.maxDepth || 0));
        
        // Calculate total bottom time (converting minutes to hours)
        const totalTimeMinutes = dives.reduce((total, dive) => total + (dive.bottomTime || 0), 0);
        const totalTimeHours = Math.round(totalTimeMinutes / 60 * 10) / 10; // Round to 1 decimal
        
        return {
          totalDives,
          maxDepth,
          totalTime: totalTimeHours
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching dive stats:', error);
      return null;
    }
  }, [user?.uid]);

  useEffect(() => {
    const fetchProfileAndDives = async () => {
      if (user?.uid) {
        try {
          console.log("Fetching profile for user:", user.uid);
          const docRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(docRef);
          
          let profileData;
          
          if (docSnap.exists()) {
            profileData = docSnap.data();
            
            // Set loyalty data
            const loyaltyInfo = {
              lifetimePoints: profileData.lifetimePoints || 0,
              redeemablePoints: profileData.redeemablePoints || 0,
              transactions: profileData.transactions || [],
              joinDate: profileData.joinDate || profileData.createdAt || new Date().toISOString()
            };
            
            // Calculate current tier
            const currentTier = calculateTier(loyaltyInfo.lifetimePoints);
            setLoyaltyData({
              ...loyaltyInfo,
              currentTier
            });
          } else {
            // Create default profile for new users
            profileData = {
              name: '',
              email: user.email || '',
              photoURL: '',
              divingStats: { totalDives: 0, maxDepth: 0, totalTime: 0 },
              createdAt: new Date().toISOString()
            };
            
            // Set default loyalty data
            setLoyaltyData({
              lifetimePoints: 0,
              redeemablePoints: 0,
              transactions: [],
              joinDate: new Date().toISOString(),
              currentTier: calculateTier(0)
            });
            
            // For new users, initialize with a bare-bones profile
            await setDoc(docRef, profileData, { merge: true });
            
            // Auto-enable edit mode for new users
            setIsEditing(true);
          }
  
          // Process diving stats if needed
          if (profileData.syncWithLogbook) {
            const logbookStats = await fetchDiveStats();
            
            if (logbookStats) {
              const needsSync = JSON.stringify(profileData.divingStats) !== JSON.stringify(logbookStats);
              setIsLogbookSynced(!needsSync);
    
              if (needsSync) {
                profileData.divingStats = logbookStats;
                await setDoc(docRef, profileData, { merge: true });
              }
            }
          }
          
          // Update state with profile data
          setProfile(profileData);
          setFormData(profileData);
          
        } catch (error) {
          console.error('Error loading profile:', error);
          alert(`Error loading profile: ${error.message}`);
        }
      }
    };
  
    fetchProfileAndDives();
  }, [user, fetchDiveStats, calculateTier]);

  const validateImage = (file) => {
    if (!file) return "No file selected";
    if (!file.type.startsWith('image/')) return "File must be an image";
    if (file.size > MAX_FILE_SIZE) return "File size must be less than 5MB";
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle sync toggle
    if (name === 'syncWithLogbook') {
      setFormData(prev => ({
        ...prev,
        syncWithLogbook: checked
      }));
      return;
    }
  
    // Handle diving stats updates
    if (name.startsWith('divingStats.')) {
      const statField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        divingStats: {
          ...prev.divingStats,
          [statField]: type === 'number' ? Number(value) : value
        }
      }));
      return;
    }
  
    // Handle diving stats object update
    if (name === 'divingStats' && typeof value === 'object') {
      setFormData(prev => ({
        ...prev,
        divingStats: {
          ...prev.divingStats,
          ...value
        }
      }));
      return;
    }
  
    // Handle all other inputs
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }));
  };

  const handleSocialLinksChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handlePrivacySettingsChange = (setting, value) => {
    setFormData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [setting]: value
      }
    }));
  };

  const handleSpecialtyChange = (specialty) => {
    const updatedSpecialties = formData.specialties?.includes(specialty)
      ? formData.specialties.filter(s => s !== specialty)
      : [...(formData.specialties || []), specialty];
    setFormData(prev => ({
      ...prev,
      specialties: updatedSpecialties
    }));
  };

  const handleInstructorCertChange = (certifications) => {
    setFormData(prev => ({
      ...prev,
      instructorCertifications: certifications
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const error = validateImage(file);
    if (error) {
      alert(error);
      return;
    }
    setProfileImage(file);
    
    // Create a preview URL
    const previewURL = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      photoURL: previewURL
    }));
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;
    
    try {
      if (profile.photoURL) {
        const photoRef = ref(storage, profile.photoURL);
        await deleteObject(photoRef);
      }
      
      setProfileImage(null);
      setFormData(prev => ({
        ...prev,
        photoURL: ''
      }));
      
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete profile picture. Please try again.');
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to profile data
    setFormData(profile);
    setProfileImage(null);
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      // FIX: Ensure photoURL is never undefined
      let photoURL = formData.photoURL || ''; 
      let divingStats = formData.divingStats || { totalDives: 0, maxDepth: 0, totalTime: 0 };
      
      if (profileImage) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${profileImage.name}`;
        const storageRef = ref(storage, `users/${user.uid}/profile/${fileName}`);
        const arrayBuffer = await profileImage.arrayBuffer();
        
        await uploadBytes(storageRef, arrayBuffer);
        photoURL = await getDownloadURL(storageRef);
      }
  
      if (formData.syncWithLogbook) {
        const logbookStats = await fetchDiveStats();
        if (logbookStats) {
          divingStats = logbookStats;
        }
      }

      const loyaltyCode = profile.loyaltyCode || generateLoyaltyCode(formData.name || '', user.uid);

      // Clean object with no undefined values
      const updatedProfile = {
        // User details
        name: formData.name || '',
        email: formData.email || user.email || '',
        photoURL: photoURL,
        phone: formData.phone || '',
        bio: formData.bio || '',
        city: formData.city || '',
        state: formData.state || '',
        
        // Loyalty code
        loyaltyCode: loyaltyCode,
        loyaltyAccess: { hasAccess: true },
        
        // Diving info
        divingStats: divingStats,
        certificationLevel: formData.certificationLevel || '',
        specialties: formData.specialties || [],
        syncWithLogbook: Boolean(formData.syncWithLogbook),
        instructorCertifications: formData.instructorCertifications || [],
        
        // Additional data
        diveTrips: formData.diveTrips || [],
        favoritePlace: formData.favoritePlace || '',
        favoriteDivesite: formData.favoriteDivesite || '',
        emergencyContact: formData.emergencyContact || {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        },
        socialLinks: formData.socialLinks || {
          instagram: '',
          facebook: '',
          youtube: '',
          twitter: ''
        },
        privacySettings: formData.privacySettings || {
          hideEmail: false,
          hidePhone: false,
          hideLocation: false,
          hideStats: false,
          hideSocial: false
        },
        
        // Loyalty data
        lifetimePoints: loyaltyData.lifetimePoints || 0,
        redeemablePoints: loyaltyData.redeemablePoints || 0,
        transactions: loyaltyData.transactions || [],
        joinDate: loyaltyData.joinDate || new Date().toISOString(),
        
        // Timestamps
        createdAt: profile.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
  
      // Use merge option to ensure we don't overwrite existing data
      await setDoc(doc(db, 'profiles', user.uid), updatedProfile, { merge: true });
      
      // Verify the save succeeded by reading it back
      const verifyDoc = await getDoc(doc(db, 'profiles', user.uid));
      if (!verifyDoc.exists()) {
        throw new Error("Profile failed to save to database");
      }
      
      // Update local state with saved data
      const savedData = verifyDoc.data();
      setProfile(savedData);
      setFormData(savedData);
      setIsEditing(false);
      setIsLogbookSynced(true);
      setProfileImage(null);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    }
  
    setIsLoading(false);
  };

  const renderEditForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormSection title="Profile Information" icon={UserCircle}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 mb-5">
          {/* Profile Image with improved error handling */}
          <div className="relative">
  {formData.photoURL && formData.photoURL.trim() !== '' ? (
    <div className="relative">
      <img
        src={formData.photoURL}
        alt="Profile"
        className="w-24 h-24 rounded-xl border-3 border-white object-cover shadow-md"
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = 'none';
          const fallback = e.target.parentNode.querySelector('.fallback-avatar');
          fallback.style.display = 'flex';
        }}
      />
      <div 
        className="w-24 h-24 rounded-xl border-3 border-white bg-gradient-to-br from-blue-100 to-blue-50 items-center justify-center shadow-md fallback-avatar"
        style={{display: 'none'}}
      >
        <UserCircle className="h-12 w-12 text-blue-500" />
      </div>
    </div>
  ) : (
              <div className="w-24 h-24 rounded-xl border-3 border-white bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-md">
                <UserCircle className="h-12 w-12 text-blue-500" />
              </div>
            )}
            
            <div className="absolute -bottom-2 -right-2 flex space-x-1">
              <label className="p-1.5 bg-blue-50 rounded-full text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors shadow-sm border border-blue-200">
                <Camera className="h-3.5 w-3.5" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                />
              </label>
              {formData.photoURL && formData.photoURL.trim() !== '' && (
                <button 
                  type="button"
                  onClick={handleDeletePhoto}
                  className="p-1.5 bg-red-50 rounded-full text-red-700 hover:bg-red-100 transition-colors shadow-sm border border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 gap-4 w-full">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                placeholder="Your Name"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio || ''}
              onChange={handleInputChange}
              rows={3}
              className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              placeholder="Tell us about your diving experience..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                placeholder="Your City"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1">State/Country</label>
              <input
                type="text"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                placeholder="Your State or Country"
              />
            </div>
          </div>
        </div>
      </FormSection>
      
      <FormSection title="Diving Statistics" icon={Clipboard}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                name="syncWithLogbook"
                checked={formData.syncWithLogbook}
                onChange={handleInputChange}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-medium text-gray-700">
                Sync with Logbook
              </span>
            </label>
          </div>
        </div>
        
        {!formData.syncWithLogbook ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Total Dives</label>
              <input
                type="number"
                name="divingStats.totalDives"
                value={formData.divingStats?.totalDives || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  handleInputChange({
                    target: {
                      name: 'divingStats',
                      value: {
                        ...formData.divingStats,
                        totalDives: value >= 0 ? value : 0
                      }
                    }
                  });
                }}
                min="0"
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Depth (ft)</label>
              <input
                type="number"
                name="divingStats.maxDepth"
                value={formData.divingStats?.maxDepth || 0}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  handleInputChange({
                    target: {
                      name: 'divingStats',
                      value: {
                        ...formData.divingStats,
                        maxDepth: value >= 0 ? value : 0
                      }
                    }
                  });
                }}
                min="0"
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bottom Time (hours)</label>
              <input
                type="number"
                name="divingStats.totalTime"
                value={formData.divingStats?.totalTime || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  handleInputChange({
                    target: {
                      name: 'divingStats',
                      value: {
                        ...formData.divingStats,
                        totalTime: value >= 0 ? value : 0
                      }
                    }
                  });
                }}
                min="0"
                step="0.1"
                className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-xs text-blue-700">
                  Statistics will be automatically calculated from your logbook entries.
                </p>
              </div>
            </div>
          </div>
        )}
      </FormSection>
      
      <FormSection title="Certifications & Skills" icon={Shield}>
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-700 mb-1">Certification Level</label>
          <select
            name="certificationLevel"
            value={formData.certificationLevel || ''}
            onChange={handleInputChange}
            className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
          >
            <option value="">Select Certification Level</option>
            {certificationLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-700 mb-2">Specialties</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {specialtyOptions.map((specialty) => (
              <label key={specialty} className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                <input
                  type="checkbox"
                  checked={formData.specialties?.includes(specialty) || false}
                  onChange={() => handleSpecialtyChange(specialty)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                <span className="ml-2 text-xs text-gray-700">{specialty}</span>
              </label>
            ))}
          </div>
        </div>
      </FormSection>
      
      <FormSection title="Dive Experience" icon={Map}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Favorite Place</label>
            <input
              type="text"
              name="favoritePlace"
              value={formData.favoritePlace || ''}
              onChange={handleInputChange}
              className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              placeholder="e.g., Cozumel, Mexico"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Favorite Dive Site</label>
            <input
              type="text"
              name="favoriteDivesite"
              value={formData.favoriteDivesite || ''}
              onChange={handleInputChange}
              className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
              placeholder="e.g., Palancar Reef"
            />
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-700">Dive Trips</label>
            <button
              type="button"
              onClick={() => {
                const currentTrips = formData.diveTrips || [];
                const newTrips = [...currentTrips, { location: '', year: new Date().getFullYear() }];
                handleInputChange({
                  target: { name: 'diveTrips', value: newTrips }
                });
              }}
              className="text-xs text-blue-700 flex items-center bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Add Trip
            </button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {(formData.diveTrips || []).map((trip, index) => (
              <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <input
                    type="text"
                    value={trip.location || ''}
                    onChange={(e) => {
                      const currentTrips = [...(formData.diveTrips || [])];
                      currentTrips[index] = { ...currentTrips[index], location: e.target.value };
                      handleInputChange({
                        target: { name: 'diveTrips', value: currentTrips }
                      });
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                    placeholder="Location"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={trip.year || new Date().getFullYear()}
                    onChange={(e) => {
                      const currentTrips = [...(formData.diveTrips || [])];
                      currentTrips[index] = { ...currentTrips[index], year: e.target.value };
                      handleInputChange({
                        target: { name: 'diveTrips', value: currentTrips }
                      });
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                    placeholder="Year"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentTrips = [...(formData.diveTrips || [])];
                    const newTrips = currentTrips.filter((_, i) => i !== index);
                    handleInputChange({
                      target: { name: 'diveTrips', value: newTrips }
                    });
                  }}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            
            {!formData.diveTrips?.length && (
              <div className="text-center p-3 text-gray-500 italic bg-gray-50 rounded-lg border border-gray-100 text-xs">
                No trips added yet
              </div>
            )}
          </div>
        </div>
      </FormSection>
      
      <FormSection title="Privacy Settings" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { id: 'hideEmail', label: 'Hide email from other divers', icon: Mail },
            { id: 'hidePhone', label: 'Hide phone number', icon: Phone },
            { id: 'hideLocation', label: 'Hide location', icon: MapPin },
            { id: 'hideStats', label: 'Hide diving statistics', icon: Clipboard },
            { id: 'hideSocial', label: 'Hide social media links', icon: Globe }
          ].map(({ id, label, icon: Icon }) => (
            <label key={id} className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
              <input
                type="checkbox"
                checked={formData.privacySettings?.[id] || false}
                onChange={(e) => handlePrivacySettingsChange(id, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span className="ml-2 text-xs text-gray-700 flex items-center">
                <Icon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                {label}
              </span>
            </label>
          ))}
        </div>
      </FormSection>
      
      {/* Emergency Contact Fields */}
      <FormSection title="Emergency Contact" icon={AlertTriangle}>
        <EmergencyContactFields
          contact={formData.emergencyContact}
          onChange={handleEmergencyContactChange}
        />
      </FormSection>

      {/* Instructor Certifications - conditionally shown */}
      {formData.certificationLevel === "Instructor" && (
        <FormSection title="Instructor Certifications" icon={Award}>
          <InstructorCertificationFields
            certifications={formData.instructorCertifications || []}
            onChange={handleInstructorCertChange}
          />
        </FormSection>
      )}
            
      <FormSection title="Social Media" icon={Globe}>
        <div className="space-y-3">
          {[
            { name: 'instagram', label: 'Instagram', icon: Instagram },
            { name: 'facebook', label: 'Facebook', icon: Facebook },
            { name: 'youtube', label: 'YouTube', icon: Youtube },
            { name: 'twitter', label: 'Twitter', icon: Twitter }
          ].map(({ name, label, icon: Icon }) => (
            <div key={name} className="flex items-center space-x-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                  <Icon className="h-3.5 w-3.5 mr-1 text-gray-500" />
                  {label}
                </label>
                <input
                  type="text"
                  value={formData.socialLinks?.[name] || ''}
                  onChange={(e) => handleSocialLinksChange(name, e.target.value)}
                  placeholder={`${label} URL`}
                  className="w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </FormSection>
      
      <div className="flex justify-end space-x-3 sticky bottom-0 bg-white p-3 shadow-sm rounded-lg border border-gray-100 z-10">
        <button
          type="button"
          onClick={handleCancelEdit}
          className="py-1.5 px-3 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded transition-colors flex items-center"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="py-1.5 px-3 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center"
        >
          {isLoading ? (
            <>Loading...</>
          ) : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 mb-16">
      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-5">
          <TabsTrigger value="profile" className="text-xs py-2 flex items-center justify-center">
            <UserCircle className="h-3.5 w-3.5 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs py-2 flex items-center justify-center">
            <Settings className="h-3.5 w-3.5 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="focus:outline-none">
          {isEditing ? (
            renderEditForm()
          ) : (
            <>
              <ProfileView 
                profile={profile}
                loyaltyData={loyaltyData}
                handleEditClick={handleEditClick}
                isLogbookSynced={isLogbookSynced}
              />
              
              <div className="mt-5 flex justify-center">
                <button 
                  onClick={handleEditClick}
                  className="py-1.5 px-4 bg-blue-50 text-blue-700 text-sm rounded border border-blue-200 hover:bg-blue-100 transition-colors flex items-center shadow-sm"
                >
                  <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                  Edit Profile
                </button>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="security">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4 border border-gray-100">
            <SecuritySettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Profile;