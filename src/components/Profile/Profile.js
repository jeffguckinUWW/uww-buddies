import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Keep your existing InstructorCertificationFields component exactly as it is
const InstructorCertificationFields = ({ certifications = [], onChange }) => {
  // Your existing component code...
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

// Keep your existing EditForm component exactly as it is
const EditForm = ({ 
  formData, 
  onInputChange, 
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
    {/* Profile Picture Upload */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
      <div>
        {formData.photoURL && (
          <button type="button" onClick={onDeletePhoto} className="mt-1 text-sm text-red-600 hover:text-red-800">
            Delete Photo
          </button>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      <p className="mt-1 text-sm text-gray-500">Maximum file size: 5MB. Supported formats: JPEG, PNG, GIF</p>
    </div>

    {/* Name */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Name</label>
      <input
        type="text"
        name="name"
        value={formData.name || ''}
        onChange={onInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Your name"
      />
    </div>

    {/* Phone Number */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
      <div className="mt-1 flex items-center space-x-3">
        <input
          type="tel"
          name="phone"
          value={formData.phone || ''}
          onChange={onInputChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Your phone number"
        />
        <label className="flex items-center">
          <input
            type="checkbox"
            name="hidePhone"
            checked={formData.hidePhone || false}
            onChange={onInputChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-600">Hide</span>
        </label>
      </div>
    </div>

    {/* Email */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Email</label>
      <div className="mt-1 flex items-center space-x-3">
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={onInputChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Your email"
        />
        <label className="flex items-center">
          <input
            type="checkbox"
            name="hideEmail"
            checked={formData.hideEmail || false}
            onChange={onInputChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-600">Hide</span>
        </label>
      </div>
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

    {/* Show Instructor Certification fields only when Instructor is selected */}
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

    {/* Number of Dives */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Number of Dives</label>
      <input
        type="number"
        name="numberOfDives"
        value={formData.numberOfDives || 0}
        onChange={onInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        min="0"
      />
    </div>

    {/* Form Buttons */}
    <div className="flex justify-end space-x-3">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {isLoading ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  </form>
);

function Profile() {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    photoURL: '',
    name: '',
    phone: '',
    email: user?.email || '',
    certificationLevel: '',
    specialties: [],
    numberOfDives: 0,
    hideEmail: false,
    hidePhone: false,
    instructorCertifications: []
  });
  const [profile, setProfile] = useState({
    photoURL: '',
    name: '',
    phone: '',
    email: user?.email || '',
    certificationLevel: '',
    specialties: [],
    numberOfDives: 0,
    hideEmail: false,
    hidePhone: false,
    instructorCertifications: []
  });

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
    "Deep Diver",
    "Underwater Navigator",
    "Solo Diver"
  ];

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const validateImage = (file) => {
    if (!file) return "No file selected";
    if (!file.type.startsWith('image/')) return "File must be an image";
    if (file.size > MAX_FILE_SIZE) return "File size must be less than 5MB";
    return null;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.uid) {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setProfile(profileData);
          setFormData(profileData);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      const currentPhotoURL = formData.photoURL;
  
      if (currentPhotoURL) {
        const filePath = decodeURIComponent(new URL(currentPhotoURL).pathname.split('/o/')[1]);
        await deleteObject(ref(storage, filePath));
  
        const updatedProfile = { ...profile, photoURL: '' };
        await setDoc(doc(db, 'profiles', user.uid), updatedProfile);
        setProfile(updatedProfile);
        setFormData(prev => ({
          ...prev,
          photoURL: ''
        }));
        alert('Profile picture deleted successfully');
      } else {
        console.log('No profile picture found.');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting profile picture');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let photoURL = formData.photoURL;
      if (profileImage) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${profileImage.name}`;
        const storageRef = ref(storage, `users/${user.uid}/profile/${fileName}`);
        const arrayBuffer = await profileImage.arrayBuffer();
        const metadata = {
          contentType: profileImage.type,
        };
        
        console.log('Starting upload...');
        const uploadTask = await uploadBytes(storageRef, arrayBuffer, metadata);
        console.log('Upload successful');

        photoURL = await getDownloadURL(uploadTask.ref);
        console.log('Got download URL:', photoURL);
      }
  
      const updatedProfile = {
        ...formData,
        photoURL,
        updatedAt: new Date().toISOString()
      };
  
      // Update both Firestore profile and Auth profile
      await Promise.all([
        setDoc(doc(db, 'profiles', user.uid), updatedProfile),
        updateUserProfile(formData.name, photoURL)
      ]);

      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error updating profile: ' + error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {isEditing ? (
          <EditForm
            formData={formData}
            onInputChange={handleInputChange}
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
            {/* Profile Display */}
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
              <h2 className="text-2xl font-bold text-gray-900">{profile.name || 'New Diver'}</h2>
              {profile.certificationLevel && (
                <p className="text-blue-600 mt-1">{profile.certificationLevel}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="mt-6 space-y-2">
              {!profile.hideEmail && profile.email && (
                <p className="text-gray-600">
                  <span className="font-medium">Email:</span> {profile.email}
                </p>
              )}
              {!profile.hidePhone && profile.phone && (
                <p className="text-gray-600">
                  <span className="font-medium">Phone:</span> {profile.phone}
                </p>
              )}
              <p className="text-gray-600">
                <span className="font-medium">Total Dives:</span> {profile.numberOfDives}
              </p>
            </div>

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

            {/* Specialties */}
            {profile.specialties?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(true)}
              className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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