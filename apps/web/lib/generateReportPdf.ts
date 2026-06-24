import { jsPDF } from "jspdf"

import type { AnalysisData, CarIssue } from "@/types"

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf"

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Критично",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
}

const SEVERITY_RGB: Record<string, [number, number, number]> = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [202, 138, 4],
  low: [22, 163, 74],
}

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Двигатель",
  transmission: "Коробка",
  suspension: "Подвеска",
  body: "Кузов",
  electronics: "Электрика",
}

let fontData: string | null = null

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

async function ensureFont(doc: jsPDF): Promise<void> {
  if (!fontData) {
    const response = await fetch(FONT_URL)

    if (!response.ok) {
      throw new Error("Failed to load PDF font")
    }

    fontData = arrayBufferToBase64(await response.arrayBuffer())
  }

  doc.addFileToVFS("DejaVuSans.ttf", fontData)
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal")
  doc.setFont("DejaVuSans", "normal")
}

class PdfBuilder {
  private readonly bottomLimit: number

  constructor(
    private readonly doc: jsPDF,
    private margin = 15,
    private y = 15,
    private readonly lineHeight = 5.5
  ) {
    this.bottomLimit = doc.internal.pageSize.getHeight() - margin
  }

  private get contentWidth(): number {
    return this.doc.internal.pageSize.getWidth() - this.margin * 2
  }

  private ensureSpace(height: number): void {
    if (this.y + height > this.bottomLimit) {
      this.doc.addPage()
      this.y = this.margin
    }
  }

  private addLines(
    lines: string[],
    fontSize: number,
    color: [number, number, number] = [34, 34, 34],
    indent = 0
  ): void {
    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(...color)

    for (const line of lines) {
      this.ensureSpace(this.lineHeight)
      this.doc.text(line, this.margin + indent, this.y)
      this.y += this.lineHeight
    }
  }

  addTitle(text: string, fontSize = 18): void {
    this.y += 2
    this.addLines(this.doc.splitTextToSize(text, this.contentWidth), fontSize, [
      17, 17, 17,
    ])
    this.y += 2
  }

  addSubtitle(text: string): void {
    this.addLines(
      this.doc.splitTextToSize(text, this.contentWidth),
      10,
      [102, 102, 102]
    )
    this.y += 2
  }

  addSectionTitle(text: string): void {
    this.y += 4
    this.addLines(this.doc.splitTextToSize(text, this.contentWidth), 13, [
      17, 17, 17,
    ])
    this.y += 1
  }

  addParagraph(
    text: string,
    fontSize = 10,
    color: [number, number, number] = [51, 51, 51]
  ): void {
    this.addLines(this.doc.splitTextToSize(text, this.contentWidth), fontSize, color)
    this.y += 2
  }

  addKeyValue(label: string, value: string): void {
    this.ensureSpace(this.lineHeight)
    this.doc.setFontSize(10)
    this.doc.setTextColor(102, 102, 102)
    this.doc.text(label, this.margin, this.y)
    this.doc.setTextColor(34, 34, 34)
    this.doc.text(value, this.margin + 42, this.y)
    this.y += this.lineHeight
  }

  addBulletList(
    items: string[],
    color: [number, number, number] = [51, 51, 51]
  ): void {
    for (const item of items) {
      const lines = this.doc.splitTextToSize(item, this.contentWidth - 6)

      for (let index = 0; index < lines.length; index++) {
        this.ensureSpace(this.lineHeight)
        this.doc.setFontSize(10)
        this.doc.setTextColor(...color)

        if (index === 0) {
          this.doc.text("•", this.margin, this.y)
        }

        this.doc.text(lines[index], this.margin + 6, this.y)
        this.y += this.lineHeight
      }
    }

    this.y += 2
  }

  addKnownIssue(issue: CarIssue): void {
    const severity = issue.severity.toLowerCase()
    const color = SEVERITY_RGB[severity] ?? [102, 102, 102]
    const label = SEVERITY_LABELS[severity] ?? issue.severity
    const category =
      CATEGORY_LABELS[issue.category.toLowerCase()] ?? issue.category

    this.ensureSpace(this.lineHeight * 4)
    this.doc.setFontSize(11)
    this.doc.setTextColor(...color)
    this.doc.text(`[${label}] ${issue.issue}`, this.margin, this.y)
    this.y += this.lineHeight

    this.doc.setFontSize(9)
    this.doc.setTextColor(102, 102, 102)
    this.doc.text(category, this.margin, this.y)
    this.y += this.lineHeight

    this.doc.setTextColor(68, 68, 68)
    this.doc.text(
      `Ремонт: ${issue.repair_cost_min.toLocaleString("ru-RU")}–${issue.repair_cost_max.toLocaleString("ru-RU")} ₽ · после ${issue.mileage_threshold.toLocaleString("ru-RU")} км`,
      this.margin,
      this.y
    )
    this.y += this.lineHeight

    if (issue.description) {
      this.addLines(
        this.doc.splitTextToSize(issue.description, this.contentWidth),
        9,
        [85, 85, 85]
      )
    }

    this.y += 2
  }
}

function buildFilename(data: AnalysisData): string {
  const name = [data.parsed_data.make, data.parsed_data.model, data.parsed_data.year]
    .filter(Boolean)
    .join("-")
    .replace(/\s+/g, "-")
    .toLowerCase()

  return `otchet-${name || "auto"}.pdf`
}

export async function downloadReportPdf(data: AnalysisData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  await ensureFont(doc)

  const pdf = new PdfBuilder(doc)
  const { parsed_data: car } = data
  const carTitle =
    [car.make, car.model].filter(Boolean).join(" ") || "Не определено"
  const date = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  pdf.addTitle("Отчёт AutoChecker")
  pdf.addSubtitle(`Дата: ${date}`)

  pdf.addSectionTitle("Данные автомобиля")
  pdf.addKeyValue("Автомобиль:", carTitle)
  pdf.addKeyValue("Год:", car.year ? String(car.year) : "—")
  pdf.addKeyValue(
    "Пробег:",
    car.mileage ? `${car.mileage.toLocaleString("ru-RU")} км` : "—"
  )
  pdf.addKeyValue(
    "Цена:",
    car.price ? `${car.price.toLocaleString("ru-RU")} ₽` : "—"
  )

  pdf.addSectionTitle("Анализ цены")
  pdf.addParagraph(data.price_analysis)

  if (data.known_issues.length > 0) {
    pdf.addSectionTitle("Известные проблемы модели")

    for (const issue of data.known_issues) {
      pdf.addKnownIssue(issue)
    }
  }

  pdf.addSectionTitle("Чек-лист осмотра")
  pdf.addBulletList(data.inspection_checklist)

  pdf.addSectionTitle("Вопросы продавцу")
  pdf.addBulletList(data.questions_to_seller)

  if (data.red_flags.length > 0) {
    pdf.addSectionTitle("Красные флаги")
    pdf.addBulletList(data.red_flags, [220, 38, 38])
  }

  pdf.addSectionTitle("Вердикт")
  pdf.addParagraph(data.verdict, 14, [17, 17, 17])

  doc.save(buildFilename(data))
}
