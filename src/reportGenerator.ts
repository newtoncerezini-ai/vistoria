import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import jsPDF from 'jspdf'
import { sections } from './formSchema'
import type { InspectionDraft } from './types'

type Finding = {
  section: string
  question: string
  answer: string
}

const problematicValues = new Set(['regular', 'ruim', 'nao', 'nao_se_aplica'])

function today() {
  return new Date().toLocaleDateString('pt-BR')
}

function filenameSafe(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function optionLabel(fieldId: string, value: string) {
  const field = sections.flatMap((section) => section.fields).find((item) => item.id === fieldId)
  return field?.options?.find((option) => option.value === value)?.label ?? value
}

function collectFindings(draft: InspectionDraft): Finding[] {
  const findings: Finding[] = []

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === 'photos') {
        continue
      }

      const rawAnswer = draft.answers[field.id]

      if (!rawAnswer) {
        continue
      }

      if (Array.isArray(rawAnswer)) {
        continue
      }

      const answer = optionLabel(field.id, rawAnswer)
      const isProblem =
        problematicValues.has(rawAnswer) ||
        field.type === 'textarea' ||
        (field.type === 'number' && Number(rawAnswer) <= 6)

      if (isProblem) {
        findings.push({
          section: section.title,
          question: field.label,
          answer,
        })
      }
    }
  }

  return findings
}

function collectPhotos(draft: InspectionDraft) {
  const photos: Array<{ section: string; dataUrl: string; caption: string }> = []

  for (const section of sections) {
    const photoFields = section.fields.filter((field) => field.type === 'photos')

    for (const field of photoFields) {
      for (const [index, dataUrl] of (draft.photos[field.id] ?? []).entries()) {
        photos.push({
          section: section.title,
          dataUrl,
          caption: `Imagem ${photos.length + 1}: ${section.title}${index > 0 ? ` (${index + 1})` : ''}`,
        })
      }
    }
  }

  return photos
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function imageType(dataUrl: string): 'jpg' | 'png' {
  return dataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true })],
  })
}

function paragraph(text: string) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun(text)],
  })
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun(text)],
  })
}

function buildNarrative(draft: InspectionDraft, findings: Finding[]) {
  const school = draft.meta.school || 'unidade escolar vistoriada'
  const city = draft.meta.city || 'município não informado'
  const gre = draft.meta.gre || 'GRE não informada'
  const address = draft.meta.address || 'endereço não informado'

  return {
    object:
      `A presente Nota Técnica tem por finalidade registrar as inconformidades identificadas após vistoria técnica realizada na ${school}, situada em ${city}, vinculada à ${gre}, bem como subsidiar o levantamento técnico detalhado e o planejamento das intervenções necessárias à infraestrutura física da unidade escolar.`,
    inspection:
      `A vistoria foi realizada in loco, compreendendo inspeção visual dos ambientes internos e externos da edificação, com registro das condições aparentes dos sistemas construtivos, instalações, acessibilidade, mobiliário e equipamentos. A unidade está localizada em ${address}.`,
    conclusion:
      findings.length > 0
        ? `Diante do exposto, esta Nota Técnica manifesta-se favoravelmente à realização de mapeamento técnico detalhado da ${school}. As inconformidades registradas demandam análise técnica complementar e programação de intervenções corretivas e preventivas para assegurar condições adequadas ao pleno desenvolvimento das atividades educacionais.`
        : `Diante do exposto, esta Nota Técnica registra a vistoria realizada na ${school}. Não foram informadas inconformidades críticas no preenchimento atual, recomendando-se validação técnica complementar antes da conclusão do diagnóstico.`,
  }
}

function splitPriorities(findings: Finding[]) {
  const high = findings.filter((finding) => /ruim|não|nao/i.test(finding.answer))
  const medium = findings.filter((finding) => /regular/i.test(finding.answer))
  const low = findings.filter((finding) => !high.includes(finding) && !medium.includes(finding))

  return { high, medium, low }
}

export async function generateDocxReport(draft: InspectionDraft) {
  const findings = collectFindings(draft)
  const photos = collectPhotos(draft)
  const narrative = buildNarrative(draft, findings)
  const priorities = splitPriorities(findings)
  const fileName = `nota-tecnica-${filenameSafe(draft.meta.school || 'vistoria')}.docx`

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [new TextRun({ text: `NOTA TÉCNICA Nº ___/${new Date().getFullYear()}`, bold: true, size: 28 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [new TableCell({ columnSpan: 2, children: [paragraph(`ESCOLA: ${draft.meta.school || ''}`)] })],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [paragraph(`GRE: ${draft.meta.gre || ''}`)] }),
            new TableCell({ children: [paragraph(`DATA: ${draft.meta.date || today()}`)] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [paragraph(`ENDEREÇO: ${draft.meta.address || ''}`)] }),
            new TableCell({ children: [paragraph(`CIDADE: ${draft.meta.city || ''}`)] }),
          ],
        }),
      ],
    }),
    sectionHeading('DO OBJETO'),
    paragraph(narrative.object),
    sectionHeading('DA VISTORIA TÉCNICA'),
    paragraph(narrative.inspection),
  ]

  if (findings.length > 0) {
    for (const [sectionIndex, section] of sections.entries()) {
      const sectionFindings = findings.filter((finding) => finding.section === section.title)

      if (sectionFindings.length === 0) {
        continue
      }

      children.push(sectionHeading(`${sectionIndex + 1}. ${section.title.toUpperCase()}`))
      sectionFindings.forEach((finding, findingIndex) => {
        children.push(bullet(`${sectionIndex + 1}.${findingIndex + 1} ${finding.question} Resposta: ${finding.answer}.`))
      })
    }
  } else {
    children.push(paragraph('Não foram registradas inconformidades no preenchimento atual.'))
  }

  children.push(
    sectionHeading('DA AVALIAÇÃO TÉCNICA DOS RISCOS IDENTIFICADOS'),
    paragraph(
      'As inconformidades registradas devem ser avaliadas por equipe técnica competente, considerando impactos sobre segurança, acessibilidade, salubridade, conservação predial e continuidade das atividades pedagógicas.',
    ),
    sectionHeading('DA CLASSIFICAÇÃO E PRIORIZAÇÃO DAS INTERVENÇÕES NECESSÁRIAS'),
    paragraph('Alta prioridade:'),
    ...(priorities.high.length ? priorities.high.slice(0, 8).map((finding) => bullet(finding.question)) : [bullet('Não informado.')]),
    paragraph('Média prioridade:'),
    ...(priorities.medium.length ? priorities.medium.slice(0, 8).map((finding) => bullet(finding.question)) : [bullet('Não informado.')]),
    paragraph('Baixa prioridade:'),
    ...(priorities.low.length ? priorities.low.slice(0, 8).map((finding) => bullet(finding.question)) : [bullet('Não informado.')]),
    sectionHeading('DAS INTERVENÇÕES RECOMENDADAS'),
    bullet('Realizar levantamento técnico detalhado dos ambientes com inconformidades registradas.'),
    bullet('Elaborar orçamento estimativo com base nos serviços necessários.'),
    bullet('Programar intervenções corretivas e preventivas conforme priorização técnica.'),
    sectionHeading('CONCLUSÃO'),
    paragraph(narrative.conclusion),
    paragraph(''),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: draft.meta.analyst || 'Responsável técnico', bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('Responsável pela vistoria')] }),
  )

  if (photos.length > 0) {
    children.push(sectionHeading('RELATÓRIO FOTOGRÁFICO'))

    for (const photo of photos.slice(0, 24)) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 80 },
          children: [
            new ImageRun({
              type: imageType(photo.dataUrl),
              data: dataUrlToUint8Array(photo.dataUrl),
              transformation: { width: 420, height: 300 },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: photo.caption.toUpperCase(), bold: true })],
        }),
      )
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveBlob(blob, fileName)
}

function addPdfText(pdf: jsPDF, text: string, x: number, y: number, maxWidth = 180) {
  const lines = pdf.splitTextToSize(text, maxWidth)
  pdf.text(lines, x, y)
  return y + lines.length * 6
}

export function generatePdfReport(draft: InspectionDraft) {
  const findings = collectFindings(draft)
  const photos = collectPhotos(draft)
  const narrative = buildNarrative(draft, findings)
  const priorities = splitPriorities(findings)
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const fileName = `nota-tecnica-${filenameSafe(draft.meta.school || 'vistoria')}.pdf`
  let y = 18

  function pageBreak(space = 24) {
    if (y + space > 285) {
      pdf.addPage()
      y = 18
    }
  }

  function heading(text: string) {
    pageBreak(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text(text, 15, y)
    y += 8
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(`NOTA TÉCNICA Nº ___/${new Date().getFullYear()}`, 105, y, { align: 'center' })
  y += 12
  pdf.setFontSize(10)
  pdf.text(`ESCOLA: ${draft.meta.school || ''}`, 15, y)
  y += 7
  pdf.text(`GRE: ${draft.meta.gre || ''}`, 15, y)
  pdf.text(`DATA: ${draft.meta.date || today()}`, 130, y)
  y += 7
  pdf.text(`ENDEREÇO: ${draft.meta.address || ''}`, 15, y)
  y += 7
  pdf.text(`CIDADE: ${draft.meta.city || ''}`, 15, y)
  y += 8

  pdf.setFont('helvetica', 'normal')
  heading('DO OBJETO')
  y = addPdfText(pdf, narrative.object, 15, y)
  heading('DA VISTORIA TÉCNICA')
  y = addPdfText(pdf, narrative.inspection, 15, y)

  for (const section of sections) {
    const sectionFindings = findings.filter((finding) => finding.section === section.title)

    if (sectionFindings.length === 0) {
      continue
    }

    heading(section.title.toUpperCase())
    for (const finding of sectionFindings) {
      pageBreak(12)
      y = addPdfText(pdf, `• ${finding.question} Resposta: ${finding.answer}.`, 18, y, 174)
      y += 2
    }
  }

  heading('DA AVALIAÇÃO TÉCNICA DOS RISCOS IDENTIFICADOS')
  y = addPdfText(
    pdf,
    'As inconformidades registradas devem ser avaliadas por equipe técnica competente, considerando impactos sobre segurança, acessibilidade, salubridade, conservação predial e continuidade das atividades pedagógicas.',
    15,
    y,
  )

  heading('DA CLASSIFICAÇÃO E PRIORIZAÇÃO DAS INTERVENÇÕES NECESSÁRIAS')
  for (const [title, list] of [
    ['Alta prioridade', priorities.high],
    ['Média prioridade', priorities.medium],
    ['Baixa prioridade', priorities.low],
  ] as const) {
    pageBreak(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${title}:`, 15, y)
    y += 6
    pdf.setFont('helvetica', 'normal')
    for (const finding of list.slice(0, 6)) {
      y = addPdfText(pdf, `• ${finding.question}`, 18, y, 174)
      y += 1
    }
    if (list.length === 0) {
      y = addPdfText(pdf, '• Não informado.', 18, y, 174)
    }
  }

  heading('DAS INTERVENÇÕES RECOMENDADAS')
  y = addPdfText(pdf, '• Realizar levantamento técnico detalhado dos ambientes com inconformidades registradas.', 18, y, 174)
  y = addPdfText(pdf, '• Elaborar orçamento estimativo com base nos serviços necessários.', 18, y, 174)
  y = addPdfText(pdf, '• Programar intervenções corretivas e preventivas conforme priorização técnica.', 18, y, 174)

  heading('CONCLUSÃO')
  y = addPdfText(pdf, narrative.conclusion, 15, y)
  y += 12
  pageBreak(24)
  pdf.setFont('helvetica', 'bold')
  pdf.text(draft.meta.analyst || 'Responsável técnico', 105, y, { align: 'center' })
  y += 6
  pdf.setFont('helvetica', 'normal')
  pdf.text('Responsável pela vistoria', 105, y, { align: 'center' })

  if (photos.length > 0) {
    pdf.addPage()
    y = 18
    heading('RELATÓRIO FOTOGRÁFICO')
    for (const photo of photos.slice(0, 24)) {
      pageBreak(92)
      pdf.addImage(photo.dataUrl, 'JPEG', 25, y, 160, 72)
      y += 78
      pdf.setFont('helvetica', 'bold')
      pdf.text(photo.caption.toUpperCase(), 105, y, { align: 'center', maxWidth: 170 })
      pdf.setFont('helvetica', 'normal')
      y += 10
    }
  }

  pdf.save(fileName)
}
