/**
 * Home Loan Eligibility Calculator
 * =================================
 * Calculates maximum loan eligibility based on monthly income
 * and generates comparison table for different tenure options.
 *
 * Formula: Max Loan = Monthly Income × Eligibility Ratio × [{(1+R)^N - 1} / {R × (1+R)^N}]
 * Where R = Monthly interest rate, N = Loan tenure in months
 */

(function () {
    'use strict';

    /* ===================================================
       1. CONFIGURATION & STATE
       =================================================== */

    const DEFAULTS = {
        monthlyIncome: 100000,
        interestRate: 8.5,
        tenure: 20,
        tenureUnit: 'years',
        eligibilityRatio: 50,
    };

    const LIMITS = {
        monthlyIncome: { min: 20000, max: 500000 },
        interestRate: { min: 5, max: 12 },
        tenureYears: { min: 5, max: 30 },
    };

    const MIN_INCOME_REQUIRED = 25000;
    const COMPARISON_TENURES = [5, 10, 15, 20, 25, 30]; // Years

    let state = { ...DEFAULTS };
    let eligibilityChart = null;

    /* ===================================================
       2. DOM REFERENCES
       =================================================== */

    const dom = {
        // Inputs
        monthlyIncomeInput: document.getElementById('monthly-income'),
        monthlyIncomeSlider: document.getElementById('monthly-income-slider'),
        interestRateInput: document.getElementById('interest-rate'),
        interestRateSlider: document.getElementById('interest-rate-slider'),
        tenureInput: document.getElementById('loan-tenure'),
        tenureSlider: document.getElementById('loan-tenure-slider'),

        // Error elements
        monthlyIncomeError: document.getElementById('monthly-income-error'),
        interestRateError: document.getElementById('interest-rate-error'),
        tenureError: document.getElementById('loan-tenure-error'),

        // Tenure toggle
        tenureToggleBtns: document.querySelectorAll('.tenure-toggle .toggle-btn'),
        tenureMinLabel: document.getElementById('tenure-min-label'),
        tenureMaxLabel: document.getElementById('tenure-max-label'),

        // Eligibility ratio buttons
        ratioBtns: document.querySelectorAll('.ratio-btn'),

        // Badge
        eligibilityBadge: document.getElementById('eligibility-badge'),

        // Results
        maxLoanValue: document.getElementById('max-loan-value'),
        monthlyEmiValue: document.getElementById('monthly-emi-value'),
        emiPercentage: document.getElementById('emi-percentage'),
        totalInterestValue: document.getElementById('total-interest-value'),

        // Chart
        chartCanvas: document.getElementById('eligibility-chart'),
        legendPrincipal: document.getElementById('legend-principal'),
        legendInterest: document.getElementById('legend-interest'),

        // Comparison table
        comparisonBody: document.getElementById('comparison-body'),

        // Controls
        resetBtn: document.getElementById('reset-btn'),
    };

    /* ===================================================
       3. LOAN ELIGIBILITY CALCULATION
       =================================================== */

    /**
     * Calculate maximum loan amount based on monthly income.
     * Using inverted EMI formula to determine principal.
     * 
     * EMI ≤ (Monthly Income × Eligibility Ratio / 100)
     * Therefore: Principal = EMI × [{(1+R)^N - 1} / {R × (1+R)^N}]
     */
    function calculateMaxLoan(monthlyIncome, annualRate, tenureMonths, eligibilityRatio) {
        // Maximum EMI the person can afford
        const maxEmi = (monthlyIncome * eligibilityRatio) / 100;

        if (annualRate === 0) {
            return maxEmi * tenureMonths;
        }

        const R = annualRate / 12 / 100;
        const N = tenureMonths;
        const compoundFactor = Math.pow(1 + R, N);

        // Inverted EMI formula to get principal
        const principal = maxEmi * ((compoundFactor - 1) / (R * compoundFactor));

        return Math.max(0, principal);
    }

    /**
     * Calculate EMI for a given principal.
     */
    function calculateEMI(principal, annualRate, tenureMonths) {
        if (principal <= 0) return { emi: 0, totalPayment: 0, totalInterest: 0 };

        if (annualRate === 0) {
            const emi = principal / tenureMonths;
            return { emi, totalPayment: principal, totalInterest: 0 };
        }

        const R = annualRate / 12 / 100;
        const N = tenureMonths;
        const compoundFactor = Math.pow(1 + R, N);

        const emi = (principal * R * compoundFactor) / (compoundFactor - 1);
        const totalPayment = emi * N;
        const totalInterest = totalPayment - principal;

        return { emi, totalPayment, totalInterest };
    }

    /* ===================================================
       4. VALIDATION
       =================================================== */

    function validateField(fieldName) {
        let value, min, max, errorEl, label;

        switch (fieldName) {
            case 'monthlyIncome':
                value = state.monthlyIncome;
                min = LIMITS.monthlyIncome.min;
                max = LIMITS.monthlyIncome.max;
                errorEl = dom.monthlyIncomeError;
                label = 'Monthly income';
                break;
            case 'interestRate':
                value = state.interestRate;
                min = LIMITS.interestRate.min;
                max = LIMITS.interestRate.max;
                errorEl = dom.interestRateError;
                label = 'Interest rate';
                break;
            case 'tenure':
                value = state.tenure;
                min = LIMITS.tenureYears.min;
                max = LIMITS.tenureYears.max;
                errorEl = dom.tenureError;
                label = 'Tenure';
                break;
            default:
                return true;
        }

        errorEl.textContent = '';

        if (isNaN(value) || value === null) {
            errorEl.textContent = `${label} is required.`;
            return false;
        }
        if (value < 0) {
            errorEl.textContent = `${label} cannot be negative.`;
            return false;
        }
        if (value < min) {
            errorEl.textContent = `${label} must be at least ${fieldName === 'monthlyIncome' ? formatCurrency(min) : min}.`;
            return false;
        }
        if (value > max) {
            errorEl.textContent = `${label} cannot exceed ${fieldName === 'monthlyIncome' ? formatCurrency(max) : max}.`;
            return false;
        }

        return true;
    }

    function validateAll() {
        return validateField('monthlyIncome') && validateField('interestRate') && validateField('tenure');
    }

    /* ===================================================
       5. UI UPDATE
       =================================================== */

    function updateResults() {
        if (!validateAll()) {
            dom.maxLoanValue.textContent = formatCurrency(0);
            dom.monthlyEmiValue.textContent = formatCurrency(0);
            dom.emiPercentage.textContent = '0% of income';
            dom.totalInterestValue.textContent = formatCurrency(0);
            dom.legendPrincipal.textContent = formatCurrency(0);
            dom.legendInterest.textContent = formatCurrency(0);
            updateChart(0, 0);
            dom.comparisonBody.innerHTML = '';
            updateEligibilityBadge(false);
            return;
        }

        const tenureMonths = state.tenure * 12;

        // Calculate max loan
        const maxLoan = calculateMaxLoan(
            state.monthlyIncome,
            state.interestRate,
            tenureMonths,
            state.eligibilityRatio
        );

        // Calculate EMI for max loan
        const { emi, totalInterest } = calculateEMI(state.monthlyIncome * state.eligibilityRatio / 100, state.interestRate, tenureMonths);
        const emiPercentageValue = (emi / state.monthlyIncome) * 100;

        // Update results
        animateValue(dom.maxLoanValue, formatCurrency(maxLoan));
        animateValue(dom.monthlyEmiValue, formatCurrency(emi));
        dom.emiPercentage.textContent = `${emiPercentageValue.toFixed(1)}% of income`;
        animateValue(dom.totalInterestValue, formatCurrency(totalInterest));

        // Update chart
        dom.legendPrincipal.textContent = formatCurrency(maxLoan);
        dom.legendInterest.textContent = formatCurrency(totalInterest);
        updateChart(maxLoan, totalInterest);

        // Update eligibility badge
        updateEligibilityBadge(state.monthlyIncome >= MIN_INCOME_REQUIRED);

        // Update comparison table
        updateComparisonTable();
    }

    function animateValue(element, newText) {
        element.textContent = newText;
        element.classList.remove('updating');
        void element.offsetWidth;
        element.classList.add('updating');
    }

    /**
     * Update eligibility badge color and text.
     */
    function updateEligibilityBadge(isEligible) {
        if (isEligible) {
            dom.eligibilityBadge.classList.remove('ineligible');
            dom.eligibilityBadge.classList.add('eligible');
            dom.eligibilityBadge.innerHTML = '<span class="badge-icon">✅</span><span class="badge-text">You are eligible for a home loan</span>';
        } else {
            dom.eligibilityBadge.classList.add('ineligible');
            dom.eligibilityBadge.classList.remove('eligible');
            dom.eligibilityBadge.innerHTML = `<span class="badge-icon">⚠️</span><span class="badge-text">Minimum income requirement: ${formatCurrency(MIN_INCOME_REQUIRED)}</span>`;
        }
    }

    /* ===================================================
       6. CHART
       =================================================== */

    function initChart() {
        const ctx = dom.chartCanvas.getContext('2d');
        eligibilityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#6366f1', '#f43f5e'],
                    hoverBackgroundColor: ['#4f46e5', '#e11d48'],
                    borderWidth: 0,
                    borderRadius: 4,
                    spacing: 3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return ` ${formatCurrency(value)} (${percentage}%)`;
                            },
                        },
                    },
                },
                animation: { animateRotate: true, duration: 600, easing: 'easeOutQuart' },
            },
        });
    }

    function updateChart(principal, interest) {
        if (!eligibilityChart) return;
        eligibilityChart.data.datasets[0].data = [principal, interest];
        eligibilityChart.update('none');
    }

    /* ===================================================
       7. COMPARISON TABLE
       =================================================== */

    function updateComparisonTable() {
        const rows = COMPARISON_TENURES.map(tenureYears => {
            const tenureMonths = tenureYears * 12;
            const maxLoan = calculateMaxLoan(
                state.monthlyIncome,
                state.interestRate,
                tenureMonths,
                state.eligibilityRatio
            );

            const { emi, totalInterest } = calculateEMI(maxLoan, state.interestRate, tenureMonths);

            return `<tr>
                <td>${tenureYears} Yr</td>
                <td>${formatCurrency(maxLoan)}</td>
                <td>${formatCurrency(emi)}</td>
                <td>${formatCurrency(totalInterest)}</td>
            </tr>`;
        });

        dom.comparisonBody.innerHTML = rows.join('');
    }

    /* ===================================================
       8. EVENT HANDLERS
       =================================================== */

    function onMonthlyIncomeInput() {
        const parsed = parseFormattedNumber(dom.monthlyIncomeInput.value);
        state.monthlyIncome = parsed;
        const clampedForSlider = Math.max(LIMITS.monthlyIncome.min, Math.min(LIMITS.monthlyIncome.max, isNaN(parsed) ? LIMITS.monthlyIncome.min : parsed));
        dom.monthlyIncomeSlider.value = clampedForSlider;
        updateSliderFill(dom.monthlyIncomeSlider);
        updateResults();
    }

    function onMonthlyIncomeSlider() {
        const val = parseFloat(dom.monthlyIncomeSlider.value);
        state.monthlyIncome = val;
        dom.monthlyIncomeInput.value = formatAmountInput(val);
        updateSliderFill(dom.monthlyIncomeSlider);
        updateResults();
    }

    function onInterestRateInput() {
        const parsed = parseFloat(dom.interestRateInput.value);
        state.interestRate = parsed;
        const clampedForSlider = Math.max(LIMITS.interestRate.min, Math.min(LIMITS.interestRate.max, isNaN(parsed) ? LIMITS.interestRate.min : parsed));
        dom.interestRateSlider.value = clampedForSlider;
        updateSliderFill(dom.interestRateSlider);
        updateResults();
    }

    function onInterestRateSlider() {
        const val = parseFloat(dom.interestRateSlider.value);
        state.interestRate = val;
        dom.interestRateInput.value = val.toFixed(1);
        updateSliderFill(dom.interestRateSlider);
        updateResults();
    }

    function onTenureInput() {
        const parsed = parseInt(dom.tenureInput.value, 10);
        state.tenure = parsed;
        const clampedForSlider = Math.max(LIMITS.tenureYears.min, Math.min(LIMITS.tenureYears.max, isNaN(parsed) ? LIMITS.tenureYears.min : parsed));
        dom.tenureSlider.value = clampedForSlider;
        updateSliderFill(dom.tenureSlider);
        updateResults();
    }

    function onTenureSlider() {
        const val = parseInt(dom.tenureSlider.value, 10);
        state.tenure = val;
        dom.tenureInput.value = val;
        updateSliderFill(dom.tenureSlider);
        updateResults();
    }

    function onEligibilityRatioChange(ratio) {
        state.eligibilityRatio = parseInt(ratio, 10);
        dom.ratioBtns.forEach(btn => {
            if (btn.dataset.ratio === ratio) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        updateResults();
    }

    function onReset() {
        state = { ...DEFAULTS };

        dom.monthlyIncomeInput.value = formatAmountInput(state.monthlyIncome);
        dom.monthlyIncomeSlider.value = state.monthlyIncome;
        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.interestRateSlider.value = state.interestRate;
        dom.tenureInput.value = state.tenure;
        dom.tenureSlider.value = state.tenure;

        dom.monthlyIncomeError.textContent = '';
        dom.interestRateError.textContent = '';
        dom.tenureError.textContent = '';

        // Reset eligibility ratio
        onEligibilityRatioChange('50');

        updateSliderFill(dom.monthlyIncomeSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);

        updateResults();

        dom.resetBtn.style.borderColor = 'var(--color-success)';
        setTimeout(() => { dom.resetBtn.style.borderColor = ''; }, 400);
    }

    /* ===================================================
       9. EVENT BINDING
       =================================================== */

    function bindEvents() {
        dom.monthlyIncomeInput.addEventListener('input', onMonthlyIncomeInput);
        dom.monthlyIncomeSlider.addEventListener('input', onMonthlyIncomeSlider);
        dom.monthlyIncomeInput.addEventListener('blur', () => {
            if (!isNaN(state.monthlyIncome) && state.monthlyIncome > 0) {
                dom.monthlyIncomeInput.value = formatAmountInput(state.monthlyIncome);
            }
        });

        dom.interestRateInput.addEventListener('input', onInterestRateInput);
        dom.interestRateSlider.addEventListener('input', onInterestRateSlider);

        dom.tenureInput.addEventListener('input', onTenureInput);
        dom.tenureSlider.addEventListener('input', onTenureSlider);

        dom.ratioBtns.forEach(btn => {
            btn.addEventListener('click', () => onEligibilityRatioChange(btn.dataset.ratio));
        });

        dom.resetBtn.addEventListener('click', onReset);
    }

    /* ===================================================
       10. INITIALIZATION
       =================================================== */

    function init() {
        dom.monthlyIncomeInput.value = formatAmountInput(state.monthlyIncome);
        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.tenureInput.value = state.tenure;

        updateSliderFill(dom.monthlyIncomeSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);

        // Set active eligibility ratio
        onEligibilityRatioChange('50');

        initChart();
        bindEvents();
        updateResults();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
