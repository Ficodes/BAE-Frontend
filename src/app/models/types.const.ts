export const TYPES= {
    //CHARGE_PERIOD: CHARGE_PERIOD,
    //CURRENCY_CODE: CURRENCY_CODE,
    PRICE: {
        ONE_TIME: 'one time',
        RECURRING: 'recurring',
        USAGE: 'usage'
    },
    PRICE_ALTERATION: {
        DISCOUNT: { code: 'discount', name: 'Discount' },
        FEE: { code: 'fee', name: 'Fee' }
    },
    PRICE_ALTERATION_SUPPORTED: {
        PRICE_COMPONENT: 'Price component',
        DISCOUNT_OR_FEE: 'Discount or fee',
        NOTHING: 'None'
    },
    PRICE_CONDITION: {
        EQ: {code: 'eq', name: 'Equal'},
        LT: {code: 'lt', name: 'Less than'},
        LE: {code: 'le', name: 'Less than or equal'},
        GT: {code: 'gt', name: 'Greater than'},
        GE: {code: 'ge', name: 'Greater than or equal'}
    },
    LICENSE: {
        NONE: 'None',
        STANDARD: 'Standard open data license',
        WIZARD: 'Custom license (wizard)',
        FREETEXT: 'Custom license (free-text)'
    },
    SLA: {
        NONE: 'None',
        SPEC: 'Spec'
    },
    METRICS: {
        UPDATES: 'Updates rate',
        RESPTIME: 'Response time',
        DELAY: 'Delay'
    },
    MEASURESDESC: {
        UPDATES: 'Expected number of updates in the given period.',
        RESPTIME: 'Total amount of time to respond to a data request (GET).',
        DELAY: 'Total amount of time to deliver a new update (SUBSCRIPTION).'
    },
    TIMERANGE: {
        DAY: 'day',
        WEEK: 'week',
        MONTH: 'month'
    },
    UNITS: {
        MSEC: 'ms',
        SEC: 's',
        MIN: 'min'
    }
};