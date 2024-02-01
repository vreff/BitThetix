
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-unknown-feed (err u101))
(define-constant err-btc-price-not-set (err u102))
(define-data-var feed-index uint u0)
(define-data-var btc-feed-index-set bool false)
(define-data-var btc-feed-index uint u0)

(define-map price-feeds uint {
	current-value: uint, ;; most recent value for feed
	block: uint, ;; block feed was updated at
	ticker: (string-ascii 15), ;; feed ticker
	type: (string-ascii 15), ;; asset type
	name: (string-ascii 100), ;; feed name
	implied-volatility: uint, ;; implied volatility of the asset
	pyth-feed-id: (string-ascii 100), ;; pyth price feed public key
})

;; add a new feed
(define-public (add-feed (feed {
	current-value: uint, ;; most recent value for feed
	ticker: (string-ascii 15), ;; feed ticker
	type: (string-ascii 15), ;; asset type
	name: (string-ascii 100), ;; feed name
	implied-volatility: uint, ;; implied volatility of the asset
	pyth-feed-id: (string-ascii 100), ;; pyth price feed public key
})
)
  (let (
	(feed-id (var-get feed-index))
	)
	(begin
		(asserts! (is-eq tx-sender contract-owner) err-owner-only)
		;; #[allow(unchecked_data)]
		(map-set price-feeds feed-id {
			current-value: (get current-value feed),
			block: burn-block-height,
			ticker: (get ticker feed),
			name: (get name feed),
			type: (get type feed),
			implied-volatility: (get implied-volatility feed),
			pyth-feed-id: (get pyth-feed-id feed),
		})
		(if (is-eq (get ticker feed) "BTC") (begin (var-set btc-feed-index-set true) (var-set btc-feed-index feed-id)) (is-eq true true))
		(var-set feed-index (+ u1 feed-id))
		(ok true)
	)
  )
)

;; add a new feed
(define-public (add-feeds (feeds (list 12 {
	current-value: uint, ;; most recent value for feed
	ticker: (string-ascii 15), ;; feed ticker
	type: (string-ascii 15), ;; asset type
	name: (string-ascii 100), ;; feed name
	implied-volatility: uint, ;; implied volatility of the asset
	pyth-feed-id: (string-ascii 100), ;; pyth price feed public key
})))
	(begin 
		(map add-feed feeds)
		(ok true)
	)
)

;; update value for feed
(define-public (update-feed (feed {
	feed-id: uint, ;; feed id
	current-value: uint, ;; most recent value for feed
}))
  (let (
	(feed-id (get feed-id feed))
	(current-value (get current-value feed))
	(current-feed (unwrap! (map-get? price-feeds feed-id) err-unknown-feed))
	)
	(begin
		(asserts! (is-eq tx-sender contract-owner) err-owner-only)
		;; #[allow(unchecked_data)]
		(map-set price-feeds feed-id (merge current-feed {current-value: current-value, block: block-height}))
		(ok true)
	)
  )
)

;; update values for feeds
(define-public (update-feeds (feeds (list 12 {
	feed-id: uint, ;; feed id
	current-value: uint, ;; most recent value for feed
})))
  	(begin 
		(map update-feed feeds)
		(ok true)
	)
)

;; get feed for given feed id
(define-read-only (get-feed (id uint))
  (begin
	(map-get? price-feeds id)
  )
)

;; get feed for given feed id
(define-read-only (get-btc-price)
  (begin
	(if 
		(var-get btc-feed-index-set) 
		(ok (get current-value (unwrap-panic (map-get? price-feeds (var-get btc-feed-index))))) 
		(err err-btc-price-not-set)
	)
  )
)

;; get current feed index
(define-read-only (get-feed-index)
  (begin
	(ok (var-get feed-index))
  )
)