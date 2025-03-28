export const generateTrainingRecordPDF = (course, student, trainingRecord, progress, signOffData, localNotes, instructor) => {
  console.log('Generating PDF with instructor:', instructor);
  
  const printWindow = window.open('', '_blank');
  
  const formatInstructorCertifications = (instructor) => {
    if (!instructor?.instructorCertifications?.length) {
      console.log('No instructor certifications found');
      return '';
    }
    return instructor.instructorCertifications
      .map(cert => `${cert.agency} Instructor #${cert.number}`)
      .join('\n');
  };

  const renderVerification = (verification) => {
    if (!verification) return '';
    return `
      <span class="verification">
        <span class="checkmark">✓</span>
        ${new Date(verification.date).toLocaleDateString()} • ${verification.instructorName}
      </span>
    `;
  };

  const renderDiveFields = (diveTitle, diveData) => {
    if (!diveData) return '';
    
    const fields = diveData.fields || {};
    
    return `
      <div class="dive-fields">
        <div class="dive-header">
          <span class="verification">
            <span class="checkmark">✓</span>
            ${new Date(diveData.date).toLocaleDateString()} • ${diveData.instructorName}
          </span>
        </div>
        <div class="dive-details">
          ${fields['Dive Date'] ? `<div><strong>Date:</strong> ${fields['Dive Date']}</div>` : ''}
          ${fields['Dive Location'] ? `<div><strong>Location:</strong> ${fields['Dive Location']}</div>` : ''}
          ${fields['Max Depth'] ? `<div><strong>Max Depth:</strong> ${fields['Max Depth']}</div>` : ''}
          ${fields['Dive Time'] ? `<div><strong>Time:</strong> ${fields['Dive Time']}</div>` : ''}
        </div>
      </div>
    `;
  };

  const renderSkills = (section, skills) => {
    // Special handling for dive format sections with special fields
    if (section === 'Open Water Dives' && trainingRecord.id === 'certification-dive') {
      return `
        <div class="skills-section">
          ${trainingRecord.sections
            .find(s => s.title === 'Open Water Dives')
            .dives.map(dive => `
              <div class="skill-item">
                <div class="skill-content">
                  <span class="skill-name">${dive.title}</span>
                  ${progress[section]?.[dive.title] ? renderDiveFields(dive.title, progress[section][dive.title]) : ''}
                </div>
              </div>
            `).join('')}
        </div>
      `;
    }

    // Standard skills rendering
    return `
      <div class="skills-section">
        ${skills.map(skill => `
          <div class="skill-item">
            <div class="skill-content">
              <span class="skill-name">${skill}</span>
              ${progress[section]?.[skill] ? renderVerification(progress[section][skill]) : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const instructorCerts = formatInstructorCertifications(instructor);
  console.log('Formatted instructor certs:', instructorCerts);

  const exportContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Training Record - ${course?.name}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            color: #333;
          }
          .header {
            background-color: #0066B3;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
          }
          .header img {
            max-width: 400px;
          }
          .content {
            padding: 0 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .course-info {
            margin-bottom: 30px;
            font-size: 14px;
          }
          .course-info > div {
            margin: 5px 0;
          }
          .instructor-cert {
            white-space: pre-line;
          }
          .section {
            margin: 20px 0;
          }
          .section-title {
            color: #0066B3;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
            border-bottom: 2px solid #0066B3;
            padding-bottom: 5px;
          }
          .skills-section {
            margin-left: 20px;
          }
          .skill-item {
            padding: 8px 0;
            display: flex;
            align-items: center;
          }
          .skill-content {
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          .verification {
            color: #28a745;
            font-size: 0.9em;
          }
          .checkmark {
            color: #28a745;
            font-weight: bold;
            margin-right: 5px;
          }
          .notes {
            margin: 30px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .sign-off {
            margin-top: 30px;
            border-top: 2px solid #0066B3;
            padding-top: 20px;
          }
          .dive-fields {
            margin-top: 8px;
            padding: 8px;
            background-color: #f9fafb;
            border-radius: 4px;
          }
          .dive-header {
            margin-bottom: 8px;
          }
          .dive-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 0.9em;
            color: #4b5563;
          }
          /* Back button styles */
          .back-button {
            position: fixed;
            top: 20px;
            left: 20px;
            background-color: #0066B3;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            cursor: pointer;
            z-index: 1000;
          }
          .back-button:hover {
            background-color: #004d8c;
          }
          @media print {
            .back-button {
              display: none; /* Hide back button when printing */
            }
          }
        </style>
      </head>
      <body>
        <!-- Back button to return to the app -->
        <button class="back-button" onclick="window.close()">← Back to App</button>
        
        <div class="header">
          <img src="/logo.png" alt="Underwater World" />
        </div>
        <div class="content">
          <div class="course-info">
            <h2>${trainingRecord?.name}</h2>
            <div>${course?.location} • ${new Date(course?.startDate).toLocaleDateString()} - ${new Date(course?.endDate).toLocaleDateString()}</div>
            <div>Instructor: ${instructor?.name || instructor?.displayName || ''}</div>
            <div class="instructor-cert" style="white-space: pre-line;">${instructorCerts}</div>
            <div>Student: ${student?.displayName || ''}</div>
            <div>Email: ${student?.email || ''}</div>
          </div>

          ${trainingRecord?.sections.map(section => `
            <div class="section">
              <div class="section-title">${section.title}</div>
              ${section.subheader ? `<div class="section-subheader">${section.subheader}</div>` : ''}
              ${section.subsections ? 
                section.subsections.map(subsection => `
                  <div class="subsection">
                    <h4>${subsection.title}</h4>
                    ${renderSkills(subsection.title, subsection.skills)}
                  </div>
                `).join('') 
                : renderSkills(section.title, section.skills)
              }
            </div>
          `).join('')}

          ${localNotes ? `
            <div class="notes">
              <div class="section-title">${trainingRecord.notes?.title || "Instructor Comments"}</div>
              <p>${localNotes}</p>
            </div>
          ` : ''}

          ${signOffData ? `
            <div class="sign-off">
              <div class="section-title">Instructor Sign Off</div>
              <p>I certify that I have completed the training or verified the completion of the training on this record and that the student has performed all the skills listed to a satisfactory level.</p>
              <p>
                ${instructor?.name || instructor?.displayName || ''}<br>
                <span class="instructor-cert">${instructorCerts}</span><br>
                Date: ${new Date(signOffData.date).toLocaleDateString()}
              </p>
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(exportContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
};