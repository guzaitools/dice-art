/**
 * PDF Exporter Strategy
 * Exports dice art as PDF document
 */

import ExporterStrategy from './ExporterStrategy.js';
import { jsPDF } from 'jspdf';
import { PDF_PAGE_MARGIN, PDF_LOGO_WIDTH_RATIO, PDF_LOGO_TOP_MARGIN, PDF_GRID_LINE_WIDTH, PDF_GRID_LINE_COLOR } from '../constants.js';

export default class PDFExporterStrategy extends ExporterStrategy {
    /**
     * Export dice art as PDF
     * @param {Object} data - Export data
     * @param {Object} options - PDF-specific options
     * @returns {Promise<Blob>} PDF file blob
     */
    async export(data, options = {}) {
        this.validateData(data);

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // --- Page 1: Dice Art ---
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Logo
        await this.addLogo(doc, pageWidth);

        // Dice Mosaic
        const diceImgData = data.diceCanvas.toDataURL('image/jpeg', 0.95);
        const mosaicWidth = pageWidth - PDF_PAGE_MARGIN * 2;
        const mosaicHeight = (data.diceCanvas.height * mosaicWidth) / data.diceCanvas.width;

        // Calculate Y position to be centered but safely below logo
        const logoBottomLimit = PDF_LOGO_TOP_MARGIN + (pageWidth / 2.5 * 0.4) + 10; // Approx logo height + margin
        const centeredY = pageHeight / 2 - mosaicHeight / 2 + 10;
        const mosaicY = Math.max(centeredY, logoBottomLimit);

        doc.addImage(diceImgData, 'JPEG', PDF_PAGE_MARGIN, mosaicY, mosaicWidth, mosaicHeight);

        // Grid overlay
        this.addGridOverlay(doc, mosaicY, mosaicWidth, mosaicHeight, data.gridWidth, data.gridHeight);

        // Footer
        this.addFooter(doc, pageHeight, pageWidth, 1);

        // --- Page 2: Original Image & Metadata ---
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Original Image (Top Left)
        const originalImgData = data.originalCanvas.toDataURL('image/jpeg', 0.95);
        const originalWidth = pageWidth * 0.2; // 20% width
        const originalHeight = (data.originalCanvas.height * originalWidth) / data.originalCanvas.width;
        const originalY = PDF_PAGE_MARGIN;

        doc.addImage(originalImgData, 'JPEG', PDF_PAGE_MARGIN, originalY, originalWidth, originalHeight);

        // Metadata (Below Image)
        const metadataY = originalY + originalHeight + 20;
        this.addMetadata(doc, data, metadataY);

        this.addFooter(doc, pageHeight, pageWidth, 2);

        return doc.output('blob');
    }

    /**
     * Add logo to PDF page
     */
    async addLogo(doc, pageWidth) {
        try {
            const paths = ['assets/icons/logo_pdf.png', 'assets/icons/logo.png'];
            let loaded = false;

            for (const path of paths) {
                const logoImg = new Image();
                logoImg.src = path;
                await new Promise((resolve) => {
                    logoImg.onload = () => { loaded = true; resolve(); };
                    logoImg.onerror = resolve;
                });

                if (loaded && logoImg.naturalWidth > 0) {
                    const logoWidth = pageWidth / 5;
                    const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                    const logoX = (pageWidth - logoWidth) / 2;
                    // Fix: Use constant margin (15mm)
                    doc.addImage(logoImg, 'PNG', logoX, PDF_LOGO_TOP_MARGIN, logoWidth, logoHeight);
                    break;
                }
            }

            if (!loaded) {
                // ... title fallback ...
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                const titleText = 'DICE ART';
                const titleWidth = doc.getTextWidth(titleText);
                doc.text(titleText, (pageWidth - titleWidth) / 2, 25);
            }
        } catch (e) {
            console.warn('Failed to load logo:', e);
        }
    }

    /**
     * Add grid overlay
     */
    addGridOverlay(doc, mosaicY, mosaicWidth, mosaicHeight, gridWidth, gridHeight) {
        doc.setDrawColor(PDF_GRID_LINE_COLOR.r, PDF_GRID_LINE_COLOR.g, PDF_GRID_LINE_COLOR.b);
        doc.setLineWidth(PDF_GRID_LINE_WIDTH);

        const cellWidth = mosaicWidth / gridWidth;
        const cellHeight = mosaicHeight / gridHeight;

        for (let i = 0; i <= gridWidth; i++) {
            const x = PDF_PAGE_MARGIN + i * cellWidth;
            doc.line(x, mosaicY, x, mosaicY + mosaicHeight);
        }
        for (let j = 0; j <= gridHeight; j++) {
            const y = mosaicY + j * cellHeight;
            doc.line(PDF_PAGE_MARGIN, y, PDF_PAGE_MARGIN + mosaicWidth, y);
        }
    }

    /**
     * Add footer
     */
    addFooter(doc, pageHeight, pageWidth, pageNum) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const footerText = `create your own dice art at diceart.gustaviano.online`;
        doc.text(footerText, PDF_PAGE_MARGIN, pageHeight - 10);
        doc.text(`Page ${pageNum}`, pageWidth - PDF_PAGE_MARGIN, pageHeight - 10, { align: 'right' });
    }

    /**
     * Add metadata to page (Now used on Page 2)
     */
    addMetadata(doc, data, startY) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('PROJECT METADATA', PDF_PAGE_MARGIN, startY);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(PDF_PAGE_MARGIN, startY + 3, doc.internal.pageSize.getWidth() - PDF_PAGE_MARGIN, startY + 3);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        let y = startY + 15;
        doc.text(`Dimensions:`, PDF_PAGE_MARGIN, y);
        doc.setTextColor(0, 0, 0);
        doc.text(`${data.gridWidth} columns x ${data.gridHeight} rows`, PDF_PAGE_MARGIN + 40, y);

        y += 8;
        doc.setTextColor(60, 60, 60);
        doc.text(`Total Dice:`, PDF_PAGE_MARGIN, y);
        doc.setTextColor(0, 0, 0);
        doc.text(`${(data.gridWidth * data.gridHeight).toLocaleString()}`, PDF_PAGE_MARGIN + 40, y);

        // Dice Counts
        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('DICE INVENTORY', PDF_PAGE_MARGIN, y);
        y += 5;
        doc.line(PDF_PAGE_MARGIN, y, doc.internal.pageSize.getWidth() - PDF_PAGE_MARGIN, y);
        y += 10;

        // Calculate stats on the fly if not provided
        const stats = [0, 0, 0, 0, 0, 0];
        data.diceLevels.forEach(l => { if (l >= 1 && l <= 6) stats[l - 1]++ });

        doc.setFont('helvetica', 'normal');
        stats.forEach((count, index) => {
            const face = index + 1;
            doc.setTextColor(60, 60, 60);
            doc.text(`Dice with Face ${face}:`, PDF_PAGE_MARGIN, y);
            doc.setTextColor(0, 0, 0);
            doc.text(`${count.toLocaleString()}`, PDF_PAGE_MARGIN + 40, y);
            y += 7;
        });
    }

    /**
     * Add instructions page
     */
    addInstructionsPage(doc, pageWidth, pageHeight, data) {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('Assembly Instructions', PDF_PAGE_MARGIN, 30);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const instructions = [
            `Grid Dimensions: ${data.gridWidth} × ${data.gridHeight}`,
            `Total Dice Required: ${data.gridWidth * data.gridHeight}`,
            '',
            'Assembly Tips:',
            '• Start from top-left corner',
            '• Work row by row from left to right',
            '• Use the grid lines as reference',
            '• Double-check dice orientation',
        ];

        let y = 45;
        instructions.forEach(line => {
            doc.text(line, PDF_PAGE_MARGIN, y);
            y += 7;
        });

        this.addFooter(doc, pageHeight, pageWidth, 3);
    }

    getExtension() {
        return 'pdf';
    }

    getMimeType() {
        return 'application/pdf';
    }

    getFormatName() {
        return 'PDF Document';
    }
}
