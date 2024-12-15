'use server'

export async function generateCsv(userProfileId: string, userPromptId: string) {
  // Create a sample row with the specified columns
  const sampleRow = {
    user_profile_id: userProfileId,
    user_prompt_id: userPromptId,
    urn_id: 'sample-urn-id',
    linkedin_url: 'https://www.linkedin.com/in/sample-profile',
    to_email: 'sample@example.com', 
    subject: 'Sample Email Subject',
    body: 'Sample email body content'
  }

  // Create headers row
  const headers = 'user_profile_id,user_prompt_id,urn_id,linkedin_url,to_email,subject,body'

  // Create CSV row from sample data
  const dataRow = `${sampleRow.user_profile_id},${sampleRow.user_prompt_id},${sampleRow.linkedin_url},${sampleRow.to_email},${sampleRow.subject},${sampleRow.body}`
  
  // Combine headers and data
  const csvContent = `${headers}\n${dataRow}`
  return csvContent
}

