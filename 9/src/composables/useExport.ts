import { ref } from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { exportToPdf as apiExportToPdf, exportToWord as apiExportToWord, type ExportParams } from '../api/export'

export interface ExportPdfOptions {
  margin?: number
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  includeStyles?: boolean
  includeImages?: boolean
  useBackend?: boolean
}

export interface ExportWordOptions {
  includeStyles?: boolean
  includeImages?: boolean
  useBackend?: boolean
  documentId?: string
}

export function useExportToPdf(
  element: HTMLElement | null,
  filename: string = 'document'
) {
  const exporting = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const success = ref(false)

  const generatePdfFromElement = async (
    el: HTMLElement,
    options: ExportPdfOptions = {}
  ): Promise<void> => {
    const {
      margin = 10,
      pageSize = 'a4',
      orientation = 'portrait',
      includeStyles = true,
      includeImages = true
    } = options

    exporting.value = true
    error.value = null
    success.value = false
    progress.value = 0

    try {
      progress.value = 10

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: includeImages,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      progress.value = 50

      const imgWidth = pageSize === 'a4' ? 210 : 216
      const imgHeight = pageSize === 'a4' ? 297 : 279
      const orientationValue = orientation === 'landscape' ? 'l' : 'p'

      const pdf = new jsPDF({
        orientation: orientationValue,
        unit: 'mm',
        format: pageSize
      })

      const pageWidth = orientation === 'landscape' ? imgHeight : imgWidth
      const pageHeight = orientation === 'landscape' ? imgWidth : imgHeight

      const contentWidth = pageWidth - margin * 2
      const contentHeight = (canvas.height * contentWidth) / canvas.width

      let heightLeft = contentHeight
      let position = 0

      const imgData = canvas.toDataURL('image/png')

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin + position,
        contentWidth,
        contentHeight
      )
      heightLeft -= pageHeight - margin * 2

      progress.value = 75

      while (heightLeft > 0) {
        position = heightLeft - contentHeight
        pdf.addPage()
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          margin + position,
          contentWidth,
          contentHeight
        )
        heightLeft -= pageHeight - margin * 2
      }

      progress.value = 90

      const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
      pdf.save(finalFilename)

      progress.value = 100
      success.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'PDF导出失败'
      success.value = false
      throw err
    } finally {
      exporting.value = false
    }
  }

  const exportViaBackend = async (
    documentId: string,
    options: ExportPdfOptions = {}
  ): Promise<void> => {
    exporting.value = true
    error.value = null
    success.value = false
    progress.value = 0

    try {
      progress.value = 30

      const params: ExportParams = {
        documentId,
        includeStyles: options.includeStyles,
        includeImages: options.includeImages,
        pageSize: options.pageSize?.toUpperCase() as 'A4' | 'Letter',
        orientation: options.orientation
      }

      const response = await apiExportToPdf(params)
      progress.value = 80

      if (response.code === 200) {
        const url = response.data.url
        const link = document.createElement('a')
        link.href = url
        link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
        link.click()
        progress.value = 100
        success.value = true
      } else {
        throw new Error(response.message || '导出失败')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'PDF导出失败'
      success.value = false
      throw err
    } finally {
      exporting.value = false
    }
  }

  const exportToPdf = async (
    options: ExportPdfOptions = {}
  ): Promise<void> => {
    if (options.useBackend) {
      const docId = (element as unknown as { dataset?: { documentId?: string } })?.dataset?.documentId
      if (!docId) {
        throw new Error('使用后端导出需要提供 documentId')
      }
      return exportViaBackend(docId, options)
    }

    if (!element) {
      throw new Error('导出元素不存在')
    }

    return generatePdfFromElement(element, options)
  }

  const reset = (): void => {
    exporting.value = false
    progress.value = 0
    error.value = null
    success.value = false
  }

  return {
    exporting,
    progress,
    error,
    success,
    exportToPdf,
    reset
  }
}

export function useExportToWord(
  content: string,
  filename: string = 'document'
) {
  const exporting = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const success = ref(false)

  const generateWordFromContent = async (
    htmlContent: string,
    options: ExportWordOptions = {}
  ): Promise<void> => {
    exporting.value = true
    error.value = null
    success.value = false
    progress.value = 0

    try {
      progress.value = 20

      const styles = options.includeStyles
        ? `
        <style>
          body {
            font-family: 'Microsoft YaHei', 'SimSun', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          }
          h1, h2, h3, h4, h5, h6 {
            font-weight: bold;
            margin: 20px 0 10px;
          }
          h1 { font-size: 24px; }
          h2 { font-size: 20px; }
          h3 { font-size: 18px; }
          p { margin: 10px 0; }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 10px 0;
          }
          table, th, td {
            border: 1px solid #ddd;
          }
          th, td {
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          blockquote {
            border-left: 4px solid #ddd;
            margin: 10px 0;
            padding: 10px 20px;
            color: #666;
            background-color: #f9f9f9;
          }
          pre, code {
            font-family: 'Consolas', 'Monaco', monospace;
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
          }
          pre {
            padding: 10px;
            overflow-x: auto;
          }
        </style>
      `
        : ''

      progress.value = 50

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `

      const blob = new Blob([fullHtml], {
        type: 'application/msword;charset=utf-8'
      })

      progress.value = 80

      const finalFilename = filename.endsWith('.doc') ? filename : `${filename}.doc`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = finalFilename

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      progress.value = 100
      success.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Word导出失败'
      success.value = false
      throw err
    } finally {
      exporting.value = false
    }
  }

  const exportViaBackend = async (
    documentId: string,
    options: ExportWordOptions = {}
  ): Promise<void> => {
    exporting.value = true
    error.value = null
    success.value = false
    progress.value = 0

    try {
      progress.value = 30

      const params: ExportParams = {
        documentId,
        includeStyles: options.includeStyles,
        includeImages: options.includeImages
      }

      const response = await apiExportToWord(params)
      progress.value = 80

      if (response.code === 200) {
        const url = response.data.url
        const link = document.createElement('a')
        link.href = url
        link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`
        link.click()
        progress.value = 100
        success.value = true
      } else {
        throw new Error(response.message || '导出失败')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Word导出失败'
      success.value = false
      throw err
    } finally {
      exporting.value = false
    }
  }

  const exportToWord = async (
    options: ExportWordOptions = {}
  ): Promise<void> => {
    if (options.useBackend) {
      if (!options.documentId) {
        throw new Error('使用后端导出需要提供 documentId')
      }
      return exportViaBackend(options.documentId, options)
    }

    if (!content) {
      throw new Error('导出内容不能为空')
    }

    return generateWordFromContent(content, options)
  }

  const reset = (): void => {
    exporting.value = false
    progress.value = 0
    error.value = null
    success.value = false
  }

  return {
    exporting,
    progress,
    error,
    success,
    exportToWord,
    reset
  }
}
