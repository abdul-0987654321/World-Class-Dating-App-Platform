/**
 * Invoice Generation Service
 * Handles PDF invoice generation, storage, and email delivery
 */

import PDFDocument from 'pdfkit';
import { BlobServiceClient } from '@azure/storage-blob';
import { db } from '../../infrastructure/database/connection';
import { NotificationServiceClient } from '../../infrastructure/clients/notification-service.client';
import logger from '../../utils/logger';
import { Readable } from 'stream';

const notificationServiceClient = new NotificationServiceClient();

export interface InvoiceData {
  invoiceNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  stripeInvoiceId?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  currency: string;
  invoiceDate: Date;
  dueDate?: Date;
  paymentMethod?: string;
  transactionId?: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  transaction_id?: string;
  stripe_invoice_id?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  invoice_date: Date;
  due_date?: Date;
  pdf_url?: string;
  azure_blob_name?: string;
  sent_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export class InvoiceGenerationService {
  private azureBlobClient?: BlobServiceClient;
  private containerName: string;
  private isAzureConfigured: boolean = false;

  constructor() {
    this.containerName = process.env.AZURE_INVOICE_CONTAINER_NAME || 'invoices';
    this.initializeAzureStorage();
  }

  /**
   * Initialize Azure Storage connection
   */
  private initializeAzureStorage(): void {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

      if (!connectionString) {
        logger.warn('Azure Storage connection string not configured. Invoice PDFs will not be uploaded.');
        return;
      }

      this.azureBlobClient = BlobServiceClient.fromConnectionString(connectionString);
      this.isAzureConfigured = true;
      logger.info('Azure Storage initialized for invoice generation');
    } catch (error: any) {
      logger.error('Failed to initialize Azure Storage:', error);
      this.isAzureConfigured = false;
    }
  }

  /**
   * Generate invoice for a transaction
   */
  async generateInvoice(
    transactionId: string,
    additionalData?: Partial<InvoiceData>
  ): Promise<Invoice> {
    try {
      // Fetch transaction data
      const transaction = await db('transactions')
        .where({ id: transactionId })
        .first();

      if (!transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      // Fetch user data (simulated - in production, fetch from user service)
      const userEmail = additionalData?.userEmail || 'user@example.com';
      const userName = additionalData?.userName || 'Customer';

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Prepare invoice data
      const invoiceData: InvoiceData = {
        invoiceNumber,
        userId: transaction.user_id,
        userEmail,
        userName,
        stripeInvoiceId: transaction.stripe_invoice_id,
        billingAddress: additionalData?.billingAddress,
        lineItems: additionalData?.lineItems || [
          {
            description: transaction.description || 'Service',
            quantity: 1,
            unitPrice: transaction.amount,
            amount: transaction.amount,
          },
        ],
        subtotal: transaction.amount,
        tax: 0,
        total: transaction.amount,
        currency: transaction.currency,
        invoiceDate: new Date(),
        dueDate: additionalData?.dueDate,
        paymentMethod: additionalData?.paymentMethod,
        transactionId: transaction.stripe_payment_intent_id,
        metadata: additionalData?.metadata,
      };

      // Generate PDF
      const pdfBuffer = await this.generatePDF(invoiceData);

      // Upload to Azure Storage
      let pdfUrl: string | undefined;
      let azureBlobName: string | undefined;

      if (this.isAzureConfigured) {
        const uploadResult = await this.uploadToAzure(invoiceNumber, pdfBuffer);
        pdfUrl = uploadResult.url;
        azureBlobName = uploadResult.blobName;
      } else {
        logger.warn(`Invoice ${invoiceNumber} generated but not uploaded (Azure not configured)`);
      }

      // Store invoice record in database
      const [invoice] = await db('invoices')
        .insert({
          invoice_number: invoiceNumber,
          user_id: transaction.user_id,
          transaction_id: transactionId,
          stripe_invoice_id: transaction.stripe_invoice_id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: 'sent',
          invoice_date: invoiceData.invoiceDate,
          due_date: invoiceData.dueDate,
          pdf_url: pdfUrl,
          azure_blob_name: azureBlobName,
          sent_at: new Date(),
          metadata: JSON.stringify(invoiceData.metadata || {}),
        })
        .returning('*');

      // Send invoice email
      await this.sendInvoiceEmail(invoice, userEmail, pdfUrl);

      logger.info(`Invoice generated successfully: ${invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Failed to generate invoice:', error);
      throw new Error(`Invoice generation failed: ${error.message}`);
    }
  }

  /**
   * Generate invoice from Stripe invoice
   */
  async generateInvoiceFromStripe(
    stripeInvoiceId: string,
    userId: string,
    userEmail: string,
    userName: string,
    stripeInvoiceData: any
  ): Promise<Invoice> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Parse Stripe invoice data
      const lineItems = stripeInvoiceData.lines.data.map((line: any) => ({
        description: line.description || 'Service',
        quantity: line.quantity || 1,
        unitPrice: (line.amount || 0) / 100,
        amount: (line.amount || 0) / 100,
      }));

      const subtotal = (stripeInvoiceData.subtotal || 0) / 100;
      const tax = (stripeInvoiceData.tax || 0) / 100;
      const total = (stripeInvoiceData.total || 0) / 100;

      const invoiceData: InvoiceData = {
        invoiceNumber,
        userId,
        userEmail,
        userName,
        stripeInvoiceId,
        billingAddress: stripeInvoiceData.customer_address,
        lineItems,
        subtotal,
        tax,
        total,
        currency: stripeInvoiceData.currency.toUpperCase(),
        invoiceDate: new Date(stripeInvoiceData.created * 1000),
        dueDate: stripeInvoiceData.due_date ? new Date(stripeInvoiceData.due_date * 1000) : undefined,
        paymentMethod: stripeInvoiceData.payment_intent?.payment_method_types?.[0],
        transactionId: stripeInvoiceData.payment_intent?.id,
        metadata: stripeInvoiceData.metadata,
      };

      // Generate PDF
      const pdfBuffer = await this.generatePDF(invoiceData);

      // Upload to Azure Storage
      let pdfUrl: string | undefined;
      let azureBlobName: string | undefined;

      if (this.isAzureConfigured) {
        const uploadResult = await this.uploadToAzure(invoiceNumber, pdfBuffer);
        pdfUrl = uploadResult.url;
        azureBlobName = uploadResult.blobName;
      }

      // Store invoice record in database
      const [invoice] = await db('invoices')
        .insert({
          invoice_number: invoiceNumber,
          user_id: userId,
          stripe_invoice_id: stripeInvoiceId,
          amount: total,
          currency: invoiceData.currency,
          status: stripeInvoiceData.status === 'paid' ? 'paid' : 'sent',
          invoice_date: invoiceData.invoiceDate,
          due_date: invoiceData.dueDate,
          pdf_url: pdfUrl,
          azure_blob_name: azureBlobName,
          sent_at: new Date(),
          metadata: JSON.stringify(invoiceData.metadata || {}),
        })
        .returning('*');

      // Send invoice email
      await this.sendInvoiceEmail(invoice, userEmail, pdfUrl);

      logger.info(`Invoice generated from Stripe: ${invoiceNumber}`);
      return invoice;
    } catch (error: any) {
      logger.error('Failed to generate invoice from Stripe:', error);
      throw new Error(`Stripe invoice generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF document
   */
  private async generatePDF(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('FLAMORAL', 50, 50);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Dating Platform', 50, 75)
          .text('Email: support@flamoral.com', 50, 90)
          .text('Website: www.flamoral.com', 50, 105);

        // Invoice Title
        doc
          .fontSize(28)
          .font('Helvetica-Bold')
          .text('INVOICE', 400, 50, { align: 'right' });

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Invoice #: ${data.invoiceNumber}`, 400, 85, { align: 'right' })
          .text(`Date: ${data.invoiceDate.toLocaleDateString()}`, 400, 100, { align: 'right' });

        if (data.dueDate) {
          doc.text(`Due Date: ${data.dueDate.toLocaleDateString()}`, 400, 115, { align: 'right' });
        }

        // Bill To Section
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Bill To:', 50, 160);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(data.userName, 50, 180)
          .text(data.userEmail, 50, 195);

        if (data.billingAddress) {
          let y = 210;
          if (data.billingAddress.line1) {
            doc.text(data.billingAddress.line1, 50, y);
            y += 15;
          }
          if (data.billingAddress.line2) {
            doc.text(data.billingAddress.line2, 50, y);
            y += 15;
          }
          const cityStateZip = [
            data.billingAddress.city,
            data.billingAddress.state,
            data.billingAddress.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
          if (cityStateZip) {
            doc.text(cityStateZip, 50, y);
            y += 15;
          }
          if (data.billingAddress.country) {
            doc.text(data.billingAddress.country, 50, y);
          }
        }

        // Line Items Table
        const tableTop = 300;
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Description', 50, tableTop)
          .text('Qty', 300, tableTop, { width: 50, align: 'right' })
          .text('Unit Price', 360, tableTop, { width: 80, align: 'right' })
          .text('Amount', 450, tableTop, { width: 95, align: 'right' });

        doc
          .moveTo(50, tableTop + 15)
          .lineTo(545, tableTop + 15)
          .stroke();

        let yPosition = tableTop + 25;
        data.lineItems.forEach((item) => {
          doc
            .font('Helvetica')
            .text(item.description, 50, yPosition, { width: 240 })
            .text(item.quantity.toString(), 300, yPosition, { width: 50, align: 'right' })
            .text(`${data.currency} ${item.unitPrice.toFixed(2)}`, 360, yPosition, { width: 80, align: 'right' })
            .text(`${data.currency} ${item.amount.toFixed(2)}`, 450, yPosition, { width: 95, align: 'right' });
          yPosition += 25;
        });

        // Totals
        yPosition += 10;
        doc
          .moveTo(50, yPosition)
          .lineTo(545, yPosition)
          .stroke();

        yPosition += 15;
        doc
          .font('Helvetica')
          .text('Subtotal:', 360, yPosition)
          .text(`${data.currency} ${data.subtotal.toFixed(2)}`, 450, yPosition, { width: 95, align: 'right' });

        if (data.tax && data.tax > 0) {
          yPosition += 20;
          doc
            .text('Tax:', 360, yPosition)
            .text(`${data.currency} ${data.tax.toFixed(2)}`, 450, yPosition, { width: 95, align: 'right' });
        }

        yPosition += 20;
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Total:', 360, yPosition)
          .text(`${data.currency} ${data.total.toFixed(2)}`, 450, yPosition, { width: 95, align: 'right' });

        // Payment Information
        if (data.transactionId) {
          yPosition += 40;
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Payment Information', 50, yPosition);

          yPosition += 20;
          doc
            .font('Helvetica')
            .text(`Transaction ID: ${data.transactionId}`, 50, yPosition);

          if (data.paymentMethod) {
            yPosition += 15;
            doc.text(`Payment Method: ${data.paymentMethod}`, 50, yPosition);
          }
        }

        // Footer
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            'Thank you for your business!',
            50,
            doc.page.height - 100,
            { align: 'center', width: doc.page.width - 100 }
          );

        doc
          .text(
            'This is a computer-generated invoice and does not require a signature.',
            50,
            doc.page.height - 80,
            { align: 'center', width: doc.page.width - 100 }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Upload PDF to Azure Blob Storage
   */
  private async uploadToAzure(
    invoiceNumber: string,
    pdfBuffer: Buffer
  ): Promise<{ url: string; blobName: string }> {
    try {
      if (!this.azureBlobClient) {
        throw new Error('Azure Storage client not initialized');
      }

      const containerClient = this.azureBlobClient.getContainerClient(this.containerName);

      // Ensure container exists
      await containerClient.createIfNotExists({ access: 'blob' });

      // Generate blob name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const blobName = `${invoiceNumber}_${timestamp}.pdf`;

      // Upload blob
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/pdf',
        },
      });

      const url = blockBlobClient.url;

      logger.info(`Invoice PDF uploaded to Azure: ${blobName}`);
      return { url, blobName };
    } catch (error: any) {
      logger.error('Failed to upload invoice to Azure:', error);
      throw new Error(`Azure upload failed: ${error.message}`);
    }
  }

  /**
   * Send invoice email to user
   */
  private async sendInvoiceEmail(
    invoice: Invoice,
    userEmail: string,
    pdfUrl?: string
  ): Promise<void> {
    try {
      // In production, this would integrate with an email service
      // For now, we'll use the notification service
      await notificationServiceClient.sendNotification({
        userId: invoice.user_id,
        type: 'payment_success',
        title: 'Invoice Available',
        body: `Your invoice #${invoice.invoice_number} is now available. Amount: ${invoice.currency} ${invoice.amount.toFixed(2)}`,
        data: {
          invoiceNumber: invoice.invoice_number,
          invoiceUrl: pdfUrl,
          amount: invoice.amount,
          currency: invoice.currency,
        },
      });

      logger.info(`Invoice email sent to ${userEmail}: ${invoice.invoice_number}`);
    } catch (error: any) {
      logger.error('Failed to send invoice email:', error);
      // Don't throw - email is non-critical
    }
  }

  /**
   * Generate sequential invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get last invoice number for this month
    const lastInvoice = await db('invoices')
      .where('invoice_number', 'like', `INV-${year}${month}-%`)
      .orderBy('created_at', 'desc')
      .first();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoice_number.split('-').pop() || '0', 10);
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return await db('invoices').where({ id: invoiceId }).first();
  }

  /**
   * Get invoices for a user
   */
  async getUserInvoices(userId: string): Promise<Invoice[]> {
    return await db('invoices')
      .where({ user_id: userId })
      .orderBy('invoice_date', 'desc');
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(invoiceId: string): Promise<void> {
    await db('invoices')
      .where({ id: invoiceId })
      .update({
        status: 'paid',
        updated_at: new Date(),
      });

    logger.info(`Invoice marked as paid: ${invoiceId}`);
  }

  /**
   * Void an invoice
   */
  async voidInvoice(invoiceId: string): Promise<void> {
    await db('invoices')
      .where({ id: invoiceId })
      .update({
        status: 'void',
        updated_at: new Date(),
      });

    logger.info(`Invoice voided: ${invoiceId}`);
  }
}

export default new InvoiceGenerationService();
