import React from 'react';
import { TRAINING_RECORD_TYPES } from '../../../constants/trainingRecords';
import NAUIScubaRecord from './NAUIScubaRecord';

const TrainingRecord = ({ type, ...props }) => {
  switch (type) {
    case TRAINING_RECORD_TYPES.NAUI_SCUBA:
      return <NAUIScubaRecord {...props} />;
    // Add more cases as you add more record types
    // case TRAINING_RECORD_TYPES.ADVANCED_OPEN_WATER:
    //   return <AdvancedOpenWaterRecord {...props} />;
    default:
      return (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-yellow-700">Unknown training record type: {type}</p>
        </div>
      );
  }
};

export default TrainingRecord;