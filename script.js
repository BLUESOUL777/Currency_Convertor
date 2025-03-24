import config from './config.js';

const fromCurrency = document.getElementById('from-currency');
const toCurrency = document.getElementById('to-currency');
const amount = document.getElementById('amount');
const convertBtn = document.querySelector('.convert-btn');
const swapBtn = document.querySelector('.swap-btn');
const rateInfo = document.getElementById('rate');
const convertedValue = document.getElementById('converted-value');
const convertedCurrency = document.getElementById('converted-currency');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

const RATE_LIMIT_DELAY = 1000;
let lastCallTime = 0;

const rateCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const currencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 
    'CAD', 'CHF', 'CNY', 'INR', 'NZD'
];

function initializeCurrencyDropdowns() {
    currencies.forEach(currency => {
        const fromOption = document.createElement('option');
        const toOption = document.createElement('option');
        
        fromOption.value = currency;
        fromOption.text = currency;
        toOption.value = currency;
        toOption.text = currency;
        
        fromCurrency.appendChild(fromOption);
        toCurrency.appendChild(toOption);
    });

    fromCurrency.value = 'USD';
    toCurrency.value = 'EUR';
}

function sanitizeInput(input) {
    return input.replace(/[^0-9.]/g, '');
}

function getCachedRate(from, to) {
    const key = `${from}-${to}`;
    const cachedData = rateCache.get(key);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
        return cachedData.rate;
    }
    
    return null;
}

function setCachedRate(from, to, rate) {
    const key = `${from}-${to}`;
    rateCache.set(key, {
        rate,
        timestamp: Date.now()
    });
}

async function getExchangeRate(from, to) {
    try {
        const cachedRate = getCachedRate(from, to);
        if (cachedRate) {
            return cachedRate;
        }

        const now = Date.now();
        if (now - lastCallTime < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
        lastCallTime = now;

        const response = await fetch(`${config.apiUrl}?apikey=${config.apiKey}&currencies=${to}&base_currency=${from}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data[to]) {
            const rate = data.data[to].value;
            setCachedRate(from, to, rate);
            return rate;
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to fetch exchange rate. Please try again later.');
        return null;
    }
}

async function convertCurrency() {
    const fromValue = fromCurrency.value;
    const toValue = toCurrency.value;
    const amountValue = sanitizeInput(amount.value);

    if (!amountValue || isNaN(amountValue) || parseFloat(amountValue) <= 0) {
        showError('Please enter a valid positive amount');
        return;
    }

    if (fromValue === toValue) {
        showError('Please select different currencies');
        return;
    }

    convertBtn.textContent = 'Converting...';
    convertBtn.disabled = true;

    try {
        const rate = await getExchangeRate(fromValue, toValue);
        
        if (rate) {
            const result = (parseFloat(amountValue) * rate).toFixed(2);
            rateInfo.textContent = `1 ${fromValue} = ${rate.toFixed(4)} ${toValue}`;
            convertedValue.textContent = result;
            convertedCurrency.textContent = toValue;
            animateValue(result);
        }
    } finally {
        convertBtn.textContent = 'Convert';
        convertBtn.disabled = false;
    }
}

function swapCurrencies() {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    
    swapBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        swapBtn.style.transform = '';
    }, 300);
    
    if (amount.value && !isNaN(amount.value)) {
        convertCurrency();
    }
}

function animateValue(targetValue) {
    const startValue = parseFloat(convertedValue.textContent) || 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = startValue + (targetValue - startValue) * progress;
        convertedValue.textContent = currentValue.toFixed(2);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function showError(message) {
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.querySelector('.converter-form').prepend(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

function toggleMobileMenu() {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
}

let debounceTimer;
amount.addEventListener('input', (e) => {
    e.target.value = sanitizeInput(e.target.value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (e.target.value) {
            convertCurrency();
        }
    }, 500);
});

convertBtn.addEventListener('click', convertCurrency);
swapBtn.addEventListener('click', swapCurrencies);
hamburger.addEventListener('click', toggleMobileMenu);

document.addEventListener('DOMContentLoaded', initializeCurrencyDropdowns);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            if (navLinks.classList.contains('active')) {
                toggleMobileMenu();
            }
        }
    });
});

const style = document.createElement('style');
style.textContent = `
    .nav-links.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        padding: 1rem;
    }
    
    .hamburger.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
        opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .error-message {
        background: var(--accent-color);
        color: white;
        padding: 0.5rem;
        border-radius: 4px;
        text-align: center;
        margin-bottom: 1rem;
        animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);