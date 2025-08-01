import emailjs from '@emailjs/browser';
import { EmailSettings, Quote, SalesOrder, DeliveryOrder, CompanyDetails } from '../types';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private emailSettings: EmailSettings | null = null;

  constructor(emailSettings?: EmailSettings) {
    if (emailSettings) {
      this.configure(emailSettings);
    }
  }

  configure(emailSettings: EmailSettings) {
    this.emailSettings = emailSettings;
    
    if (emailSettings.enableNotifications && emailSettings.emailjsPublicKey) {
      emailjs.init(emailSettings.emailjsPublicKey);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.emailSettings?.enableNotifications) {
      throw new Error('Email notifications are not enabled');
    }

    if (!this.emailSettings.emailjsServiceId || !this.emailSettings.emailjsTemplateId || !this.emailSettings.emailjsPublicKey) {
      throw new Error('EmailJS configuration incomplete');
    }

    try {
      // Send a test email
      await this.sendEmail({
        to: this.emailSettings.notificationEmail,
        subject: 'EmailJS Configuration Test',
        html: `
          <h2>EmailJS Configuration Test</h2>
          <p>This is a test email to verify your EmailJS configuration is working correctly.</p>
          <p>If you receive this email, your configuration is working properly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `
      });
      return true;
    } catch (error) {
      console.error('EmailJS connection test failed:', error);
      return false;
    }
  }

  async sendEmail(emailData: EmailData): Promise<void> {
    if (!this.emailSettings || !this.emailSettings.enableNotifications) {
      console.log('Email notifications are disabled');
      return;
    }

    if (!this.emailSettings.emailjsServiceId || !this.emailSettings.emailjsTemplateId) {
      throw new Error('EmailJS service or template ID not configured');
    }

    console.log('Email settings:', {
      serviceId: this.emailSettings.emailjsServiceId,
      templateId: this.emailSettings.emailjsTemplateId,
      publicKey: this.emailSettings.emailjsPublicKey ? 'SET' : 'NOT SET',
      fromEmail: this.emailSettings.fromEmail,
      toEmail: this.emailSettings.notificationEmail
    });

    const templateParams = {
      to_email: emailData.to,
      from_email: this.emailSettings.fromEmail,
      subject: emailData.subject,
      html_content: emailData.html
    };

    console.log('Sending email with params:', templateParams);

    try {
      console.log('Calling emailjs.send...');
      const response = await emailjs.send(
        this.emailSettings.emailjsServiceId,
        this.emailSettings.emailjsTemplateId,
        templateParams
      );
      
      console.log('Email sent successfully:', response);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendQuoteNotification(
    quote: Quote, 
    companyDetails: CompanyDetails
  ): Promise<void> {
    if (!this.emailSettings?.enableNotifications) return;

    const emailHtml = this.generateQuoteEmailTemplate(quote, companyDetails);
    
    await this.sendEmail({
      to: this.emailSettings.notificationEmail,
      subject: `New Quote Generated - ${quote.quoteNumber}${quote.revisionNumber ? `-Rev${quote.revisionNumber}` : ''}`,
      html: emailHtml
    });
  }

  async sendSalesOrderNotification(
    order: SalesOrder, 
    companyDetails: CompanyDetails
  ): Promise<void> {
    if (!this.emailSettings?.enableNotifications) return;

    const emailHtml = this.generateSalesOrderEmailTemplate(order, companyDetails);
    
    await this.sendEmail({
      to: this.emailSettings.notificationEmail,
      subject: `New Sales Order Generated - ${order.orderNumber}`,
      html: emailHtml
    });
  }

  async sendDeliveryOrderNotification(
    order: DeliveryOrder, 
    companyDetails: CompanyDetails
  ): Promise<void> {
    if (!this.emailSettings?.enableNotifications) return;

    const emailHtml = this.generateDeliveryOrderEmailTemplate(order, companyDetails);
    
    await this.sendEmail({
      to: this.emailSettings.notificationEmail,
      subject: `New Delivery Order Generated - ${order.deliveryNumber}`,
      html: emailHtml
    });
  }

  private generateQuoteEmailTemplate(quote: Quote, companyDetails: CompanyDetails): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .document { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
          .header p { margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; }
          .company-info { background: #f8fafc; padding: 20px; border-bottom: 3px solid #2563eb; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e40af; margin: 0; }
          .company-details { margin: 10px 0 0 0; color: #64748b; }
          .content { padding: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-section h3 { margin: 0 0 15px 0; color: #1e40af; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
          .info-row { margin: 8px 0; }
          .info-label { font-weight: bold; color: #475569; }
          .info-value { color: #1e293b; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .items-table th { background: #1e40af; color: white; padding: 15px 12px; text-align: left; font-weight: bold; }
          .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .items-table tr:nth-child(even) { background: #f8fafc; }
          .item-name { font-weight: bold; color: #1e293b; }
          .item-desc { font-size: 14px; color: #64748b; margin-top: 4px; }
          .total-row { background: #1e40af !important; color: white; font-weight: bold; }
          .subtotal-row { background: #e2e8f0; font-weight: bold; }
          .amount { text-align: right; font-weight: bold; }
          .footer { background: #f8fafc; padding: 20px; border-top: 3px solid #2563eb; text-align: center; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1>QUOTATION</h1>
            <p>Quote #${quote.quoteNumber}${quote.revisionNumber ? `-Rev${quote.revisionNumber}` : ''}</p>
          </div>
          
          <div class="company-info">
            <div class="company-name">${companyDetails.name}</div>
            <div class="company-details">
              ${companyDetails.address}<br>
              GSTIN: ${companyDetails.gstin}<br>
              Phone: ${companyDetails.phone} | Email: ${companyDetails.email}
            </div>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-section">
                <h3>Bill To</h3>
                <div class="info-row">
                  <div class="info-value" style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${quote.customerName}</div>
                </div>
                <div class="info-row">
                  <div class="info-value">${quote.shippingAddress.line1}</div>
                </div>
                <div class="info-row">
                  <div class="info-value">${quote.shippingAddress.city}, ${quote.shippingAddress.state} - ${quote.shippingAddress.pincode}</div>
                </div>
                <div class="info-row" style="margin-top: 15px;">
                  <div class="info-label">Contact:</div>
                  <div class="info-value">${quote.contactName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Phone:</div>
                  <div class="info-value">${quote.contactPhone}</div>
                </div>
              </div>
              
              <div class="info-section">
                <h3>Quote Details</h3>
                <div class="info-row">
                  <div class="info-label">Issue Date:</div>
                  <div class="info-value">${new Date(quote.issueDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Expiry Date:</div>
                  <div class="info-value">${new Date(quote.expiryDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Status:</div>
                  <div class="info-value">${quote.status}</div>
                </div>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Product</th>
                  <th style="width: 15%;">HSN</th>
                  <th style="width: 15%;" class="amount">Qty</th>
                  <th style="width: 15%;" class="amount">Rate</th>
                  <th style="width: 15%;" class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${quote.lineItems.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.productName}</div>
                      <div class="item-desc">${item.description}</div>
                    </td>
                    <td>${item.hsnCode}</td>
                    <td class="amount">${item.quantity} ${item.unit}</td>
                    <td class="amount">₹${item.unitPrice.toFixed(2)}</td>
                    <td class="amount">₹${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
                <tr class="subtotal-row">
                  <td colspan="4" class="amount">Subtotal</td>
                  <td class="amount">₹${quote.subTotal.toFixed(2)}</td>
                </tr>
                <tr class="subtotal-row">
                  <td colspan="4" class="amount">GST (${quote.lineItems[0]?.taxRate || 18}%)</td>
                  <td class="amount">₹${quote.gstTotal.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" class="amount">GRAND TOTAL</td>
                  <td class="amount">₹${quote.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>This quotation was automatically generated by ${companyDetails.name} Order Management System.</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateSalesOrderEmailTemplate(order: SalesOrder, companyDetails: CompanyDetails): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sales Order ${order.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .document { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: #059669; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
          .header p { margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; }
          .company-info { background: #f0fdf4; padding: 20px; border-bottom: 3px solid #059669; }
          .company-name { font-size: 24px; font-weight: bold; color: #047857; margin: 0; }
          .company-details { margin: 10px 0 0 0; color: #374151; }
          .content { padding: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-section h3 { margin: 0 0 15px 0; color: #047857; font-size: 18px; border-bottom: 2px solid #d1fae5; padding-bottom: 5px; }
          .info-row { margin: 8px 0; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #111827; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .items-table th { background: #047857; color: white; padding: 15px 12px; text-align: left; font-weight: bold; }
          .items-table td { padding: 12px; border-bottom: 1px solid #d1fae5; }
          .items-table tr:nth-child(even) { background: #f0fdf4; }
          .item-name { font-weight: bold; color: #111827; }
          .item-desc { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .total-row { background: #047857 !important; color: white; font-weight: bold; }
          .subtotal-row { background: #d1fae5; font-weight: bold; }
          .amount { text-align: right; font-weight: bold; }
          .footer { background: #f0fdf4; padding: 20px; border-top: 3px solid #059669; text-align: center; color: #374151; }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1>SALES ORDER</h1>
            <p>Order #${order.orderNumber}</p>
          </div>
          
          <div class="company-info">
            <div class="company-name">${companyDetails.name}</div>
            <div class="company-details">
              ${companyDetails.address}<br>
              GSTIN: ${companyDetails.gstin}<br>
              Phone: ${companyDetails.phone} | Email: ${companyDetails.email}
            </div>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-section">
                <h3>Bill To</h3>
                <div class="info-row">
                  <div class="info-value" style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${order.customerName}</div>
                </div>
                <div class="info-row">
                  <div class="info-value">${order.shippingAddress.line1}</div>
                </div>
                <div class="info-row">
                  <div class="info-value">${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}</div>
                </div>
                <div class="info-row" style="margin-top: 15px;">
                  <div class="info-label">Contact:</div>
                  <div class="info-value">${order.contactName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Phone:</div>
                  <div class="info-value">${order.contactPhone}</div>
                </div>
              </div>
              
              <div class="info-section">
                <h3>Order Details</h3>
                <div class="info-row">
                  <div class="info-label">Order Date:</div>
                  <div class="info-value">${new Date(order.orderDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Client PO:</div>
                  <div class="info-value">${order.clientPoNumber || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Status:</div>
                  <div class="info-value">${order.status}</div>
                </div>
                ${order.quoteNumber ? `
                <div class="info-row">
                  <div class="info-label">Original Quote:</div>
                  <div class="info-value">${order.quoteNumber}</div>
                </div>
                ` : ''}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 35%;">Product</th>
                  <th style="width: 12%;">HSN</th>
                  <th style="width: 13%;" class="amount">Ordered</th>
                  <th style="width: 13%;" class="amount">Delivered</th>
                  <th style="width: 12%;" class="amount">Rate</th>
                  <th style="width: 15%;" class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${order.lineItems.map(item => {
                  const deliveredQty = order.deliveredQuantities ? order.deliveredQuantities[item.id] || 0 : 0;
                  return `
                    <tr>
                      <td>
                        <div class="item-name">${item.productName}</div>
                        <div class="item-desc">${item.description}</div>
                      </td>
                      <td>${item.hsnCode}</td>
                      <td class="amount">${item.quantity} ${item.unit}</td>
                      <td class="amount">${deliveredQty} ${item.unit}</td>
                      <td class="amount">₹${item.unitPrice.toFixed(2)}</td>
                      <td class="amount">₹${item.total.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="subtotal-row">
                  <td colspan="5" class="amount">Subtotal</td>
                  <td class="amount">₹${order.subTotal.toFixed(2)}</td>
                </tr>
                <tr class="subtotal-row">
                  <td colspan="5" class="amount">GST (${order.lineItems[0]?.taxRate || 18}%)</td>
                  <td class="amount">₹${order.gstTotal.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="5" class="amount">GRAND TOTAL</td>
                  <td class="amount">₹${order.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>This sales order was automatically generated by ${companyDetails.name} Order Management System.</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDeliveryOrderEmailTemplate(order: DeliveryOrder, companyDetails: CompanyDetails): string {
    // Calculate tax totals for delivery order
    const subTotal = order.lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = order.lineItems[0]?.taxRate || 18;
    const gstTotal = subTotal * (taxRate / 100);
    const total = subTotal + gstTotal;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Delivery Order ${order.deliveryNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .document { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
          .header p { margin: 5px 0 0 0; font-size: 16px; opacity: 0.9; }
          .company-info { background: #fef2f2; padding: 20px; border-bottom: 3px solid #dc2626; }
          .company-name { font-size: 24px; font-weight: bold; color: #b91c1c; margin: 0; }
          .company-details { margin: 10px 0 0 0; color: #374151; }
          .content { padding: 30px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-section h3 { margin: 0 0 15px 0; color: #b91c1c; font-size: 18px; border-bottom: 2px solid #fecaca; padding-bottom: 5px; }
          .info-row { margin: 8px 0; }
          .info-label { font-weight: bold; color: #374151; }
          .info-value { color: #111827; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .items-table th { background: #b91c1c; color: white; padding: 15px 12px; text-align: left; font-weight: bold; }
          .items-table td { padding: 12px; border-bottom: 1px solid #fecaca; }
          .items-table tr:nth-child(even) { background: #fef2f2; }
          .item-name { font-weight: bold; color: #111827; }
          .item-desc { font-size: 14px; color: #6b7280; margin-top: 4px; }
          .amount { text-align: right; font-weight: bold; }
          .footer { background: #fef2f2; padding: 20px; border-top: 3px solid #dc2626; text-align: center; color: #374151; }
          .address-box { background: #fef2f2; border: 2px solid #fecaca; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <h1>DELIVERY ORDER</h1>
            <p>Delivery #${order.deliveryNumber}</p>
          </div>
          
          <div class="company-info">
            <div class="company-name">${companyDetails.name}</div>
            <div class="company-details">
              ${companyDetails.address}<br>
              GSTIN: ${companyDetails.gstin}<br>
              Phone: ${companyDetails.phone} | Email: ${companyDetails.email}
            </div>
          </div>
          
          <div class="content">
            <div class="info-grid">
              <div class="info-section">
                <h3>Customer Details</h3>
                <div class="info-row">
                  <div class="info-value" style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${order.customerName}</div>
                </div>
                <div class="info-row" style="margin-top: 15px;">
                  <div class="info-label">Contact:</div>
                  <div class="info-value">${order.contactName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Phone:</div>
                  <div class="info-value">${order.contactPhone}</div>
                </div>
              </div>
              
              <div class="info-section">
                <h3>Delivery Details</h3>
                <div class="info-row">
                  <div class="info-label">Delivery Date:</div>
                  <div class="info-value">${new Date(order.deliveryDate).toLocaleDateString('en-GB')}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Sales Order:</div>
                  <div class="info-value">${order.salesOrderNumber}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Vehicle Number:</div>
                  <div class="info-value">${order.vehicleNumber || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Status:</div>
                  <div class="info-value">${order.status}</div>
                </div>
              </div>
            </div>

            <div class="address-box">
              <h3 style="margin: 0 0 10px 0; color: #b91c1c;">🚚 Delivery Address</h3>
              <div style="font-weight: bold;">${order.shippingAddress.line1}</div>
              ${order.shippingAddress.line2 ? `<div>${order.shippingAddress.line2}</div>` : ''}
              <div>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Product</th>
                  <th style="width: 20%;">HSN Code</th>
                  <th style="width: 30%;" class="amount">Quantity Delivered</th>
                </tr>
              </thead>
              <tbody>
                ${order.lineItems.map(item => `
                  <tr>
                    <td>
                      <div class="item-name">${item.productName}</div>
                      <div class="item-desc">${item.description}</div>
                    </td>
                    <td>${item.hsnCode}</td>
                    <td class="amount">${item.quantity} ${item.unit}</td>
                  </tr>
                `).join('')}
                <tr class="subtotal-row">
                  <td colspan="2" class="amount">Subtotal</td>
                  <td class="amount">₹${subTotal.toFixed(2)}</td>
                </tr>
                <tr class="subtotal-row">
                  <td colspan="2" class="amount">GST (${taxRate}%)</td>
                  <td class="amount">₹${gstTotal.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2" class="amount">GRAND TOTAL</td>
                  <td class="amount">₹${total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>This delivery order was automatically generated by ${companyDetails.name} Order Management System.</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

}

let emailServiceInstance: EmailService | null = null;

export const getEmailService = (emailSettings?: EmailSettings): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(emailSettings);
  } else if (emailSettings) {
    emailServiceInstance.configure(emailSettings);
  }
  return emailServiceInstance;
};

