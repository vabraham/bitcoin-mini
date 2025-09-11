# Bitcoin Mini Analytics

A comprehensive Bitcoin analytics web application built with FastAPI, featuring real-time price tracking, fee estimation, address watchlist, and quantum exposure analysis.

## Features

### 🔥 Core Functionality
- **Real-time Bitcoin Price**: Live BTC-USD price from CoinGecko
- **Fee Estimation**: Network fee estimates from mempool.space
- **Address Watchlist**: Track Bitcoin addresses and their balances
- **Portfolio Management**: Total value calculation in BTC and USD
- **Unit Conversion**: Toggle between BTC and satoshi display

### 🔬 Advanced Security
- **Quantum Exposure Analysis**: Assess Bitcoin addresses for quantum vulnerability
- **UTXO Risk Assessment**: Analyze individual UTXOs for exposed public keys
- **Address Reuse Detection**: Identify potential security risks from address reuse
- **Risk Classification**: Categorize addresses as low/elevated/high risk

### 📊 Analytics & BI
- **Event Logging**: Track user interactions for data analysis
- **Anonymous User Tracking**: Generate unique user IDs
- **Metrics Endpoints**: Basic aggregation for analytics
- **Metabase Integration**: Ready for advanced BI dashboards

## Quick Start

### Prerequisites
- Python 3.10+
- Docker (optional)

### Local Development

1. **Clone and setup**:
   ```bash
   git clone <your-repo-url>
   cd bitcoin-mini
   python -m venv benv
   source benv/bin/activate  # On Windows: benv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Run the application**:
   ```bash
   uvicorn app:app --reload
   ```

3. **Visit**: http://127.0.0.1:8000

### Docker Deployment

**Simple SQLite setup**:
```bash
docker-compose up --build
```

**Full development with PostgreSQL + Metabase**:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

## API Endpoints

### Public Data
- `GET /api/price` - Bitcoin price (USD)
- `GET /api/fees` - Network fee estimates
- `GET /api/address/{addr}` - Address summary

### Watchlist
- `GET /api/watchlist` - List tracked addresses
- `POST /api/watchlist` - Add address to watchlist

### Security Analysis
- `GET /api/quantum_exposure/{addr}` - Quantum exposure analysis

### Analytics
- `POST /api/event` - Log analytics event
- `GET /api/metrics/events_by_type` - Event type counts

## Architecture

- **Backend**: FastAPI + SQLModel
- **Database**: SQLite (prod) / PostgreSQL (dev)
- **Frontend**: Vanilla JavaScript (single HTML file)
- **APIs**: CoinGecko, mempool.space, Blockstream.info
- **Containerization**: Docker + docker-compose

## Database Schema

```sql
-- Events table for analytics
CREATE TABLE event (
    id INTEGER PRIMARY KEY,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR NOT NULL,
    user_id VARCHAR,
    payload_json TEXT
);

-- Watchlist for Bitcoin addresses
CREATE TABLE watchitem (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    address VARCHAR NOT NULL,
    label VARCHAR
);
```

## Quantum Exposure Analysis

This application includes advanced quantum security analysis for Bitcoin addresses:

- **Exposed Types**: P2PK, v1_p2tr (public key in script)
- **Hashed Types**: P2PKH, v0_p2wpkh (public key hashed)
- **Risk Assessment**: Analyzes UTXOs for quantum vulnerability
- **Address Reuse**: Detects potential key exposure from previous spends

## Development

### Environment Variables
- `DB_PATH`: SQLite database path (default: `./data/btcmini.db`)
- `DATABASE_URL`: PostgreSQL connection string (for production)

### Adding Features
The codebase is designed for easy extension:
- Add new API endpoints in `app.py`
- Extend database models with SQLModel
- Add new frontend features in `index.html`

## License

MIT License - feel free to use and modify as needed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Note**: This is a starter application designed for learning and experimentation. For production use, consider adding authentication, rate limiting, and additional security measures.
