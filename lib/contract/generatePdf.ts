import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { CONTRACT_TEXT } from './contractText'

export interface ContractData {
  razaoSocial: string
  cnpjCpf: string
  address: string
  email: string
  plano: string
  valor: string
  periodicidade: string
  dataContratacao: string
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_LEFT = 50
const MARGIN_BOTTOM = 60
const MARGIN_TOP = 50
const BODY_SIZE = 9
const LINE_HEIGHT = 14
const FOOTER_TEXT =
  "Documento gerado eletronicamente por comprasmunicipais.com.br | D'Amico Editora Ltda | CNPJ 05.904.375/0001-08"

function wrapLine(line: string, maxChars = 90): string[] {
  if (line.length <= maxChars) return [line]
  const result: string[] = []
  let remaining = line
  while (remaining.length > maxChars) {
    let breakAt = maxChars
    const spaceIdx = remaining.lastIndexOf(' ', maxChars)
    if (spaceIdx > maxChars * 0.6) breakAt = spaceIdx
    result.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt).trimStart()
  }
  if (remaining.length > 0) result.push(remaining)
  return result
}

function isSectionHeader(line: string): boolean {
  return /^\d+\.\s/.test(line) || /^\d+\.\d+\./.test(line)
}

export async function generateContractPdf(data: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const addFooter = (page: PDFPage) => {
    page.drawText(FOOTER_TEXT, {
      x: MARGIN_LEFT,
      y: 22,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Replace all placeholders with real data
  const filledText = CONTRACT_TEXT
    .replace(/\[RAZAO SOCIAL DO CONTRATANTE\]/g, data.razaoSocial || '(não informado)')
    .replace(/\[CNPJ\/CPF\]/g, data.cnpjCpf || '(não informado)')
    .replace(/\[PLANO CONTRATADO\]/g, data.plano)
    .replace(/\[VALOR\]/g, data.valor)
    .replace(/\[MENSAL \/ SEMESTRAL \/ ANUAL\]/g, data.periodicidade)
    .replace(/\[DATA\]/g, data.dataContratacao)
    .replace(/\[EMAIL CADASTRADO\]/g, data.email)
    .replace(/\[ENDERECO COMPLETO\]/g, data.address || '(não informado)')

  // Expand all lines with word-wrap
  const allLines: string[] = []
  for (const raw of filledText.split('\n')) {
    allLines.push(...wrapLine(raw, 90))
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN_TOP
  let lineIndex = 0

  for (const line of allLines) {
    if (y < MARGIN_BOTTOM) {
      addFooter(page)
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN_TOP
    }

    // Style: first line = large bold title, section headers = bold, rest = regular
    let font = fontRegular
    let size = BODY_SIZE
    if (lineIndex === 0) {
      font = fontBold
      size = 11
    } else if (lineIndex === 1) {
      font = fontBold
      size = 10
    } else if (isSectionHeader(line)) {
      font = fontBold
      size = BODY_SIZE
    }

    if (line.trim().length > 0) {
      page.drawText(line, {
        x: MARGIN_LEFT,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      })
    }

    y -= LINE_HEIGHT
    lineIndex++
  }

  addFooter(page)

  return pdfDoc.save()
}
