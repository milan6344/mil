const config = {
    // API Endpoints
    API_BASE_URL: 'http://localhost:3000/api',
    WS_BASE_URL: 'ws://localhost:3000',
    
    // Solana Network
    SOLANA_NETWORK: 'mainnet-beta',
    
    // Contract Addresses
    STAKING_CONTRACT: 'your_staking_contract_address',
    PRESALE_CONTRACT: 'your_presale_contract_address',
    TOKEN_CONTRACT: 'your_token_contract_address',
    
    // Token Details
    TOKEN_DECIMALS: 9,
    
    // Staking Config
    MIN_STAKE_AMOUNT: 100,
    STAKING_APY: 12,
    
    // Presale Config
    PRESALE_PRICE: 0.001,
    MIN_BUY: 0.1,
    MAX_BUY: 10,
    
    // Airdrop Config
    AIRDROP_AMOUNT: 1000,
    
    // UI Config
    TOAST_DURATION: 3000,
    CHART_UPDATE_INTERVAL: 30000,
    PRICE_UPDATE_INTERVAL: 10000
};

export default config; 