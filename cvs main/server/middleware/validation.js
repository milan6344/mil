const { check, validationResult } = require('express-validator');

const validateUser = [
    check('walletAddress')
        .isString()
        .matches(/^[A-HJ-NP-Za-km-z1-9]*$/)
        .withMessage('Invalid Solana wallet address'),
    
    check('balance.sol')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Invalid SOL balance'),
    
    check('balance.usdt')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Invalid USDT balance'),
    
    check('staking.stakedAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Invalid staked amount'),
    
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = { validateUser }; 