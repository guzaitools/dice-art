import { jsPDF } from 'jspdf';

export default class PDFExporter {
    async exportProject(diceCanvas, originalCanvas, metadata) {
        const doc = jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;

        // --- Page 1: Dice Art ---
        doc.setFillColor(255, 255, 255); // White background
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Title / Logo for Page 1
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
                    const logoWidth = pageWidth / 2.5;
                    const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
                    const logoX = (pageWidth - logoWidth) / 2;
                    doc.addImage(logoImg, 'PNG', logoX, 15, logoWidth, logoHeight);
                    break;
                }
            }

            if (!loaded) {
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                const titleText = 'DICE ART';
                const titleWidth = doc.getTextWidth(titleText);
                doc.text(titleText, (pageWidth - titleWidth) / 2, 25);
            }
        } catch (e) {
            console.warn('Failed to load logo for PDF:', e);
        }

        // Dice Mosaic Image
        const diceImgData = diceCanvas.toDataURL('image/jpeg', 0.95);
        const mosaicWidth = pageWidth - margin * 2;
        const mosaicHeight = (diceCanvas.height * mosaicWidth) / diceCanvas.width;

        // Centering the mosaic
        const mosaicY = pageHeight / 2 - mosaicHeight / 2 + 10;
        doc.addImage(diceImgData, 'JPEG', margin, mosaicY, mosaicWidth, mosaicHeight);

        // Grid overlay
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.2); // Visible white lines
        const cellWidth = mosaicWidth / metadata.gridWidth;
        const cellHeight = mosaicHeight / metadata.gridHeight;

        for (let i = 0; i <= metadata.gridWidth; i++) {
            const x = margin + i * cellWidth;
            doc.line(x, mosaicY, x, mosaicY + mosaicHeight);
        }
        for (let j = 0; j <= metadata.gridHeight; j++) {
            const y = mosaicY + j * cellHeight;
            doc.line(margin, y, margin + mosaicWidth, y);
        }

        // Footer Page 1
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const footerText = `create your own dice art at diceart.gustaviano.online`;
        doc.text(footerText, margin, pageHeight - 10);

        // --- Page 2: Metadata & Original ---
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Section Title: Arte Metadata
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('PROJECT METADATA', margin, margin + 10);

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(margin, margin + 13, pageWidth - margin, margin + 13);

        // Metadata Details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);

        let y = margin + 25;
        doc.text(`Dimensions:`, margin, y);
        doc.setTextColor(0, 0, 0);
        doc.text(`${metadata.gridWidth} columns x ${metadata.gridHeight} rows`, margin + 40, y);

        y += 8;
        doc.setTextColor(60, 60, 60);
        doc.text(`Total Dice:`, margin, y);
        doc.setTextColor(0, 0, 0);
        doc.text(`${metadata.totalDice.toLocaleString()}`, margin + 40, y);

        // Inventory Table
        y += 20;
        doc.setFont('helvetica', 'bold');
        doc.text('DICE INVENTORY', margin, y);
        y += 5;
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        metadata.stats.byLevel.forEach((count, index) => {
            const face = index + 1;
            doc.setTextColor(60, 60, 60);
            doc.text(`Dice with Face ${face}:`, margin, y);
            doc.setTextColor(0, 0, 0);
            doc.text(`${count.toLocaleString()}`, margin + 40, y);
            y += 7;
        });

        // Original Image Comparison
        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('SOURCE IMAGE', margin, y);
        y += 5;
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        const originalImgData = originalCanvas.toDataURL('image/jpeg', 0.8);
        const origDisplayWidth = 80;
        const origDisplayHeight = (originalCanvas.height * origDisplayWidth) / originalCanvas.width;
        doc.addImage(originalImgData, 'JPEG', margin, y, origDisplayWidth, origDisplayHeight);

        // Final Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('create your own dice art at diceart.gustaviano.online', margin, pageHeight - 10);

        return doc.output('blob');
    }
}
