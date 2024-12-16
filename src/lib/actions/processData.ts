interface ProcessDataParams {
  csvData: string;
  keywordIndustry: string;
  linkedinUrl: string;
  emailTemplate: string;
}

export async function processData({
  csvData,
  keywordIndustry,
  linkedinUrl,
  emailTemplate,
}: ProcessDataParams): Promise<string> {
  try {
    if (!csvData) {
      throw new Error('CSV data is required');
    }

    const dataObject = {
      csv_data: csvData,
      keyword_industry: keywordIndustry,
      user_linkedin_url: linkedinUrl,
      email_template: JSON.stringify(emailTemplate)
    };

    const url = 'https://automail-ai-apple.vercel.app';
    const response = await fetch(`${url}/process-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataObject)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.csv_data) {
      throw new Error('No CSV data received in response');
    }

    return result.csv_data;
  } catch (error) {
    console.error('Error processing data:', error);
    throw error;
  }
}
