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

// Start with just two record types for testing
const TRAINING_RECORD_TYPES = [
  {
    id: 'certification-dive',
    name: 'Certification Dive Addendum',
    description: 'Basic certification dive requirements and verification'
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