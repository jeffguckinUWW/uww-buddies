// NAUI Open Water Diver Practice Test
// This code can be run to add the quiz directly to your Firestore database

import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Update this path based on your project structure

// Function to create the NAUI Open Water Test
const createNAUIOpenWaterTest = async () => {
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

    // 2. Create the NAUI Open Water quiz
    const quizId = "naui-open-water-diver";
    await setDoc(doc(db, 'quizzes', quizId), {
      id: quizId,
      title: "NAUI Open Water Diver Certification",
      categoryId: categoryId,
      difficulty: "intermediate",
      certificationLevel: "openwater",
      questionCount: 50,
      completedBy: [],
      questions: [
        {
          question: "As you descend in water, pressure:",
          imageUrl: null,
          answers: [
            "Decreases",
            "Remains the same",
            "Increases",
            "Fluctuates randomly"
          ],
          correctAnswer: 2,
          explanation: "Pressure increases by 1 atmosphere (14.7 psi) for every 33 feet (10 meters) of depth in salt water."
        },
        {
          question: "According to Boyle's Law, if a balloon of air is taken from the surface to a depth of 33 feet (10 meters), its volume will:",
          imageUrl: null,
          answers: [
            "Increase by half",
            "Double",
            "Decrease by half",
            "Remain unchanged"
          ],
          correctAnswer: 2,
          explanation: "According to Boyle's Law, as pressure doubles at 33 feet, the volume of gas decreases by half when temperature remains constant."
        },
        {
          question: "The bends, or decompression sickness, is caused by:",
          imageUrl: null,
          answers: [
            "Nitrogen bubbles forming in the body's tissues",
            "Oxygen toxicity",
            "Carbon dioxide buildup",
            "Helium absorption"
          ],
          correctAnswer: 0,
          explanation: "During ascent, if pressure decreases too quickly, dissolved nitrogen can form bubbles in tissues and bloodstream, causing decompression sickness."
        },
        {
          question: "Squeezes (barotrauma) can affect which of these air spaces:",
          imageUrl: null,
          answers: [
            "Mask, sinuses, ears",
            "Hands, feet, knees",
            "Muscles, heart, liver",
            "None of the above"
          ],
          correctAnswer: 0,
          explanation: "Air spaces like the mask, sinuses, and ears can experience pressure imbalances, causing barotrauma if not properly equalized during descent."
        },
        {
          question: "If you hold your breath while ascending:",
          imageUrl: null,
          answers: [
            "You will conserve air",
            "You risk lung overexpansion injury",
            "You will ascend more quickly",
            "Your buoyancy will decrease"
          ],
          correctAnswer: 1,
          explanation: "As you ascend, the air in your lungs expands due to decreasing pressure. If you hold your breath, this expansion can cause lung overexpansion injuries."
        },
        {
          question: "The primary function of a BCD (Buoyancy Control Device) is to:",
          imageUrl: null,
          answers: [
            "Provide emergency flotation only",
            "Control buoyancy during the dive",
            "Hold the tank in place",
            "Protect against hypothermia"
          ],
          correctAnswer: 1,
          explanation: "BCDs allow divers to achieve neutral buoyancy at depth by adding or releasing air, making it easier to maintain position in the water column."
        },
        {
          question: "What is the purpose of the first stage of a regulator?",
          imageUrl: null,
          answers: [
            "To reduce high pressure air to an intermediate pressure",
            "To deliver breathing air directly to the diver",
            "To indicate remaining air pressure",
            "To filter contaminants from the air"
          ],
          correctAnswer: 0,
          explanation: "The first stage reduces high pressure air from the tank (typically 3000 psi) to an intermediate pressure (around 140 psi) before it reaches the second stage."
        },
        {
          question: "What do the markings '3AA' on a SCUBA tank indicate?",
          imageUrl: null,
          answers: [
            "The maximum depth rating",
            "The type of material and specifications of the tank",
            "The volume of air in cubic feet",
            "The country of manufacture"
          ],
          correctAnswer: 1,
          explanation: "'3AA' is a Department of Transportation designation indicating the material and specifications of the cylinder construction."
        },
        {
          question: "How often should SCUBA tanks be visually inspected?",
          imageUrl: null,
          answers: [
            "Every dive",
            "Weekly",
            "Annually",
            "Every 5 years"
          ],
          correctAnswer: 2,
          explanation: "Tanks should be visually inspected annually and hydrostatically tested every 5 years (in the US) to ensure structural integrity."
        },
        {
          question: "What is the purpose of a dive computer?",
          imageUrl: null,
          answers: [
            "To communicate with other divers",
            "To track dive time and depth, and calculate no-decompression limits",
            "To control air flow from the tank",
            "To adjust buoyancy automatically"
          ],
          correctAnswer: 1,
          explanation: "Dive computers continuously track depth, time, and calculate no-decompression limits based on your actual dive profile."
        },
        {
          question: "The buddy system in diving means:",
          imageUrl: null,
          answers: [
            "Always diving in groups of at least four",
            "Taking turns monitoring each other's air supply",
            "Diving in pairs, monitoring and assisting each other",
            "Following an instructor at all times"
          ],
          correctAnswer: 2,
          explanation: "The buddy system involves diving in pairs where partners stay close, monitor each other's condition, and are ready to provide assistance if needed."
        },
        {
          question: "What is the recommended ascent rate for recreational diving?",
          imageUrl: null,
          answers: [
            "As fast as possible",
            "10 feet (3 meters) per second",
            "30 feet (9 meters) per minute",
            "60 feet (18 meters) per minute"
          ],
          correctAnswer: 2,
          explanation: "The recommended maximum ascent rate is 30 feet (9 meters) per minute to allow adequate nitrogen off-gassing and prevent decompression sickness."
        },
        {
          question: "When diving in a current, you should:",
          imageUrl: null,
          answers: [
            "Always swim against the current first",
            "Avoid diving if any current is present",
            "Begin the dive swimming against the current",
            "Only dive with the current going both ways"
          ],
          correctAnswer: 2,
          explanation: "Start by swimming against the current when your energy is highest, then return with the current, making your exit easier when air supply is lower."
        },
        {
          question: "What should you do if you and your buddy become separated during a dive?",
          imageUrl: null,
          answers: [
            "Continue the dive and meet at the boat",
            "Search for 1 minute, then ascend if not found",
            "Descend deeper to look around",
            "Surface immediately without following proper ascent procedures"
          ],
          correctAnswer: 1,
          explanation: "Search for approximately one minute, then if your buddy isn't found, ascend safely and reunite at the surface."
        },
        {
          question: "How should you properly equalize your ears while descending?",
          imageUrl: null,
          answers: [
            "Swallow frequently",
            "Gently blow against pinched nostrils",
            "Yawn repeatedly",
            "All of the above can be effective"
          ],
          correctAnswer: 3,
          explanation: "All these techniques can help equalize pressure in the middle ear, with the Valsalva maneuver (B) being most common, but gentler methods like swallowing or yawning are often preferred."
        },
        {
          question: "The safe diving limit for recreational divers breathing compressed air is:",
          imageUrl: null,
          answers: [
            "60 feet (18 meters)",
            "100 feet (30 meters)",
            "130 feet (40 meters)",
            "200 feet (60 meters)"
          ],
          correctAnswer: 2,
          explanation: "NAUI recommends a maximum depth of 130 feet (40 meters) for recreational divers using compressed air due to increasing risks of nitrogen narcosis and oxygen toxicity beyond this depth."
        },
        {
          question: "What is the 'margin of safety' when using dive tables?",
          imageUrl: null,
          answers: [
            "Adding 10 feet to your actual maximum depth",
            "Planning decompression stops at shallow depths",
            "Subtracting 10 minutes from your no-decompression limit",
            "All of the above"
          ],
          correctAnswer: 0,
          explanation: "A common safety practice is to plan your dive using the next greater depth on the table than your actual planned depth, creating a more conservative profile."
        },
        {
          question: "When determining your SAC (Surface Air Consumption) rate, which factor does NOT affect air consumption?",
          imageUrl: null,
          answers: [
            "Depth",
            "Water temperature",
            "The color of your wetsuit",
            "Exercise level"
          ],
          correctAnswer: 2,
          explanation: "Your surface air consumption rate is affected by depth, temperature, physical exertion, experience level, and stress - but not wetsuit color."
        },
        {
          question: "What is a safety stop, and when should it be performed?",
          imageUrl: null,
          answers: [
            "A 3-5 minute stop at 15-20 feet after every dive",
            "A rest at the surface before beginning a dive",
            "A required decompression stop determined by dive tables",
            "A pause at 30 feet to check equipment"
          ],
          correctAnswer: 0,
          explanation: "A safety stop is a 3-5 minute pause at 15-20 feet that should be included after every dive, especially those approaching no-decompression limits, to allow additional nitrogen off-gassing."
        },
        {
          question: "What percentage of your air supply should signal the beginning of your ascent?",
          imageUrl: null,
          answers: [
            "When you've used 50% of your air",
            "When you reach 1000 psi or 1/3 of your starting pressure",
            "When your dive buddy signals",
            "When you reach your bottom time limit"
          ],
          correctAnswer: 1,
          explanation: "The 'rule of thirds' suggests turning the dive when you've consumed 2/3 of your air supply, leaving 1/3 (typically about 1000 psi) for your ascent and safety stop."
        },
        {
          question: "What causes dangerous surf or wave conditions?",
          imageUrl: null,
          answers: [
            "Water temperature changes",
            "Wind, storms, and underwater topography",
            "Fish migrations",
            "Pollution levels"
          ],
          correctAnswer: 1,
          explanation: "Wind, storms, and the shape of the seafloor primarily determine wave size and surf conditions, which can create hazardous diving environments."
        },
        {
          question: "Which of the following marine creatures should divers avoid touching?",
          imageUrl: null,
          answers: [
            "Only those with spines",
            "Only brightly colored species",
            "All marine life",
            "Only those that swim toward you"
          ],
          correctAnswer: 2,
          explanation: "Divers should avoid touching all marine life for both conservation reasons and personal safety, as many species have defenses like toxins, spines, or sharp edges."
        },
        {
          question: "The best practice for a diver encountering ocean currents is to:",
          imageUrl: null,
          answers: [
            "Always swim directly against the current",
            "Swim perpendicular to the current to exit it",
            "Inflate your BCD fully and float on the surface",
            "Increase your depth immediately"
          ],
          correctAnswer: 1,
          explanation: "Swimming perpendicular (across) to a current uses less energy than fighting against it and can help you exit the current more efficiently."
        },
        {
          question: "What causes tides?",
          imageUrl: null,
          answers: [
            "Wind patterns",
            "Gravitational pull of the moon and sun",
            "Underwater earthquakes",
            "Ocean temperature changes"
          ],
          correctAnswer: 1,
          explanation: "Tides are primarily caused by the gravitational pull of the moon and, to a lesser extent, the sun on Earth's oceans."
        },
        {
          question: "What is thermocline?",
          imageUrl: null,
          answers: [
            "A distinct layer where water temperature drops rapidly",
            "A warm water current",
            "The difference between air and water temperature",
            "A type of deep sea trench"
          ],
          correctAnswer: 0,
          explanation: "A thermocline is a layer of water where the temperature changes more rapidly with depth than it does in the layers above or below."
        },
        {
          question: "The proper response to leg cramps underwater is to:",
          imageUrl: null,
          answers: [
            "Ascend immediately to the surface",
            "Stretch and massage the affected muscle",
            "Ignore it and continue diving",
            "Add more weights to reduce strain"
          ],
          correctAnswer: 1,
          explanation: "Stop, relax, and stretch/massage the cramped muscle. For a calf cramp, gently extending the toe and flexing the foot while massaging the muscle often helps."
        },
        {
          question: "If you or your buddy starts to panic underwater, you should:",
          imageUrl: null,
          answers: [
            "Ascend immediately as fast as possible",
            "Stop, breathe, think, and act",
            "Drop your weights and inflate your BCD fully",
            "Wait for it to pass, then continue the dive"
          ],
          correctAnswer: 1,
          explanation: "Stop, breathe slowly and deeply to regain control, think about the situation calmly, and then take appropriate action based on the specific circumstances."
        },
        {
          question: "The appropriate response to an out-of-air situation is:",
          imageUrl: null,
          answers: [
            "Immediately make a free (emergency) ascent",
            "Signal 'out of air' and share air with your buddy while making a controlled ascent",
            "Drop your weights and make a buoyant emergency ascent",
            "Grab your buddy's alternate air source without signaling"
          ],
          correctAnswer: 1,
          explanation: "Signal your buddy with the 'out of air' sign, secure their alternate air source, and make a normal, controlled ascent together while sharing air."
        },
        {
          question: "What is the primary cause of most diving accidents?",
          imageUrl: null,
          answers: [
            "Equipment failure",
            "Marine animal encounters",
            "Human error",
            "Bad weather conditions"
          ],
          correctAnswer: 2,
          explanation: "Human error, including poor judgment, inadequate planning, failing to follow procedures, exceeding training limits, and panic, is the primary cause of most diving accidents."
        },
        {
          question: "If caught in a downcurrent, you should:",
          imageUrl: null,
          answers: [
            "Inflate your BCD fully to overcome it",
            "Swim directly against it with powerful kicks",
            "Swim diagonally out of it or use available handholds",
            "Deflate your BCD completely to sink faster"
          ],
          correctAnswer: 2,
          explanation: "Swimming diagonally (at an angle) away from the downcurrent uses less energy than fighting it directly. If available, use handholds to prevent being pushed deeper."
        },
        {
          question: "Nitrogen narcosis typically begins to affect divers at depths around:",
          imageUrl: null,
          answers: [
            "33 feet (10 meters)",
            "66 feet (20 meters)",
            "100 feet (30 meters)",
            "165 feet (50 meters)"
          ],
          correctAnswer: 2,
          explanation: "While individual sensitivity varies, most divers begin to notice the effects of nitrogen narcosis around 100 feet (30 meters), with effects becoming more pronounced with increasing depth."
        },
        {
          question: "Hyperventilation before a breath-hold dive:",
          imageUrl: null,
          answers: [
            "Is recommended to increase breath-holding time",
            "Can lead to shallow water blackout and should be avoided",
            "Has no effect on breath-holding ability",
            "Increases oxygen levels significantly"
          ],
          correctAnswer: 1,
          explanation: "Hyperventilation reduces the CO2 level in the blood, delaying the breathing reflex but not increasing oxygen. This can lead to unconsciousness underwater as oxygen levels drop too low before you feel the need to breathe."
        },
        {
          question: "What is oxygen toxicity?",
          imageUrl: null,
          answers: [
            "An allergic reaction to oxygen",
            "A toxic effect from breathing too much oxygen at depth",
            "A bacterial infection in diving cylinders",
            "A form of dehydration during diving"
          ],
          correctAnswer: 1,
          explanation: "Oxygen toxicity occurs when breathing oxygen at high partial pressures (typically at depths beyond recreational limits when using enriched air nitrox), potentially causing seizures or other CNS symptoms."
        },
        {
          question: "Which symptom is NOT typically associated with decompression sickness?",
          imageUrl: null,
          answers: [
            "Joint pain",
            "Skin rash or itching",
            "Numbness or tingling",
            "Watery eyes"
          ],
          correctAnswer: 3,
          explanation: "Watery eyes are not a typical symptom of decompression sickness. Common symptoms include joint pain (the 'bends'), skin manifestations, neurological issues like numbness or tingling, and respiratory or circulatory problems."
        },
        {
          question: "What is the best treatment for decompression sickness?",
          imageUrl: null,
          answers: [
            "Rest and pain medication",
            "Returning underwater to reverse symptoms",
            "Recompression in a hyperbaric chamber",
            "Drinking large amounts of water"
          ],
          correctAnswer: 2,
          explanation: "The definitive treatment for decompression sickness is recompression in a hyperbaric chamber, where the pressure can be controlled while breathing pure oxygen to eliminate nitrogen bubbles and reduce tissue damage."
        },
        {
          question: "What is residual nitrogen time (RNT)?",
          imageUrl: null,
          answers: [
            "The amount of time it takes all nitrogen to leave your body",
            "The amount of nitrogen remaining in your body from a previous dive",
            "The maximum allowable bottom time",
            "The time you must spend at a decompression stop"
          ],
          correctAnswer: 1,
          explanation: "Residual nitrogen time represents the nitrogen remaining in your tissues from previous dives, expressed as an equivalent amount of bottom time already spent at your new depth."
        },
        {
          question: "What is the purpose of a surface interval between dives?",
          imageUrl: null,
          answers: [
            "To allow equipment to dry",
            "To allow the body to eliminate excess nitrogen",
            "To check equipment for the next dive",
            "To plan the next dive route"
          ],
          correctAnswer: 1,
          explanation: "Surface intervals allow time for your body to eliminate excess nitrogen absorbed during the previous dive, reducing your residual nitrogen level before the next dive."
        },
        {
          question: "When using NAUI dive tables for repetitive dives, you need:",
          imageUrl: null,
          answers: [
            "Maximum depth and bottom time of each dive",
            "Average depth and total dive time",
            "Water temperature and visibility",
            "Tank pressure at beginning and end of each dive"
          ],
          correctAnswer: 0,
          explanation: "When planning repetitive dives with tables, you need the maximum depth and bottom time of each dive, plus surface interval times between dives."
        },
        {
          question: "What letter group would you be in after a dive to 60 feet for 50 minutes using NAUI tables?",
          imageUrl: null,
          answers: [
            "Group C",
            "Group E",
            "Group H",
            "Group J"
          ],
          correctAnswer: 3,
          explanation: "According to NAUI tables, a dive to 60 feet for 50 minutes puts you in repetitive group J, indicating a relatively high nitrogen loading."
        },
        {
          question: "After a surface interval of 2 hours following a dive that placed you in group F, what would your new group be according to NAUI tables?",
          imageUrl: null,
          answers: [
            "Group A",
            "Group C",
            "Group D",
            "Group E"
          ],
          correctAnswer: 1,
          explanation: "After a 2-hour surface interval starting from group F, you would move to group C according to the NAUI surface interval table, indicating partial elimination of residual nitrogen."
        },
        {
          question: "If a diver consumes air at a rate of 20 psi per minute at 33 feet, approximately how fast will they consume air at 99 feet?",
          imageUrl: null,
          answers: [
            "20 psi per minute",
            "40 psi per minute",
            "60 psi per minute",
            "80 psi per minute"
          ],
          correctAnswer: 3,
          explanation: "At 99 feet (4 ATA), a diver will consume air approximately 4 times faster than at the surface. Since 33 feet is 2 ATA, consumption at 99 feet would be about 2 times the rate at 33 feet, or 80 psi per minute."
        },
        {
          question: "A standard aluminum 80 cubic foot cylinder filled to 3000 psi contains approximately:",
          imageUrl: null,
          answers: [
            "40 cubic feet of air",
            "80 cubic feet of air",
            "120 cubic feet of air",
            "200 cubic feet of air"
          ],
          correctAnswer: 1,
          explanation: "An 'aluminum 80' contains approximately 80 cubic feet of air when filled to its rated pressure of 3000 psi."
        },
        {
          question: "If your tank pressure drops from 3000 psi to 2400 psi during a 10-minute test at 33 feet, what is your approximate SAC rate?",
          imageUrl: null,
          answers: [
            "15 psi/minute",
            "30 psi/minute",
            "45 psi/minute",
            "60 psi/minute"
          ],
          correctAnswer: 1,
          explanation: "Pressure drop is 600 psi over 10 minutes, so at 33 feet (2 ATA), the SAC rate would be (600/10)/2 = 30 psi/minute at the surface."
        },
        {
          question: "The hand signal for 'OK' or 'I am OK' is:",
          imageUrl: null,
          answers: [
            "Thumbs up",
            "Forming a circle with thumb and index finger",
            "Waving hand side to side",
            "Patting the top of your head"
          ],
          correctAnswer: 1,
          explanation: "The underwater OK signal is made by forming a circle with the thumb and index finger. Thumbs up means 'ascend' or 'going up.'"
        },
        {
          question: "The hand signal for 'something is wrong' is:",
          imageUrl: null,
          answers: [
            "Thumbs down",
            "Hand flat, rocking back and forth",
            "Slashing motion across throat",
            "Pointing to mouth repeatedly"
          ],
          correctAnswer: 1,
          explanation: "A flat hand rocking back and forth (like a wobbly airplane) indicates that something is wrong or there's a problem. This allows divers to communicate issues without specifying the exact problem initially."
        },
        {
          question: "The hand signal for 'I am out of air' is:",
          imageUrl: null,
          answers: [
            "Thumbs down",
            "Slashing motion across throat",
            "Fist pounding on chest",
            "Hand waving overhead"
          ],
          correctAnswer: 1,
          explanation: "The out-of-air signal is a slashing motion across the throat with a flat hand, indicating the diver can no longer breathe from their tank."
        },
        {
          question: "How often should regulators be professionally serviced?",
          imageUrl: null,
          answers: [
            "After every 10 dives",
            "Monthly",
            "Annually or according to manufacturer's recommendations",
            "Only when they show signs of malfunction"
          ],
          correctAnswer: 2,
          explanation: "Regulators should be professionally serviced annually or according to the manufacturer's specific recommendations, regardless of use frequency."
        },
        {
          question: "After diving in saltwater, you should:",
          imageUrl: null,
          answers: [
            "Store equipment immediately in a dry bag",
            "Rinse everything thoroughly with fresh water",
            "Wipe down with a towel only",
            "Apply silicone spray to all parts"
          ],
          correctAnswer: 1,
          explanation: "All dive equipment should be thoroughly rinsed with fresh water after saltwater exposure to prevent salt crystal formation, corrosion, and deterioration."
        },
        {
          question: "Which of the following should NOT be exposed to direct sunlight for extended periods?",
          imageUrl: null,
          answers: [
            "Aluminum tanks",
            "Weight belts",
            "Wetsuits and rubber components",
            "All of the above should be protected from extended sun exposure"
          ],
          correctAnswer: 3,
          explanation: "All diving equipment should be protected from extended direct sunlight, which can cause deterioration of rubber and neoprene, fading of colors, and excessive heating of tanks."
        },
        {
          question: "What is the proper way to store a regulator between dive trips?",
          imageUrl: null,
          answers: [
            "Connected to a pressurized tank",
            "Clean, dry, and coiled without sharp bends",
            "Submerged in fresh water",
            "Partially disassembled"
          ],
          correctAnswer: 1,
          explanation: "Regulators should be stored clean, dry, and coiled without sharp bends that could stress the hoses. They should be protected from dust, preferably in their original case or a regulator bag."
        }
      ]
    });

    // 3. Update the category's quiz count
    const categoryRef = doc(db, 'quizCategories', categoryId);
    await updateDoc(categoryRef, {
      quizCount: 1
    });

    console.log("NAUI Open Water Diver test successfully created!");
    return true;

  } catch (err) {
    console.error("Error creating NAUI Open Water Diver test:", err);
    return false;
  }
};

export default createNAUIOpenWaterTest;

// To use this function:
// import createNAUIOpenWaterTest from './path-to-this-file';
// 
// // Call in a component or admin page
// const handleCreateTest = async () => {
//   const success = await createNAUIOpenWaterTest();
//   if (success) {
//     alert("NAUI test added successfully!");
//   } else {
//     alert("Error creating NAUI test.");
//   }
// };