// Configuration constants for Bitcoin Mini Extension

export const CONFIG = {
  // API Configuration
  CACHE_TIMEOUT: 60000, // 1 minute cache
  MIN_UPDATE_INTERVAL: 30000, // Minimum 30 seconds between updates
  RATE_LIMIT_DELAY: 60000, // 1 minute delay after rate limit
  MAX_RETRIES: 2, // Maximum retry attempts
  API_TIMEOUT: 45000, // 45 seconds API timeout
  BACKGROUND_RETRY_DELAY: 10000, // 10 seconds for background retries

  // PIN Security
  MAX_PIN_ATTEMPTS: 5, // Maximum PIN attempts before lockout
  PIN_LOCKOUT_DURATION: 300000, // 5 minutes lockout after max attempts
  MIN_PIN_LENGTH: 4,
  MAX_PIN_LENGTH: 6,

  // Address Processing
  MAX_UTXOS_TO_CHECK: 5, // Limit UTXO analysis for speed
  ADDRESS_MIN_LENGTH: 25,
  ADDRESS_TIMEOUT: 40000, // 40 seconds for address analysis

  // UI Configuration
  NOTIFICATION_DURATION: 3000, // 3 seconds for notifications
  TOOLTIP_OFFSET: 10, // Pixels offset for tooltips
  PIN_DISPLAY_UPDATE_INTERVAL: 1000, // 1 second for PIN lockout countdown

  // Cache Configuration
  STALE_CACHE_THRESHOLD: 300000, // 5 minutes - consider cache stale

  // API Endpoints
  ENDPOINTS: {
    COINGECKO_PRICE: 'https://api.coingecko.com/api/v3/simple/price',
    COINGECKO_HISTORY: 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart',
    MEMPOOL_FEES: 'https://mempool.space/api/v1/fees/recommended',
    BLOCKSTREAM_ADDRESS: 'https://blockstream.info/api/address',
    BLOCKSTREAM_TX: 'https://blockstream.info/api/tx',
    MEMPOOL_ADDRESS: 'https://mempool.space/api/address'
  },

  // Currency symbols mapping
  CURRENCY_SYMBOLS: {
    'usd': '$', 'eur': '€', 'gbp': '£', 'jpy': '¥', 'cad': 'C$',
    'aud': 'A$', 'chf': 'CHF', 'cny': '¥', 'inr': '₹', 'krw': '₩',
    'brl': 'R$', 'mxn': '$', 'rub': '₽', 'try': '₺', 'zar': 'R',
    'nzd': 'NZ$', 'sek': 'kr', 'nok': 'kr', 'dkk': 'kr', 'pln': 'zł',
    'czk': 'Kč', 'huf': 'Ft', 'ils': '₪', 'thb': '฿', 'sgd': 'S$',
    'hkd': 'HK$', 'twd': 'NT$', 'php': '₱', 'idr': 'Rp', 'myr': 'RM',
    'vnd': '₫', 'bdt': '৳', 'pkr': '₨', 'lkr': '₨', 'npr': '₨',
    'bht': 'Nu', 'mvr': 'Rf', 'afn': '؋', 'kzt': '₸', 'uzs': 'som',
    'kgs': 'с', 'tjs': 'SM', 'tmt': 'T', 'amd': '֏', 'azn': '₼',
    'gel': '₾', 'byn': 'Br', 'mdl': 'L', 'uah': '₴', 'bgn': 'лв',
    'ron': 'lei', 'hrk': 'kn', 'rsd': 'дин', 'bam': 'КМ', 'mkd': 'ден',
    'all': 'L', 'mnt': '₮', 'khr': '៛', 'lak': '₭', 'mmk': 'K',
    'bob': 'Bs', 'clp': '$', 'cop': '$', 'pen': 'S/', 'uyu': '$U',
    'pyg': '₲', 'ars': '$', 'vef': 'Bs.S'
  },

  // Fee categories thresholds
  FEE_THRESHOLDS: {
    VERY_LOW: 5,
    LOW: 10,
    MEDIUM: 50,
    HIGH: 100
  },

  // Default values
  DEFAULTS: {
    CURRENCY: 'usd',
    UNIT: 'BTC',
    VAULT_TIMEOUT: 'extension_open' // More secure default - locks when extension closes
  },

  // Regular expressions
  REGEX: {
    ADDRESS: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/,
    TX_ID: /^[a-fA-F0-9]{64}$/,
    BLOCK_HASH: /^[a-fA-F0-9]{64}$/,
    DIGITS_ONLY: /^\d+$/,
    ADDRESS_CHARS: /^[a-zA-HJ-NP-Z0-9]+$/
  },

  // Special addresses to skip
  SPECIAL_ADDRESSES: [
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' // Genesis block address
  ]
};