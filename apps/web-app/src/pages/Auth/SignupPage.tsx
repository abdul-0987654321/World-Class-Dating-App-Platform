import React, { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../../services';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';
import { AIAvatarSystem } from '../../components/AIAvatar/AIAvatarSystem';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
  agreeToTerms: boolean;
}

interface PhotoPreview {
  file: File;
  url: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  gender?: string;
  agreeToTerms?: string;
  photos?: string;
  general?: string;
}

const MIN_PHOTOS_REQUIRED = 3;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const tierParam = searchParams.get('tier');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
    agreeToTerms: false,
  });
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(
        formData.password
      )
    ) {
      newErrors.password =
        'Password must contain uppercase, lowercase, number, and special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Please select your gender';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    if (photos.length < MIN_PHOTOS_REQUIRED) {
      newErrors.photos = `Please upload at least ${MIN_PHOTOS_REQUIRED} photos to continue`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && photos.length + newPhotos.length < 6) {
        newPhotos.push({
          file,
          url: URL.createObjectURL(file),
        });
      }
    });

    setPhotos([...photos, ...newPhotos]);
    if (errors.photos) {
      setErrors((prev) => ({ ...prev, photos: undefined }));
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].url);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep3()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName || undefined,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        consents: {
          terms: formData.agreeToTerms,
          privacy: formData.agreeToTerms,
          marketing: false,
        },
      });

      // Verify registration was successful
      // Note: With httpOnly cookie authentication, tokens are NOT in the response body
      // We check for the user object to confirm successful registration
      if (response && response.user) {
        // Store gender for profile background color
        localStorage.setItem('userGender', formData.gender);

        // If user came from a tier selection, redirect to subscription page
        if (tierParam) {
          window.location.href = `/subscription?tier=${tierParam}`;
        } else {
          // Force page reload to update auth state across the app
          window.location.href = '/discover';
        }
      } else {
        throw new Error('Registration failed - no user data received');
      }
    } catch (err: unknown) {
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Registration failed. Please try again.';

      if (err instanceof Error) {
        // Handle specific error types
        if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('connect')
        ) {
          errorMessage =
            'Unable to connect to server. Please check your internet connection and try again.';
        } else if (err.message.includes('timeout') || err.message.includes('timed out')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = (err as { message: string }).message || errorMessage;
      }

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when field is modified
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const getPasswordStrength = (
    password: string
  ): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Main content container - responsive max-width */}
      <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl">
        {/* Card - clean white design with subtle shadow for visibility */}
        <div className="rounded-3xl p-6 sm:p-8 lg:p-10 bg-white shadow-xl border border-gray-100">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <Link to="/" className="inline-flex items-center justify-center mb-3">
              <FlamoralLogo variant="primary" size="lg" showTagline={true} />
            </Link>
            <p className="text-gray-500 text-sm sm:text-base mt-4">
              {tierParam
                ? `Join Flamoral ${tierParam.charAt(0).toUpperCase() + tierParam.slice(1)}`
                : 'Create your account'}
            </p>
          </div>

          {/* Progress indicator - 3 steps - light theme */}
          <div className="flex items-center justify-center mb-6 sm:mb-8 px-4 sm:px-8 lg:px-12">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-300 ${
                step >= 1
                  ? 'bg-[#D62839] text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              1
            </div>
            <div
              className={`flex-1 h-1 sm:h-1.5 mx-2 sm:mx-3 rounded-full transition-all duration-300 ${
                step >= 2 ? 'bg-[#D62839]' : 'bg-gray-200'
              }`}
            />
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-300 ${
                step >= 2
                  ? 'bg-[#D62839] text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              2
            </div>
            <div
              className={`flex-1 h-1 sm:h-1.5 mx-2 sm:mx-3 rounded-full transition-all duration-300 ${
                step >= 3 ? 'bg-[#D62839]' : 'bg-gray-200'
              }`}
            />
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-300 ${
                step >= 3
                  ? 'bg-[#D62839] text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              3
            </div>
          </div>

          {errors.general && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4"
            >
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4 sm:space-y-5">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
                  Basic Information
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label
                      htmlFor="signup-firstName"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="signup-firstName"
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition ${
                        errors.firstName ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="First name"
                      aria-required="true"
                      aria-invalid={!!errors.firstName}
                      aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    />
                    {errors.firstName && (
                      <p id="firstName-error" className="text-red-500 text-xs mt-1" role="alert">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="signup-lastName"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Last Name
                    </label>
                    <input
                      id="signup-lastName"
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition ${
                      errors.email ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="your@email.com"
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="email-error" className="text-red-500 text-xs mt-1" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition pr-10 ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Create a strong password"
                      aria-required="true"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-error' : 'password-strength'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div id="password-strength" className="mt-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={passwordStrength.strength}
                          aria-valuemin={0}
                          aria-valuemax={3}
                          aria-label={`Password strength: ${passwordStrength.label}`}
                        >
                          <div
                            className={`h-full ${passwordStrength.color} transition-all`}
                            style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength.strength === 1
                              ? 'text-red-500'
                              : passwordStrength.strength === 2
                                ? 'text-yellow-600'
                                : 'text-green-600'
                          }`}
                          aria-hidden="true"
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                  {errors.password && (
                    <p id="password-error" className="text-red-500 text-xs mt-1" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="signup-confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-confirmPassword"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Confirm your password"
                    aria-required="true"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  />
                  {errors.confirmPassword && (
                    <p
                      id="confirmPassword-error"
                      className="text-red-500 text-xs mt-1"
                      role="alert"
                    >
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-[#D62839] text-white py-3.5 sm:py-4 rounded-xl font-semibold hover:bg-[#B82232] hover:shadow-lg transition-all duration-300 mt-6"
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 sm:space-y-5">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">About You</h2>

                <div>
                  <label
                    htmlFor="signup-dateOfBirth"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    autoComplete="bday"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={
                      new Date(new Date().setFullYear(new Date().getFullYear() - 18))
                        .toISOString()
                        .split('T')[0]
                    }
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-200'
                    }`}
                    aria-required="true"
                    aria-invalid={!!errors.dateOfBirth}
                    aria-describedby="dob-help"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-red-500 text-xs mt-1" role="alert">
                      {errors.dateOfBirth}
                    </p>
                  )}
                  <p id="dob-help" className="text-gray-500 text-xs mt-1">
                    You must be at least 18 years old
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="signup-gender"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="signup-gender"
                    name="gender"
                    autoComplete="sex"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 sm:py-3.5 rounded-xl bg-gray-50 border text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D62839]/30 focus:border-[#D62839] transition ${
                      errors.gender ? 'border-red-500' : 'border-gray-200'
                    }`}
                    aria-required="true"
                    aria-invalid={!!errors.gender}
                  >
                    <option value="">Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-xs mt-1" role="alert">
                      {errors.gender}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 rounded bg-white border-gray-300 text-[#D62839] focus:ring-[#D62839]/30"
                  />
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-600">
                    I agree to the{' '}
                    <a
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D62839] hover:text-[#B82232] hover:underline"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#D62839] hover:text-[#B82232] hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
                )}

                <div className="flex gap-3 sm:gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-3 sm:py-3.5 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-[1.5] bg-[#D62839] text-white py-3 sm:py-3.5 rounded-xl font-semibold hover:bg-[#B82232] hover:shadow-lg transition-all duration-300"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                    Upload Your Photos
                  </h2>
                  {/* Enhanced instruction with better visibility */}
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <svg
                      className="w-5 h-5 text-[#D62839] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm text-[#D62839] font-medium">
                      Add at least {MIN_PHOTOS_REQUIRED} photos to continue
                    </p>
                  </div>
                </div>

                {/* Required Photos Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Required Photos
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          photos[index]
                            ? 'border-[#D62839]/50 bg-gray-50'
                            : 'border-dashed border-[#D62839]/50 bg-red-50/50 hover:bg-red-50'
                        }`}
                      >
                        {photos[index] ? (
                          <>
                            <img
                              src={photos[index].url}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transition"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                            {index === 0 && (
                              <span className="absolute bottom-2 left-2 text-xs bg-[#D62839] text-white px-2.5 py-1 rounded-full font-medium shadow-lg">
                                Main
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full flex flex-col items-center justify-center text-[#D62839] hover:text-[#B82232] transition"
                          >
                            <svg
                              className="w-8 h-8 sm:w-10 sm:h-10 mb-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            <span className="text-xs font-medium">Required</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Photos Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Optional Photos
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {[3, 4, 5].map((index) => (
                      <div
                        key={index}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          photos[index]
                            ? 'border-gray-300 bg-gray-50'
                            : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {photos[index] ? (
                          <>
                            <img
                              src={photos[index].url}
                              alt={`Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transition"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 transition"
                          >
                            <svg
                              className="w-8 h-8 sm:w-10 sm:h-10 mb-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            <span className="text-xs">Optional</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                {/* Photo count indicator */}
                <div className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span
                    className={`font-medium ${photos.length >= MIN_PHOTOS_REQUIRED ? 'text-green-600' : 'text-[#D62839]'}`}
                  >
                    {photos.length} / {MIN_PHOTOS_REQUIRED} required photos
                  </span>
                  {photos.length >= MIN_PHOTOS_REQUIRED && (
                    <span className="flex items-center gap-1.5 text-green-600 font-medium">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Ready to continue!
                    </span>
                  )}
                </div>

                {errors.photos && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {errors.photos}
                  </div>
                )}

                <p className="text-xs text-gray-500 leading-relaxed">
                  Tips: Use clear, recent photos. Show your face in your main photo. Avoid group
                  photos for your first picture.
                </p>

                {/* Buttons with proper spacing and visual weight */}
                <div className="flex gap-3 sm:gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-3.5 sm:py-4 border border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.5] bg-[#D62839] text-white py-3.5 sm:py-4 rounded-xl font-bold text-base hover:bg-[#B82232] hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#D62839] hover:text-[#B82232] font-medium transition"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* AI Avatar positioned to not overlap main content */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
        <AIAvatarSystem initialContext="welcome" />
      </div>
    </div>
  );
};

export default SignupPage;
