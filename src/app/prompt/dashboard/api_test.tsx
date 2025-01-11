mport { readFileSync } from 'fs';
import { EMAIL_TEMPLATE } from '../prompt/email.ts';
import { resolve } from 'path';

async function main() {
  const csvFilePath = resolve(__dirname, '../data/sample_output.csv');
  const csvData = readFileSync(csvFilePath, 'utf-8');
  
  const dataObject = {
      csv_data: csvData,
      keyword_industry: "Investment Banking",
      user_linkedin_url: "https://www.linkedin.com/in/abdullahchandna",
      email_template: JSON.stringify(EMAIL_TEMPLATE)
  };

  console.log(dataObject);
  
  // Helper function to download CSV data
  const downloadCSV = (csvData: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Helper function to update progress
  const updateProgress = (message: string) => {
    // Implement your progress update logic here
    console.log('Progress:', message);
  };
  
  // Helper function to show errors
  const showError = (message: string) => {
    // Implement your error handling logic here
    console.error('Error:', message);
  };

  // const url = 'http://127.0.0.1:8000'
  const url = 'https://automail-ai-apple.vercel.app'
  
  const response = await fetch(`${url}/process-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }, // passing JSON need to specify this
      body: JSON.stringify(dataObject)
    });
    
    
    const reader = response?.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const {value, done} = await reader?.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const updates = chunk.split('\n').filter(Boolean);
      
      for (const update of updates) {
        const data = JSON.parse(update);
        
        switch (data.status) {
          case 'completed':
            // Handle CSV data
            try {
              console.log("DOwnloading CSV");
              downloadCSV(data.csv_data);
            } catch (error) {
              console.error('Error downloading CSV:', error);
              console.log(data.csv_data);
            }
            
            break;
          case 'drafting':
          case 'progress':
            // Update UI with progress
            updateProgress(data.message);
            break;
          case 'error':
            // Handle error
            showError(data.message);
            break;
        }
      }
    }
}

main().catch(console.error);
