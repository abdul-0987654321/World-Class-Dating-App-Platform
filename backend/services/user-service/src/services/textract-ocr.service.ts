/**
 * AWS Textract OCR Service
 * Flamoral Dating Platform
 *
 * Handles document text extraction using AWS Textract.
 * Supports synchronous analysis for ID documents (passport, driver's license, national ID).
 */

import {
  TextractClient,
  AnalyzeDocumentCommand,
  AnalyzeIDCommand,
  AnalyzeIDCommandOutput,
  AnalyzeDocumentCommandOutput,
  FeatureType,
  Block,
  IdentityDocument,
  IdentityDocumentField,
} from '@aws-sdk/client-textract';
import logger from '../utils/logger';
import config from '../config';
import {
  DocumentType,
  ExtractedDocumentData,
  DocumentDataResult,
  TextBlock,
  ExtractedField,
  TextractConfig,
  getConfidenceLevel,
  BoundingBox,
} from '../types/document-verification.types';

/**
 * AWS Textract OCR Service
 * Provides document text extraction and analysis capabilities.
 */
export class TextractOCRService {
  private client: TextractClient;
  private config: TextractConfig;

  constructor() {
    this.config = this.loadConfig();
    this.client = new TextractClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      maxAttempts: this.config.maxRetries,
    });

    logger.info('AWS Textract OCR service initialized', {
      region: this.config.region,
    });
  }

  /**
   * Load Textract configuration from environment
   */
  private loadConfig(): TextractConfig {
    return {
      region: process.env.AWS_TEXTRACT_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_TEXTRACT_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_TEXTRACT_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
      maxRetries: parseInt(process.env.AWS_TEXTRACT_MAX_RETRIES || '3', 10),
      requestTimeout: parseInt(process.env.AWS_TEXTRACT_TIMEOUT || '30000', 10),
      s3Bucket: process.env.AWS_TEXTRACT_S3_BUCKET,
    };
  }

  /**
   * Extract document data from an image buffer
   * Uses AnalyzeID for ID documents, falls back to AnalyzeDocument for other types.
   */
  async extractDocumentData(
    imageBuffer: Buffer,
    documentType: DocumentType
  ): Promise<DocumentDataResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting document data extraction', { documentType });

      // Use AnalyzeID for ID documents (passport, driver's license, national ID)
      const result = await this.analyzeIDDocument(imageBuffer, documentType);

      const processingTime = Date.now() - startTime;
      logger.info('Document data extraction completed', {
        documentType,
        processingTime,
        overallConfidence: result.overallConfidence,
        fieldsExtracted: result.fields.length,
      });

      return {
        ...result,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Document data extraction failed', {
        documentType,
        processingTime,
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        fields: [],
        overallConfidence: 0,
        processingTime,
        errors: [error.message || 'Failed to extract document data'],
      };
    }
  }

  /**
   * Analyze ID document using AWS Textract AnalyzeID
   */
  private async analyzeIDDocument(
    imageBuffer: Buffer,
    documentType: DocumentType
  ): Promise<DocumentDataResult> {
    try {
      const command = new AnalyzeIDCommand({
        DocumentPages: [
          {
            Bytes: imageBuffer,
          },
        ],
      });

      const response: AnalyzeIDCommandOutput = await this.client.send(command);

      if (!response.IdentityDocuments || response.IdentityDocuments.length === 0) {
        return {
          success: false,
          fields: [],
          overallConfidence: 0,
          processingTime: 0,
          errors: ['No identity document detected in the image'],
        };
      }

      const identityDoc = response.IdentityDocuments[0];
      const extractedData = this.parseIdentityDocument(identityDoc, documentType);
      const fields = this.extractFieldsFromIdentityDocument(identityDoc);

      // Calculate overall confidence
      const confidenceScores = fields.map(f => f.confidence).filter(c => c > 0);
      const overallConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

      // Detect any warnings
      const warnings = this.detectWarnings(extractedData, fields, documentType);

      return {
        success: true,
        data: extractedData,
        fields,
        overallConfidence,
        processingTime: 0,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      // If AnalyzeID fails, fall back to general document analysis
      if (error.code === 'UnsupportedDocumentException') {
        logger.warn('AnalyzeID not supported, falling back to AnalyzeDocument', {
          documentType,
        });
        return this.analyzeGeneralDocument(imageBuffer, documentType);
      }
      throw error;
    }
  }

  /**
   * Parse identity document response to ExtractedDocumentData
   */
  private parseIdentityDocument(
    identityDoc: IdentityDocument,
    documentType: DocumentType
  ): ExtractedDocumentData {
    const fields = identityDoc.IdentityDocumentFields || [];
    const fieldMap = this.buildFieldMap(fields);

    const data: ExtractedDocumentData = {
      documentType,
    };

    // Extract personal information
    data.firstName = this.getFieldValue(fieldMap, ['FIRST_NAME', 'GIVEN_NAME', 'GIVEN_NAMES']);
    data.lastName = this.getFieldValue(fieldMap, ['LAST_NAME', 'SURNAME', 'FAMILY_NAME']);
    data.middleName = this.getFieldValue(fieldMap, ['MIDDLE_NAME', 'MIDDLE_NAMES']);
    data.fullName = this.getFieldValue(fieldMap, ['FULL_NAME', 'NAME']);
    data.dateOfBirth = this.normalizeDate(this.getFieldValue(fieldMap, ['DATE_OF_BIRTH', 'DOB', 'BIRTH_DATE']));
    data.gender = this.getFieldValue(fieldMap, ['SEX', 'GENDER']);
    data.nationality = this.getFieldValue(fieldMap, ['NATIONALITY', 'COUNTRY']);

    // Extract document information
    data.documentNumber = this.getFieldValue(fieldMap, ['DOCUMENT_NUMBER', 'ID_NUMBER', 'LICENSE_NUMBER', 'PASSPORT_NUMBER']);
    data.issuingCountry = this.getFieldValue(fieldMap, ['COUNTRY_OF_ISSUANCE', 'ISSUING_COUNTRY', 'PLACE_OF_ISSUE']);
    data.issuingAuthority = this.getFieldValue(fieldMap, ['ISSUING_AUTHORITY', 'ISSUED_BY']);
    data.issueDate = this.normalizeDate(this.getFieldValue(fieldMap, ['DATE_OF_ISSUE', 'ISSUE_DATE']));
    data.expiryDate = this.normalizeDate(this.getFieldValue(fieldMap, ['EXPIRATION_DATE', 'DATE_OF_EXPIRY', 'EXPIRY_DATE', 'EXPIRES']));

    // Extract address (primarily for driver's licenses)
    const addressLine1 = this.getFieldValue(fieldMap, ['ADDRESS_LINE_1', 'ADDRESS', 'STREET_ADDRESS']);
    const addressLine2 = this.getFieldValue(fieldMap, ['ADDRESS_LINE_2']);
    const city = this.getFieldValue(fieldMap, ['CITY', 'PLACE_OF_BIRTH']);
    const state = this.getFieldValue(fieldMap, ['STATE', 'STATE_NAME', 'PROVINCE']);
    const postalCode = this.getFieldValue(fieldMap, ['ZIP_CODE', 'POSTAL_CODE', 'ZIP']);
    const country = this.getFieldValue(fieldMap, ['COUNTRY']);

    if (addressLine1 || city || state) {
      data.address = {
        line1: addressLine1,
        line2: addressLine2,
        city,
        state,
        postalCode,
        country,
      };
    }

    // Extract MRZ for passports
    const mrzLine1 = this.getFieldValue(fieldMap, ['MRZ_CODE_1', 'MRZ_LINE_1']);
    const mrzLine2 = this.getFieldValue(fieldMap, ['MRZ_CODE_2', 'MRZ_LINE_2']);
    const mrzLine3 = this.getFieldValue(fieldMap, ['MRZ_CODE_3', 'MRZ_LINE_3']);

    if (mrzLine1 || mrzLine2) {
      data.mrz = {
        line1: mrzLine1,
        line2: mrzLine2,
        line3: mrzLine3,
        checkDigits: this.validateMRZCheckDigits(mrzLine1, mrzLine2, mrzLine3),
      };
    }

    // Extract driver's license specific fields
    if (documentType === 'drivers_license') {
      data.licenseClass = this.getFieldValue(fieldMap, ['CLASS', 'LICENSE_CLASS', 'VEHICLE_CLASS']);
      data.restrictions = this.getFieldValue(fieldMap, ['RESTRICTIONS', 'ENDORSEMENT_CODES']);
      data.endorsements = this.getFieldValue(fieldMap, ['ENDORSEMENTS']);
    }

    // Extract national ID specific fields
    if (documentType === 'national_id') {
      data.personalNumber = this.getFieldValue(fieldMap, ['PERSONAL_NUMBER', 'NATIONAL_ID_NUMBER', 'ID_NUMBER']);
    }

    return data;
  }

  /**
   * Build a field map from IdentityDocumentFields
   */
  private buildFieldMap(fields: IdentityDocumentField[]): Map<string, IdentityDocumentField> {
    const map = new Map<string, IdentityDocumentField>();
    for (const field of fields) {
      if (field.Type?.Text) {
        map.set(field.Type.Text.toUpperCase(), field);
      }
    }
    return map;
  }

  /**
   * Get field value from field map with fallback keys
   */
  private getFieldValue(fieldMap: Map<string, IdentityDocumentField>, keys: string[]): string | undefined {
    for (const key of keys) {
      const field = fieldMap.get(key);
      if (field?.ValueDetection?.Text) {
        return field.ValueDetection.Text.trim();
      }
    }
    return undefined;
  }

  /**
   * Extract fields with confidence scores
   */
  private extractFieldsFromIdentityDocument(identityDoc: IdentityDocument): ExtractedField[] {
    const fields: ExtractedField[] = [];
    const docFields = identityDoc.IdentityDocumentFields || [];

    for (const field of docFields) {
      if (field.Type?.Text && field.ValueDetection?.Text) {
        const confidence = field.ValueDetection.Confidence || 0;
        fields.push({
          fieldName: field.Type.Text,
          value: field.ValueDetection.Text,
          confidence: confidence / 100, // Normalize to 0-1
          confidenceLevel: getConfidenceLevel(confidence / 100),
          rawText: field.ValueDetection.Text,
        });
      }
    }

    return fields;
  }

  /**
   * Analyze general document using AnalyzeDocument API
   * Fallback for documents not supported by AnalyzeID
   */
  private async analyzeGeneralDocument(
    imageBuffer: Buffer,
    documentType: DocumentType
  ): Promise<DocumentDataResult> {
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: imageBuffer,
      },
      FeatureTypes: [FeatureType.FORMS, FeatureType.TABLES],
    });

    const response: AnalyzeDocumentCommandOutput = await this.client.send(command);
    const blocks = response.Blocks || [];

    // Parse blocks into extracted data
    const { extractedData, fields } = this.parseDocumentBlocks(blocks, documentType);

    // Calculate overall confidence
    const confidenceScores = fields.map(f => f.confidence).filter(c => c > 0);
    const overallConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    // Extract raw text blocks for audit
    extractedData.rawTextBlocks = this.extractTextBlocks(blocks);

    const warnings = this.detectWarnings(extractedData, fields, documentType);

    return {
      success: true,
      data: extractedData,
      fields,
      overallConfidence,
      processingTime: 0,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Parse document blocks into structured data
   */
  private parseDocumentBlocks(
    blocks: Block[],
    documentType: DocumentType
  ): { extractedData: ExtractedDocumentData; fields: ExtractedField[] } {
    const fields: ExtractedField[] = [];
    const keyValuePairs = this.extractKeyValuePairs(blocks);

    const extractedData: ExtractedDocumentData = {
      documentType,
    };

    // Map key-value pairs to structured data
    for (const [key, value] of keyValuePairs.entries()) {
      const normalizedKey = key.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const confidence = value.confidence;

      fields.push({
        fieldName: key,
        value: value.text,
        confidence,
        confidenceLevel: getConfidenceLevel(confidence),
        rawText: value.text,
      });

      // Map to specific fields
      this.mapKeyValueToData(normalizedKey, value.text, extractedData);
    }

    return { extractedData, fields };
  }

  /**
   * Extract key-value pairs from blocks
   */
  private extractKeyValuePairs(blocks: Block[]): Map<string, { text: string; confidence: number }> {
    const pairs = new Map<string, { text: string; confidence: number }>();
    const blockMap = new Map<string, Block>();

    // Build block ID map
    for (const block of blocks) {
      if (block.Id) {
        blockMap.set(block.Id, block);
      }
    }

    // Find KEY_VALUE_SET blocks
    for (const block of blocks) {
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
        const keyText = this.getBlockText(block, blockMap);
        const valueBlock = this.findValueBlock(block, blocks);
        if (valueBlock && keyText) {
          const valueText = this.getBlockText(valueBlock, blockMap);
          if (valueText) {
            pairs.set(keyText, {
              text: valueText,
              confidence: (block.Confidence || 0) / 100,
            });
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Get text content from a block
   */
  private getBlockText(block: Block, blockMap: Map<string, Block>): string {
    if (!block.Relationships) return '';

    const textParts: string[] = [];
    for (const relationship of block.Relationships) {
      if (relationship.Type === 'CHILD' && relationship.Ids) {
        for (const id of relationship.Ids) {
          const childBlock = blockMap.get(id);
          if (childBlock?.Text) {
            textParts.push(childBlock.Text);
          }
        }
      }
    }

    return textParts.join(' ').trim();
  }

  /**
   * Find the VALUE block corresponding to a KEY block
   */
  private findValueBlock(keyBlock: Block, blocks: Block[]): Block | undefined {
    if (!keyBlock.Relationships) return undefined;

    for (const relationship of keyBlock.Relationships) {
      if (relationship.Type === 'VALUE' && relationship.Ids && relationship.Ids.length > 0) {
        const valueId = relationship.Ids[0];
        return blocks.find(b => b.Id === valueId);
      }
    }

    return undefined;
  }

  /**
   * Map key-value pair to structured data
   */
  private mapKeyValueToData(key: string, value: string, data: ExtractedDocumentData): void {
    const keyMappings: Record<string, (v: string) => void> = {
      'FIRST_NAME': (v) => data.firstName = v,
      'GIVEN_NAME': (v) => data.firstName = v,
      'LAST_NAME': (v) => data.lastName = v,
      'SURNAME': (v) => data.lastName = v,
      'DATE_OF_BIRTH': (v) => data.dateOfBirth = this.normalizeDate(v),
      'DOB': (v) => data.dateOfBirth = this.normalizeDate(v),
      'BIRTH_DATE': (v) => data.dateOfBirth = this.normalizeDate(v),
      'DOCUMENT_NUMBER': (v) => data.documentNumber = v,
      'ID_NUMBER': (v) => data.documentNumber = v,
      'LICENSE_NUMBER': (v) => data.documentNumber = v,
      'PASSPORT_NUMBER': (v) => data.documentNumber = v,
      'EXPIRATION_DATE': (v) => data.expiryDate = this.normalizeDate(v),
      'EXPIRY_DATE': (v) => data.expiryDate = this.normalizeDate(v),
      'EXPIRES': (v) => data.expiryDate = this.normalizeDate(v),
      'ISSUE_DATE': (v) => data.issueDate = this.normalizeDate(v),
      'SEX': (v) => data.gender = v,
      'GENDER': (v) => data.gender = v,
      'NATIONALITY': (v) => data.nationality = v,
      'COUNTRY': (v) => data.issuingCountry = v,
    };

    const mapper = keyMappings[key];
    if (mapper) {
      mapper(value);
    }
  }

  /**
   * Extract text blocks for audit trail
   */
  private extractTextBlocks(blocks: Block[]): TextBlock[] {
    return blocks
      .filter(b => b.BlockType === 'LINE' || b.BlockType === 'WORD')
      .map(b => ({
        text: b.Text || '',
        confidence: (b.Confidence || 0) / 100,
        blockType: b.BlockType as TextBlock['blockType'],
        boundingBox: b.Geometry?.BoundingBox ? {
          width: b.Geometry.BoundingBox.Width || 0,
          height: b.Geometry.BoundingBox.Height || 0,
          left: b.Geometry.BoundingBox.Left || 0,
          top: b.Geometry.BoundingBox.Top || 0,
        } : undefined,
      }));
  }

  /**
   * Normalize date to ISO format (YYYY-MM-DD)
   */
  private normalizeDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;

    // Try various date formats
    const formats = [
      // MM/DD/YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // DD/MM/YYYY
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
      // YYYY-MM-DD (already normalized)
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // DD-MM-YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/,
      // DD MMM YYYY (e.g., 15 JAN 1990)
      /^(\d{2})\s+([A-Z]{3})\s+(\d{4})$/i,
      // MMM DD, YYYY
      /^([A-Z]{3})\s+(\d{2}),?\s+(\d{4})$/i,
    ];

    const monthMap: Record<string, string> = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
    };

    const cleaned = dateStr.trim().toUpperCase();

    // Already in ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }

    // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for US documents
    let match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[1]}-${match[2]}`;
    }

    // DD-MM-YYYY
    match = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    // DD MMM YYYY
    match = cleaned.match(/^(\d{2})\s+([A-Z]{3})\s+(\d{4})$/);
    if (match) {
      const month = monthMap[match[2]];
      if (month) {
        return `${match[3]}-${month}-${match[1]}`;
      }
    }

    // MMM DD, YYYY
    match = cleaned.match(/^([A-Z]{3})\s+(\d{2}),?\s+(\d{4})$/);
    if (match) {
      const month = monthMap[match[1]];
      if (month) {
        return `${match[3]}-${month}-${match[2]}`;
      }
    }

    // Return original if no format matched
    return dateStr;
  }

  /**
   * Validate MRZ check digits
   */
  private validateMRZCheckDigits(
    line1?: string,
    line2?: string,
    line3?: string
  ): ExtractedDocumentData['mrz']['checkDigits'] | undefined {
    if (!line2) return undefined;

    // MRZ check digit calculation weights
    const weights = [7, 3, 1];
    const charValues: Record<string, number> = {
      '<': 0, '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
      '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15,
      'G': 16, 'H': 17, 'I': 18, 'J': 19, 'K': 20, 'L': 21,
      'M': 22, 'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27,
      'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33,
      'Y': 34, 'Z': 35,
    };

    const calculateCheckDigit = (str: string): number => {
      let sum = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i].toUpperCase();
        const value = charValues[char] ?? 0;
        sum += value * weights[i % 3];
      }
      return sum % 10;
    };

    const validateField = (field: string, expectedCheckDigit: string): boolean => {
      const calculated = calculateCheckDigit(field);
      return calculated === parseInt(expectedCheckDigit, 10);
    };

    // For TD1 (ID cards) and TD3 (passports), parse line2
    // TD3 format: PPPPPPPPPPCNNNNNNNNNNCDDDDDDCSSSSSSSCXXXXXXXXXX
    // Where P=passport number (9), C=check digit, N=nationality (3), D=DOB (6), S=sex (1), E=expiry (6)

    try {
      if (line2.length >= 44) {
        // TD3 passport format
        const docNumber = line2.substring(0, 9);
        const docCheckDigit = line2.substring(9, 10);
        const dob = line2.substring(13, 19);
        const dobCheckDigit = line2.substring(19, 20);
        const expiry = line2.substring(21, 27);
        const expiryCheckDigit = line2.substring(27, 28);
        const composite = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
        const compositeCheck = line2.substring(43, 44);

        return {
          documentNumber: validateField(docNumber, docCheckDigit),
          dateOfBirth: validateField(dob, dobCheckDigit),
          expiryDate: validateField(expiry, expiryCheckDigit),
          overall: validateField(composite, compositeCheck),
        };
      }
    } catch (error) {
      logger.warn('MRZ check digit validation failed', { error });
    }

    return undefined;
  }

  /**
   * Detect warnings during extraction
   */
  private detectWarnings(
    data: ExtractedDocumentData,
    fields: ExtractedField[],
    documentType: DocumentType
  ): string[] {
    const warnings: string[] = [];

    // Check for low confidence fields
    const lowConfidenceFields = fields.filter(f => f.confidenceLevel === 'low' || f.confidenceLevel === 'very_low');
    if (lowConfidenceFields.length > 0) {
      warnings.push(`Low confidence detected for fields: ${lowConfidenceFields.map(f => f.fieldName).join(', ')}`);
    }

    // Check for missing critical fields
    if (!data.firstName && !data.fullName) {
      warnings.push('Name could not be extracted');
    }
    if (!data.dateOfBirth) {
      warnings.push('Date of birth could not be extracted');
    }
    if (!data.documentNumber) {
      warnings.push('Document number could not be extracted');
    }

    // Check for expired document
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate);
      if (expiry < new Date()) {
        warnings.push('Document appears to be expired');
      }
    }

    // Check MRZ validation for passports
    if (documentType === 'passport' && data.mrz?.checkDigits) {
      if (!data.mrz.checkDigits.overall) {
        warnings.push('MRZ check digit validation failed');
      }
    }

    return warnings;
  }

  /**
   * Extract data from multiple document images (front and back)
   */
  async extractFromMultipleImages(
    frontImage: Buffer,
    backImage: Buffer | undefined,
    documentType: DocumentType
  ): Promise<DocumentDataResult> {
    const startTime = Date.now();

    try {
      // Extract from front image
      const frontResult = await this.extractDocumentData(frontImage, documentType);

      if (!frontResult.success) {
        return frontResult;
      }

      // If back image provided, extract and merge
      if (backImage) {
        const backResult = await this.extractDocumentData(backImage, documentType);

        if (backResult.success && backResult.data) {
          // Merge back image data with front
          const mergedData = this.mergeExtractedData(frontResult.data!, backResult.data);
          const mergedFields = [...frontResult.fields, ...backResult.fields];

          // Recalculate overall confidence
          const confidenceScores = mergedFields.map(f => f.confidence).filter(c => c > 0);
          const overallConfidence = confidenceScores.length > 0
            ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
            : 0;

          return {
            success: true,
            data: mergedData,
            fields: mergedFields,
            overallConfidence,
            processingTime: Date.now() - startTime,
            warnings: [
              ...(frontResult.warnings || []),
              ...(backResult.warnings || []),
            ],
          };
        }
      }

      return {
        ...frontResult,
        processingTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Multi-image extraction failed', {
        documentType,
        error: error.message,
      });

      return {
        success: false,
        fields: [],
        overallConfidence: 0,
        processingTime: Date.now() - startTime,
        errors: [error.message || 'Failed to extract document data'],
      };
    }
  }

  /**
   * Merge extracted data from front and back of document
   */
  private mergeExtractedData(
    front: ExtractedDocumentData,
    back: ExtractedDocumentData
  ): ExtractedDocumentData {
    // Prefer front data, fill in missing from back
    return {
      ...front,
      firstName: front.firstName || back.firstName,
      lastName: front.lastName || back.lastName,
      middleName: front.middleName || back.middleName,
      fullName: front.fullName || back.fullName,
      dateOfBirth: front.dateOfBirth || back.dateOfBirth,
      gender: front.gender || back.gender,
      nationality: front.nationality || back.nationality,
      documentNumber: front.documentNumber || back.documentNumber,
      issuingCountry: front.issuingCountry || back.issuingCountry,
      issuingAuthority: front.issuingAuthority || back.issuingAuthority,
      issueDate: front.issueDate || back.issueDate,
      expiryDate: front.expiryDate || back.expiryDate,
      address: front.address || back.address,
      mrz: front.mrz || back.mrz,
      licenseClass: front.licenseClass || back.licenseClass,
      restrictions: front.restrictions || back.restrictions,
      endorsements: front.endorsements || back.endorsements,
      personalNumber: front.personalNumber || back.personalNumber,
      rawTextBlocks: [
        ...(front.rawTextBlocks || []),
        ...(back.rawTextBlocks || []),
      ],
    };
  }
}

// Export singleton instance
export const textractOCRService = new TextractOCRService();
