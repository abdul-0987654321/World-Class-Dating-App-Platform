import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PhotoVerificationFlow from '../PhotoVerificationFlow';

// Mock fetch API
global.fetch = jest.fn();

describe('PhotoVerificationFlow E2E Tests', () => {
  const mockUserId = 'test-user-123';
  const mockReferencePhoto = 'https://example.com/reference.jpg';
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    localStorage.setItem('token', 'mock-jwt-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Step 1: Upload', () => {
    it('should render upload step initially', () => {
      render(
        <PhotoVerificationFlow
          userId={mockUserId}
          onVerificationComplete={mockOnComplete}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Upload Photo for Verification')).toBeInTheDocument();
      expect(screen.getByText('Click to select photo')).toBeInTheDocument();
    });

    it('should display quality tips', () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      expect(screen.getByText('Photo Quality Tips')).toBeInTheDocument();
      expect(screen.getByText(/Face clearly visible/)).toBeInTheDocument();
      expect(screen.getByText(/No sunglasses/)).toBeInTheDocument();
      expect(screen.getByText(/Only one person/)).toBeInTheDocument();
    });

    it('should handle file selection', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Change Photo')).toBeInTheDocument();
        expect(screen.getByText('Verify Photo')).toBeInTheDocument();
      });
    });

    it('should reject non-image files', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Please select an image file/)).toBeInTheDocument();
      });
    });

    it('should reject files larger than 10MB', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      // Create a 11MB file (over limit)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, largeFile);

      await waitFor(() => {
        expect(screen.getByText(/Image size must be less than 10MB/)).toBeInTheDocument();
      });
    });

    it('should show preview after file selection', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        const preview = screen.getByAltText('Preview');
        expect(preview).toBeInTheDocument();
      });
    });

    it('should allow changing photo after selection', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file1);

      await waitFor(() => {
        expect(screen.getByText('Change Photo')).toBeInTheDocument();
      });

      const changeButton = screen.getByText('Change Photo');
      fireEvent.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText('Click to select photo')).toBeInTheDocument();
      });
    });

    it('should call onCancel when cancel button is clicked', () => {
      render(
        <PhotoVerificationFlow
          userId={mockUserId}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step 2: Processing', () => {
    it('should show processing step after clicking verify', async () => {
      // Mock successful upload
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
      });

      // Mock successful verification
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            verified: true,
            confidence: 0.92,
            details: {
              faceDetected: true,
              faceCount: 1,
              qualityScore: 0.88,
            },
          },
        }),
      });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Uploading photo.../)).toBeInTheDocument();
      });
    });

    it('should show verification steps during processing', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: { verified: true, confidence: 0.9, details: {} },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Detecting face')).toBeInTheDocument();
        expect(screen.getByText('Checking quality')).toBeInTheDocument();
      });
    });

    it('should show face matching step when reference photo provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: true,
              confidence: 0.9,
              details: { matchScore: 0.85 },
            },
          }),
        });

      render(
        <PhotoVerificationFlow
          userId={mockUserId}
          referencePhotoUrl={mockReferencePhoto}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Matching face')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Success Result', () => {
    it('should show success result for verified photo', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: true,
              confidence: 0.92,
              details: {
                faceDetected: true,
                faceCount: 1,
                qualityScore: 0.88,
                matchScore: 0.85,
              },
              liveness: {
                isLive: true,
                confidence: 0.78,
              },
            },
          }),
        });

      render(
        <PhotoVerificationFlow
          userId={mockUserId}
          onVerificationComplete={mockOnComplete}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Verification Successful!')).toBeInTheDocument();
        expect(screen.getByText(/Confidence Score:/)).toBeInTheDocument();
        expect(screen.getByText(/Quality Score:/)).toBeInTheDocument();
        expect(screen.getByText(/Face Match Score:/)).toBeInTheDocument();
      });

      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: true,
          confidence: 0.92,
        })
      );
    });

    it('should show liveness check result', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: true,
              confidence: 0.9,
              details: {},
              liveness: {
                isLive: true,
                confidence: 0.82,
              },
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Liveness Check:/)).toBeInTheDocument();
        expect(screen.getByText('Passed')).toBeInTheDocument();
      });
    });

    it('should call onVerificationComplete with results', async () => {
      const mockResult = {
        verified: true,
        confidence: 0.95,
        details: {
          faceDetected: true,
          faceCount: 1,
          qualityScore: 0.9,
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: mockResult }),
        });

      render(
        <PhotoVerificationFlow
          userId={mockUserId}
          onVerificationComplete={mockOnComplete}
        />
      );

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            verified: true,
            confidence: 0.95,
          })
        );
      });
    });
  });

  describe('Step 3: Failure Results', () => {
    it('should show failure result for no face detected', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: false,
              confidence: 0,
              details: {
                faceDetected: false,
                faceCount: 0,
              },
              failureReason: 'No face detected in the photo',
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
        expect(screen.getByText(/No face detected/)).toBeInTheDocument();
        expect(screen.getByText(/Issue:/)).toBeInTheDocument();
        expect(screen.getByText(/Solution:/)).toBeInTheDocument();
      });
    });

    it('should show failure result for multiple faces', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: false,
              confidence: 0,
              details: {
                faceDetected: true,
                faceCount: 3,
              },
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Multiple faces detected/)).toBeInTheDocument();
      });
    });

    it('should show failure result for low quality', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: false,
              confidence: 0,
              details: {
                faceDetected: true,
                faceCount: 1,
                qualityScore: 0.3,
              },
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Photo quality too low/)).toBeInTheDocument();
      });
    });

    it('should show failure result for failed liveness check', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: false,
              confidence: 0,
              details: { faceDetected: true, faceCount: 1, qualityScore: 0.8 },
              liveness: {
                isLive: false,
                confidence: 0.3,
              },
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/screenshot or printout/)).toBeInTheDocument();
      });
    });

    it('should show Try Again button on failure', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              verified: false,
              confidence: 0,
              details: { faceDetected: false, faceCount: 0 },
            },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should reset flow when Try Again is clicked', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: { verified: false, confidence: 0, details: {} },
          }),
        });

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Upload Photo for Verification')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      });
    });

    it('should handle verification API errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: 'https://example.com/uploaded.jpg' }),
        })
        .mockRejectedValueOnce(new Error('Verification service unavailable'));

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<PhotoVerificationFlow userId={mockUserId} />);

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      const verifyButton = await screen.findByText('Verify Photo');
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Indicator', () => {
    it('should show progress steps', () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      // Step indicators should be visible
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should highlight current step', async () => {
      render(<PhotoVerificationFlow userId={mockUserId} />);

      // First step should be active
      const step1 = screen.getByText('1');
      expect(step1).toHaveStyle({ backgroundColor: expect.stringContaining('82f6') });
    });
  });
});
