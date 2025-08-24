import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Button from './Button';
import { uploadPdfToStorage, generateWhatsAppURL } from '../../services/firebase';

interface WhatsAppButtonProps {
  pdfBlob: Blob;
  documentType: string;
  documentNumber: string;
  customerName: string;
  customerPhone: string;
  companyName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  pdfBlob,
  documentType,
  documentNumber,
  customerName,
  customerPhone,
  companyName,
  className = '',
  size = 'md'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWhatsAppShare = async () => {
    if (!customerPhone?.trim()) {
      setError('Customer phone number is required');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Upload PDF to Firebase Storage
      const uploadResult = await uploadPdfToStorage(
        pdfBlob,
        documentType.toLowerCase().replace(/\s+/g, '_'),
        documentNumber,
        companyName
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload PDF');
      }

      // Generate WhatsApp URL
      const whatsappURL = generateWhatsAppURL(
        customerPhone,
        documentType,
        documentNumber,
        customerName,
        uploadResult.downloadURL!
      );

      // Open WhatsApp in new tab
      window.open(whatsappURL, '_blank');
    } catch (err) {
      console.error('Error sharing to WhatsApp:', err);
      setError(err instanceof Error ? err.message : 'Failed to share to WhatsApp');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size={size}
        onClick={handleWhatsAppShare}
        disabled={isUploading || !customerPhone?.trim()}
        className={`${className} ${!customerPhone?.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
        icon={<MessageCircle size={16} />}
      >
        {isUploading ? 'Sharing...' : 'Share on WhatsApp'}
      </Button>
      
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-md shadow-lg z-10 min-w-max">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700 font-bold"
          >
            ×
          </button>
        </div>
      )}
      
      {!customerPhone?.trim() && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs rounded-md shadow-lg z-10 min-w-max opacity-0 hover:opacity-100 transition-opacity">
          Customer phone number required
        </div>
      )}
    </div>
  );
};

export default WhatsAppButton;