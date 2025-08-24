// MySQL Sales Service - Replaces Firebase sales operations
import { executeQuery, executeTransaction, generateUUID, timestampToDateTime, dateTimeToISO } from '@/database/config';
import { Quote, SalesOrder, DeliveryOrder, DocumentLineItem, DocumentStatus } from '@/types';

// ========================================
// QUOTE SERVICES
// ========================================

export const quoteService = {
  /**
   * Get all quotes with optional filtering
   */
  async getQuotes(statusFilter?: string): Promise<Quote[]> {
    try {
      let query = `
        SELECT q.*, 
               COUNT(qli.id) as line_items_count,
               c.name as customer_name,
               poc.name as point_of_contact_name
        FROM quotes q
        LEFT JOIN quote_line_items qli ON q.id = qli.quote_id
        LEFT JOIN customers c ON q.customer_id = c.id
        LEFT JOIN points_of_contact poc ON q.point_of_contact_id = poc.id
      `;
      const params: any[] = [];

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'open') {
          query += ` WHERE q.status IN ('Draft', 'Sent', 'Discussion')`;
        } else if (statusFilter === 'approved') {
          query += ` WHERE q.status = 'Approved'`;
        } else {
          query += ` WHERE q.status = ?`;
          params.push(statusFilter);
        }
      }

      query += ` GROUP BY q.id ORDER BY q.created_at DESC`;

      const quotes = await executeQuery<any>(query, params);

      return quotes.map(quote => ({
        id: quote.id,
        quoteNumber: quote.quote_number,
        revisionNumber: quote.revision_number,
        customerId: quote.customer_id,
        customerName: quote.customer_name,
        issueDate: quote.issue_date,
        validUntil: quote.valid_until,
        status: quote.status as DocumentStatus,
        subtotal: parseFloat(quote.subtotal),
        discount: parseFloat(quote.discount),
        taxAmount: parseFloat(quote.tax_amount),
        total: parseFloat(quote.total),
        terms: quote.terms,
        notes: quote.notes,
        pointOfContactId: quote.point_of_contact_id,
        lineItems: [], // Will be loaded separately if needed
        createdAt: dateTimeToISO(quote.created_at),
        updatedAt: dateTimeToISO(quote.updated_at)
      }));
    } catch (error) {
      console.error('Get quotes error:', error);
      throw new Error('Failed to fetch quotes');
    }
  },

  /**
   * Get quote by ID with line items
   */
  async getQuoteById(id: string): Promise<Quote | null> {
    try {
      // Get quote details
      const quotes = await executeQuery<any>(
        `SELECT q.*, c.name as customer_name, poc.name as point_of_contact_name
         FROM quotes q
         LEFT JOIN customers c ON q.customer_id = c.id
         LEFT JOIN points_of_contact poc ON q.point_of_contact_id = poc.id
         WHERE q.id = ?`,
        [id]
      );

      if (quotes.length === 0) return null;

      const quote = quotes[0];

      // Get line items
      const lineItems = await executeQuery<any>(
        `SELECT * FROM quote_line_items 
         WHERE quote_id = ? 
         ORDER BY line_order ASC, created_at ASC`,
        [id]
      );

      return {
        id: quote.id,
        quoteNumber: quote.quote_number,
        revisionNumber: quote.revision_number,
        customerId: quote.customer_id,
        customerName: quote.customer_name,
        issueDate: quote.issue_date,
        validUntil: quote.valid_until,
        status: quote.status as DocumentStatus,
        subtotal: parseFloat(quote.subtotal),
        discount: parseFloat(quote.discount),
        taxAmount: parseFloat(quote.tax_amount),
        total: parseFloat(quote.total),
        terms: quote.terms,
        notes: quote.notes,
        pointOfContactId: quote.point_of_contact_id,
        lineItems: lineItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount)
        })),
        createdAt: dateTimeToISO(quote.created_at),
        updatedAt: dateTimeToISO(quote.updated_at)
      };
    } catch (error) {
      console.error('Get quote by ID error:', error);
      return null;
    }
  },

  /**
   * Save quote (create or update)
   */
  async saveQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>, userId: string, quoteId?: string): Promise<string> {
    return await executeTransaction(async (connection) => {
      const id = quoteId || generateUUID();
      const isUpdate = !!quoteId;

      try {
        if (isUpdate) {
          // Update existing quote
          await connection.execute(
            `UPDATE quotes SET 
               quote_number = ?, revision_number = ?, customer_id = ?, customer_name = ?,
               issue_date = ?, valid_until = ?, status = ?, subtotal = ?, discount = ?,
               tax_amount = ?, total = ?, terms = ?, notes = ?, point_of_contact_id = ?,
               updated_at = NOW()
             WHERE id = ?`,
            [
              quote.quoteNumber, quote.revisionNumber, quote.customerId, quote.customerName,
              quote.issueDate, quote.validUntil, quote.status, quote.subtotal, quote.discount,
              quote.taxAmount, quote.total, quote.terms, quote.notes, quote.pointOfContactId,
              id
            ]
          );

          // Delete existing line items
          await connection.execute('DELETE FROM quote_line_items WHERE quote_id = ?', [id]);
        } else {
          // Insert new quote
          await connection.execute(
            `INSERT INTO quotes (
               id, quote_number, revision_number, customer_id, customer_name,
               issue_date, valid_until, status, subtotal, discount, tax_amount, total,
               terms, notes, point_of_contact_id, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id, quote.quoteNumber, quote.revisionNumber, quote.customerId, quote.customerName,
              quote.issueDate, quote.validUntil, quote.status, quote.subtotal, quote.discount,
              quote.taxAmount, quote.total, quote.terms, quote.notes, quote.pointOfContactId, userId
            ]
          );
        }

        // Insert line items
        if (quote.lineItems && quote.lineItems.length > 0) {
          for (let i = 0; i < quote.lineItems.length; i++) {
            const item = quote.lineItems[i];
            await connection.execute(
              `INSERT INTO quote_line_items (
                 id, quote_id, product_id, product_name, description,
                 quantity, unit, rate, amount, line_order
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                generateUUID(), id, item.productId, item.productName, item.description,
                item.quantity, item.unit, item.rate, item.amount, i
              ]
            );
          }
        }

        return id;
      } catch (error) {
        console.error('Save quote error:', error);
        throw error;
      }
    });
  },

  /**
   * Delete quote
   */
  async deleteQuote(id: string): Promise<boolean> {
    try {
      await executeQuery('DELETE FROM quotes WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete quote error:', error);
      return false;
    }
  },

  /**
   * Update quote status
   */
  async updateQuoteStatus(id: string, status: DocumentStatus): Promise<boolean> {
    try {
      await executeQuery(
        'UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
      return true;
    } catch (error) {
      console.error('Update quote status error:', error);
      return false;
    }
  }
};

// ========================================
// SALES ORDER SERVICES
// ========================================

export const salesOrderService = {
  /**
   * Get all sales orders with optional filtering
   */
  async getSalesOrders(statusFilter?: string): Promise<SalesOrder[]> {
    try {
      let query = `
        SELECT so.*, 
               COUNT(soli.id) as line_items_count,
               c.name as customer_name,
               poc.name as point_of_contact_name,
               q.quote_number
        FROM sales_orders so
        LEFT JOIN sales_order_line_items soli ON so.id = soli.order_id
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN points_of_contact poc ON so.point_of_contact_id = poc.id
        LEFT JOIN quotes q ON so.quote_id = q.id
      `;
      const params: any[] = [];

      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'open') {
          query += ` WHERE so.status IN ('Approved', 'Partial')`;
        } else {
          query += ` WHERE so.status = ?`;
          params.push(statusFilter);
        }
      }

      query += ` GROUP BY so.id ORDER BY so.created_at DESC`;

      const orders = await executeQuery<any>(query, params);

      return orders.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        quoteId: order.quote_id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        orderDate: order.order_date,
        expectedDelivery: order.expected_delivery,
        status: order.status as DocumentStatus,
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        taxAmount: parseFloat(order.tax_amount),
        total: parseFloat(order.total),
        terms: order.terms,
        notes: order.notes,
        pointOfContactId: order.point_of_contact_id,
        lineItems: [], // Will be loaded separately if needed
        createdAt: dateTimeToISO(order.created_at),
        updatedAt: dateTimeToISO(order.updated_at)
      }));
    } catch (error) {
      console.error('Get sales orders error:', error);
      throw new Error('Failed to fetch sales orders');
    }
  },

  /**
   * Get sales order by ID with line items
   */
  async getSalesOrderById(id: string): Promise<SalesOrder | null> {
    try {
      // Get sales order details
      const orders = await executeQuery<any>(
        `SELECT so.*, c.name as customer_name, poc.name as point_of_contact_name, q.quote_number
         FROM sales_orders so
         LEFT JOIN customers c ON so.customer_id = c.id
         LEFT JOIN points_of_contact poc ON so.point_of_contact_id = poc.id
         LEFT JOIN quotes q ON so.quote_id = q.id
         WHERE so.id = ?`,
        [id]
      );

      if (orders.length === 0) return null;

      const order = orders[0];

      // Get line items with delivery status
      const lineItems = await executeQuery<any>(
        `SELECT * FROM sales_order_line_items 
         WHERE order_id = ? 
         ORDER BY line_order ASC`,
        [id]
      );

      return {
        id: order.id,
        orderNumber: order.order_number,
        quoteId: order.quote_id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        orderDate: order.order_date,
        expectedDelivery: order.expected_delivery,
        status: order.status as DocumentStatus,
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        taxAmount: parseFloat(order.tax_amount),
        total: parseFloat(order.total),
        terms: order.terms,
        notes: order.notes,
        pointOfContactId: order.point_of_contact_id,
        lineItems: lineItems.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          description: item.description,
          quantity: parseFloat(item.quantity),
          deliveredQuantity: parseFloat(item.delivered_quantity),
          pendingQuantity: parseFloat(item.pending_quantity),
          unit: item.unit,
          rate: parseFloat(item.rate),
          amount: parseFloat(item.amount)
        })),
        createdAt: dateTimeToISO(order.created_at),
        updatedAt: dateTimeToISO(order.updated_at)
      };
    } catch (error) {
      console.error('Get sales order by ID error:', error);
      return null;
    }
  },

  /**
   * Create sales order from quote
   */
  async createSalesOrderFromQuote(quoteId: string, userId: string): Promise<string> {
    return await executeTransaction(async (connection) => {
      try {
        // Get quote details
        const [quote] = await connection.execute(
          'SELECT * FROM quotes WHERE id = ?',
          [quoteId]
        ) as any;

        if (!quote || quote.length === 0) {
          throw new Error('Quote not found');
        }

        const quoteData = quote[0];

        // Generate sales order number
        const orderNumber = await generateDocumentNumber('sales_order');

        // Create sales order
        const orderId = generateUUID();
        await connection.execute(
          `INSERT INTO sales_orders (
             id, order_number, quote_id, customer_id, customer_name,
             order_date, status, subtotal, discount, tax_amount, total,
             terms, notes, point_of_contact_id, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, orderNumber, quoteId, quoteData.customer_id, quoteData.customer_name,
            new Date().toISOString().split('T')[0], 'Approved',
            quoteData.subtotal, quoteData.discount, quoteData.tax_amount, quoteData.total,
            quoteData.terms, quoteData.notes, quoteData.point_of_contact_id, userId
          ]
        );

        // Get quote line items
        const [lineItems] = await connection.execute(
          'SELECT * FROM quote_line_items WHERE quote_id = ? ORDER BY line_order',
          [quoteId]
        ) as any;

        // Create sales order line items
        for (const item of lineItems) {
          await connection.execute(
            `INSERT INTO sales_order_line_items (
               id, order_id, product_id, product_name, description,
               quantity, unit, rate, amount, line_order
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              generateUUID(), orderId, item.product_id, item.product_name, item.description,
              item.quantity, item.unit, item.rate, item.amount, item.line_order
            ]
          );
        }

        // Update quote status
        await connection.execute(
          'UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?',
          ['Approved', quoteId]
        );

        return orderId;
      } catch (error) {
        console.error('Create sales order from quote error:', error);
        throw error;
      }
    });
  }
};

// ========================================
// DELIVERY ORDER SERVICES
// ========================================

export const deliveryOrderService = {
  /**
   * Get all delivery orders
   */
  async getDeliveryOrders(): Promise<DeliveryOrder[]> {
    try {
      const orders = await executeQuery<any>(
        `SELECT do.*, so.order_number as sales_order_number, c.name as customer_name
         FROM delivery_orders do
         LEFT JOIN sales_orders so ON do.sales_order_id = so.id
         LEFT JOIN customers c ON do.customer_id = c.id
         ORDER BY do.created_at DESC`
      );

      return orders.map(order => ({
        id: order.id,
        deliveryNumber: order.delivery_number,
        salesOrderId: order.sales_order_id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        deliveryDate: order.delivery_date,
        vehicleNumber: order.vehicle_number,
        driverName: order.driver_name,
        status: order.status as DocumentStatus,
        notes: order.notes,
        lineItems: [], // Will be loaded separately if needed
        createdAt: dateTimeToISO(order.created_at),
        updatedAt: dateTimeToISO(order.updated_at)
      }));
    } catch (error) {
      console.error('Get delivery orders error:', error);
      throw new Error('Failed to fetch delivery orders');
    }
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate document number based on type
 */
async function generateDocumentNumber(documentType: string): Promise<string> {
  try {
    const [numbering] = await executeQuery<any>(
      'SELECT * FROM document_numbering WHERE document_type = ?',
      [documentType]
    );

    if (!numbering || numbering.length === 0) {
      throw new Error(`Document numbering not configured for type: ${documentType}`);
    }

    const config = numbering[0];
    const currentYear = new Date().getFullYear();

    // Check if we need to reset the counter for a new year
    if (config.reset_annually && config.last_reset_year !== currentYear) {
      await executeQuery(
        'UPDATE document_numbering SET current_number = 1, last_reset_year = ? WHERE document_type = ?',
        [currentYear, documentType]
      );
      config.current_number = 1;
    }

    // Generate the document number
    let number = `${config.prefix}${String(config.current_number).padStart(4, '0')}`;
    
    if (config.date_format) {
      const dateStr = new Date().toLocaleDateString('en-GB', {
        year: config.date_format.includes('yyyy') ? 'numeric' : '2-digit',
        month: config.date_format.includes('MM') ? '2-digit' : undefined,
        day: config.date_format.includes('dd') ? '2-digit' : undefined
      }).replace(/\//g, '');
      number += dateStr;
    }

    if (config.suffix) {
      number += config.suffix;
    }

    // Increment the counter
    await executeQuery(
      'UPDATE document_numbering SET current_number = current_number + 1 WHERE document_type = ?',
      [documentType]
    );

    return number;
  } catch (error) {
    console.error('Generate document number error:', error);
    throw error;
  }
}

export default {
  quoteService,
  salesOrderService,
  deliveryOrderService
};