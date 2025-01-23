export const generateTrainingRecordPDF = (course, student, trainingRecord, progress, signOffData, localNotes) => {
    const printWindow = window.open('', '_blank');
    
    const exportContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Training Record - ${course?.name}</title>
          <style>
            @media print {
              .no-print { display: none; }
              @page { margin: 0.5in; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header img {
              max-width: 400px;
              height: auto;
            }
            .content {
              padding: 20px;
            }
            .section {
              margin-bottom: 20px;
            }
            .skill-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .verification {
              color: #666;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" alt="Underwater World" />
          </div>
          <div class="content">
            <div class="section">
              <h2>Student Information</h2>
              <div>Name: ${student?.displayName || ''}</div>
              <div>Email: ${student?.email || ''}</div>
              <div>Course: ${course?.name || ''}</div>
              <div>Training Record: ${trainingRecord?.name || ''}</div>
            </div>
            
            ${trainingRecord?.sections.map(section => `
              <div class="section">
                <h3>${section.title}</h3>
                ${section.skills.map(skill => `
                  <div class="skill-item">
                    <span>${skill}</span>
                    ${progress[section.title]?.[skill] ? `
                      <span class="verification">
                        Verified ${new Date(progress[section.title][skill].date).toLocaleDateString()} 
                        by ${progress[section.title][skill].instructorName}
                      </span>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `).join('')}
            
            ${signOffData ? `
              <div class="section">
                <h3>Instructor Sign Off</h3>
                <p>Record Locked and Signed Off by: ${signOffData.instructorName}</p>
                <p>Date: ${new Date(signOffData.date).toLocaleDateString()}</p>
              </div>
            ` : ''}
            
            <div class="section">
              <h3>Instructor Notes</h3>
              <p>${localNotes || 'No notes available.'}</p>
            </div>
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