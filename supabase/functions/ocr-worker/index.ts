import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ocrServiceUrl = Deno.env.get('OCR_SERVICE_URL')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

type VerificationRow = {
  id: string
  file_path: string
}

Deno.serve(async () => {
  try {
    const { data, error } = await supabase
      .from<VerificationRow>('verifications')
      .select('id, file_path')
      .eq('ocr_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('DB fetch error', error)
      return new Response('DB error', { status: 500 })
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

    const formData = new FormData()
    formData.append('file', new Blob([fileData]), 'id.jpg')

    const ocrResponse = await fetch(ocrServiceUrl, { method: 'POST', body: formData })

    if (!ocrResponse.ok) {
      console.error('OCR service error:', await ocrResponse.text())
      await supabase
        .from('verifications')
        .update({ ocr_status: 'failed' })
        .eq('id', verification.id)
      return new Response('OCR failed', { status: 500 })
    }

    const { text } = await ocrResponse.json() as { text: string }

    const idNumber = text.match(/ID\s*No\.?:?\s*([A-Z0-9\-]+)/i)?.[1] ?? null
    const holderName = text.match(/Name[:\s]*([A-Z \.',-]+)/i)?.[1] ?? null

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
    return new Response('Error', { status: 500 })
  }
})
