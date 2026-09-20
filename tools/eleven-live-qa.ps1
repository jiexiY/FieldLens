# Explicit production test: one short ElevenLabs TTS and one STT request.
# STT input is generated locally with Windows speech; no microphone or secret is read.
$ErrorActionPreference = 'Stop'
$fieldlensOrigin = 'https://fieldlens-pi.vercel.app'
$fieldlensText = 'From Reitz Union to Marston tomorrow at eight A M.'
function Invoke-FieldLensVoiceTest($payload) {
    try {
        $response = Invoke-WebRequest "$fieldlensOrigin/api/voice" -Method Post -Headers @{Origin=$fieldlensOrigin} -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Compress) -UseBasicParsing -TimeoutSec 30
        if ($response.Headers['Content-Type'] -match '^audio/') {
            return [pscustomobject]@{status=$response.StatusCode; contentType=$response.Headers['Content-Type']; bytes=$response.RawContentLength}
        }
        return [pscustomobject]@{status=$response.StatusCode; data=($response.Content | ConvertFrom-Json)}
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $code = 'request_failed'
        try { $code = ($_.ErrorDetails.Message | ConvertFrom-Json).code } catch {}
        return [pscustomobject]@{status=$status; code=$code}
    }
}
$fieldlensSpeech = Invoke-FieldLensVoiceTest @{action='speak'; text=$fieldlensText}
Add-Type -AssemblyName System.Speech
$fieldlensSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$fieldlensPcm = New-Object System.IO.MemoryStream
$fieldlensWav = New-Object System.IO.MemoryStream
try {
    $fieldlensSynth.SelectVoice('Microsoft Zira Desktop')
    $fieldlensFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    $fieldlensSynth.SetOutputToAudioStream($fieldlensPcm, $fieldlensFormat)
    $fieldlensSynth.Speak($fieldlensText)
    $fieldlensSynth.SetOutputToNull()
    $fieldlensSamples = $fieldlensPcm.ToArray()
    if ($fieldlensSamples.Length -gt 640000) { throw 'Test speech exceeds 20 seconds.' }
    $fieldlensWriter = New-Object System.IO.BinaryWriter($fieldlensWav)
    $fieldlensWriter.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
    $fieldlensWriter.Write([uint32](36+$fieldlensSamples.Length))
    $fieldlensWriter.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
    $fieldlensWriter.Write([uint32]16)
    $fieldlensWriter.Write([uint16]1)
    $fieldlensWriter.Write([uint16]1)
    $fieldlensWriter.Write([uint32]16000)
    $fieldlensWriter.Write([uint32]32000)
    $fieldlensWriter.Write([uint16]2)
    $fieldlensWriter.Write([uint16]16)
    $fieldlensWriter.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
    $fieldlensWriter.Write([uint32]$fieldlensSamples.Length)
    $fieldlensWriter.Write($fieldlensSamples)
    $fieldlensWriter.Flush()
    $fieldlensTranscript = Invoke-FieldLensVoiceTest @{action='transcribe'; audio=[Convert]::ToBase64String($fieldlensWav.ToArray())}
    [pscustomobject]@{speech=$fieldlensSpeech; transcription=$fieldlensTranscript; syntheticSeconds=($fieldlensSamples.Length/32000)} | ConvertTo-Json -Depth 5 -Compress
    if ($fieldlensSpeech.status -ne 200 -or $fieldlensTranscript.status -ne 200) { exit 1 }
} finally {
    $fieldlensSynth.Dispose()
    $fieldlensPcm.Dispose()
    $fieldlensWav.Dispose()
}
