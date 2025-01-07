import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { CheckCircle2, Circle, Save, Download } from 'lucide-react';
import { exportTrainingRecordToPDF } from '../../../utils/pdfExport';

const titleMapping = {
  academics: 'Academics',
  swimmingSkills: 'Swimming Skills',
  skinDiving: 'Skin Diving',
  prePostDive: 'Pre/Post Dive',
  surfaceSkills: 'Surface Skills',
  underwaterSkills: 'Underwater Skills',
  emergencySkills: 'Emergency Skills',
  appliedSciences: 'Applied Sciences',
  divingEquipment: 'Diving Equipment',
  divingSafety: 'Diving Safety',
  divingEnvironment: 'Diving Environment',
  divingActivities: 'Diving Activities',
  continuingEducation: 'Continuing Education',
  eLearning: 'eLearning',
  finalWrittenExam: 'Final Written Exam',
  contStrokeCycles: '15 Cont. Stroke Cycles',
  survivalSwim: '10min Survival Swim',
  underwaterSwim: '50ft U/W, 1 Breath',
  nonstopSwim: '450yds, Nonstop w/ Mask, Fins, Snorkel',
  recoverDiver: 'Recover Diver from 10ft',
  waterEntries: 'Water Entries & Exits',
  surfaceDives: 'Surface Dives',
  clearingSnorkel: 'Clearing the Snorkel',
  ditchingWeights: 'Ditching the weights',
  buoyancyControl: 'Buoyancy Control',
  underwaterSurface: 'U/W Swim & Surface',
  selectAssemble: 'Select, check assemble and don equipment',
  gearCheck: 'Pre-dive gear check for self and buddy',
  defogMask: 'Defog mask',
  equipmentCare: 'Doff, rinse and care for equipment',
  buoyancyCheck: 'Perform surface buoyancy check',
  communication: 'Surface Communication',
  bcdControl: 'Orally Inflate/Deflate BCD',
  equipmentHandling: 'Remove/Replace Equipment',
  snorkelBreathing: 'Face Submerged, Breath Through Snorkel, Rest/Swim',
  waterSnorkel: 'Face Submerged, Breath Through Water in Snorkel',
  regulatorExchange: 'Regulator/Snorkel Exchange while Swimming',
  crampRelease: 'Release Simulated Cramp for Self and Buddy',
  smbDeployment: 'Deploy/Retrieve an SMB',
  scubaRemoval: 'Remove/Replace SCUBA Unit on Surface',
  weightSystem: 'Demonstrate Proper Use of Selected Weight System',
  signals: 'Give, Recognize and Respond to U/W Signals',
  maskClearing: 'Mask Clearing Including Removal and Replacement',
  noMaskBreathing: 'Breath from SCUBA U/W w/o Mask',
  noMaskComfort: 'Demonstrate Comfort U/W w/o Mask',
  regulator: 'Remove, Replace & Clear Regulator',
  regulatorRecovery: 'Primary Regulator Recovery',
  powerInflator: 'Proper Power Inflator Usage',
  hover: 'Hover w/o Support',
  position: 'U/W Swimming w/ Proper Position and Trim',
  propulsion: 'Environmentally Appropriate Propulsion Techniques',
  scubaUnit: 'Remove/Replace SCUBA Unit',
  ballast: 'Ballast Remove/Replace/Adjust',
  buddySystem: 'Use of Buddy System',
  monitoring: 'Monitor Instruments and Communicate Effectively',
  compassNav: 'Environmental Compass Nav',
  problemSolving: 'Problem Solving Underwater',
  exhaustedDiver: 'Transport Simulated Exhausted Buddy 50yards',
  airSharingStationary: 'Share Air as Donor/Receiver while Stationary',
  emergencyAscent: 'Perform Controlled Emergency Swimming Ascent',
  airSharingAscent: 'Share Air as Donor/Receiver while Ascending',
  unconsciousDiver: 'Retrieve Unconscious Diver from 10ft',
  dive1: 'Open Water Dive #1',
  dive2: 'Open Water Dive #2',
  dive3: 'Open Water Dive #3',
  dive4: 'Open Water Dive #4',
};

const SkillItem = ({ name, completed, onComplete, date }) => {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <button 
          onClick={onComplete}
          className="focus:outline-none"
        >
          {completed ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" />
          )}
        </button>
        <span className={`${completed ? 'text-gray-700' : 'text-gray-600'}`}>
          {titleMapping[name] || name}
        </span>
      </div>
      {completed && (
        <span className="text-sm text-gray-500">
          {new Date(date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

const SkillSection = ({ title, skills, onComplete, progress }) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{titleMapping[title] || title}</CardTitle>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        {Object.entries(skills).map(([key, value]) => (
          <SkillItem
            key={key}
            name={key}
            completed={value.completed}
            date={value.date}
            onComplete={() => onComplete(key)}
          />
        ))}
      </CardContent>
    </Card>
  );
};

const NAUIScubaRecord = ({ courseId, studentId, isInstructor = false }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState("academics");
  const [record, setRecord] = useState({
    academics: {
      appliedSciences: { completed: false, date: null },
      divingEquipment: { completed: false, date: null },
      divingSafety: { completed: false, date: null },
      divingEnvironment: { completed: false, date: null },
      divingActivities: { completed: false, date: null },
      continuingEducation: { completed: false, date: null },
      eLearning: { completed: false, date: null },
      finalWrittenExam: { completed: false, date: null }
    },
    swimmingSkills: {
      contStrokeCycles: { completed: false, date: null },
      survivalSwim: { completed: false, date: null },
      underwaterSwim: { completed: false, date: null }
    },
    skinDiving: {
      nonstopSwim: { completed: false, date: null },
      recoverDiver: { completed: false, date: null },
      waterEntries: { completed: false, date: null },
      surfaceDives: { completed: false, date: null },
      clearingSnorkel: { completed: false, date: null },
      ditchingWeights: { completed: false, date: null },
      buoyancyControl: { completed: false, date: null },
      underwaterSurface: { completed: false, date: null }
    },
    prePostDive: {
      selectAssemble: { completed: false, date: null },
      gearCheck: { completed: false, date: null },
      defogMask: { completed: false, date: null },
      equipmentCare: { completed: false, date: null }
    },
    surfaceSkills: {
      buoyancyCheck: { completed: false, date: null },
      communication: { completed: false, date: null },
      bcdControl: { completed: false, date: null },
      equipmentHandling: { completed: false, date: null },
      snorkelBreathing: { completed: false, date: null },
      waterSnorkel: { completed: false, date: null },
      regulatorExchange: { completed: false, date: null },
      crampRelease: { completed: false, date: null },
      smbDeployment: { completed: false, date: null },
      scubaRemoval: { completed: false, date: null },
      weightSystem: { completed: false, date: null }
    },
    underwaterSkills: {
      signals: { completed: false, date: null },
      maskClearing: { completed: false, date: null },
      noMaskBreathing: { completed: false, date: null },
      noMaskComfort: { completed: false, date: null },
      regulator: { completed: false, date: null },
      regulatorRecovery: { completed: false, date: null },
      powerInflator: { completed: false, date: null },
      buoyancyControl: { completed: false, date: null },
      hover: { completed: false, date: null },
      position: { completed: false, date: null },
      propulsion: { completed: false, date: null },
      scubaUnit: { completed: false, date: null },
      ballast: { completed: false, date: null },
      buddySystem: { completed: false, date: null },
      monitoring: { completed: false, date: null },
      compassNav: { completed: false, date: null }
    },
    emergencySkills: {
      problemSolving: { completed: false, date: null },
      exhaustedDiver: { completed: false, date: null },
      airSharingStationary: { completed: false, date: null },
      emergencyAscent: { completed: false, date: null },
      airSharingAscent: { completed: false, date: null },
      unconsciousDiver: { completed: false, date: null }
    },
    openWater: {
      dive1: { completed: false, date: null, location: '' },
      dive2: { completed: false, date: null, location: '' },
      dive3: { completed: false, date: null, location: '' },
      dive4: { completed: false, date: null, location: '' }
    }
  });

  const [metadata, setMetadata] = useState({
    studentName: '',
    studentEmail: '',
    instructorName: '',
    instructorEmail: '',
    courseName: '',
    lastUpdated: null,
    updatedBy: null
  });

  useEffect(() => {
    const loadRecord = async () => {
      try {
        setLoading(true);
        setError('');

        // Verify course and permissions
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
          throw new Error('Course not found');
        }

        const courseData = courseSnap.data();
        const isStudentEnrolled = courseData.students?.some(s => s.uid === studentId);
        const isInstructorOfCourse = courseData.instructorId === user.uid;
        const hasAccess = isInstructorOfCourse || (studentId === user.uid && isStudentEnrolled);

        if (!hasAccess) {
          throw new Error('You do not have permission to access this record');
        }

        // Get student and instructor details
        const studentRef = doc(db, 'profiles', studentId);
        const studentSnap = await getDoc(studentRef);
        const studentData = studentSnap.data();

        const instructorRef = doc(db, 'profiles', courseData.instructorId);
        const instructorSnap = await getDoc(instructorRef);
        const instructorData = instructorSnap.data();

        // Update metadata
        setMetadata({
          studentName: studentData?.name || 'Unknown Student',
          studentEmail: studentData?.email || '',
          instructorName: instructorData?.name || 'Unknown Instructor',
          instructorEmail: instructorData?.email || '',
          courseName: courseData.name || '',
          lastUpdated: null,
          updatedBy: null
        });

        // Load existing record if it exists
        const recordRef = doc(db, 'courses', courseId, 'trainingRecords', studentId);
        const recordSnap = await getDoc(recordRef);

        if (recordSnap.exists()) {
          const recordData = recordSnap.data();
          setRecord(recordData.record);
          setMetadata(prev => ({
            ...prev,
            lastUpdated: recordData.lastUpdated,
            updatedBy: recordData.updatedBy
          }));
        }

      } catch (err) {
        console.error('Error loading record:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (courseId && studentId) {
      loadRecord();
    }
  }, [courseId, studentId, user.uid]);

  const calculateProgress = (section) => {
    const skills = record[section];
    if (!skills) return 0;
    const total = Object.keys(skills).length;
    if (total === 0) return 0;
    const completed = Object.values(skills).filter(s => s.completed).length;
    return (completed / total) * 100;
  };

  const handleComplete = (section, skill) => {
    if (!isInstructor) return;

    setRecord(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [skill]: {
          ...prev[section][skill],
          completed: !prev[section][skill].completed,
          date: !prev[section][skill].completed ? new Date().toISOString() : null
        }
      }
    }));
  };

  const handleOpenWaterLocation = (dive, location) => {
    if (!isInstructor) return;

    setRecord(prev => ({
      ...prev,
      openWater: {
        ...prev.openWater,
        [dive]: {
          ...prev.openWater[dive],
          location
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!isInstructor) return;

    try {
      setSaving(true);
      setError('');

      const recordData = {
        record,
        metadata: {
          ...metadata,
          lastUpdated: new Date().toISOString(),
          updatedBy: user.uid
        }
      };

      const recordRef = doc(db, 'courses', courseId, 'trainingRecords', studentId);
      await setDoc(recordRef, recordData);

      setMetadata(prev => ({
        ...prev,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.uid
      }));

    } catch (err) {
      console.error('Error saving record:', err);
      setError('Failed to save record');
    } finally {
        setSaving(false);
      }
    };
  
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading...</div>
        </div>
      );
    }
  
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">NAUI SCUBA Training Record</h1>
            <div className="text-sm text-gray-600 mt-1">
              <p>Student: {metadata.studentName} ({metadata.studentEmail})</p>
              <p>Instructor: {metadata.instructorName} ({metadata.instructorEmail})</p>
              <p>Course: {metadata.courseName}</p>
              {metadata.lastUpdated && (
                <p>Last updated: {new Date(metadata.lastUpdated).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          {isInstructor && (
            <div className="flex gap-2">
              <Button
                onClick={() => exportTrainingRecordToPDF(record, metadata)}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Record'}
              </Button>
            </div>
          )}
        </div>
  
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
  
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="academics">
              Academics
              {calculateProgress('academics') === 100 && 
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
            <TabsTrigger value="swimming">
              Swimming
              {calculateProgress('swimmingSkills') === 100 && 
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
            <TabsTrigger value="skinDiving">
              Skin Diving
              {calculateProgress('skinDiving') === 100 && 
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
            <TabsTrigger value="scubaSkills">
              SCUBA Skills
              {calculateProgress('prePostDive') === 100 && 
               calculateProgress('surfaceSkills') === 100 && 
               calculateProgress('underwaterSkills') === 100 &&
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
            <TabsTrigger value="emergency">
              Emergency
              {calculateProgress('emergencySkills') === 100 && 
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
            <TabsTrigger value="openWater">
              Open Water
              {calculateProgress('openWater') === 100 && 
                <CheckCircle2 className="ml-2 h-4 w-4 text-green-500" />
              }
            </TabsTrigger>
          </TabsList>
  
          <TabsContent value="academics">
            <SkillSection
              title="academics"
              skills={record.academics}
              onComplete={(skill) => handleComplete('academics', skill)}
              progress={calculateProgress('academics')}
            />
          </TabsContent>
  
          <TabsContent value="swimming">
            <SkillSection
              title="swimmingSkills"
              skills={record.swimmingSkills}
              onComplete={(skill) => handleComplete('swimmingSkills', skill)}
              progress={calculateProgress('swimmingSkills')}
            />
          </TabsContent>
  
          <TabsContent value="skinDiving">
            <SkillSection
              title="skinDiving"
              skills={record.skinDiving}
              onComplete={(skill) => handleComplete('skinDiving', skill)}
              progress={calculateProgress('skinDiving')}
            />
          </TabsContent>
  
          <TabsContent value="scubaSkills">
            <SkillSection
              title="prePostDive"
              skills={record.prePostDive}
              onComplete={(skill) => handleComplete('prePostDive', skill)}
              progress={calculateProgress('prePostDive')}
            />
            <SkillSection
              title="surfaceSkills"
              skills={record.surfaceSkills}
              onComplete={(skill) => handleComplete('surfaceSkills', skill)}
              progress={calculateProgress('surfaceSkills')}
            />
            <SkillSection
              title="underwaterSkills"
              skills={record.underwaterSkills}
              onComplete={(skill) => handleComplete('underwaterSkills', skill)}
              progress={calculateProgress('underwaterSkills')}
            />
          </TabsContent>
  
          <TabsContent value="emergency">
            <SkillSection
              title="emergencySkills"
              skills={record.emergencySkills}
              onComplete={(skill) => handleComplete('emergencySkills', skill)}
              progress={calculateProgress('emergencySkills')}
            />
          </TabsContent>
          <TabsContent value="openWater">
  <Card className="mb-4">
    <CardHeader>
      <CardTitle>Open Water Dives</CardTitle>
    </CardHeader>
    <CardContent>
      {Object.entries(record.openWater)
        .sort(([a], [b]) => {
          const numA = parseInt(a.replace('dive', ''));
          const numB = parseInt(b.replace('dive', ''));
          return numA - numB;
        })
        .map(([dive, data]) => (
          <div key={dive} className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => handleComplete('openWater', dive)}
              className="focus:outline-none"
            >
              {data.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300" />
              )}
            </button>
            <span>{titleMapping[dive] || dive}</span>
            <input
              type="text"
              placeholder="Location"
              value={data.location}
              onChange={(e) => handleOpenWaterLocation(dive, e.target.value)}
              className="flex-1 p-2 border rounded"
              disabled={!isInstructor}
            />
            {data.completed && (
              <span className="text-sm text-gray-500">
                {new Date(data.date).toLocaleDateString()}
              </span>
            )}
          </div>
        ))
      }
    </CardContent>
  </Card>
</TabsContent>
        </Tabs>
      </div>
    );
  };
  
  export default NAUIScubaRecord;