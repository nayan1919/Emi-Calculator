/**
 * EMI Calculator — Main Script
 * ============================
 * Handles EMI calculation, chart rendering, amortization table,
 * real-time updates, input validation, and theme toggling.
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

    const DEFAULTS = {
        loanAmount: 1000000,
        interestRate: 8.5,
        tenure: 20,
        tenureUnit: 'years',
    };

    const LIMITS = {
        loanAmount: { min: 10000, max: 10000000 },
        interestRate: { min: 1, max: 30 },
        tenureYears: { min: 1, max: 30 },
        tenureMonths: { min: 1, max: 360 },
    };

    let state = { ...DEFAULTS };
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

        // Error elements
        loanAmountError: document.getElementById('loan-amount-error'),
        interestRateError: document.getElementById('interest-rate-error'),
        tenureError: document.getElementById('loan-tenure-error'),

        // Tenure toggle
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

        // Amortization
        amortizationToggle: document.getElementById('amortization-toggle'),
        amortizationContent: document.getElementById('amortization-content'),
        amortizationBody: document.getElementById('amortization-body'),
        amortViewBtns: document.querySelectorAll('.amort-view-toggle .view-btn'),
        colPeriod: document.getElementById('col-period'),

        // Controls
        resetBtn: document.getElementById('reset-btn'),
    };

    /* ===================================================
       3. EMI CALCULATION
       =================================================== */

    function calculateEMI(principal, annualRate, tenureMonths) {
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

    function generateAmortization(principal, annualRate, tenureMonths) {
        const { emi } = calculateEMI(principal, annualRate, tenureMonths);
        const R = annualRate / 12 / 100;
        const schedule = [];
        let balance = principal;

        for (let month = 1; month <= tenureMonths; month++) {
            const interestPaid = balance * R;
            let principalPaid = emi - interestPaid;

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
       4. VALIDATION
       =================================================== */

    function validateField(fieldName) {
        let value, min, max, errorEl, label;

        switch (fieldName) {
            case 'loanAmount':
                value = state.loanAmount;
                min = LIMITS.loanAmount.min;
                max = LIMITS.loanAmount.max;
                errorEl = dom.loanAmountError;
                label = 'Loan amount';
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
                min = state.tenureUnit === 'years' ? LIMITS.tenureYears.min : LIMITS.tenureMonths.min;
                max = state.tenureUnit === 'years' ? LIMITS.tenureYears.max : LIMITS.tenureMonths.max;
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
            errorEl.textContent = `${label} must be at least ${fieldName === 'loanAmount' ? formatCurrency(min) : min}.`;
            return false;
        }
        if (value > max) {
            errorEl.textContent = `${label} cannot exceed ${fieldName === 'loanAmount' ? formatCurrency(max) : max}.`;
            return false;
        }

        return true;
    }

    function validateAll() {
        return validateField('loanAmount') && validateField('interestRate') && validateField('tenure');
    }

    /* ===================================================
       5. UI UPDATE
       =================================================== */

    function updateResults() {
        if (!validateAll()) {
            dom.emiValue.textContent = formatCurrency(0);
            dom.interestValue.textContent = formatCurrency(0);
            dom.totalValue.textContent = formatCurrency(0);
            dom.legendPrincipal.textContent = formatCurrency(0);
            dom.legendInterest.textContent = formatCurrency(0);
            updateChart(0, 0);
            dom.amortizationBody.innerHTML = '';
            return;
        }

        const tenureMonths = state.tenureUnit === 'years' ? state.tenure * 12 : state.tenure;
        const { emi, totalPayment, totalInterest } = calculateEMI(state.loanAmount, state.interestRate, tenureMonths);

        animateValue(dom.emiValue, formatCurrency(emi));
        animateValue(dom.interestValue, formatCurrency(totalInterest));
        animateValue(dom.totalValue, formatCurrency(totalPayment));

        dom.legendPrincipal.textContent = formatCurrency(state.loanAmount);
        dom.legendInterest.textContent = formatCurrency(totalInterest);

        updateChart(state.loanAmount, totalInterest);
        updateAmortizationTable(tenureMonths);
    }

    function animateValue(element, newText) {
        element.textContent = newText;
        element.classList.remove('updating');
        void element.offsetWidth;
        element.classList.add('updating');
    }

    /* ===================================================
       6. CHART
       =================================================== */

    function initChart() {
        const ctx = dom.chartCanvas.getContext('2d');
        emiChart = new Chart(ctx, {
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
        if (!emiChart) return;
        emiChart.data.datasets[0].data = [principal, interest];
        emiChart.update('none');
    }

    /* ===================================================
       7. AMORTIZATION TABLE
       =================================================== */

    let amortView = 'yearly';

    function updateAmortizationTable(tenureMonths) {
        const monthlySchedule = generateAmortization(state.loanAmount, state.interestRate, tenureMonths);
        if (amortView === 'yearly') {
            renderYearlyTable(monthlySchedule);
        } else {
            renderMonthlyTable(monthlySchedule);
        }
    }

    function renderYearlyTable(monthlySchedule) {
        dom.colPeriod.textContent = 'Year';
        const yearly = aggregateYearly(monthlySchedule);
        const originalPrincipal = state.loanAmount;

        const rows = yearly.map((row) => {
            const balancePercent = originalPrincipal > 0 ? (row.balance / originalPrincipal) * 100 : 0;
            return `<tr>
                <td>${row.year}</td>
                <td>${formatCurrency(row.principalPaid)}</td>
                <td>${formatCurrency(row.interestPaid)}</td>
                <td>${formatCurrency(row.totalPayment)}</td>
                <td>
                    <div class="balance-cell">
                        <span>${formatCurrency(row.balance)}</span>
                        <div class="balance-bar"><div class="balance-bar-fill" style="width: ${balancePercent}%"></div></div>
                    </div>
                </td>
            </tr>`;
        });

        dom.amortizationBody.innerHTML = rows.join('');
    }

    function renderMonthlyTable(monthlySchedule) {
        dom.colPeriod.textContent = 'Month';
        const originalPrincipal = state.loanAmount;

        const rows = monthlySchedule.map((row) => {
            const balancePercent = originalPrincipal > 0 ? (row.balance / originalPrincipal) * 100 : 0;
            return `<tr>
                <td>${row.month}</td>
                <td>${formatCurrency(row.principalPaid)}</td>
                <td>${formatCurrency(row.interestPaid)}</td>
                <td>${formatCurrency(row.totalPayment)}</td>
                <td>
                    <div class="balance-cell">
                        <span>${formatCurrency(row.balance)}</span>
                        <div class="balance-bar"><div class="balance-bar-fill" style="width: ${balancePercent}%"></div></div>
                    </div>
                </td>
            </tr>`;
        });

        dom.amortizationBody.innerHTML = rows.join('');
    }

    /* ===================================================
       8. EVENT HANDLERS
       =================================================== */

    function onLoanAmountInput() {
        const parsed = parseFormattedNumber(dom.loanAmountInput.value);
        state.loanAmount = parsed;
        const clampedForSlider = Math.max(LIMITS.loanAmount.min, Math.min(LIMITS.loanAmount.max, isNaN(parsed) ? LIMITS.loanAmount.min : parsed));
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
        const limits = state.tenureUnit === 'years' ? LIMITS.tenureYears : LIMITS.tenureMonths;
        const clampedForSlider = Math.max(limits.min, Math.min(limits.max, isNaN(parsed) ? limits.min : parsed));
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

    function onTenureUnitChange(unit) {
        if (unit === state.tenureUnit) return;

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

        dom.tenureToggleBtns.forEach((btn) => {
            const isActive = btn.dataset.unit === unit;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });

        dom.tenureInput.value = state.tenure;
        dom.tenureSlider.value = state.tenure;
        updateSliderFill(dom.tenureSlider);
        updateResults();
    }

    function onAmortizationToggle() {
        const isExpanded = dom.amortizationToggle.getAttribute('aria-expanded') === 'true';
        dom.amortizationToggle.setAttribute('aria-expanded', !isExpanded);
        dom.amortizationContent.hidden = isExpanded;
    }

    function onAmortViewChange(view) {
        amortView = view;
        dom.amortViewBtns.forEach((btn) => {
            const isActive = btn.dataset.view === view;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });

        const tenureMonths = state.tenureUnit === 'years' ? state.tenure * 12 : state.tenure;
        updateAmortizationTable(tenureMonths);
    }

    function onReset() {
        state = { ...DEFAULTS };
        onTenureUnitChange('years');

        dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
        dom.loanAmountSlider.value = state.loanAmount;
        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.interestRateSlider.value = state.interestRate;
        dom.tenureInput.value = state.tenure;
        dom.tenureSlider.value = state.tenure;

        dom.loanAmountError.textContent = '';
        dom.interestRateError.textContent = '';
        dom.tenureError.textContent = '';

        updateSliderFill(dom.loanAmountSlider);
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
        dom.loanAmountInput.addEventListener('input', onLoanAmountInput);
        dom.loanAmountSlider.addEventListener('input', onLoanAmountSlider);
        dom.loanAmountInput.addEventListener('blur', () => {
            if (!isNaN(state.loanAmount) && state.loanAmount > 0) {
                dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
            }
        });

        dom.interestRateInput.addEventListener('input', onInterestRateInput);
        dom.interestRateSlider.addEventListener('input', onInterestRateSlider);

        dom.tenureInput.addEventListener('input', onTenureInput);
        dom.tenureSlider.addEventListener('input', onTenureSlider);

        dom.tenureToggleBtns.forEach((btn) => {
            btn.addEventListener('click', () => onTenureUnitChange(btn.dataset.unit));
        });

        dom.amortizationToggle.addEventListener('click', onAmortizationToggle);

        dom.amortViewBtns.forEach((btn) => {
            btn.addEventListener('click', () => onAmortViewChange(btn.dataset.view));
        });

        dom.resetBtn.addEventListener('click', onReset);
    }

    /* ===================================================
       10. INITIALIZATION
       =================================================== */

    function init() {
        dom.loanAmountInput.value = formatAmountInput(state.loanAmount);
        dom.interestRateInput.value = state.interestRate.toFixed(1);
        dom.tenureInput.value = state.tenure;

        updateSliderFill(dom.loanAmountSlider);
        updateSliderFill(dom.interestRateSlider);
        updateSliderFill(dom.tenureSlider);

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
