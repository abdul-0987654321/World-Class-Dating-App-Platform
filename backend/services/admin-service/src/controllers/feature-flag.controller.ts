import { Response } from 'express';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

import { featureFlagAdminService } from '../services/feature-flag-admin.service';
import {
  UpdateFeatureFlagDto,
  UpdateRolloutDto,
  UpdateSegmentsDto,
  UpdateRegionsDto,
  ToggleFeatureFlagDto,
} from '../dto/feature-flag.dto';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Feature Flag Controller
 * Handles all REST API endpoints for feature flag administration
 */
export class FeatureFlagController {
  /**
   * GET /admin/feature-flags
   * List all feature flags across all categories
   */
  async getAllFlags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await featureFlagAdminService.getAllFlags();

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error fetching feature flags:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch feature flags',
      });
    }
  }

  /**
   * GET /admin/feature-flags/categories
   * List all feature flag categories
   */
  async getCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const categories = featureFlagAdminService.getCategories();

      res.json({
        success: true,
        data: { categories },
      });
    } catch (error: any) {
      logger.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch categories',
      });
    }
  }

  /**
   * GET /admin/feature-flags/category/:category
   * Get all flags in a specific category
   */
  async getFlagsByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const flags = await featureFlagAdminService.getFlagsByCategory(category);

      res.json({
        success: true,
        data: { flags },
      });
    } catch (error: any) {
      logger.error(`Error fetching flags for category ${req.params.category}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to fetch flags',
      });
    }
  }

  /**
   * GET /admin/feature-flags/:category/:name
   * Get a specific feature flag by category and name
   */
  async getFlag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const flag = await featureFlagAdminService.getFlag(category, name);

      if (!flag) {
        res.status(404).json({
          success: false,
          error: `Feature flag ${category}/${name} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: flag,
      });
    } catch (error: any) {
      logger.error(`Error fetching flag ${req.params.category}/${req.params.name}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch feature flag',
      });
    }
  }

  /**
   * PATCH /admin/feature-flags/:category/:name
   * Update a feature flag (multiple properties at once)
   */
  async updateFlag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;

      // Validate DTO
      const updateDto = plainToClass(UpdateFeatureFlagDto, req.body);
      const errors = await validate(updateDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.map((e) => Object.values(e.constraints || {}).join(', ')),
        });
        return;
      }

      const updatedFlag = await featureFlagAdminService.updateFlag(
        category,
        name,
        updateDto,
        adminId
      );

      res.json({
        success: true,
        data: updatedFlag,
        message: `Feature flag ${category}/${name} updated successfully`,
      });
    } catch (error: any) {
      logger.error(`Error updating flag ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to update feature flag',
      });
    }
  }

  /**
   * POST /admin/feature-flags/:category/:name/toggle
   * Toggle a feature flag enabled/disabled state
   */
  async toggleFlag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;

      // Validate DTO
      const toggleDto = plainToClass(ToggleFeatureFlagDto, req.body);
      const errors = await validate(toggleDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.map((e) => Object.values(e.constraints || {}).join(', ')),
        });
        return;
      }

      const updatedFlag = await featureFlagAdminService.toggleFlag(
        category,
        name,
        toggleDto.enabled,
        adminId,
        toggleDto.reason
      );

      res.json({
        success: true,
        data: updatedFlag,
        message: `Feature flag ${category}/${name} ${toggleDto.enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error: any) {
      logger.error(`Error toggling flag ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to toggle feature flag',
      });
    }
  }

  /**
   * PATCH /admin/feature-flags/:category/:name/rollout
   * Update feature flag rollout percentage
   */
  async updateRollout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;

      // Validate DTO
      const rolloutDto = plainToClass(UpdateRolloutDto, req.body);
      const errors = await validate(rolloutDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.map((e) => Object.values(e.constraints || {}).join(', ')),
        });
        return;
      }

      const updatedFlag = await featureFlagAdminService.updateRollout(
        category,
        name,
        rolloutDto.percentage,
        adminId,
        rolloutDto.reason
      );

      res.json({
        success: true,
        data: updatedFlag,
        message: `Feature flag ${category}/${name} rollout updated to ${rolloutDto.percentage}%`,
      });
    } catch (error: any) {
      logger.error(`Error updating rollout for ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to update rollout',
      });
    }
  }

  /**
   * PATCH /admin/feature-flags/:category/:name/segments
   * Update feature flag user segments
   */
  async updateSegments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;

      // Validate DTO
      const segmentsDto = plainToClass(UpdateSegmentsDto, req.body);
      const errors = await validate(segmentsDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.map((e) => Object.values(e.constraints || {}).join(', ')),
        });
        return;
      }

      const updatedFlag = await featureFlagAdminService.updateSegments(
        category,
        name,
        segmentsDto.segments,
        adminId,
        segmentsDto.reason
      );

      res.json({
        success: true,
        data: updatedFlag,
        message: `Feature flag ${category}/${name} segments updated`,
      });
    } catch (error: any) {
      logger.error(`Error updating segments for ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to update segments',
      });
    }
  }

  /**
   * PATCH /admin/feature-flags/:category/:name/regions
   * Update feature flag regions
   */
  async updateRegions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;

      // Validate DTO
      const regionsDto = plainToClass(UpdateRegionsDto, req.body);
      const errors = await validate(regionsDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.map((e) => Object.values(e.constraints || {}).join(', ')),
        });
        return;
      }

      const updatedFlag = await featureFlagAdminService.updateRegions(
        category,
        name,
        regionsDto.regions,
        adminId,
        regionsDto.reason
      );

      res.json({
        success: true,
        data: updatedFlag,
        message: `Feature flag ${category}/${name} regions updated`,
      });
    } catch (error: any) {
      logger.error(`Error updating regions for ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to update regions',
      });
    }
  }

  /**
   * GET /admin/feature-flags/:category/:name/metrics
   * Get usage metrics for a feature flag
   */
  async getMetrics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const metrics = await featureFlagAdminService.getFeatureMetrics(category, name);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error(`Error fetching metrics for ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to fetch metrics',
      });
    }
  }

  /**
   * GET /admin/feature-flags/:category/:name/history
   * Get change history for a feature flag
   */
  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const history = await featureFlagAdminService.getFlagHistory(category, name, limit);

      res.json({
        success: true,
        data: { history },
      });
    } catch (error: any) {
      logger.error(`Error fetching history for ${req.params.category}/${req.params.name}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch history',
      });
    }
  }

  /**
   * DELETE /admin/feature-flags/:category/:name/override
   * Remove runtime override and revert to default config
   */
  async removeOverride(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category, name } = req.params;
      const adminId = req.admin!.id;
      const reason = req.body.reason;

      const revertedFlag = await featureFlagAdminService.removeOverride(
        category,
        name,
        adminId,
        reason
      );

      res.json({
        success: true,
        data: revertedFlag,
        message: `Feature flag ${category}/${name} reverted to default configuration`,
      });
    } catch (error: any) {
      logger.error(`Error removing override for ${req.params.category}/${req.params.name}:`, error);
      res.status(error.message?.includes('not found') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to remove override',
      });
    }
  }
}

// Export singleton instance
export const featureFlagController = new FeatureFlagController();
