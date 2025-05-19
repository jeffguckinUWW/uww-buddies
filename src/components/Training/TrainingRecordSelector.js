import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

// Training record types including the updated Certification Dive Addendum
const TRAINING_RECORD_TYPES = [
  {
    id: 'certification-dive',
    name: 'Certification Dive Addendum',
    description: 'Basic certification dive requirements and verification',
    sections: [
      {
        title: 'Pre-Dive Verification',
        skills: [
          'Confined Water Training Passed, Verification',
          'Written Test Passed, Verification',
          'Medical Waiver Checked',
          'Liability Waiver w/ Certifying Instructor Listed'
        ]
      },
      {
        title: 'Open Water Dives',
        // Using a custom format for dives with multiple fields
        diveFormat: true,
        dives: [
          {
            title: 'Open Water Dive #1',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Open Water Dive #2',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Open Water Dive #3',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Open Water Dive #4',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          }
        ],
        // Adding these as skills also to ensure compatibility with the existing verification system
        skills: [
          'Open Water Dive #1',
          'Open Water Dive #2',
          'Open Water Dive #3',
          'Open Water Dive #4'
        ]
      }
    ],
    notes: {
      title: 'Instructor Notes and Observations',
      type: 'textarea'
    }
  },
  {
    id: 'naui-scuba',
    name: 'Open Water SCUBA Diver, NAUI',
    description: 'NAUI SCUBA certification requirements',
    sections: [
      {
        title: 'Academics',
        skills: [
          'Applied Sciences',
          'Diving Equipment',
          'Diving Safety',
          'Diving Environment',
          'Diving Activities',
          'Continuing Education',
          'eLearning',
          'Final Written Exam'
        ]
      },
      {
        title: 'Swimming Skills',
        skills: [
          '15 Cont. Stroke Cycles',
          '10min Survival Swim',
          '50ft U/W, 1 Breath'
        ]
      },
      {
        title: 'Skin Diving Skills',
        subheader: 'Using Proper Skin Diving Techniques',
        skills: [
          '450yds, Nonstop w/ Mask, Fins, Snorkel',
          'Recover Diver from 10ft',
          'Water Entries & Exits',
          'Surface Dives',
          'Clearing the Snorkel',
          'Ditching the Weights',
          'Buoyancy Control',
          'U/W Swim & Surface'
        ]
      },
      {
        title: 'SCUBA Diving Skills',
        subsections: [
          {
            title: 'Pre-Post Dive Skills',
            skills: [
              'Select, check assemble and don equipment',
              'Pre-dive gear check for self and buddy',
              'Defog mask',
              'Doff, rinse and care for equipment'
            ]
          },
          {
            title: 'Surface Skills',
            skills: [
              'Perform surface buoyancy check',
              'Surface Communication',
              'Orally Inflate/Deflate BCD',
              'Remove/Replace Equipment',
              'Face Submerged, Breath Through Snorkel, Rest/Swim',
              'Face Submerged, Breath Through Water in Snorkel',
              'Regulator/Snorkel Exchange while Swimming',
              'Release Simulated Cramp for Self and Buddy',
              'Deploy/Retrieve an SMB',
              'Remove/Replace SCUBA Unit on Surface',
              'Demonstrate Proper Use of Selected Weight System'
            ]
          },
          {
            title: 'Ascent/Descent Skills',
            skills: [
              'Control Pressure in Air Spaces',
              'Controlled Feet First Descent w/ Breath and BCD',
              'Controlled Ascent w/ Safety Stop'
            ]
          },
          {
            title: 'Planning Skills',
            skills: [
              'SAC Rate Calculation',
              'Plan & Make a No Deco Dive Between 40-60ft',
              'Calc. a No Deco Repetitive Dive w/ Tables or Computer',
            ]
          },
          {
            title: 'Environmental Skills',
            skills: [
              'Diving w/ Min Impact on Environ.',
              'Marine Life Identification'
            ]
          },
          {
            title: 'Underwater Skills',
            skills: [
              'Give, Recognize and Respond to U/W Signals',
              'Mask Clearing Including Removal and Replacement',
              'Breath from SCUBA U/W w/o Mask',
              'Demonstrate Comfort U/W w/o Mask',
              'Remove, Replace & Clear Regulator',
              'Primary Regulator Recovery',
              'Proper Power Inflator Usage',
              'Environmentally Appropriate Buoyancy Control',
              'Hover w/o Support',
              'U/W Swimming w/ Proper Position and Trim',
              'Environmentally Appropriate Propulsion Techniques',
              'Remove/Replace SCUBA Unit',
              'Ballast Remove/Replace/Adjust',
              'Use of Buddy System',
              'Monitor Instruments and Communicate Effectively',
              'Environmental Compass Nav',
              'Compass Nav/Bearing/Reciprocal'
            ]
          },
          {
            title: 'Emergency Skills',
            skills: [
              'Problem Solving Underwater',
              'Transport Simulated Exhausted Buddy 50yards',
              'Share Air as Donor/Receiver while Stationary',
              'Perform Controlled Emergency Swimming Ascent',
              'Share Air as Donor/Receiver while Ascending',
              'Retrieve Unconscious Diver from 10ft'
            ]
          }
        ]
      }
    ],
    notes: {
      title: 'Instructor Notes and Observations',
      type: 'textarea'
    }
  },
  {
    id: 'sdi-scuba',
    name: 'Open Water SCUBA Diver, SDI',
    description: 'SDI SCUBA certification requirements',
    sections: [
      {
        title: 'Academics',
        skills: [
          'Aquatic Environment',
          'Marine Life Injuries',
          'Physics & Physiology',
          'SCUBA Equipment',
          'Dive Planning',
          'Underwater Navigation',
          'eLearning',
          'Final Written Exam'
        ]
      },
      {
        title: 'Swimming Evaluation',
        skills: [
          'Distance Swim, 300m Nonstop, w/ Mask Fins and Snorkel',
          '10min Survival Swim'
        ]
      },
      {
        title: 'SCUBA Skills',
        subsections: [
          {
            title: 'Pre-Dive Skills',
            skills: [
              'SCUBA System Assembly/Disassembly',
              'Pre-Dive Check Self/Buddy',
              'Weight System Adjustment w/ Proper Weighting'
            ]
          },
          {
            title: 'In-Water Skills',
            skills: [
              'Removal/Replacement of Weights on Surface',
              'Removal/Replacement of Weights at Depth',
              'Partial Mask Clear at Depth',
              'Full Mask Clear at Depth',
              'Breathing & Swimming U/W w/o Mask',
              'Underwater Swimming w/ Proper Use of Fins',
              'Snorkel Use; Adjustment',
              'Snorkel Use; Clearing Blast Method',
              'Snorkel Use; Regulator Exchange on the Surface',
              'Surface Snorkel Swim in Full SCUBA Equipment'
            ]
          },
          {
            title: 'Buoyancy Skills',
            skills: [
              'BCD; Inflate/Deflate on Surface',
              'BCD; Inflate/Deflate at Depth',
              'BCD; Don/Doff on the Surface',
              'BCD;Don/Doff at Depth',
              'Buoyancy Control; Hovering',
              'Buoyancy Control; Ascent',
              'Buoyancy Control; Descent'
            ]
          },
          {
            title: 'Regulator Skills',
            skills: [
              'Regulator, Breath, Clear and Recover on Surface',
              'Regulator Breath, Clear and Recover at Depth'
            ]
          },
          {
            title: 'Exits and Entry Skills',
            skills: [
              'Entries/Exits; Controlled Seated Entry',
              'Entries/Exits; Giant Stride Entry',
              'Entries/Exits; Shallow Water Exit',
              'Entries/Exits; Deep Water Exit'
            ]
          },
          {
            title: 'Dive Planning',
            skills: [
              'Computer Use; Understanding the Functions of Computer',
              'Use of Gauges',
              'Underwater Communication',
              'Underwater Navigation',
              'Calculate a No Deco Repetitive Dive w/ Tables or Computer'
            ]
          },
          {
            title: 'Dive Emergencies',
            skills: [
              'Rescue Techniques; Tired Diver Tows',
              'Rescue Techniques; Cramp Relief',
              'Out of Air Emergency; Cont. Swimming Ascent',
              'Out of Air Emergency; Alternate Air Source Use'
            ]
          }
        ]
      }
    ],
    notes: {
      title: 'Instructor Notes and Observation',
      type: 'textarea'
    }
  },
  {
    id: 'naui-advanced-scuba',
    name: 'Advanced SCUBA Diver, NAUI',
    description: 'NAUI Advanced SCUBA certification requirements',
    sections: [
      {
        title: 'Academics',
        skills: [
          'Intro to Navigation, Planning and Debriefing',
          'Intro to Night/Low Visibility, Planning and Debriefing',
          'Intro to Deep Diving, Planning and Debriefing',
          'Intro to ___________________, Planning and Debriefing',
          'Intro to ___________________, Planning and Debriefing',
          'Intro to ___________________, Planning and Debriefing',
          'eLearning',
          'Final Written Exam'
        ]
      },
      {
        title: 'Practical Skills',
        skills: [
          'Review Dive Planning, Rescue Skills and Assist Skills',
          'Record Dives in Logbooks',
          'Conduct Appropriate Skills for all Dives'
        ]
      },
      {
        title: 'Required Dives',
        // Using a custom format for dives with multiple fields
        diveFormat: true,
        dives: [
          {
            title: 'Navigation',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Night/Low Visibility',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Deep Dive (130\' Max)',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
        ],
        // Adding these as skills also to ensure compatibility with the existing verification system
        skills: [
          'Navigation',
          'Night/Low Visibility',
          'Deep Dive (130\' Max)'
        ]
      },
      {
        title: 'Elective Dives',
        diveFormat: true,
        dives: [
          {
            title: 'Elective Dive #1',
            fields: [
              { name: 'Dive Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Elective Dive #2',
            fields: [
              { name: 'Dive Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Elective Dive #3',
            fields: [
              { name: 'Dive Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          }
        ],
        // Skills for verification
        skills: [
          'Elective Dive #1',
          'Elective Dive #2',
          'Elective Dive #3'
        ]
      }
    ],
    notes: {
      title: 'Instructor Notes and Observations',
      type: 'textarea'
    }
  },
  {
    id: 'sdi-advanced-scuba',
    name: 'Advanced Adventurer SCUBA Diver, SDI',
    description: 'SDI Advanced Adventurer certification requirements',
    sections: [
      {
        title: 'Academics',
        subsections: [
          {
            title: 'Deep Diver Academics',
            skills: [
              'Diving Tables & Computers',
              'Speciality Equipment',
              'Physics and Physiology',
              'Emergency Procedures',
              'Review of First Aid'
            ]
          },
          {
            title: 'Navigation Academics',
            skills: [
              'Aquatic Environment',
              'Natural Navigation',
              'Compass Understanding',
              'Use of Compass',
              'Estimating Distance Underwater'
            ]
          },
          {
            title: 'Elective Academics',
            skills: [
              'Intro/Overview of ___________________',
              'Intro/Overview of ___________________',
              'Intro/Overview of ___________________'
            ]
          }
        ]
      },
      {
        title: 'Practical Skills',
        subsections: [
          {
            title: 'Deep Dive',
            skills: [
              'Test and Check All Equipment',
              'Familiarization of the Dive Area',
              'Descend to Planned Depth and Do Not Exceed any Limits',
              'Dive According to Plan and Do Not Exceed 100ft',
              'Ascend and Complete a Safety Stop'
            ]
          },
          {
            title: 'Navigation Dive',
            skills: [
              'Plan a Dive',
              'Enter Water from Boat or Shore',
              'Practice Out and Back Technique',
              'Squares and Triangles on the Surface',
              'Squares and Triangles on the Bottom',
              'Ascend and Exit the Water'
            ]
          },
          {
            title: 'Speciality Dive Skills',
            skills: [
              'Dive 1 Skills from Speciality #1',
              'Dive 1 Skills from Speciality #2',
              'Dive 1 Skills from Speciality #3'
            ]
          }
        ]
      },
      {
        title: 'Required Dives',
        diveFormat: true,
        dives: [
          {
            title: 'Deep Dive',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Navigation Dive',
            fields: [
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Speciality Dive #1',
            fields: [
              { name: 'Speciality Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Speciality Dive #2',
            fields: [
              { name: 'Speciality Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          },
          {
            title: 'Speciality Dive #3',
            fields: [
              { name: 'Speciality Type', type: 'text' },
              { name: 'Dive Date', type: 'date' },
              { name: 'Dive Location', type: 'text' },
              { name: 'Max Depth', type: 'number' },
              { name: 'Dive Time', type: 'text' }
            ]
          }
        ],
        skills: [
          'Deep Dive',
          'Navigation Dive',
          'Speciality Dive #1',
          'Speciality Dive #2', 
          'Speciality Dive #3'
        ]
      }
    ],
    notes: {
      title: 'Instructor Notes and Observations',
      type: 'textarea'
    }
  }
];

const TrainingRecordSelector = ({ isOpen, onClose, onSelect }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Training Record Type</DialogTitle>
          <DialogDescription>
            Choose a training record template for this course. You can change this later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {TRAINING_RECORD_TYPES.map((recordType) => (
            <Card
              key={recordType.id}
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(recordType)}
            >
              <h3 className="font-semibold mb-2">{recordType.name}</h3>
              <p className="text-sm text-gray-600">{recordType.description}</p>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingRecordSelector;