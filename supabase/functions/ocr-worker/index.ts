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

    // Improved parsing with multiple patterns and better handling
    let idNumber: string | null = null
    let holderName: string | null = null
    
    // Try multiple patterns for ID number
    const idPatterns = [
      /ID\s*No\.?:?\s*([A-Z0-9\-]+)/i,
      /ID\s*Number[:\s]*([A-Z0-9\-]+)/i,
      /ID[:\s]*([A-Z0-9\-]{4,})/i,
      /(?:^|\n)\s*([0-9]{4,})\s*(?:\n|$)/  // Standalone number (4+ digits)
    ]
    
    for (const pattern of idPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        idNumber = match[1].trim()
        break
      }
    }
    
    // Try multiple patterns for name
    // Look for "Name:" followed by text (handles various formats)
    const namePatterns = [
      /Name[:\s]+([A-Z][A-Z\s\.\',-]{3,})/i,  // Name: followed by uppercase text
      /Name[:\s]+([A-Z][A-Za-z\s\.\',-]{3,})/i,  // Name: followed by mixed case
      /(?:^|\n)\s*([A-Z][A-Z\s\.]{2,}[A-Z])\s*(?:\n|Address|Date|$)/i,  // Standalone uppercase name
      /([A-Z]{2,}\s+[A-Z][A-Z\s\.\',-]{2,})/  // Pattern: LASTNAME Firstname
    ]
    
    // First, try to find name after "Name:" label
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const candidate = match[1].trim()
        // Filter out common false positives
        if (!candidate.match(/^(Republic|Office|Pasig|City|Philippines|Date|ID|No|Address)$/i) &&
            candidate.length >= 3 &&
            /[A-Za-z]/.test(candidate)) {
          holderName = candidate
          break
        }
      }
    }
    
    // If name not found, try to extract from lines that look like names
    if (!holderName) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      for (const line of lines) {
        // Look for lines that look like names (2-4 words, mostly uppercase, after "Name:" context)
        const nameLikePattern = /^([A-Z][A-Z\s\.\',-]{5,})$/i
        if (nameLikePattern.test(line) && 
            !line.match(/^(Republic|Office|Pasig|City|Philippines|Date|ID|No|Address|Senior|Citizens|Affairs)$/i) &&
            line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5) {
          holderName = line.trim()
          break
        }
      }
    }

    await supabase
      .from('verifications')
      .update({
        ocr_status: 'complete',
        ocr_text: text,
        detected_id_number: idNumber,
        detected_holder_name: holderName
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
