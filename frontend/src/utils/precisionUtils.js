// frontend/src/utils/precisionUtils.js - PRECISION-SAFE MATHEMATICAL UTILITIES

/**
 * Precision-Safe Mathematical Utilities for AgroYield
 * 
 * JavaScript's floating-point arithmetic can cause precision issues, especially
 * when dealing with financial calculations. These utilities provide safer
 * alternatives by working with integer representations internally.
 */
import { calculatePreciseFundingProgress, isProjectCompleted, formatNumber } from '../utils/precisionUtils';
// ==========================================
// CORE PRECISION UTILITIES
// ==========================================

/**
 * Converts a number to its integer representation for precise calculations
 * @param {number|string} num - Number to convert
 * @param {number} decimals - Number of decimal places to preserve
 * @returns {number} - Integer representation
 */
export const toSafeInteger = (num, decimals = 6) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return 0;
  return Math.round(numValue * Math.pow(10, decimals));
};

/**
 * Converts integer back to decimal with specified precision
 * @param {number} safeInt - Integer representation
 * @param {number} decimals - Number of decimal places used
 * @returns {number} - Decimal value
 */
export const fromSafeInteger = (safeInt, decimals = 6) => {
  return safeInt / Math.pow(10, decimals);
};

/**
 * Format number for display with consistent precision
 * @param {string|number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted number
 */
export const formatNumber = (num, decimals = 2) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0.00';
  return numValue.toFixed(decimals);
};

/**
 * Safe addition using integer arithmetic
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @param {number} decimals - Decimal precision
 * @returns {number} - Sum
 */
export const safeAdd = (a, b, decimals = 6) => {
  const aInt = toSafeInteger(a, decimals);
  const bInt = toSafeInteger(b, decimals);
  return fromSafeInteger(aInt + bInt, decimals);
};

/**
 * Safe subtraction using integer arithmetic
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @param {number} decimals - Decimal precision
 * @returns {number} - Difference
 */
export const safeSubtract = (a, b, decimals = 6) => {
  const aInt = toSafeInteger(a, decimals);
  const bInt = toSafeInteger(b, decimals);
  return fromSafeInteger(aInt - bInt, decimals);
};

/**
 * Safe multiplication using integer arithmetic
 * @param {number|string} a - First number
 * @param {number|string} b - Second number
 * @param {number} decimals - Decimal precision
 * @returns {number} - Product
 */
export const safeMultiply = (a, b, decimals = 6) => {
  const aInt = toSafeInteger(a, decimals);
  const bInt = toSafeInteger(b, decimals);
  // Need to divide by 10^decimals because we're multiplying two scaled numbers
  return fromSafeInteger((aInt * bInt) / Math.pow(10, decimals), decimals);
};

/**
 * Safe division using integer arithmetic
 * @param {number|string} a - Numerator
 * @param {number|string} b - Denominator
 * @param {number} decimals - Decimal precision
 * @returns {number} - Quotient
 */
export const safeDivide = (a, b, decimals = 6) => {
  const aInt = toSafeInteger(a, decimals);
  const bInt = toSafeInteger(b, decimals);
  if (bInt === 0) return 0;
  // Need to multiply by 10^decimals to maintain precision
  return fromSafeInteger((aInt * Math.pow(10, decimals)) / bInt, decimals);
};

// ==========================================
// AGROYIELD-SPECIFIC UTILITIES
// ==========================================

/**
 * Calculate funding percentage with precision safety
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @returns {number} - Precise percentage (0-100)
 */
export const calculatePreciseFundingProgress = (currentAmount, targetAmount) => {
  // Convert to safe integers (using 6 decimal places for USDC)
  const currentInt = toSafeInteger(currentAmount, 6);
  const targetInt = toSafeInteger(targetAmount, 6);
  
  if (targetInt === 0) return 0;
  
  // Calculate percentage using integers, then scale back
  const percentageInt = Math.round((currentInt * 10000) / targetInt); // 10000 for 2 decimal precision in percentage
  const percentage = percentageInt / 100; // Convert back to percentage
  
  return Math.min(percentage, 100); // Cap at 100%
};

/**
 * Check if project is completed with tolerance for rounding errors
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @param {number} tolerance - Tolerance percentage (default 0.001 = 0.1%)
 * @returns {boolean} - Whether project is effectively completed
 */
export const isProjectCompleted = (currentAmount, targetAmount, tolerance = 0.001) => {
  const currentInt = toSafeInteger(currentAmount, 6);
  const targetInt = toSafeInteger(targetAmount, 6);
  
  if (targetInt === 0) return false;
  
  // Calculate the difference in "safe integer" space
  const difference = targetInt - currentInt;
  const toleranceInt = Math.round(targetInt * tolerance);
  
  // Project is completed if the difference is within tolerance
  return difference <= toleranceInt;
};

/**
 * Calculate the exact remaining amount needed for project completion
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @returns {number} - Remaining amount needed (can be negative if overfunded)
 */
export const calculateRemainingAmount = (currentAmount, targetAmount) => {
  return safeSubtract(targetAmount, currentAmount, 6);
};

/**
 * Check if an investment amount would complete a project
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @param {string|number} investmentAmount - Proposed investment amount
 * @param {number} platformFeeRate - Platform fee rate (e.g., 0.015 for 1.5%)
 * @returns {boolean} - Whether this investment would complete the project
 */
export const wouldCompleteProject = (currentAmount, targetAmount, investmentAmount, platformFeeRate = 0.015) => {
  // Calculate net investment after platform fee
  const netInvestment = safeMultiply(investmentAmount, 1 - platformFeeRate, 6);
  const newTotal = safeAdd(currentAmount, netInvestment, 6);
  
  return isProjectCompleted(newTotal, targetAmount, 0.001);
};

/**
 * Calculate platform fee for an investment
 * @param {string|number} investmentAmount - Investment amount
 * @param {number} feeRate - Fee rate (default 1.5% = 0.015)
 * @returns {number} - Platform fee amount
 */
export const calculatePlatformFee = (investmentAmount, feeRate = 0.015) => {
  return safeMultiply(investmentAmount, feeRate, 6);
};

/**
 * Calculate net investment after platform fee
 * @param {string|number} investmentAmount - Investment amount
 * @param {number} feeRate - Fee rate (default 1.5% = 0.015)
 * @returns {number} - Net investment amount
 */
export const calculateNetInvestment = (investmentAmount, feeRate = 0.015) => {
  const fee = calculatePlatformFee(investmentAmount, feeRate);
  return safeSubtract(investmentAmount, fee, 6);
};

/**
 * Calculate expected return based on principal and duration
 * @param {string|number} principalAmount - Principal investment amount
 * @param {number} durationDays - Investment duration in days
 * @param {number} annualRate - Annual return rate (default 12% = 0.12)
 * @returns {number} - Expected return amount
 */
export const calculateExpectedReturn = (principalAmount, durationDays, annualRate = 0.12) => {
  // Convert annual rate to daily rate and multiply by duration
  const dailyRate = annualRate / 365;
  const totalRate = dailyRate * durationDays;
  return safeMultiply(principalAmount, totalRate, 6);
};

// ==========================================
// COMPARISON UTILITIES
// ==========================================

/**
 * Compare two numbers with tolerance for floating-point precision
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @param {number} tolerance - Tolerance for comparison (default 1e-6)
 * @returns {number} - -1 if a < b, 0 if equal, 1 if a > b
 */
export const safeCompare = (a, b, tolerance = 1e-6) => {
  const diff = safeSubtract(a, b, 6);
  
  if (Math.abs(diff) <= tolerance) return 0;
  return diff > 0 ? 1 : -1;
};

/**
 * Check if two numbers are equal within tolerance
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @param {number} tolerance - Tolerance for comparison (default 1e-6)
 * @returns {boolean} - Whether numbers are equal within tolerance
 */
export const safeEquals = (a, b, tolerance = 1e-6) => {
  return safeCompare(a, b, tolerance) === 0;
};

/**
 * Check if first number is greater than second within tolerance
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @param {number} tolerance - Tolerance for comparison (default 1e-6)
 * @returns {boolean} - Whether a > b
 */
export const safeGreaterThan = (a, b, tolerance = 1e-6) => {
  return safeCompare(a, b, tolerance) > 0;
};

/**
 * Check if first number is less than second within tolerance
 * @param {string|number} a - First number
 * @param {string|number} b - Second number
 * @param {number} tolerance - Tolerance for comparison (default 1e-6)
 * @returns {boolean} - Whether a < b
 */
export const safeLessThan = (a, b, tolerance = 1e-6) => {
  return safeCompare(a, b, tolerance) < 0;
};

// ==========================================
// DEBUGGING AND ANALYSIS UTILITIES
// ==========================================

/**
 * Analyze precision issues in a calculation
 * @param {string|number} currentAmount - Current amount
 * @param {string|number} targetAmount - Target amount
 * @param {string} context - Context for debugging
 * @returns {object} - Analysis results
 */
export const analyzePrecision = (currentAmount, targetAmount, context = 'Analysis') => {
  const currentFloat = parseFloat(currentAmount);
  const targetFloat = parseFloat(targetAmount);
  const difference = targetFloat - currentFloat;
  const percentageFP = (currentFloat / targetFloat) * 100;
  const percentageSafe = calculatePreciseFundingProgress(currentAmount, targetAmount);
  const isCompletedFP = currentFloat >= targetFloat;
  const isCompletedSafe = isProjectCompleted(currentAmount, targetAmount);

  const analysis = {
    context,
    input: {
      current: currentAmount,
      target: targetAmount
    },
    floatingPoint: {
      current: currentFloat,
      target: targetFloat,
      difference: difference,
      percentage: percentageFP,
      isCompleted: isCompletedFP
    },
    precisionSafe: {
      current: toSafeInteger(currentAmount, 6),
      target: toSafeInteger(targetAmount, 6),
      difference: toSafeInteger(difference, 6),
      percentage: percentageSafe,
      isCompleted: isCompletedSafe
    },
    hasPrecisionIssue: isCompletedFP !== isCompletedSafe,
    recommendation: isCompletedFP !== isCompletedSafe 
      ? 'Use precision-safe calculations' 
      : 'Both methods agree'
  };

  console.log(`🔍 Precision Analysis - ${context}:`, analysis);
  return analysis;
};

/**
 * Test precision utilities with common problematic values
 */
export const testPrecisionUtilities = () => {
  console.log('🧪 Testing Precision Utilities...');
  
  // Test cases that commonly cause floating-point issues
  const testCases = [
    { current: '99.98', target: '100.00', expected: false },
    { current: '99.99', target: '100.00', expected: true },
    { current: '99.995', target: '100.00', expected: true },
    { current: '0.1', target: '0.3', expected: false }, // Classic 0.1 + 0.2 problem
    { current: '0.30000000000000004', target: '0.3', expected: true }, // Result of 0.1 + 0.2
  ];
  
  testCases.forEach(({ current, target, expected }, index) => {
    const analysis = analyzePrecision(current, target, `Test ${index + 1}`);
    const passed = analysis.precisionSafe.isCompleted === expected;
    console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('🧪 Precision utilities testing complete');
};

// ==========================================
// EXPORT DEFAULT CONFIGURATION
// ==========================================

export const PRECISION_CONFIG = {
  USDC_DECIMALS: 6,
  PERCENTAGE_DECIMALS: 2,
  COMPLETION_TOLERANCE: 0.001, // 0.1%
  PLATFORM_FEE_RATE: 0.015, // 1.5%
  ANNUAL_RETURN_RATE: 0.12, // 12%
  COMPARISON_TOLERANCE: 1e-6
};

// Test in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment to run tests when module is imported
  // testPrecisionUtilities();
}