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
            .navigation-controls { display: none; }
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
          /* Navigation controls */
          .navigation-controls {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #0066B3;
            color: white;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            z-index: 1000;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          }
          .nav-button {
            background-color: white;
            color: #0066B3;
            border: none;
            border-radius: 4px;
            padding: 10px 20px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          }
          .nav-button:hover {
            background-color: #f0f0f0;
          }
          .print-button {
            background-color: #28a745;
            color: white;
          }
          .print-button:hover {
            background-color: #218838;
          }
          /* Add some bottom padding to ensure content isn't hidden behind the navigation bar */
          body {
            padding-bottom: 70px;
          }
        </style>
      </head>
      <body>
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
        
        <!-- Fixed navigation bar at the bottom with Back and Print buttons -->
        <div class="navigation-controls">
          <button class="nav-button back-button" onclick="attemptNavBack()">← Back to App</button>
          <button class="nav-button print-button" onclick="window.print()">Print Document</button>
        </div>

        <script>
          // Function to handle back navigation - tries multiple approaches
          function attemptNavBack() {
            // Try various methods to go back, in order of preference
            if (window.opener && !window.opener.closed) {
              // If opened from another window that's still available
              window.close();
            } else if (history.length > 1) {
              // If there's history to go back to
              history.back();
            } else if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
              // If in PWA standalone mode, try to open the main app
              // This uses the current origin/domain
              window.location.href = '/';
            } else {
              // Last resort - just try to close
              window.close();
              // If we're still here after trying to close, show a message
              setTimeout(function() {
                alert("Please use your browser's back button or close this tab to return to the app.");
              }, 300);
            }
          }

          // Detect if coming from print dialog and show a notification
          window.addEventListener('afterprint', function() {
            const notification = document.createElement('div');
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = '#28a745';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            notification.style.zIndex = '2000';
            notification.textContent = 'Print complete! You can now return to the app.';
            document.body.appendChild(notification);
            
            setTimeout(function() {
              notification.style.opacity = '0';
              notification.style.transition = 'opacity 0.5s ease';
              setTimeout(function() {
                document.body.removeChild(notification);
              }, 500);
            }, 3000);
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(exportContent);
  printWindow.document.close();
  
  printWindow.onload = () => {
    // We don't automatically print now - user can click the Print button
    // printWindow.print();
  };
};