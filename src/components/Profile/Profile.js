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
import { AlertTriangle, MapPin } from 'lucide-react';
import Badges from './Badges';
import { Alert, AlertDescription } from '../../components/ui/alert';
import MembershipCard from '../Loyalty/MembershipCard';

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
      'favoriteDiveLocation',
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

  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Profile Completion</span>
        <span className="text-sm font-medium text-gray-700">{completion}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>
    </div>
  );
};

const DivingStats = ({ stats }) => {
  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.totalDives || 0}</div>
        <div className="text-sm text-gray-600">Total Dives</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.maxDepth || 0}ft</div>
        <div className="text-sm text-gray-600">Max Depth</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.totalTime || 0}h</div>
        <div className="text-sm text-gray-600">Bottom Time</div>
      </div>
    </div>
  );
};

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
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Instructor Certifications</label>
      
      {certifications.map((cert, index) => (
        <div key={index} className="flex gap-2 items-start">
          <select
            value={cert.agency}
            onChange={(e) => updateCertification(index, 'agency', e.target.value)}
            className="mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            className="mt-1 block w-1/2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          
          <button
            type="button"
            onClick={() => handleRemoveCertification(index)}
            className="mt-1 text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      ))}
      
      <button
        type="button"
        onClick={handleAddCertification}
        className="text-blue-600 hover:text-blue-800"
      >
        + Add Certification
      </button>
    </div>
  );
};

const SocialLinks = ({ links, onUpdate }) => {
  const platforms = [
    { name: 'instagram', label: 'Instagram' },
    { name: 'facebook', label: 'Facebook' },
    { name: 'youtube', label: 'YouTube' },
    { name: 'twitter', label: 'Twitter' }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-900">Social Links</h3>
      {platforms.map(({ name, label }) => (
        <div key={name} className="flex items-center space-x-2">
          <input
            type="text"
            value={links[name] || ''}
            onChange={(e) => onUpdate(name, e.target.value)}
            placeholder={`${label} URL`}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      ))}
    </div>
  );
};

const PrivacySettings = ({ settings, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
    <div className="space-y-2">
      {[
        { id: 'hideEmail', label: 'Hide email from other divers' },
        { id: 'hidePhone', label: 'Hide phone number' },
        { id: 'hideLocation', label: 'Hide location' },
        { id: 'hideStats', label: 'Hide diving statistics' },
        { id: 'hideSocial', label: 'Hide social media links' }
      ].map(({ id, label }) => (
        <label key={id} className="flex items-center">
          <input
            type="checkbox"
            checked={settings[id] || false}
            onChange={(e) => onChange(id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-600">{label}</span>
        </label>
      ))}
    </div>
  </div>
);

const EmergencyContactFields = ({ contact, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={contact?.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Relationship</label>
        <input
          type="text"
          value={contact?.relationship || ''}
          onChange={(e) => onChange('relationship', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          value={contact?.phone || ''}
          onChange={(e) => onChange('phone', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={contact?.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>
  </div>
);
const EditForm = ({ 
  formData, 
  onInputChange,
  onEmergencyContactChange,
  onSocialLinksChange,
  onPrivacySettingsChange,
  onSpecialtyChange,
  onInstructorCertChange,
  onImageChange,
  onDeletePhoto,
  onSubmit,
  onCancel,
  isLoading,
  certificationLevels,
  specialtyOptions
}) => (
  <form onSubmit={onSubmit} className="space-y-6">
    {/* Profile Picture Section */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
      <div className="mt-2 flex items-center space-x-4">
        <div className="relative">
          {formData.photoURL ? (
            <img
              src={formData.photoURL}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-3xl text-blue-500">
                {formData.name ? formData.name[0].toUpperCase() : '?'}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {formData.photoURL && (
            <button
              type="button"
              onClick={onDeletePhoto}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete Photo
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Basic Info */}
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
  <div>
    <label className="block text-sm font-medium text-gray-700">Name</label>
    <input
      type="text"
      name="name"
      value={formData.name || ''}
      onChange={onInputChange}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">Phone</label>
    <input
      type="tel"
      name="phone"
      value={formData.phone || ''}
      onChange={onInputChange}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700">Email</label>
    <input
      type="email"
      name="email"
      value={formData.email || ''}
      onChange={onInputChange}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
    />
  </div>
</div>

{/* Diving Stats Section */}
<div>
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-medium text-gray-900">Diving Statistics</h3>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        name="syncWithLogbook"
        checked={formData.syncWithLogbook}
        onChange={onInputChange}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      <span className="ml-2 text-sm font-medium text-gray-700">
        Sync with Logbook
      </span>
    </label>
  </div>

  {!formData.syncWithLogbook ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">Total Dives</label>
        <input
          type="number"
          name="divingStats.totalDives"
          value={formData.divingStats?.totalDives || 0}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            onInputChange({
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Max Depth (ft)</label>
        <input
          type="number"
          name="divingStats.maxDepth"
          value={formData.divingStats?.maxDepth || 0}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            onInputChange({
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Bottom Time (hours)</label>
        <input
          type="number"
          name="divingStats.totalTime"
          value={formData.divingStats?.totalTime || 0}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            onInputChange({
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>
  ) : (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-blue-700">
            Statistics will be automatically calculated from your logbook entries.
          </p>
        </div>
      </div>
    </div>
  )}
</div>

    {/* Location */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          name="city"
          value={formData.city || ''}
          onChange={onInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">State/Country</label>
        <input
          type="text"
          name="state"
          value={formData.state || ''}
          onChange={onInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* Bio */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Bio</label>
      <textarea
        name="bio"
        value={formData.bio || ''}
        onChange={onInputChange}
        rows={4}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Tell us about your diving experience..."
      />
    </div>

    {/* Certification Level */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Certification Level</label>
      <select
        name="certificationLevel"
        value={formData.certificationLevel || ''}
        onChange={onInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      >
        <option value="">Select Certification Level</option>
        {certificationLevels.map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </div>

    {/* Instructor Certifications */}
    {formData.certificationLevel === "Instructor" && (
      <InstructorCertificationFields
        certifications={formData.instructorCertifications || []}
        onChange={onInstructorCertChange}
      />
    )}

    {/* Specialties */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
      <div className="space-y-2">
        {specialtyOptions.map((specialty) => (
          <label key={specialty} className="flex items-center">
            <input
              type="checkbox"
              checked={formData.specialties?.includes(specialty) || false}
              onChange={() => onSpecialtyChange(specialty)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">{specialty}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Dive Trips */}
<div className="space-y-4">
  <h3 className="text-lg font-medium text-gray-900">Dive Trips</h3>
  
  {/* Favorite Place and Dive Site */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="block text-sm font-medium text-gray-700">Favorite Place</label>
      <input
        type="text"
        name="favoritePlace"
        value={formData.favoritePlace || ''}
        onChange={onInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="e.g., Cozumel, Mexico"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Favorite Dive Site</label>
      <input
        type="text"
        name="favoriteDivesite"
        value={formData.favoriteDivesite || ''}
        onChange={onInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="e.g., Palancar Reef"
      />
    </div>
  </div>

  {/* Trip List */}
  <div className="mt-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">Trip History</label>
    {(formData.diveTrips || []).map((trip, index) => (
      <div key={index} className="flex gap-4 items-start mb-2">
        <div className="flex-1">
          <input
            type="text"
            value={trip.location || ''}
            onChange={(e) => {
              const currentTrips = [...(formData.diveTrips || [])];
              currentTrips[index] = { ...currentTrips[index], location: e.target.value };
              onInputChange({
                target: { name: 'diveTrips', value: currentTrips }
              });
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Location"
          />
        </div>
        <div className="w-32">
          <input
            type="number"
            value={trip.year || new Date().getFullYear()}
            onChange={(e) => {
              const currentTrips = [...(formData.diveTrips || [])];
              currentTrips[index] = { ...currentTrips[index], year: e.target.value };
              onInputChange({
                target: { name: 'diveTrips', value: currentTrips }
              });
            }}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
            onInputChange({
              target: { name: 'diveTrips', value: newTrips }
            });
          }}
          className="text-red-600 hover:text-red-800"
        >
          Remove
        </button>
      </div>
    ))}
    <button
      type="button"
      onClick={() => {
        const currentTrips = formData.diveTrips || [];
        const newTrips = [...currentTrips, { location: '', year: new Date().getFullYear() }];
        onInputChange({
          target: { name: 'diveTrips', value: newTrips }
        });
      }}
      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
    >
      + Add Trip
    </button>
  </div>
</div>

    {/* Emergency Contact */}
    <EmergencyContactFields
      contact={formData.emergencyContact}
      onChange={onEmergencyContactChange}
    />

    {/* Social Links */}
    <SocialLinks
      links={formData.socialLinks || {}}
      onUpdate={onSocialLinksChange}
    />

    {/* Privacy Settings */}
    <PrivacySettings
      settings={formData.privacySettings || {}}
      onChange={onPrivacySettingsChange}
    />

    {/* Form Actions */}
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
      >
        {isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </form>
);


const TIER_LEVELS = {
  OCEANIC_SILVER: { min: 0, max: 9999, multiplier: 1.0, name: 'Oceanic Silver' },
  MARINER_GOLD: { min: 10000, max: 19999, multiplier: 1.2, name: 'Mariner Gold' },
  NAUTILUS_PLATINUM: { min: 20000, max: 49999, multiplier: 1.5, name: 'Nautilus Platinum' },
  TRIDENT_ELITE: { min: 50000, max: 99999, multiplier: 2.0, name: 'Trident Elite' },
  LIFETIME_ELITE: { min: 100000, max: Infinity, multiplier: 2.0, name: 'Lifetime Elite' }
};

const calculateTier = (lifetimePoints) => {
  return Object.entries(TIER_LEVELS).reduce((acc, [tier, details]) => {
    if (lifetimePoints >= details.min && lifetimePoints <= details.max) {
      return { tier, ...details };
    }
    return acc;
  }, TIER_LEVELS.OCEANIC_SILVER);
};

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
          const docRef = doc(db, 'profiles', user.uid);
          const docSnap = await getDoc(docRef);
          const profileData = docSnap.exists() ? docSnap.data() : {};

          if (docSnap.exists()) {
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
          }
  
          if (profileData.syncWithLogbook) {
            const logbookStats = await fetchDiveStats();
            
            if (logbookStats) {
              const needsSync = JSON.stringify(profileData.divingStats) !== JSON.stringify(logbookStats);
              setIsLogbookSynced(!needsSync);
  
              if (needsSync) {
                const updatedProfileData = {
                  ...profileData,
                  divingStats: logbookStats
                };
  
                await setDoc(docRef, updatedProfileData);
                setProfile(updatedProfileData);
                setFormData(updatedProfileData);
              } else {
                setProfile(profileData);
                setFormData(profileData);
              }
            }
          } else {
            setProfile(profileData);
            setFormData(profileData);
            setIsLogbookSynced(true);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      }
    };
  
    fetchProfileAndDives();
  }, [user, fetchDiveStats]);

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
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your profile picture?')) return;
    
    try {
      if (formData.photoURL) {
        const photoRef = ref(storage, formData.photoURL);
        await deleteObject(photoRef);
      }
      
      const updatedProfile = {
        ...profile,
        photoURL: ''
      };
      
      await setDoc(doc(db, 'profiles', user.uid), updatedProfile);
      setProfile(updatedProfile);
      setFormData(updatedProfile);
      
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete profile picture. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      let photoURL = formData.photoURL;
      let divingStats = formData.divingStats;
      
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
  
      const updatedProfile = {
        ...formData,
        photoURL,
        divingStats,
        // Loyalty data
        lifetimePoints: loyaltyData.lifetimePoints,
        redeemablePoints: loyaltyData.redeemablePoints,
        transactions: loyaltyData.transactions,
        joinDate: loyaltyData.joinDate,
        // Only include updatedAt once
        updatedAt: new Date().toISOString()
      };
  
      await setDoc(doc(db, 'profiles', user.uid), updatedProfile);
      setProfile(updatedProfile);
      setIsEditing(false);
      setIsLogbookSynced(true);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    }
  
    setIsLoading(false);
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <ProfileCompletionIndicator profile={profile} />
        
        {!isLogbookSynced && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your profile dive count is being synced with your logbook.
            </AlertDescription>
          </Alert>
        )}
        
        {isEditing ? (
  <EditForm
    formData={formData}
    onInputChange={handleInputChange}
    onEmergencyContactChange={handleEmergencyContactChange}
    onSocialLinksChange={handleSocialLinksChange}
    onPrivacySettingsChange={handlePrivacySettingsChange}
    onSpecialtyChange={handleSpecialtyChange}
    onInstructorCertChange={handleInstructorCertChange}
    onImageChange={handleImageChange}
    onDeletePhoto={handleDeletePhoto}
    onSubmit={handleSubmit}
    onCancel={() => setIsEditing(false)}
    isLoading={isLoading}
    certificationLevels={certificationLevels}
    specialtyOptions={specialtyOptions}
  />
) : (
  <div>
    {/* Profile Header */}
    <div className="text-center">
      {profile.photoURL ? (
        <img
          src={profile.photoURL}
          alt="Profile"
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
        />
      ) : (
        <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-blue-100 flex items-center justify-center">
          <span className="text-4xl text-blue-500">
            {profile.name ? profile.name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}
      
      <h2 className="text-2xl font-bold text-gray-900">
        {profile.name || 'New Diver'}
      </h2>
      
      {profile.certificationLevel && (
        <p className="text-blue-600 mt-1">{profile.certificationLevel}</p>
      )}

      <Badges 
        certificationLevel={profile.certificationLevel}
        specialties={profile.specialties}
        numberOfDives={profile.divingStats?.totalDives}
      />
    </div>

    {/* Diving Stats */}
    {!profile.privacySettings?.hideStats && profile.divingStats && (
  <DivingStats stats={profile.divingStats} />
)}

    {/* Location & Contact */}
    <div className="space-y-2 mt-6">
      {!profile.privacySettings?.hideLocation && (profile.city || profile.state) && (
        <p className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          {[profile.city, profile.state].filter(Boolean).join(', ')}
        </p>
      )}
      
      {!profile.privacySettings?.hideEmail && profile.email && (
        <p className="text-gray-600">Email: {profile.email}</p>
      )}
      
      {!profile.privacySettings?.hidePhone && profile.phone && (
        <p className="text-gray-600">Phone: {profile.phone}</p>
      )}
    </div>

    {/* Bio */}
    {profile.bio && (
      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-2">About Me</h3>
        <p className="text-gray-600">{profile.bio}</p>
      </div>
    )}

    {/* Instructor Certifications */}
    {profile.certificationLevel === "Instructor" && profile.instructorCertifications?.length > 0 && (
      <div className="mt-6">
        <h3 className="font-medium text-gray-900 mb-2">Instructor Certifications</h3>
        <div className="space-y-2">
          {profile.instructorCertifications.map((cert, index) => (
            <div key={index} className="text-sm text-gray-600">
              {cert.agency} - #{cert.number}
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Dive Trips */}
    <div className="mt-6">
      <h3 className="font-medium text-gray-900 mb-2">Dive Trips</h3>
      <div className="space-y-2 text-gray-600">
        {profile.favoritePlace && (
          <p>Favorite Place: {profile.favoritePlace}
            {profile.favoriteDivesite && ` - ${profile.favoriteDivesite}`}
          </p>
        )}
        {profile.diveTrips?.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-1">Trip History:</p>
            <div className="space-y-1">
              {profile.diveTrips
                .sort((a, b) => b.year - a.year)
                .map((trip, index) => (
                  <p key={index} className="text-sm">
                    {trip.year}: {trip.location}
                  </p>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Social Links */}
    {!profile.privacySettings?.hideSocial && profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
  <div className="mt-6">
    <h3 className="font-medium text-gray-900 mb-2">Connect</h3>
    <div className="flex space-x-4">
      {Object.entries(profile.socialLinks).map(([platform, url]) => (
        url && (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </a>
        )
      ))}
    </div>
  </div>
)}

{/* Membership Card Section */}
<div className="mt-8 border-t pt-6">
  <h3 className="font-medium text-gray-900 mb-4">Membership & Rewards</h3>
  
  <div className="space-y-6">
    <MembershipCard 
      tier={loyaltyData.currentTier?.tier}
      memberName={profile.name}
      memberId={user?.uid?.slice(-6)}
      joinDate={loyaltyData.joinDate}
    />
    
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Available Points</p>
        <p className="text-2xl font-bold text-gray-900">
          {loyaltyData.redeemablePoints.toLocaleString()}
        </p>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Lifetime Points</p>
        <p className="text-2xl font-bold text-gray-900">
          {loyaltyData.lifetimePoints.toLocaleString()}
        </p>
      </div>
    </div>

    {loyaltyData.transactions?.length > 0 && (
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Recent Transactions</h4>
        <div className="space-y-2">
          {loyaltyData.transactions.slice(0, 3).map((transaction, index) => (
            <div key={index} className="bg-white border rounded-lg p-3">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {transaction.type === 'earn' ? 'Points Earned' : 'Points Redeemed'}
                </span>
                <span className={`font-medium ${
                  transaction.type === 'earn' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'earn' ? '+' : '-'}{transaction.points}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(transaction.date?.seconds * 1000).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</div>

    {/* Edit Button */}
    <button
      onClick={() => setIsEditing(true)}
      className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
    >
      Edit Profile
    </button>
  </div>
)}
      </div>
    </div>
  );
}

export default Profile;