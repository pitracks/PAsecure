import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ocrServiceUrl = Deno.env.get('OCR_SERVICE_URL')

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables')
  // Will be handled in the serve function
}

const supabase = supabaseUrl && serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : null

type VerificationRow = {
  id: string
  file_path: string
}

Deno.serve(async (req) => {
  try {
    console.log('OCR worker started')
    
    if (!supabase) {
      return new Response(JSON.stringify({ 
        error: 'Configuration error', 
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    const { data, error } = await supabase
      .from<VerificationRow>('verifications')
      .select('id, file_path')
      .eq('ocr_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('DB fetch error', error)
      return new Response(JSON.stringify({ error: 'DB error', details: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!data || data.length === 0) {
      return new Response('No pending verifications', { status: 200 })
    }

    const verification = data[0]

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('id-uploads')
      .download(verification.file_path)

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError)
      await supabase
        .from('verifications')
        .update({ ocr_status: 'failed' })
        .eq('id', verification.id)
      return new Response('Download failed', { status: 500 })
    }

    if (!ocrServiceUrl) {
      console.error('OCR_SERVICE_URL not configured')
      await supabase
        .from('verifications')
        .update({ ocr_status: 'failed' })
        .eq('id', verification.id)
      return new Response('OCR service not configured', { status: 500 })
    }

    console.log('Calling OCR service:', ocrServiceUrl)
    const formData = new FormData()
    formData.append('file', new Blob([fileData]), 'id.jpg')

    let ocrResponse: Response
    try {
      ocrResponse = await fetch(ocrServiceUrl, { method: 'POST', body: formData })
    } catch (fetchError) {
      console.error('OCR service fetch error:', fetchError)
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      await supabase
        .from('verifications')
        .update({ ocr_status: 'failed' })
        .eq('id', verification.id)
      return new Response(JSON.stringify({ 
        error: 'OCR service connection failed', 
        details: errorMsg 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text()
      console.error('OCR service error:', ocrResponse.status, errorText)
      await supabase
        .from('verifications')
        .update({ ocr_status: 'failed' })
        .eq('id', verification.id)
      return new Response(JSON.stringify({ 
        error: 'OCR service returned error', 
        status: ocrResponse.status,
        details: errorText 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { text } = await ocrResponse.json() as { text: string }

    // Normalize text: fix common OCR errors
    let normalizedText = text
      .replace(/Narne/gi, 'Name')  // Fix "Narne" -> "Name"
      .replace(/Narne:/gi, 'Name:')
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/_+/g, '')  // Remove underscores (common in ID numbers)

    // Improved parsing with multiple patterns and better handling
    let idNumber: string | null = null
    let holderName: string | null = null
    let idType: string | null = null
    
    // Detect ID type first
    if (normalizedText.match(/Senior\s+Citizens?\s+Affairs/i) || 
        normalizedText.match(/OSCA/i) ||
        normalizedText.match(/Senior\s+Citizen/i)) {
      idType = 'senior_citizen'
    } else if (normalizedText.match(/PWD|Person\s+with\s+Disability/i)) {
      idType = 'pwd'
    }
    
    // Try multiple patterns for ID number (handle underscores, spaces, etc.)
    const idPatterns = [
      /ID\s*No\.?:?\s*[_\s]*([0-9]{4,})/i,  // ID No.: _22135 or ID No. 22135
      /ID\s*No\.?:?\s*([A-Z0-9\-]+)/i,
      /ID\s*Number[:\s]*[_\s]*([0-9]{4,})/i,
      /ID[:\s]*[_\s]*([0-9]{4,})/i,
      /(?:^|\n)\s*[_\s]*([0-9]{4,})\s*(?:\n|$)/,  // Standalone number (4+ digits, may have underscore)
      /_([0-9]{4,})/,  // Number after underscore
    ]
    
    for (const pattern of idPatterns) {
      const match = normalizedText.match(pattern)
      if (match && match[1]) {
        // Clean the ID number (remove any remaining non-digits except hyphens)
        idNumber = match[1].replace(/[^0-9\-]/g, '').trim()
        if (idNumber.length >= 4) {
          break
        }
      }
    }
    
    // Try multiple patterns for name (handle "Narne" typo and garbled text)
    const namePatterns = [
      /Name[:\s]+([A-Z][A-Z\s\.\',-]{5,})/i,  // Name: followed by uppercase text
      /Name[:\s]+([A-Z][A-Za-z\s\.\',-]{5,})/i,  // Name: followed by mixed case
      /Name[:\s]+([A-Z]{2,}\s+[A-Z][A-Z\s\.\',-]{2,})/i,  // Name: LASTNAME Firstname
    ]
    
    // First, try to find name after "Name:" label
    for (const pattern of namePatterns) {
      const match = normalizedText.match(pattern)
      if (match && match[1]) {
        let candidate = match[1].trim()
        // Clean up the name (remove extra spaces, fix common OCR errors)
        candidate = candidate.replace(/\s+/g, ' ').trim()
        
        // Filter out common false positives
        if (!candidate.match(/^(Republic|Office|Pasig|City|Philippines|Date|ID|No|Address|Senior|Citizens|Affairs|Address741)$/i) &&
            candidate.length >= 5 &&
            /[A-Za-z]/.test(candidate) &&
            candidate.split(/\s+/).length >= 2) {
          holderName = candidate
          break
        }
      }
    }
    
    // If name not found, try to extract from lines near "Name" or "Narne"
    if (!holderName) {
      const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      let foundNameLabel = false
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        // Check if this line contains "Name" or "Narne"
        if (line.match(/Name|Narne/i)) {
          foundNameLabel = true
          // Look at next 2 lines for the actual name
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nameLine = lines[j]
            // Look for lines that look like names
            if (nameLine.match(/^[A-Z][A-Z\s\.\',-]{5,}$/i) &&
                !nameLine.match(/^(Republic|Office|Pasig|City|Philippines|Date|ID|No|Address|Senior|Citizens|Affairs|ONO|Address741|Date of|VAD|CARD|WOmalet)$/i) &&
                nameLine.split(/\s+/).length >= 2 && 
                nameLine.split(/\s+/).length <= 6) {
              holderName = nameLine.trim().replace(/\s+/g, ' ')
              break
            }
          }
          if (holderName) break
        }
      }
      
      // If still not found, look for patterns like "RO PLPANGLMRAE" (garbled names)
      if (!holderName) {
        for (const line of lines) {
          // Pattern: 2-4 words, mostly uppercase letters, may have garbled characters
          if (line.match(/^[A-Z][A-Z\s]{4,}$/i) &&
              line.split(/\s+/).length >= 2 &&
              line.split(/\s+/).length <= 5 &&
              !line.match(/^(Republic|Office|Pasig|City|Philippines|Date|ID|No|Address|Senior|Citizens|Affairs|ONO|Address741|Date of|VAD|CARD|WOmalet|reo|of te|PP mae ve)$/i)) {
            holderName = line.trim().replace(/\s+/g, ' ')
            break
          }
        }
      }
    }
    
    // Clean up extracted name (remove trailing dashes, extra spaces)
    if (holderName) {
      holderName = holderName.replace(/\s*-\s*$/, '').replace(/\s+/g, ' ').trim()
    }

    await supabase
      .from('verifications')
      .update({
        ocr_status: 'complete',
        ocr_text: text,
        detected_id_number: idNumber,
        detected_holder_name: holderName,
        detected_id_type: idType || null  // Update ID type if detected
      })
      .eq('id', verification.id)

    return new Response('Processed', { status: 200 })
  } catch (err) {
    console.error('Unhandled OCR worker error', err)
    const errorMessage = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ 
      error: 'Unhandled error', 
      details: errorMessage,
      stack: err instanceof Error ? err.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
