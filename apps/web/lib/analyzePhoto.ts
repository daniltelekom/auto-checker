const YANDEX_IMAGE_API_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/imageCompletion'

const PHOTO_ANALYSIS_PROMPT =
  'Проанализируй фото автомобиля. Найди: 1) Признаки перекраса (разнотон краски, шагрень) 2) Ржавчину 3) Повреждения ЛКП (царапины, вмятины) 4) Кривые зазоры между панелями 5) Износ салона (руль, педали, сиденья). Верни строго JSON: { findings: [{type: string, severity: "low"|"medium"|"high", description: string}], overallCondition: "good"|"fair"|"poor" }'

export type YandexVisionConfig = {
  apiKey: string
  folderId: string
  cloudId: string
}

export type PhotoAnalysisResult = {
  findings?: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
  overallCondition?: 'good' | 'fair' | 'poor'
}

type YandexImageCompletionResponse = {
  result?: {
    alternatives?: Array<{
      message?: {
        text?: string
      }
    }>
  }
}

export function parsePhotoAnalysisJson(text: string): PhotoAnalysisResult | null {
  try {
    const trimmed = text.trim()
    const match = trimmed.match(/\{[\s\S]*\}/)
    return JSON.parse(match?.[0] ?? trimmed) as PhotoAnalysisResult
  } catch {
    return null
  }
}

export async function analyzePhoto(
  photoUrl: string,
  config: YandexVisionConfig
): Promise<PhotoAnalysisResult | null> {
  try {
    const response = await fetch(YANDEX_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${config.apiKey}`,
        'x-folder-id': config.folderId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: `gpt://${config.cloudId}/yandexgpt-lite`,
        completionOptions: { stream: false, temperature: 0.2, maxTokens: 600 },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: photoUrl } },
              { type: 'text', text: PHOTO_ANALYSIS_PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })

    if (!response.ok) {
      console.error('[analyzePhoto] API error:', response.status)
      return null
    }

    const data = (await response.json()) as YandexImageCompletionResponse
    const text = data.result?.alternatives?.[0]?.message?.text || '{}'
    return parsePhotoAnalysisJson(text)
  } catch (error) {
    console.error('Photo analysis error:', error)
    return null
  }
}

export async function analyzePhotos(
  photoUrls: string[],
  config: YandexVisionConfig,
  maxPhotos = 3
): Promise<PhotoAnalysisResult[]> {
  const results = await Promise.all(
    photoUrls.slice(0, maxPhotos).map((photoUrl) => analyzePhoto(photoUrl, config))
  )

  return results.filter((result): result is PhotoAnalysisResult => result !== null)
}

export function getPhotoRedFlags(photoAnalysis: PhotoAnalysisResult[]): string[] {
  return photoAnalysis.flatMap((result) =>
    (result.findings ?? [])
      .filter((finding) => finding.severity === 'high')
      .map((finding) => `[Фото] ${finding.type}: ${finding.description}`)
  )
}
