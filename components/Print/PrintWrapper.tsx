
import React from 'react';
import { CompanyDetails, PdfSettings } from '../../types';

interface PrintWrapperProps {
    children: React.ReactNode;
    companyDetails: CompanyDetails;
    settings: PdfSettings;
    totalPages?: number;
    currentPage?: number;
}

const AdaptecHeader: React.FC<{ company: CompanyDetails; settings: PdfSettings }> = ({ company, settings }) => (
    <div className="flex justify-between items-center">
        <div> 
            {settings.companyLogo ? (
                <img src={settings.companyLogo} alt="Company Logo" style={{ width: `${settings.logoSize}px`, height: 'auto' }} />
            ) : (
                <div className="w-40">
                    <p className="text-3xl font-bold" style={{ color: '#002f5f' }}>adaptec</p>
                    <p className="text-lg tracking-wide" style={{ color: '#d92429' }}>building solutions</p>
                    <p className="text-xs text-gray-500 tracking-wider">private limited</p>
                </div>
            )}
        </div>
        <div className="text-right text-xs text-gray-700 space-y-1">
            <p className="font-bold text-lg" style={{fontSize: '1.5rem'}}>{company.name}</p>
            <p className="whitespace-pre-line">{company.address}</p>
            <p>
                <span>Tel: {company.phone}</span>
                <span className="mx-1">|</span>
                <span>Email: {company.email}</span>
            </p>
            <p><strong className="font-bold">GSTIN:</strong> {company.gstin}</p>
        </div>
    </div>
);

const AdaptecFooter: React.FC<{ company: CompanyDetails, page: number, totalPages: number }> = ({ company, page, totalPages }) => (
    <div className="h-8 flex items-center justify-between text-white text-xs px-8" style={{backgroundColor: '#002f5f'}}>
        <span>{company.name}</span>
        <span>Page {page} of {totalPages}</span>
        <span>Tel: {company.phone}</span>
    </div>
);

const ClassicTemplate: React.FC<PrintWrapperProps> = ({ children, companyDetails, settings, currentPage, totalPages }) => {
     return (
        <div className="p-8 flex flex-col h-full">
            <header>
                <div className="flex justify-between items-center">
                    <div>
                        {settings.companyLogo ? (
                            <img src={settings.companyLogo} alt="Company Logo" style={{ width: `${settings.logoSize}px`, height: 'auto', maxHeight: '60px', objectFit: 'contain' }} />
                        ) : (
                            <h1 className="text-3xl font-bold" style={{color: settings.accentColor}}>{companyDetails.name}</h1>
                        )}
                    </div>
                    <div className="text-right text-xs">
                        <p className="whitespace-pre-line">{companyDetails.address}</p>
                        <p>{companyDetails.email} | {companyDetails.phone}</p>
                    </div>
                </div>
                <hr className="my-2" style={{borderColor: settings.accentColor}}/>
            </header>
            <main className="flex-grow">
                {children}
            </main>
             <footer className="mt-auto pt-4 text-xs text-center text-gray-500">
                {settings.footerImage && (
                    <img src={settings.footerImage} alt="Footer" className="w-full object-contain mb-2" style={{ height: `${settings.footerImageSize}px` }} />
                )}
                 {totalPages && totalPages > 1 && <p>Page {currentPage} of {totalPages}</p>}
            </footer>
        </div>
     )
};

const AdaptecTemplate: React.FC<PrintWrapperProps> = ({ children, companyDetails, settings, currentPage, totalPages }) => {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-8 pt-8">
                <AdaptecHeader company={companyDetails} settings={settings} />
            </div>
            <main className="flex-grow mt-2 px-8">
                {children}
            </main>
            <AdaptecFooter company={companyDetails} page={currentPage || 1} totalPages={totalPages || 1} />
        </div>
    )
}

const ModernTemplate: React.FC<PrintWrapperProps> = ({ children, companyDetails, settings, currentPage, totalPages }) => {
    return (
        <div className="p-8 flex flex-col h-full bg-white text-gray-800">
            <header className="flex justify-between items-center pb-4">
                {settings.companyLogo ? (
                    <img src={settings.companyLogo} alt="Company Logo" style={{ width: `${settings.logoSize}px`, height: 'auto', maxHeight: '50px', objectFit: 'contain' }} />
                ) : (
                    <h1 className="text-2xl font-bold">{companyDetails.name}</h1>
                )}
                <div className="text-right text-xs space-y-0.5">
                    <p className="whitespace-pre-line font-semibold">{companyDetails.address}</p>
                    <p>{companyDetails.phone} | {companyDetails.email}</p>
                    <p>GSTIN: {companyDetails.gstin}</p>
                </div>
            </header>
            <div className="w-full h-1 mb-4" style={{ backgroundColor: settings.accentColor }}></div>

            <main className="flex-grow">
                {children}
            </main>

            <footer className="mt-auto pt-4 text-xs text-center text-gray-500">
                <p>Thank you for your business!</p>
                <p>{companyDetails.name} | Page {currentPage || 1} of {totalPages || 1}</p>
            </footer>
        </div>
    )
};

const ElegantTemplate: React.FC<PrintWrapperProps> = ({ children, companyDetails, settings, currentPage, totalPages }) => {
    return (
        <div className="h-full w-full bg-gray-100 p-3">
            <div className="border border-gray-300 h-full w-full flex flex-col p-6 bg-white">
                <header className="text-center pb-4 border-b border-gray-200">
                    {settings.companyLogo ? (
                         <img src={settings.companyLogo} alt="Company Logo" className="mx-auto mb-2" style={{ width: `${settings.logoSize}px`, height: 'auto', maxHeight: '40px', objectFit: 'contain' }} />
                    ) : (
                        <h1 className="text-2xl" style={{ fontFamily: 'serif' }}>{companyDetails.name}</h1>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{companyDetails.address}</p>
                </header>

                <main className="flex-grow py-4">
                    {children}
                </main>

                <footer className="mt-auto pt-4 text-xs text-center text-gray-500 border-t border-gray-200">
                    <p>{companyDetails.phone} | {companyDetails.email} | GSTIN: {companyDetails.gstin}</p>
                    <p className="mt-1">Page {currentPage || 1} of {totalPages || 1}</p>
                </footer>
            </div>
        </div>
    );
};

const BandWTemplate: React.FC<PrintWrapperProps> = ({ children, companyDetails, settings, currentPage, totalPages }) => {
    return (
        <div className="relative p-8 flex flex-col h-full bg-white text-black font-sans">
            {/* Header */}
            <header className="flex justify-between items-center pb-2 border-b-4 border-black">
                {settings.companyLogo ? (
                    <img src={settings.companyLogo} alt="Logo" style={{ width: `${settings.logoSize}px`, height: 'auto', maxHeight: '60px', objectFit: 'contain' }} />
                ) : (
                    <div className="w-40">
                        <p className="text-3xl font-bold">ABSPL</p>
                    </div>
                )}
                <div className="text-right text-xs space-y-1">
                    <p className="font-bold text-lg">{companyDetails.name}</p>
                    <p className="whitespace-pre-line">{companyDetails.address}</p>
                    <p>Phone: {companyDetails.phone} | Email: {companyDetails.email}</p>
                    {companyDetails.website && <p>Website: {companyDetails.website}</p>}
                    <p>GSTIN: {companyDetails.gstin}</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow mt-2 pb-24">
                {children}
            </main>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 right-0 px-8 pt-2 pb-4 border-t-2 border-gray-400 bg-white">
                <div className="flex justify-between items-center text-xs">
                    <div className="w-1/3">
                        {settings.footerImage ? (
                            <img src={settings.footerImage} alt="Footer Logo" style={{ height: `${settings.footerImageSize}px` }} />
                        ) : (
                            <p>&nbsp;</p> // Placeholder
                        )}
                    </div>
                     <div className="w-1/3 text-center">
                        {totalPages && totalPages > 0 && (
                            <p>Page {currentPage} of {totalPages}</p>
                        )}
                    </div>
                    <div className="w-1/3 text-right">
                        {companyDetails.bankDetails && (
                            <div>
                                <p className="font-bold">Bank Details</p>
                                <p>{companyDetails.bankDetails.name} - {companyDetails.bankDetails.branch}</p>
                                <p>A/c: {companyDetails.bankDetails.accountNumber} | IFSC: {companyDetails.bankDetails.ifsc}</p>
                            </div>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
};


const PrintWrapper: React.FC<PrintWrapperProps> = (props) => {
  const { settings } = props;

  const renderTemplate = () => {
    switch (settings.template) {
      case 'adaptec':
        return <AdaptecTemplate {...props} />;
      case 'modern':
        return <ModernTemplate {...props} />;
      case 'elegant':
        return <ElegantTemplate {...props} />;
       case 'BandW':
        return <BandWTemplate {...props} />;
       case 'BandW POI':
        return <BandWTemplate {...props} />;
      case 'classic':
      default:
        return <ClassicTemplate {...props} />;
    }
  };

  return (
    <div style={{ width: '210mm', height: '297mm', fontFamily: 'sans-serif' }} className="bg-white shadow-lg">
       {renderTemplate()}
    </div>
  );
};

export default PrintWrapper;