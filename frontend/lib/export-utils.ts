import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export const exportToPDF = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const dataUrl = await toPng(element, {
            quality: 0.95,
            cacheBust: true,
        });

        const img = new Image();
        img.src = dataUrl;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [img.width, img.height]
        });

        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        pdf.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("Export PDF failed", error);
    }
};

export const exportToPNG = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const dataUrl = await toPng(element, {
            quality: 0.95,
            cacheBust: true,
        });

        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error("Export PNG failed", error);
    }
};
