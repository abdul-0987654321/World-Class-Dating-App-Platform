import express, { Request, Response } from 'express';
import { db } from '../../infrastructure/database/connection';
import { createLogger } from '@flamoral/backend-shared';
import { Partner, PartnerCreateInput, PartnerUpdateInput, PARTNER_STATUS } from '../../domain/entities/Partner.entity';

const router = express.Router();
const logger = createLogger('partner-admin-routes');

interface AdminRequest extends Request {
  admin?: {
    id: string;
    role: string;
  };
}

/**
 * List all partners
 * GET /api/v1/partnerships/admin/partners
 */
router.get('/', async (req: AdminRequest, res: Response) => {
  try {
    const { type, status, search, page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = db('partners').orderBy('created_at', 'desc');

    if (type) {
      query = query.where('type', type);
    }
    if (status) {
      query = query.where('status', status);
    }
    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('contact_email', 'ilike', `%${search}%`);
      });
    }

    // Get total count
    const [{ count }] = await query.clone().count('* as count');
    const total = parseInt(count as string) || 0;

    // Get paginated results
    const partners = await query.limit(limitNum).offset(offset);

    res.json({
      success: true,
      data: partners.map(p => mapPartner(p)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('List partners failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get partner details
 * GET /api/v1/partnerships/admin/partners/:partnerId
 */
router.get('/:partnerId', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    const partner = await db('partners').where('id', partnerId).first();

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    // Get associated counts
    const [restaurantCount] = await db('restaurants')
      .where('partner_id', partnerId)
      .count('* as count');
    const [eventCount] = await db('events')
      .where('partner_id', partnerId)
      .count('* as count');
    const [giftCount] = await db('gift_products')
      .where('partner_id', partnerId)
      .count('* as count');

    // Get commission stats
    const commissionStats = await db('affiliate_commissions')
      .where('partner_id', partnerId)
      .select('status')
      .count('* as count')
      .sum('commission_amount as amount')
      .groupBy('status');

    res.json({
      success: true,
      data: {
        ...mapPartner(partner),
        stats: {
          restaurants: parseInt(restaurantCount.count as string) || 0,
          events: parseInt(eventCount.count as string) || 0,
          products: parseInt(giftCount.count as string) || 0,
          commissions: commissionStats.reduce((acc, row) => {
            acc[row.status] = {
              count: parseInt(row.count as string) || 0,
              amount: parseFloat(row.amount as string) || 0,
            };
            return acc;
          }, {} as Record<string, { count: number; amount: number }>),
        },
      },
    });
  } catch (error: any) {
    logger.error('Get partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create a new partner
 * POST /api/v1/partnerships/admin/partners
 */
router.post('/', async (req: AdminRequest, res: Response) => {
  try {
    const input: PartnerCreateInput = req.body;

    // Validate required fields
    if (!input.name || !input.type || !input.integrationType || !input.contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, integrationType, contactEmail',
      });
    }

    // Check for duplicate name
    const existing = await db('partners')
      .where('name', input.name)
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Partner with this name already exists',
      });
    }

    const [partner] = await db('partners')
      .insert({
        name: input.name,
        type: input.type,
        integration_type: input.integrationType,
        status: PARTNER_STATUS.PENDING,
        api_key: input.apiKey,
        api_secret: input.apiSecret,
        webhook_secret: input.webhookSecret,
        base_url: input.baseUrl,
        affiliate_id: input.affiliateId,
        commission_rate: input.commissionRate || 10,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        logo_url: input.logoUrl,
        description: input.description,
        terms_url: input.termsUrl,
        metadata: input.metadata || {},
      })
      .returning('*');

    logger.info('Partner created', { partnerId: partner.id, name: partner.name });

    res.status(201).json({
      success: true,
      data: mapPartner(partner),
    });
  } catch (error: any) {
    logger.error('Create partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Update a partner
 * PUT /api/v1/partnerships/admin/partners/:partnerId
 */
router.put('/:partnerId', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const input: PartnerUpdateInput = req.body;

    const existing = await db('partners').where('id', partnerId).first();
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    const updateData: any = {
      updated_at: db.fn.now(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.apiKey !== undefined) updateData.api_key = input.apiKey;
    if (input.apiSecret !== undefined) updateData.api_secret = input.apiSecret;
    if (input.webhookSecret !== undefined) updateData.webhook_secret = input.webhookSecret;
    if (input.baseUrl !== undefined) updateData.base_url = input.baseUrl;
    if (input.affiliateId !== undefined) updateData.affiliate_id = input.affiliateId;
    if (input.commissionRate !== undefined) updateData.commission_rate = input.commissionRate;
    if (input.contactEmail !== undefined) updateData.contact_email = input.contactEmail;
    if (input.contactPhone !== undefined) updateData.contact_phone = input.contactPhone;
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.termsUrl !== undefined) updateData.terms_url = input.termsUrl;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const [partner] = await db('partners')
      .where('id', partnerId)
      .update(updateData)
      .returning('*');

    logger.info('Partner updated', { partnerId, changes: Object.keys(input) });

    res.json({
      success: true,
      data: mapPartner(partner),
    });
  } catch (error: any) {
    logger.error('Update partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Activate a partner
 * POST /api/v1/partnerships/admin/partners/:partnerId/activate
 */
router.post('/:partnerId/activate', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    const [partner] = await db('partners')
      .where('id', partnerId)
      .update({
        status: PARTNER_STATUS.ACTIVE,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    logger.info('Partner activated', { partnerId });

    res.json({
      success: true,
      data: mapPartner(partner),
      message: 'Partner activated successfully',
    });
  } catch (error: any) {
    logger.error('Activate partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Suspend a partner
 * POST /api/v1/partnerships/admin/partners/:partnerId/suspend
 */
router.post('/:partnerId/suspend', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { reason } = req.body;

    const [partner] = await db('partners')
      .where('id', partnerId)
      .update({
        status: PARTNER_STATUS.SUSPENDED,
        metadata: db.raw(`metadata || '{"suspension_reason": "${reason || 'Not specified'}"}'::jsonb`),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    logger.info('Partner suspended', { partnerId, reason });

    res.json({
      success: true,
      data: mapPartner(partner),
      message: 'Partner suspended',
    });
  } catch (error: any) {
    logger.error('Suspend partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete a partner (soft delete by setting status to inactive)
 * DELETE /api/v1/partnerships/admin/partners/:partnerId
 */
router.delete('/:partnerId', async (req: AdminRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    const [partner] = await db('partners')
      .where('id', partnerId)
      .update({
        status: PARTNER_STATUS.INACTIVE,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found',
      });
    }

    logger.info('Partner deactivated', { partnerId });

    res.json({
      success: true,
      message: 'Partner deactivated',
    });
  } catch (error: any) {
    logger.error('Delete partner failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get partner dashboard summary
 * GET /api/v1/partnerships/admin/partners/dashboard/summary
 */
router.get('/dashboard/summary', async (req: AdminRequest, res: Response) => {
  try {
    // Partner counts by status
    const partnerStats = await db('partners')
      .select('status')
      .count('* as count')
      .groupBy('status');

    // Partner counts by type
    const partnerTypes = await db('partners')
      .where('status', 'active')
      .select('type')
      .count('* as count')
      .groupBy('type');

    // Total commissions
    const commissionStats = await db('affiliate_commissions')
      .select('status')
      .count('* as count')
      .sum('commission_amount as amount')
      .groupBy('status');

    // Recent orders
    const recentOrders = await db('order_history')
      .orderBy('created_at', 'desc')
      .limit(10);

    res.json({
      success: true,
      data: {
        partners: {
          byStatus: partnerStats.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count as string) || 0;
            return acc;
          }, {} as Record<string, number>),
          byType: partnerTypes.reduce((acc, row) => {
            acc[row.type] = parseInt(row.count as string) || 0;
            return acc;
          }, {} as Record<string, number>),
        },
        commissions: commissionStats.reduce((acc, row) => {
          acc[row.status] = {
            count: parseInt(row.count as string) || 0,
            amount: parseFloat(row.amount as string) || 0,
          };
          return acc;
        }, {} as Record<string, { count: number; amount: number }>),
        recentOrders: recentOrders,
      },
    });
  } catch (error: any) {
    logger.error('Get dashboard summary failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Map database row to Partner object
 */
function mapPartner(row: any): Partner {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    integrationType: row.integration_type,
    status: row.status,
    apiKey: row.api_key,
    apiSecret: row.api_secret,
    webhookSecret: row.webhook_secret,
    baseUrl: row.base_url,
    affiliateId: row.affiliate_id,
    commissionRate: parseFloat(row.commission_rate),
    metadata: row.metadata,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    logoUrl: row.logo_url,
    description: row.description,
    termsUrl: row.terms_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
