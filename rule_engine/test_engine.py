from .engine import RuleEngine
from .blacklisted_ip import BlacklistedIPRule
from .high_velocity import HighVelocityRule
from .new_country import NewCountryRule
from .lrg_transaction import LrgTransactionAmountRule
from datetime import datetime, timedelta

# Initialize rules
blacklisted_ips = {'192.168.1.1', '10.0.0.1', '172.16.0.5', '192.168.1.100'}
rules = [
    BlacklistedIPRule(blacklisted_ips),
    #HighVelocityRule(limit=10000.0),
    NewCountryRule(),
    LrgTransactionAmountRule(threshold=1000.0)
]

engine = RuleEngine(rules)

# ── Sample Transactions ────────────────────────────────────────────────────

transactions = [
    # 1. Original — blacklisted IP, known country, under threshold
    {
        #'label': 'T1 — Blacklisted IP, known country',
        'transaction': {
            'user_id': 'user123',
            'amount': 5000.0,
            'ip_address': '192.168.1.1',
            'country': 'US',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user123': [
                {'amount': 3000.0, 'timestamp': datetime.now() - timedelta(minutes=30)},
                {'amount': 4000.0, 'timestamp': datetime.now() - timedelta(minutes=45)},
            ]},
            'user_countries': {'user123': {'US', 'CA'}}
        }
    },

    # 2. Clean transaction — nothing suspicious
    {
        #'label': 'T2 — Clean transaction, LOW expected',
        'transaction': {
            'user_id': 'user456',
            'amount': 45.0,
            'ip_address': '203.0.113.5',
            'country': 'CA',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user456': []},
            'user_countries': {'user456': {'CA', 'US'}}
        }
    },

    # 3. New country — user transacting from an unseen country
    {
        #'label': 'T3 — New country (BR), MEDIUM expected',
        'transaction': {
            'user_id': 'user789',
            'amount': 200.0,
            'ip_address': '198.51.100.12',
            'country': 'BR',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user789': []},
            'user_countries': {'user789': {'US', 'CA', 'GB'}}
        }
    },

    # 4. Large transaction over threshold
    {
        #'label': 'T4 — Large transaction (>$1000)',
        'transaction': {
            'user_id': 'user321',
            'amount': 1500.0,
            'ip_address': '10.10.10.10',
            'country': 'US',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user321': []},
            'user_countries': {'user321': {'US'}}
        }
    },

    # 5. Blacklisted IP + new country combo — MEDIUM/HIGH expected
    {
        #'label': 'T5 — Blacklisted IP + new country',
        'transaction': {
            'user_id': 'user654',
            'amount': 300.0,
            'ip_address': '10.0.0.1',
            'country': 'NG',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user654': []},
            'user_countries': {'user654': {'US', 'CA'}}
        }
    },

    # 6. Blacklisted IP + new country + large transaction — HIGH expected
    {
        #'label': 'T6 — Blacklisted IP + new country + large amount (HIGH expected)',
        'transaction': {
            'user_id': 'user999',
            'amount': 8500.0,
            'ip_address': '172.16.0.5',
            'country': 'RU',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user999': []},
            'user_countries': {'user999': {'US'}}
        }
    },

    # 7. Known country, clean IP, large amount — borderline
    {
        #'label': 'T7 — Large amount, clean IP, known country',
        'transaction': {
            'user_id': 'user111',
            'amount': 2500.0,
            'ip_address': '8.8.8.8',
            'country': 'GB',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user111': []},
            'user_countries': {'user111': {'GB', 'FR', 'DE'}}
        }
    },

    # 8. No context provided — rules dependent on context should return 0
    {
        #'label': 'T8 — No context provided',
        'transaction': {
            'user_id': 'user222',
            'amount': 750.0,
            'ip_address': '192.168.1.100',
            'country': 'US',
            'timestamp': datetime.now()
        },
        'context': None
    },

    # 9. User with no country history — new country fires by default
    {
        #'label': 'T9 — First-ever transaction (no country history)',
        'transaction': {
            'user_id': 'user_new',
            'amount': 90.0,
            'ip_address': '203.0.113.99',
            'country': 'JM',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user_new': []},
            'user_countries': {'user_new': set()}  # empty — no prior history
        }
    },

    # 10. Everything fires — worst case scenario
    {
        #'label': 'T10 — All rules triggered (HIGH expected)',
        'transaction': {
            'user_id': 'user_bad',
            'amount': 9999.0,
            'ip_address': '192.168.1.1',
            'country': 'KP',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user_bad': []},
            'user_countries': {'user_bad': {'US'}}
        }
    },

    # 11. Repeat blacklisted IP but amount and country are clean
    {
        #'label': 'T11 — Blacklisted IP only, everything else clean',
        'transaction': {
            'user_id': 'user333',
            'amount': 12.0,
            'ip_address': '10.0.0.1',
            'country': 'US',
            'timestamp': datetime.now()
        },
        'context': {
            'historical_transactions': {'user333': []},
            'user_countries': {'user333': {'US', 'CA'}}
        }
    },
]

# ── Run All Transactions ───────────────────────────────────────────────────

print(f"{'='*65}")
print(f"  RiskNet Rule Engine — Test Results")
print(f"{'='*65}\n")

for entry in transactions:
    result = engine.evaluate_transaction(entry['transaction'], entry['context'])
    tier = result['fraud_possibility']
    score = result['total_risk_score']
    fired = {k: v for k, v in result['rule_scores'].items() if v > 0}

    tier_label = f"[{tier}]"
    #print(f"  {entry['label']}")
    print(f"  Score: {score:.1f}  |  Tier: {tier_label}")
    print(f"  Rules fired: {fired if fired else 'None'}")
    print(f"  {'-'*60}")