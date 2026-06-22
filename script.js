/**
 * EMI Calculator — Main Script
 * ============================
 * Handles EMI calculation, chart rendering, amortization table,
 * real-time updates, input validation, theme toggling, and currency switching.
 *
 * EMI Formula: EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
 *   P = Principal loan amount
 *   R = Monthly interest rate (annual_rate / 12 / 100)
 *   N = Total number of monthly installments
 */

(function () {
    'use strict';

    /* ===================================================
       1. CONFIGURATION & STATE
       =================================================== */

    /** Default values for the calculator */
    const DEFAULTS = {
        loanAmount: 1000000,
        interestRate: 8.5,
        tenure: 20,
        tenureUnit: 'years',  // 'years' or 'months'
        currency: 'INR',
    };

    /** Currency configuration */
    const CURRENCIES = {
        INR: { symbol: '₹', locale: 'en-IN' },
        USD: { symbol: '$', locale: 'en-US' },
        EUR: { symbol: '€', locale: 'de-DE' },
        GBP: { symbol: '£', locale: 'en-GB' },
    };

    /** Slider limits */
    const LIMITS = {
        loanAmount: { min: 10000, max: 10000000 },
        interestRate: { min: 1, max: 30 },
        tenureYears: { min: 1, max: 30 },
        tenureMonths: { min: 1, max: 360 },
    };

    /** Application state (single source of truth) */
    let state = { ...DEFAULTS };

    /** Reference to the Chart.js instance */
    let emiChart = null;

    /* ===================================================
       2. DOM REFERENCES
       =================================================== */

    const dom = {
        // Inputs
        loanAmountInput: document.getElementById('loan-amount'),
        loanAmountSlider: document.getElementById('loan-amount-slider'),
        interestRateInput: document.getElementById('interest-rate'),
        interestRateSlider: document.getElementById('interest-rate-slider'),
        tenureInput: document.getElementById('loan-tenure'),
        tenureSlider: document.getElementById('loan-tenure-slider'),

        // Input wrappers (for error styling)
        loanAmountWrapper: document.querySelector('#loan-amount-group .input-value-wrapper'),
        interestRateWrapper: document.querySelector('#interest-rate-group .input-value-wrapper'),
        tenureWrapper: document.querySelector('#loan-tenure-group .input-value-wrapper'),

        // Error elements
        loanAmountError: document.getElementById('loan-amount-error'),
        interestRateError: document.getElementById('interest-rate-error'),
        tenureError: document.getElementById('loan-tenure-error'),

        // Tenure toggle buttons
        tenureToggleBtns: document.querySelectorAll('.tenure-toggle .toggle-btn'),
        tenureMinLabel: document.getElementById('tenure-min-label'),
        tenureMaxLabel: document.getElementById('tenure-max-label'),

        // Results
        emiValue: document.getElementById('emi-value'),
        interestValue: document.getElementById('interest-value'),
        totalValue: document.getElementById('total-value'),

        // Chart
        chartCanvas: document.getElementById('emi-chart'),
        legendPrincipal: document.getElementById('legend-principal'),
        legendInterest: document.getElementById('legend-interest'),

        // Currency
        currencySelect: document.getElementById('currency-select'),
        currencySymbols: document.querySelectorAll('.currency-symbol'),

        // Amortization
        amortizationToggle: document.getElementById('amortization-toggle'),
        amortizationContent: document.getElementById('amortization-content'),
        amortizationBody: document.getElementById('amortization-body'),
        amortViewBtns: document.querySelectorAll('.amort-view-toggle .view-btn'),
        colPeriod: document.getElementById('col-period'),

        // Controls
        resetBtn: document.getElementById('reset-btn'),
        themeToggle: document.getElementById('theme-toggle'),
    };


    /* ===================================================
       3. EMI CALCULATION
       =================================================== */

    /**
     * Calculate EMI using the standard formula.
     * EMI = [P × R × (1+R)^N] / [(1+R)^N − 1]
     *
     * @param {number} principal   - Loan amount (P)
     * @param {number} annualRate  - Annual interest rate in percent
     * @param {number} tenureMonths - Total number of months (N)
     * @returns {{ emi: number, totalPayment: number, totalInterest: number }}
     */
    function calculateEMI(principal, annualRate, tenureMonths) {
        // Edge case: zero interest
        if (annualRate === 0) {
            const emi = principal / tenureMonths;
            return {
                emi: emi,
                totalPayment: principal,
                totalInterest: 0,
            };
        }

        const R = annualRate / 12 / 100;  // Monthly interest rate
        const N = tenureMonths;
        const compoundFactor = Math.pow(1 + R, N);  // (1 + R)^N

        const emi = (principal * R * compoundFactor) / (compoundFactor - 1);
        const totalPayment = emi * N;
        const totalInterest = totalPayment - principal;

        return {
            emi: emi,
            totalPayment: totalPayment,
            totalInterest: totalInterest,
        };
    }

    /**
     * Generate amortization schedule (month by month).
     * Each entry: { month, principalPaid, interestPaid, totalPayment, balance }
     */
    function generateAmortization(principal, annualRate, tenureMonths) {
        const { emi } = calculateEMI(principal, annualRate, tenureMonths);
        const R = annualRate / 12 / 100;
        const schedule = [];
        let balance = principal;

        for (let month = 1; month <= tenureMonths; month++) {
            const interestPaid = balance * R;
            let principalPaid = emi - interestPaid;

            // Last month adjustment to avoid floating-point drift
            if (month === tenureMonths) {
                principalPaid = balance;
            }

            balance = Math.max(0, balance - principalPaid);

            schedule.push({
                month,
                principalPaid,
                interestPaid,
                totalPayment: principalPaid + interestPaid,
                balance,
            });
        }

        return schedule;
    }

    /**
     * Aggregate monthly schedule into yearly summaries.
     */
    function aggregateYearly(monthlySchedule) {
        const yearly = [];
        let year = 1;
        let yearPrincipal = 0;
        let yearInterest = 0;
        let yearTotal = 0;
        let lastBalance = 0;

        monthlySchedule.forEach((entry, index) => {
            yearPrincipal += entry.principalPaid;
            yearInterest += entry.interestPaid;
            yearTotal += entry.totalPayment;
            lastBalance = entry.balance;

            if ((index + 1) % 12 === 0 || index === monthlySchedule.length - 1) {
                yearly.push({
                    year,
                    principalPaid: yearPrincipal,
                    interestPaid: yearInterest,
                    totalPayment: yearTotal,
                    balance: lastBalance,
                });
                year++;
                yearPrincipal = 0;
                yearInterest = 0;
                yearTotal = 0;
            }
        });

        return yearly;
    }


    /* ===================================================
       4. FORMATTING UTILITIES
       =================================================== */

    /**
     * Format a number as currency string with locale-aware grouping.
     * @param {number} value
     * @param {boolean} [compact=false] - Use compact notation for large numbers
     * @returns {string}
     */
    function formatCurrency(value, compact = false) {
        const { symbol, locale } = CURRENCIES[state.currency];

        if (compact && value >= 10000000) {
            return symbol + (value / 10000000).toFixed(2) + ' Cr';
        }
        if (compact && value >= 100000) {
            return symbol + (value / 100000).toFixed(2) + ' L';
        }

        const formatted = new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
        }).format(Math.round(value));

        return symbol + formatted;
    }

    /**
     * Format number for display in the loan amount input (no currency symbol).
     */
    function formatAmountInput(value) {
        const { locale } = CURRENCIES[state.currency];
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: 0,
        }).format(Math.round(value));
    }

    /**
     * Parse a formatted number string back to a number.
     * Removes commas, spaces, currency symbols.
     */
    function parseFormattedNumber(str) {
        if (!str) return NaN;
        const cleaned = str.replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned);
    }


    /* ===================================================
       5. SLIDER FILL UTILITY
       =================================================== */

    /**
     * Update the slider's background gradient to show a filled track.
     */
    function updateSliderFill(slider) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const percent = ((val - min) / (max - min)) * 100;

        slider.style.background = `linear-gradient(to right, 
            #6366f1 0%, #8b5cf6 ${percent}%, 
            var(--bg-slider-track) ${percent}%, var(--bg-slider-track) 100%)`;
    }


    /* ===================================================
       6. INPUT VALIDATION
       =================================================== */

    /**
     * Validate a single input field.
     * @returns {boolean} true if valid
     */
    function validateField(fieldName) {
        let value, min, max, errorEl, wrapperEl, label;

        switch (fieldName) {
            case 'loanAmount':
                value = state.loanAmount;
                min = LIMITS.loanAmount.min;
                max = LIMITS.loanAmount.max;
                errorEl = dom.loanAmountError;
                wrapperEl = dom.loanAmountWrapper;
                label = 'Loan amount';
                break;
            case 'interestRate':
                value = state.interestRate;
                min = LIMITS.interestRate.min;
                max = LIMITS.interestRate.max;
                errorEl = dom.interestRateError;
                wrapperEl = dom.interestRateWrapper;
                label = 'Interest rate';
                break;
            case 'tenure':
                value = state.tenure;
                min = state.tenureUnit === 'years' ? LIMITS.tenureYears.min : LIMITS.tenureMonths.min;
                max = state.tenureUnit === 'years' ? LIMITS.tenureYears.max : LIMITS.tenureMonths.max;
                errorEl = dom.tenureError;
                wrapperEl = dom.tenureWrapper;
                label = 'Tenure';
                break;
            default:
                return true;
        }

        // Clear previous error
        errorEl.textContent = '';
        wrapperEl.classList.remove('has-error');

        if (isNaN(value) || value === null || value === undefined) {
            errorEl.textContent = `${label} is required.`;
            wrapperEl.classList.add('has-error');
            return false;
        }
        if (value < 0) {
            errorEl.textContent = `${label} cannot be negative.`;
            wrapperEl.classList.add('has-error');
            return false;
        }
        if (value < min) {
            errorEl.textContent = `${label} must be at least ${fieldName === 'loanAmount' ? formatCurrency(min) : min}.`;
            wrapperEl.classList.add('has-error');
            return false;
        }
        if (value > max) {
            errorEl.textContent = `${label} cannot exceed ${fieldName === 'loanAmount' ? formatCurrency(max) : max}.`;
            wrapperEl.classList.add('has-error');
            return false;
        }

        return true;
    }

    /**
     * Validate all fields. Returns true if all are valid.
     */
    function validateAll() {
        const a = validateField('loanAmount');
        const b = validateField('interestRate');
        const c = validateField('tenure');
        return a && b && c;
    }


    /* ===================================================
       7. UI UPDATE (RESULTS, CHART, TABLE)
       =================================================== */

    /**
     * Main update function: recalculate EMI, update results, chart, and table.
     */
    function updateResults() {
        if (!validateAll()) {
            // If invalid, show zeroes
            dom.emiValue.textContent = formatCurrency(0);
            dom.interestValue.textContent = formatCurrency(0);
            dom.totalValue.textContent = formatCurrency(0);
            dom.legendPrincipal.textContent = formatCurrency(0);
            dom.legendInterest.textContent = formatCurrency(0);
            updateChart(0, 0);
            dom.amortizationBody.innerHTML = '';
            return;
        }

        const tenureMonths = state.tenureUnit === 'years'
            ? state.tenure * 12
            : state.tenure;

        const { emi, totalPayment, totalInterest } = calculateEMI(
            state.loanAmount, state.interestRate, tenureMonths
        );

        // Animate result value updates
        animateValue(dom.emiValue, formatCurrency(emi));
        animateValue(dom.interestValue, formatCurrency(totalInterest));
        animateValue(dom.totalValue, formatCurrency(totalPayment));

        // Update chart legend
        dom.legendPrincipal.textContent = formatCurrency(state.loanAmount);
        dom.legendInterest.textContent = formatCurrency(totalInterest);

        // Update chart
        updateChart(state.loanAmount, totalInterest);

        // Update amortization table
        updateAmortizationTable(tenureMonths);
    }

    /**
     * Apply a brief pulse animation when values change.
     */
    function animateValue(element, newText) {
        element.textContent = newText;
        element.classList.remove('updating');
        // Trigger reflow to restart animation
        void element.offsetWidth;
        element.classList.add('updating');
    }


    /* ===================================================
       8. CHART (Chart.js Doughnut)
       =================================================== */

    /**
     * Initialize the Chart.js doughnut chart.
     */
    function initChart() {
        const ctx = dom.chartCanvas.getContext('2d');

        emiChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Principal', 'Interest'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: [
                        '#6366f1',
                        '#f43f5e',
                    ],
                    hoverBackgroundColor: [
                        '#4f46e5',
                        '#e11d48',
                    ],
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
                        displayColors: true,
                        boxPadding: 4,
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
                animation: {
                    animateRotate: true,
                    duration: 600,
                    easing: 'easeOutQuart',
                },
            },
        });
    }

    /**
     * Update chart data.
     */
    function updateChart(principal, interest) {
        if (!emiChart) return;
        emiChart.data.datasets[0].data = [principal, interest];
        emiChart.update('none'); // Use 'none' mode for instant update when live-calculating
    }


    /* ===================================================
       9. AMORTIZATION TABLE
       =================================================== */

    /** Current amortization view mode */
    let amortView = 'yearly';

    /**
     * Render the amortization table based on the current view mode.
     */
    function updateAmortizationTable(tenureMonths) {
        const monthlySchedule = generateAmortization(
            state.loanAmount, state.interestRate, tenureMonths
        );

        if (amortView === 'yearly') {
            renderYearlyTable(monthlySchedule);
        } else {
            renderMonthlyTable(monthlySchedule);
        }
    }

    /**
     * Render yearly aggregated rows.
     */
    function renderYearlyTable(monthlySchedule) {
        dom.colPeriod.textContent = 'Year';
        const yearly = aggregateYearly(monthlySchedule);
        const originalPrincipal = state.loanAmount;

        const rows = yearly.map((row) => {
            const balancePercent = originalPrincipal > 0
                ? (row.balance / originalPrincipal) * 100
                : 0;

            return `<tr>
                <td>${row.year}</td>
                <td>${formatCurrency(row.principalPaid)}</td>
                <td>${formatCurrency(row.interestPaid)}</td>
                <td>${formatCurrency(row.totalPayment)}</td>
                <td>
                    <div class="balance-cell">
                        <span>${formatCurrency(row.balance)}</span>
                        <div class="balance-bar">
                            <div class="balance-bar-fill" style="width: ${balancePercent}%"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        });

        dom.amortizationBody.innerHTML = rows.join('');
    }

    /**
     * Render monthly rows.
     */
    function renderMonthlyTable(monthlySchedule) {
        dom.colPeriod.textContent = 'Month';
        const originalPrincipal = state.loanAmount;

        const rows = monthlySchedule.map((row) => {
            const balancePercent = originalPrincipal > 0
                ? (row.balance / originalPrincipal) * 100
                : 0;

            return `<tr>
                <td>${row.month}</td>
                <td>${formatCurrency(row.principalPaid)}</td>
                <td>${formatCurrency(row.interestPaid)}</td>
                <td>${formatCurrency(row.totalPayment)}</td>
                <td>
                    <div class="balance-cell">
                        <span>${formatCurrency(row.balance)}</span>
                        <div class="balance-bar">
                            <div class="balance-bar-fill" style="width: ${balancePercent}%"></div>
                        </div>
                    </div>
                </td>
            </tr>`;
        });

        dom.amortizationBody.innerHTML = rows.join('');
    }


    /* ===================================================
       10. EVENT HANDLERS
       =================================================== */

    /**
     * Sync loan amount: input → state → slider.
     */
    function onLoanAmountInput() {
        const parsed = parseFormattedNumber(dom.loanAmountInput.value);
        state.loanAmount = parsed;

        // Clamp slider to valid range but allow typed values outside for validation messages
        const clampedForSlider = Math.max(LIMITS.loanAmount.min,
            Math.min(LIMITS.loanAmount.max, isNaN(parsed) ? LIMITS.loanAmount.min : parsed));
        dom.loanAmountSlider.value = clampedForSlider;
        updateSliderFill(dom.loanAmountSlider);

        updateResults();
    }

    function onLoanAmountSlider() {
        const val = parseFloat(dom.loanAmountSlider.value);
        state.loanAmount = val;
        dom.loanAmountInput.value = formatAmountInput(val);
        updateSliderFill(dom.loanAmountSlider);
        updateResults();
    }

    /**
     * Sync interest rate: input → state → slider.
     */
    function onInterestRateInput() {
        const parsed = parseFloat(dom.interestRateInput.value);
        state.interestRate = parsed;

        const clampedForSlider = Math.max(LIMITS.interestRate.min,
            Math.min(LIMITS.interestRate.max, isNaN(parsed) ? LIMITS.interestRate.min : parsed));
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

    /**
     * Sync tenure: input → state → slider.
     */
    function onTenureInput() {
        const parsed = parseInt(dom.tenureInput.value, 10);
        state.tenure = parsed;

        const limits = state.tenureUnit === 'years' ? LIMITS.tenureYears : LIMITS.tenureMonths;
        const clampedForSlider = Math.max(limits.min,
            Math.min(limits.max, isNaN(parsed) ? limits.min : parsed));
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

    /**
     * Handle tenure unit toggle (Years ↔ Months).
     */
    function onTenureUnitChange(unit) {
        if (unit === state.tenureUnit) return;

        // Convert current value
        if (unit === 'months') {
            state.tenure = Math.min(state.tenure * 12, LIMITS.tenureMonths.max);
            dom.tenureSlider.min = LIMITS.tenureMonths.min;
            dom.tenureSlider.max = LIMITS.tenureMonths.max;
            dom.tenureMinLabel.textContent = '1 Mo';
            dom.tenureMaxLabel.textContent = '360 Mo';
        } else {
            state.tenure = Math.max(1, Math.round(state.tenure / 12));
            dom.tenureSlider.min = LIMITS.tenureYears.min;
            dom.tenureSlider.max = LIMITS.tenureYears.max;
            dom.tenureMinLabel.textContent = '1 Yr';
            dom.tenureMaxLabel.textContent = '30 Yr';
        }

        state.tenureUnit = unit;

        // Update toggle button states
        dom.tenureToggleBtns.forEach((btn) => {
            const isActive = btn.dataset.unit === unit;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });

        // Sync input and slider
        dom.tenureInput.value = state.tenure;
        dom.tenureSlider.value = state.tenure;
        updateSliderFill(dom.tenureSlider);
        updateResults();
    }

    /**
     * Handle currency change.
     */
    function onCurrencyChange() {
        state.currency = dom.currencySelect.value;

        // Update all currency symbols in the UI
        const { symbol } = CURRENCIES[state.currency];
        dom.currencySymbols.forEach((el) => {
            el.textContent = symbol;
        });

        // Re-format the loan amount input
        if (!isNaN(state.loanAmount)) {
            dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
        }

        // Refresh results with new currency formatting
        updateResults();
    }

    /**
     * Handle theme toggle.
     */
    function onThemeToggle() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);

        // Persist preference
        try {
            localStorage.setItem('emi-calc-theme', next);
        } catch (_e) { /* ignore */ }

        // Update slider fills (colors change with theme)
        updateSliderFill(dom.loanAmountSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);
    }

    /**
     * Handle amortization schedule toggle (expand/collapse).
     */
    function onAmortizationToggle() {
        const isExpanded = dom.amortizationToggle.getAttribute('aria-expanded') === 'true';
        dom.amortizationToggle.setAttribute('aria-expanded', !isExpanded);

        if (isExpanded) {
            dom.amortizationContent.hidden = true;
        } else {
            dom.amortizationContent.hidden = false;
        }
    }

    /**
     * Handle amortization view toggle (yearly/monthly).
     */
    function onAmortViewChange(view) {
        amortView = view;

        dom.amortViewBtns.forEach((btn) => {
            const isActive = btn.dataset.view === view;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });

        const tenureMonths = state.tenureUnit === 'years'
            ? state.tenure * 12
            : state.tenure;
        updateAmortizationTable(tenureMonths);
    }

    /**
     * Reset all inputs to defaults.
     */
    function onReset() {
        state = { ...DEFAULTS };

        // Reset tenure unit toggle
        onTenureUnitChange('years');

        // Reset currency
        dom.currencySelect.value = state.currency;
        onCurrencyChange();

        // Reset input values
        dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
        dom.loanAmountSlider.value = state.loanAmount;

        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.interestRateSlider.value = state.interestRate;

        dom.tenureInput.value = state.tenure;
        dom.tenureSlider.value = state.tenure;

        // Clear errors
        dom.loanAmountError.textContent = '';
        dom.interestRateError.textContent = '';
        dom.tenureError.textContent = '';
        dom.loanAmountWrapper.classList.remove('has-error');
        dom.interestRateWrapper.classList.remove('has-error');
        dom.tenureWrapper.classList.remove('has-error');

        // Update slider fills
        updateSliderFill(dom.loanAmountSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);

        // Recalculate
        updateResults();

        // Brief visual feedback on the reset button
        dom.resetBtn.style.borderColor = 'var(--color-success)';
        setTimeout(() => {
            dom.resetBtn.style.borderColor = '';
        }, 400);
    }


    /* ===================================================
       11. EVENT LISTENER BINDING
       =================================================== */

    function bindEvents() {
        // Loan amount — both 'input' (live) and 'change' events
        dom.loanAmountInput.addEventListener('input', onLoanAmountInput);
        dom.loanAmountSlider.addEventListener('input', onLoanAmountSlider);

        // Re-format on blur (clean up typed value)
        dom.loanAmountInput.addEventListener('blur', () => {
            if (!isNaN(state.loanAmount) && state.loanAmount > 0) {
                dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
            }
        });

        // Interest rate
        dom.interestRateInput.addEventListener('input', onInterestRateInput);
        dom.interestRateSlider.addEventListener('input', onInterestRateSlider);

        // Tenure
        dom.tenureInput.addEventListener('input', onTenureInput);
        dom.tenureSlider.addEventListener('input', onTenureSlider);

        // Tenure unit toggle
        dom.tenureToggleBtns.forEach((btn) => {
            btn.addEventListener('click', () => onTenureUnitChange(btn.dataset.unit));
        });

        // Currency
        dom.currencySelect.addEventListener('change', onCurrencyChange);

        // Theme
        dom.themeToggle.addEventListener('click', onThemeToggle);

        // Amortization toggle
        dom.amortizationToggle.addEventListener('click', onAmortizationToggle);

        // Amortization view toggle
        dom.amortViewBtns.forEach((btn) => {
            btn.addEventListener('click', () => onAmortViewChange(btn.dataset.view));
        });

        // Reset
        dom.resetBtn.addEventListener('click', onReset);
    }


    /* ===================================================
       12. INITIALIZATION
       =================================================== */

    function init() {
        // Load saved theme preference
        try {
            const savedTheme = localStorage.getItem('emi-calc-theme');
            if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            }
        } catch (_e) { /* ignore */ }

        // Set initial input values
        dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.tenureInput.value = state.tenure;

        // Initialize slider fills
        updateSliderFill(dom.loanAmountSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);

        // Initialize Chart.js doughnut
        initChart();

        // Bind all event listeners
        bindEvents();

        // Run initial calculation
        updateResults();
    }

    // Start the app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
