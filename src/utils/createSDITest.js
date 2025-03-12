// SDI Open Water Diver Practice Test
// This code can be run to add the quiz directly to your Firestore database

import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Function to create the SDI Open Water Test
const createSDIOpenWaterTest = async () => {
  try {
    // 1. Create a category if it doesn't exist
    const categoryId = "practice-certification-tests";
    await setDoc(doc(db, 'quizCategories', categoryId), {
      id: categoryId,
      title: "Practice Certification Tests",
      description: "Prepare for diving certification with these practice tests from various certification agencies.",
      icon: "certification",
      quizCount: 1 // Will be incremented when quiz is added
    }, { merge: true });

    // 2. Create the SDI Open Water quiz
    const quizId = "sdi-open-water-diver";
    await setDoc(doc(db, 'quizzes', quizId), {
      id: quizId,
      title: "SDI Open Water Diver Certification",
      categoryId: categoryId,
      difficulty: "intermediate",
      certificationLevel: "openwater",
      questionCount: 50,
      completedBy: [],
      questions: [
        {
          question: "What does SDI stand for?",
          imageUrl: null,
          answers: [
            "Scuba Diving International",
            "Specialty Diving Institute",
            "Scuba Divers International",
            "Sport Diving Industry"
          ],
          correctAnswer: 0,
          explanation: "SDI stands for Scuba Diving International, one of the largest certification agencies for recreational scuba diving."
        },
        {
          question: "What is the proper way to equalize pressure in your ears when descending?",
          imageUrl: null,
          answers: [
            "Swallowing repeatedly",
            "Exhaling through your nose while pinching it closed",
            "Yawning or wiggling your jaw",
            "All of the above are acceptable methods"
          ],
          correctAnswer: 3,
          explanation: "All these methods can help equalize pressure in your middle ear. The Valsalva maneuver (pinching your nose and gently blowing) is common, but swallowing, yawning, and jaw movements can also help equalize pressure."
        },
        {
          question: "What gas is primarily responsible for decompression sickness?",
          imageUrl: null,
          answers: [
            "Oxygen",
            "Carbon Dioxide",
            "Nitrogen",
            "Helium"
          ],
          correctAnswer: 2,
          explanation: "Nitrogen is the gas primarily responsible for decompression sickness. Under pressure, it dissolves in body tissues and must be released slowly during ascent to prevent bubble formation."
        },
        {
          question: "What is the primary function of the BCD (Buoyancy Control Device)?",
          imageUrl: null,
          answers: [
            "To regulate air flow to the regulator",
            "To provide emergency flotation only",
            "To control buoyancy throughout the dive",
            "To hold the dive tank in position"
          ],
          correctAnswer: 2,
          explanation: "The primary function of a BCD is to allow the diver to control buoyancy throughout the dive by adding or releasing air, helping maintain neutral buoyancy at various depths."
        },
        {
          question: "What is the recommended maximum ascent rate in recreational diving?",
          imageUrl: null,
          answers: [
            "10 feet (3 meters) per minute",
            "30 feet (9 meters) per minute",
            "60 feet (18 meters) per minute",
            "As fast as possible to conserve air"
          ],
          correctAnswer: 1,
          explanation: "The recommended maximum ascent rate is 30 feet (9 meters) per minute. This allows adequate nitrogen off-gassing to prevent decompression sickness."
        },
        {
          question: "SDI recommends that recreational divers not exceed which depth?",
          imageUrl: null,
          answers: [
            "60 feet (18 meters)",
            "100 feet (30 meters)",
            "130 feet (40 meters)",
            "165 feet (50 meters)"
          ],
          correctAnswer: 2,
          explanation: "SDI recommends that recreational divers stay within a maximum depth of 130 feet (40 meters) when diving with regular air."
        },
        {
          question: "Why should you never hold your breath while scuba diving?",
          imageUrl: null,
          answers: [
            "It uses too much air in your tank",
            "It can cause lung overexpansion injuries during ascent",
            "It increases nitrogen absorption",
            "It makes you sink faster"
          ],
          correctAnswer: 1,
          explanation: "Never hold your breath while scuba diving, especially during ascent, as expanding air can cause serious lung overexpansion injuries including arterial gas embolism."
        },
        {
          question: "What is the primary purpose of a safety stop?",
          imageUrl: null,
          answers: [
            "To check your equipment",
            "To allow your body to release excess nitrogen",
            "To conserve air for emergency situations",
            "To communicate with your dive buddy"
          ],
          correctAnswer: 1,
          explanation: "A safety stop (typically 3 minutes at 15 feet/5 meters) allows your body additional time to release excess nitrogen, reducing the risk of decompression sickness."
        },
        {
          question: "When diving in cold water, your air consumption will typically:",
          imageUrl: null,
          answers: [
            "Increase",
            "Decrease",
            "Remain the same as in warm water",
            "Fluctuate unpredictably"
          ],
          correctAnswer: 0,
          explanation: "Air consumption typically increases in cold water due to the body expending more energy to maintain core temperature and the tendency to breathe more rapidly."
        },
        {
          question: "What should you do if you run out of air underwater?",
          imageUrl: null,
          answers: [
            "Immediately swim to the surface as fast as possible",
            "Drop your weights and make a buoyant emergency ascent",
            "Signal your buddy that you're out of air and share air while making a normal ascent",
            "Hold your breath until you reach the surface"
          ],
          correctAnswer: 2,
          explanation: "If you run out of air, signal your buddy with the out-of-air signal, obtain their alternate air source, and make a normal, controlled ascent together."
        },
        {
          question: "Which regulator component reduces tank pressure to intermediate pressure?",
          imageUrl: null,
          answers: [
            "First stage",
            "Second stage",
            "Alternate air source",
            "Submersible pressure gauge"
          ],
          correctAnswer: 0,
          explanation: "The first stage of the regulator attaches to the tank valve and reduces the high pressure air to an intermediate pressure that the second stage can safely handle."
        },
        {
          question: "What does a submersible pressure gauge (SPG) measure?",
          imageUrl: null,
          answers: [
            "Water temperature",
            "Water pressure at depth",
            "Air pressure remaining in your tank",
            "Your rate of air consumption"
          ],
          correctAnswer: 2,
          explanation: "The submersible pressure gauge (SPG) displays the pressure of the air remaining in your tank, allowing you to monitor your air supply throughout the dive."
        },
        {
          question: "What is nitrogen narcosis?",
          imageUrl: null,
          answers: [
            "A buildup of nitrogen bubbles in the bloodstream",
            "An impairment of judgment and motor skills due to nitrogen at depth",
            "The need to do decompression stops",
            "A toxic reaction to breathing compressed air"
          ],
          correctAnswer: 1,
          explanation: "Nitrogen narcosis is an impairment of neurological function, caused by nitrogen under pressure, affecting judgment, coordination, and decision-making at depth. Effects increase with depth and are often compared to alcohol intoxication."
        },
        {
          question: "What should you do before every dive?",
          imageUrl: null,
          answers: [
            "Hyperventilate to increase oxygen levels",
            "Perform a pre-dive safety check of your equipment",
            "Measure the barometric pressure",
            "Take seasickness medication"
          ],
          correctAnswer: 1,
          explanation: "A thorough pre-dive safety check should be performed before every dive to verify that all equipment is functioning properly and set up correctly."
        },
        {
          question: "What is the purpose of dive planning?",
          imageUrl: null,
          answers: [
            "To maximize bottom time at any cost",
            "To ensure safe, enjoyable dives within personal and environmental limitations",
            "To reduce equipment requirements",
            "To eliminate the need for dive tables"
          ],
          correctAnswer: 1,
          explanation: "Dive planning ensures dives are conducted safely by considering factors like depth, time, air consumption, environmental conditions, and diver experience to stay within safe limits."
        },
        {
          question: "What information does a dive computer provide?",
          imageUrl: null,
          answers: [
            "Only depth and time",
            "Only no-decompression limits",
            "Depth, time, no-decompression limits, and ascent rate",
            "Only water temperature"
          ],
          correctAnswer: 2,
          explanation: "Modern dive computers track and display depth, dive time, no-decompression limits, ascent rate, and often additional information like water temperature and gas consumption."
        },
        {
          question: "What is the buddy system?",
          imageUrl: null,
          answers: [
            "A system where instructors are assigned to students",
            "Diving with a partner who can assist in case of emergency",
            "A method for calculating decompression stops",
            "A type of equipment rental program"
          ],
          correctAnswer: 1,
          explanation: "The buddy system means diving with a partner who stays close, monitors your condition, and can assist in emergencies, enhancing diving safety through mutual support."
        },
        {
          question: "What action is most important if you feel panicked underwater?",
          imageUrl: null,
          answers: [
            "Immediately ascend to the surface",
            "Stop, breathe, think, and then act",
            "Inflate your BCD fully",
            "Use your alternate air source"
          ],
          correctAnswer: 1,
          explanation: "If you feel panicked underwater, the most important action is to stop, focus on slow, deep breathing to regain control, think about the situation calmly, and then take appropriate action."
        },
        {
          question: "How often should scuba tanks be hydrostatically tested?",
          imageUrl: null,
          answers: [
            "After every 50 dives",
            "Monthly",
            "Every 5 years in most countries",
            "Only when visible damage occurs"
          ],
          correctAnswer: 2,
          explanation: "In most countries including the US, scuba tanks must be hydrostatically tested every 5 years to ensure structural integrity and safety for continued use."
        },
        {
          question: "What is the primary cause of most diving accidents?",
          imageUrl: null,
          answers: [
            "Equipment failure",
            "Environmental conditions",
            "Human error",
            "Marine life encounters"
          ],
          correctAnswer: 2,
          explanation: "Human error, including poor judgment, inadequate training, exceeding personal limitations, and panic, is the primary cause of most diving accidents and incidents."
        },
        {
          question: "What should you use to clear water from your mask while underwater?",
          imageUrl: null,
          answers: [
            "Remove the mask completely and replace it",
            "Blow air out through your mouth while looking down",
            "Exhale through your nose while pressing the top of the mask",
            "Use your alternate air source to blow water out"
          ],
          correctAnswer: 2,
          explanation: "To clear water from your mask, press the top of the mask against your forehead while looking slightly downward, and exhale gently through your nose to force water out the bottom."
        },
        {
          question: "What is the recommended surface interval between repetitive dives?",
          imageUrl: null,
          answers: [
            "At least 10 minutes",
            "At least 30 minutes",
            "At least 1 hour",
            "At least 2 hours"
          ],
          correctAnswer: 2,
          explanation: "At least 1 hour surface interval is recommended between dives to allow adequate off-gassing of nitrogen, though longer intervals provide greater safety margins."
        },
        {
          question: "What should you do if caught in a strong current?",
          imageUrl: null,
          answers: [
            "Swim directly against the current",
            "Hold your breath to reduce energy expenditure",
            "Swim with the current or diagonal to it",
            "Inflate your BCD fully and float on the surface"
          ],
          correctAnswer: 2,
          explanation: "When caught in a strong current, swim with it or diagonal to it rather than directly against it, which quickly depletes energy and air. Use terrain or line features if available."
        },
        {
          question: "What position provides the best hydrodynamics underwater?",
          imageUrl: null,
          answers: [
            "Vertical with legs down",
            "Horizontal with arms at sides",
            "Swimming on your side",
            "Curled in a ball"
          ],
          correctAnswer: 1,
          explanation: "A horizontal trim position with arms at your sides provides the best hydrodynamics underwater, reducing drag and improving efficiency and control."
        },
        {
          question: "The \"rule of thirds\" for air management means:",
          imageUrl: null,
          answers: [
            "Dive to 1/3 of your certification depth",
            "Use 1/3 of your air for descent, 1/3 for the dive, and 1/3 for ascent",
            "Use 1/3 of your air to reach your destination, 1/3 to return, and keep 1/3 in reserve",
            "Breathe at 1/3 your normal rate"
          ],
          correctAnswer: 2,
          explanation: "The 'rule of thirds' means using 1/3 of your air supply to reach your destination, 1/3 to return, and keeping 1/3 as a safety reserve for emergencies or contingencies."
        },
        {
          question: "What is the first sign of nitrogen narcosis that most divers notice?",
          imageUrl: null,
          answers: [
            "Headache",
            "Nausea",
            "Feeling of euphoria or impaired judgment",
            "Loss of consciousness"
          ],
          correctAnswer: 2,
          explanation: "The first signs of nitrogen narcosis typically include euphoria, impaired judgment, or a feeling similar to mild alcohol intoxication, often with overconfidence and delayed responses."
        },
        {
          question: "What does the acronym DCS stand for in diving?",
          imageUrl: null,
          answers: [
            "Diving Control System",
            "Decompression Sickness",
            "Dive Computer Settings",
            "Depth Control Sequence"
          ],
          correctAnswer: 1,
          explanation: "DCS stands for Decompression Sickness, a condition caused by nitrogen bubbles forming in tissues and bloodstream when ascending too quickly from depth."
        },
        {
          question: "What hand signal indicates 'Something is wrong'?",
          imageUrl: null,
          answers: [
            "Thumbs down",
            "Hand flat, rocking back and forth",
            "Circle with thumb and forefinger",
            "Slashing motion across throat"
          ],
          correctAnswer: 1,
          explanation: "The hand signal for 'something is wrong' is a flat hand rocking back and forth (like a wobbly airplane), indicating a problem without specifying its nature."
        },
        {
          question: "What is the most important action when diving in an environment with limited visibility?",
          imageUrl: null,
          answers: [
            "Use a dive light regardless of time of day",
            "Maintain physical or visual contact with your buddy",
            "Descend more slowly than normal",
            "Use a compass at all times"
          ],
          correctAnswer: 1,
          explanation: "In limited visibility, maintaining close contact with your buddy (either physical contact or close visual range) is most important to prevent separation and ensure assistance is available."
        },
        {
          question: "What should you do if your regulator free-flows underwater?",
          imageUrl: null,
          answers: [
            "Continue breathing from it normally",
            "Switch to your alternate air source immediately",
            "Continue breathing while controlling the free flow, and begin a controlled ascent",
            "Remove it from your mouth and hold your breath"
          ],
          correctAnswer: 2,
          explanation: "If your regulator free-flows, continue breathing from it while controlling the flow if possible, and begin a controlled ascent. A free-flowing regulator still provides air, though it wastes supply."
        },
        {
          question: "At what depth does pressure double from atmospheric pressure at the surface?",
          imageUrl: null,
          answers: [
            "10 feet (3 meters)",
            "33 feet (10 meters)",
            "66 feet (20 meters)",
            "99 feet (30 meters)"
          ],
          correctAnswer: 1,
          explanation: "Pressure doubles from 1 atmosphere at the surface to 2 atmospheres at 33 feet (10 meters) of depth in saltwater."
        },
        {
          question: "What is the proper response to ear pain during descent?",
          imageUrl: null,
          answers: [
            "Descend faster to push through the pain",
            "Continue descending but equalize more frequently",
            "Stop descending, ascend slightly if needed, and equalize",
            "Take decongestant immediately underwater"
          ],
          correctAnswer: 2,
          explanation: "If you experience ear pain during descent, stop immediately, ascend slightly if needed to relieve the pressure, and then attempt to equalize. Never force descent through ear pain."
        },
        {
          question: "When should you perform a safety stop?",
          imageUrl: null,
          answers: [
            "Only after dives deeper than 100 feet",
            "Only when required by dive tables or computer",
            "After every dive regardless of depth",
            "Only after diving for more than 45 minutes"
          ],
          correctAnswer: 2,
          explanation: "Safety stops (typically 3 minutes at 15-20 feet) should be performed after every dive regardless of depth, as they significantly reduce the risk of decompression sickness."
        },
        {
          question: "What factor does NOT affect a diver's air consumption rate?",
          imageUrl: null,
          answers: [
            "Physical fitness",
            "Depth",
            "The color of their wetsuit",
            "Water temperature"
          ],
          correctAnswer: 2,
          explanation: "The color of a wetsuit has no effect on air consumption. Key factors include depth (which directly affects consumption due to pressure), physical exertion, fitness, temperature, and psychological factors like stress."
        },
        {
          question: "What is the purpose of a weight check before diving?",
          imageUrl: null,
          answers: [
            "To look good in photographs",
            "To achieve proper buoyancy with appropriate weighting",
            "To prevent the tank from floating away",
            "To calculate your Body Mass Index (BMI)"
          ],
          correctAnswer: 1,
          explanation: "A weight check ensures you're properly weighted for the conditions, equipment, and exposure protection, allowing you to achieve neutral buoyancy at depth and maintain proper position in the water."
        },
        {
          question: "What does the term 'MOD' refer to in diving?",
          imageUrl: null,
          answers: [
            "Method Of Diving",
            "Maximum Operating Depth",
            "Minimum Oxygen Demand",
            "Multiple Option Diving"
          ],
          correctAnswer: 1,
          explanation: "MOD stands for Maximum Operating Depth, which is the deepest depth at which a specific breathing gas can be safely used based on its oxygen content to avoid oxygen toxicity."
        },
        {
          question: "What is the most appropriate response if you and your buddy become separated underwater?",
          imageUrl: null,
          answers: [
            "Continue the dive alone",
            "Search for one minute, then ascend if unable to reunite",
            "Descend deeper to look for your buddy",
            "Surface immediately regardless of your depth"
          ],
          correctAnswer: 1,
          explanation: "If separated from your buddy, search for approximately one minute while maintaining your depth. If you cannot find your buddy, make a normal, controlled ascent and reunite at the surface."
        },
        {
          question: "How does depth affect air consumption?",
          imageUrl: null,
          answers: [
            "Air consumption decreases with depth",
            "Air consumption remains constant regardless of depth",
            "Air consumption increases proportionally with increased pressure",
            "Air consumption is only affected by temperature, not depth"
          ],
          correctAnswer: 2,
          explanation: "Air consumption increases proportionally with pressure. At 33 feet (2 ATA), you consume twice as much air as at the surface; at 66 feet (3 ATA), you consume three times as much."
        },
        {
          question: "What is the purpose of a dive log?",
          imageUrl: null,
          answers: [
            "Only to qualify for advanced certifications",
            "To track experience, conditions, equipment, and observations for future reference",
            "Only to record equipment purchases",
            "To calculate taxes on diving expenses"
          ],
          correctAnswer: 1,
          explanation: "A dive log documents your experience, tracks dive conditions, equipment configurations, air consumption patterns, and observations, providing valuable reference for future planning and proof of experience."
        },
        {
          question: "How should a wetsuit fit properly?",
          imageUrl: null,
          answers: [
            "Loose and comfortable like regular clothing",
            "Snug with minimal water entry but allowing full movement",
            "As tight as possible regardless of comfort",
            "Only tight around the torso, loose in the extremities"
          ],
          correctAnswer: 1,
          explanation: "A wetsuit should fit snugly to minimize water entry and maintain warmth, but should allow full range of motion, particularly in the shoulders, arms, and legs."
        },
        {
          question: "What is the most important rule when diving from a boat?",
          imageUrl: null,
          answers: [
            "Always dive near the anchor line",
            "Always be the first one in the water",
            "Listen to and follow the boat captain's and dive leader's instructions",
            "Always dive in pairs"
          ],
          correctAnswer: 2,
          explanation: "The most important rule when diving from a boat is to listen to and follow all instructions from the boat captain and dive leaders, who are responsible for safety procedures specific to their vessel and dive site."
        },
        {
          question: "What is the primary purpose of the octopus regulator (alternate air source)?",
          imageUrl: null,
          answers: [
            "To provide air to another diver in an out-of-air emergency",
            "To use when your primary regulator malfunctions",
            "To connect to your BCD inflator",
            "All of the above"
          ],
          correctAnswer: 0,
          explanation: "The primary purpose of the octopus (alternate air source) is to provide air to another diver in an out-of-air emergency, allowing air-sharing during a controlled ascent."
        },
        {
          question: "What is the proper technique for mask clearing?",
          imageUrl: null,
          answers: [
            "Breathing rapidly through your regulator",
            "Removing the mask completely and putting it back on",
            "Looking down and exhaling through your nose while pressing the top of the mask",
            "Holding your breath and removing water with your hand"
          ],
          correctAnswer: 2,
          explanation: "To clear a mask, look slightly downward, press the top of the mask against your forehead to create a seal, and exhale slowly but steadily through your nose to force water out the bottom."
        },
        {
          question: "What is the correct way to respond to a leg cramp underwater?",
          imageUrl: null,
          answers: [
            "Ignore it and continue diving",
            "Ascend immediately to the surface",
            "Stretch the affected muscle and massage it",
            "Add more weight to reduce strain"
          ],
          correctAnswer: 2,
          explanation: "For a leg cramp underwater, stop activity, extend the affected limb, and stretch/massage the cramped muscle. For calf cramps, point your toe toward your shin while maintaining the leg extension."
        },
        {
          question: "What should be included in a basic dive plan?",
          imageUrl: null,
          answers: [
            "Only maximum depth",
            "Only dive duration",
            "Maximum depth, duration, minimum air pressure to exit, entry/exit points, and buddy separation procedures",
            "Only the dive site name"
          ],
          correctAnswer: 2,
          explanation: "A complete dive plan includes maximum depth, dive duration, minimum air pressure to end the dive, entry/exit points, navigation plan, and emergency procedures including buddy separation protocols."
        },
        {
          question: "How often should regulators be serviced?",
          imageUrl: null,
          answers: [
            "Only when they malfunction",
            "Every 5 years",
            "According to manufacturer recommendations, typically annually",
            "After every 10 dives"
          ],
          correctAnswer: 2,
          explanation: "Regulators should be professionally serviced according to manufacturer recommendations, which is typically annually or after a specified number of dives, regardless of apparent condition."
        },
        {
          question: "What is the greatest danger associated with breath-holding while ascending?",
          imageUrl: null,
          answers: [
            "Nitrogen narcosis",
            "Oxygen toxicity",
            "Lung overexpansion and arterial gas embolism",
            "Increased heart rate"
          ],
          correctAnswer: 2,
          explanation: "Breath-holding during ascent can lead to lung overexpansion as the air in your lungs expands with decreasing pressure, potentially causing pulmonary barotrauma and arterial gas embolism, which can be fatal."
        },
        {
          question: "After saltwater diving, what equipment care is most important?",
          imageUrl: null,
          answers: [
            "Drying in direct sunlight",
            "Thorough rinse with fresh water",
            "Immediate application of lubricant",
            "Storage in the gear bag"
          ],
          correctAnswer: 1,
          explanation: "After saltwater diving, thoroughly rinse all equipment with fresh water to remove salt, which can cause corrosion, deterioration of materials, and crystal formation in mechanisms."
        },
        {
          question: "What does SDI recommend regarding diving and flying?",
          imageUrl: null,
          answers: [
            "No flying for 12 hours after any dive",
            "No flying for 18 hours after a single no-decompression dive",
            "No flying for at least 24 hours after multiple dives or decompression dives",
            "Both B and C are correct"
          ],
          correctAnswer: 3,
          explanation: "SDI recommends waiting at least 18 hours after single no-decompression dives and at least 24 hours after multiple dives or decompression dives before flying to reduce decompression sickness risk."
        }
      ]
    });

    // 3. Update the category's quiz count
    const categoryRef = doc(db, 'quizCategories', categoryId);
    await updateDoc(categoryRef, {
      quizCount: 2 // Update to 2 since there should now be 2 quizzes (NAUI and SDI)
    });

    console.log("SDI Open Water Diver test successfully created!");
    return true;

  } catch (err) {
    console.error("Error creating SDI Open Water Diver test:", err);
    return false;
  }
};

export default createSDIOpenWaterTest;

// To use this function:
// import createSDIOpenWaterTest from './path-to-this-file';
// 
// // Call in a component or admin page
// const handleCreateTest = async () => {
//   const success = await createSDIOpenWaterTest();
//   if (success) {
//     alert("SDI test added successfully!");
//   } else {
//     alert("Error creating SDI test.");
//   }
// };