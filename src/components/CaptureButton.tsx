import React from 'react';
import html2canvas from 'html2canvas';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';

interface CaptureButtonProps {
    targetId: string;
    fileName: string;
    className?: string;
}

export const CaptureButton: React.FC<CaptureButtonProps> = ({ targetId, fileName, className }) => {
    const handleCapture = async () => {
        const element = document.getElementById(targetId);
        if (!element) {
            toast.error("Elemento no encontrado");
            return;
        }

        try {
            toast.loading("Generando imagen...");
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a', // Slate-900 match
                scale: 2, // High DPI
                logging: false,
                useCORS: true
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `${fileName}.png`;
            link.click();
            toast.dismiss();
            toast.success("Imagen descargada");
        } catch (e) {
            console.error(e);
            toast.error("Error al generar imagen");
        }
    };

    return (
        <button
            onClick={handleCapture}
            className={`p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition shadow-lg flex items-center gap-2 text-xs font-bold uppercase ${className}`}
            title="Descargar como Imagen"
        >
            <Camera className="w-4 h-4" /> <span className="hidden sm:inline">Capturar</span>
        </button>
    );
};
