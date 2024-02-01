(define-constant contract-owner tx-sender)
(define-constant satoshi-amount u100000000)
(define-constant err-get-price-feed-index (err u100))
(define-constant err-owner-only (err u101))
(define-constant err-append-supported-feed (err u102))
(define-constant err-insufficient-funds (err u3766))
(define-constant err-get-sBTC-price (err u104))

(define-fungible-token thetix-USD)

;; c-ratio required for trades to execute.
;; For now, this is an impotent value.
(define-data-var min-c-ratio uint u300)

;; list of supported asset feed ids
(define-data-var supported-assets (list 100 uint) (list ))

;; global balances for assets
;; asset-id (uint) -> amount (uint)
(define-map global-asset-amounts uint uint)

;; primary datastore for user accounts
;; user id (principal) -> account info ({...})
(define-map user-accounts principal {
	  name: (string-ascii 100), ;; readable user name
    tUSD-amount: uint ;; thetix-USD balance
})

(define-map user-asset-balances {user: principal, asset-id: uint} uint)
(define-map user-asset-balances-sbtc {user: principal, asset-id: uint} uint)

;; mapping of total asset ownership:
;; feed-id (uint) -> amount-owned (uint)
(define-map asset-ownership uint uint)

;; mint thetix token for user
(define-public (mint-thetix-USD) 
    (begin
        (ft-mint? thetix-USD u1000 tx-sender)
    )
)

;; add supported feed
(define-public (add-supported-feed (feed-id uint)) 
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        ;; #[allow(unchecked_data)]
        (var-set supported-assets 
            (unwrap! 
                (as-max-len? (append (var-get supported-assets) feed-id) u100) 
                err-append-supported-feed)
        )
        (ok true)
    )
)

(define-public (set-supported-feeds (feed-ids (list 100 uint))) 
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        ;; #[allow(unchecked_data)]
        (var-set supported-assets feed-ids)
        (ok true)
    )
)

;; get supported feeds
(define-read-only (get-supported-feeds) 
    (begin
        (ok (map get-feed-for-id (var-get supported-assets)))
    )
)

;; get supported feeds
(define-read-only (get-supported-feeds-ids) 
    (begin
        (ok (var-get supported-assets))
    )
)

;; get supported feeds
(define-read-only (get-feed-for-id (feed-id uint)) 
    (unwrap-panic (contract-call? .mock-price-feed get-feed feed-id))
)

;; Get total asset value currently on the protocol.
;; Necessary for c-ratio purposes in future iterations.
(define-read-only (get-total-asset-value) 
  (let (
        (feed-index (unwrap! (contract-call? .mock-price-feed get-feed-index ) err-get-price-feed-index))
        (assets-list (var-get supported-assets))
    )
    (begin 
        ;; (fold add-supported-feed sequence initial-value)
        (ok (fold add-total-value-for-asset assets-list u0))
    )
  )
)

;; Get total thetix USD balance for a user account.
(define-read-only (get-user-tusd-balance (account-name principal)) 
  (ok (ft-get-balance thetix-USD account-name))
)

;; Get total thetix USD balance for a user account.
(define-read-only (get-sbtc-balance) 
  (contract-call? .sbtc get-balance tx-sender)
)

;; Get total thetix USD balance for a user account.
(define-read-only (get-sbtc-price) 
  (contract-call? .mock-price-feed get-btc-price)
)

;; Get total thetix USD balance for a user account.
(define-read-only (get-asset-balance (asset-id uint))
  (let (
        (balance (map-get? user-asset-balances {user: tx-sender, asset-id: asset-id}))
    ) 
    (if (is-eq balance none) (ok u0) (ok (unwrap-panic balance)))
  )
)


;; Get total thetix USD balance for a user account.
(define-read-only (get-global-asset-balance (asset-id uint))
  (let (
        (balance (map-get? global-asset-amounts asset-id))
    ) 
    (if (is-eq balance none) (ok u0) (ok (unwrap-panic balance)))
  )
)

;; reducer function to add value of total assets
(define-private (add-total-value-for-asset (asset-id uint) (current-sum uint)) 
  (let (
        (asset-amount (map-get? global-asset-amounts asset-id))
        (feed-value (get current-value (unwrap-panic (contract-call? .mock-price-feed get-feed asset-id))))
    )
    (begin
        (if (is-eq asset-amount none)
            current-sum
            (+ current-sum (* feed-value (unwrap-panic asset-amount)))
        )
    )
  )
)

;; Set the required c-ratio.
(define-public (set-c-ratio (value uint))
  (begin 
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    ;; #[allow(unchecked_data)]
    (var-set min-c-ratio value)
    (ok true)
  )
)

;; get the c-ratio for the protocol.
;; For testnet, we are stubbing this as 300%, which can be argued to be safe for
;; puchasing synthetic assets on such a protocol. For mainnet with sBTC,
;; this function will be based on the sBTC locked in the pool 
;; vs outstanding synthetic assets.
(define-read-only (get-c-ratio)
  (begin
	(ok (var-get min-c-ratio))
  )
)

(define-public (test-send) 
  (begin 
    (contract-call? .sbtc transfer u1 tx-sender (as-contract tx-sender) (some 0x68656c6c6f21))
  )
)

;; Get total asset value currently on the protocol.
;; Necessary for c-ratio purposes in future iterations.
(define-public (purchase-asset (asset-id uint) (amount-satoshis uint)) 
  (let (
        (feed-value (get current-value (unwrap-panic (contract-call? .mock-price-feed get-feed asset-id))))
        (assets-balance-key {user: tx-sender, asset-id: asset-id})
        (user-assets-balance (map-get? user-asset-balances assets-balance-key))
        (sbtc-balance (unwrap-panic (get-sbtc-balance)))
        (sbtc-price (unwrap-panic (get-sbtc-price)))
        (amount-of-asset-to-purchase (/ (* sbtc-price amount-satoshis) feed-value))
        (new-balance (if (is-eq user-assets-balance none)
            amount-of-asset-to-purchase
            (+ amount-of-asset-to-purchase (unwrap-panic user-assets-balance))
        ))
        (global-asset-amount (map-get? global-asset-amounts asset-id))
        (new-global-asset-amount (if (is-eq global-asset-amount none)
            amount-of-asset-to-purchase
            (+ amount-of-asset-to-purchase (unwrap-panic global-asset-amount))
        ))
    )
    (begin
        (asserts! (>= sbtc-balance amount-satoshis) err-insufficient-funds)
        (try! (contract-call? .sbtc transfer amount-satoshis tx-sender (as-contract tx-sender) none))
        (map-set user-asset-balances assets-balance-key new-balance)
        ;; #[allow(unchecked_data)]
        (map-set global-asset-amounts asset-id new-global-asset-amount)
        (print amount-of-asset-to-purchase)
        (ok true)
    )
  )
)

(define-public (sell-asset (asset-id uint) (amount uint)) 
  (let (
        (feed-value (get current-value (unwrap-panic (contract-call? .mock-price-feed get-feed asset-id))))
        (assets-balance-key {user: tx-sender, asset-id: asset-id})
        (user-assets-balance (map-get? user-asset-balances assets-balance-key))
        (sbtc-price (unwrap-panic (get-sbtc-price)))
        (amount-of-sbtc-to-receive (/ (* feed-value amount) sbtc-price))
        (current-balance (if (is-eq user-assets-balance none)
            u0
            (unwrap-panic user-assets-balance)
        ))
    )
    (begin
        (print current-balance)
        (print amount)
        (asserts! (>= current-balance amount) err-insufficient-funds)
        (try! (contract-call? .sbtc transfer amount-of-sbtc-to-receive (as-contract tx-sender) tx-sender none))
        (map-set user-asset-balances assets-balance-key (- current-balance amount))
        ;; #[allow(unchecked_data)]
        (print amount-of-sbtc-to-receive)
        (ok true)
    )
  )
)