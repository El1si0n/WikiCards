import fs from 'node:fs';
import path from 'node:path';

  const dataDir = path.resolve(process.cwd(), 'data')
  const usersDir = path.join(dataDir, 'users')
  const tradesFile = path.join(dataDir, 'trades.json')
  const marketFile = path.join(dataDir, 'market.json')

  const ensureDir = () => {
    if (!fs.existsSync(usersDir)) {
      fs.mkdirSync(usersDir, { recursive: true })
    }
  }

  const sanitizeCode = (code) => {
    return String(code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
  }

  const getUserFilePath = (code) => {
    ensureDir()
    const clean = sanitizeCode(code)
    if (!clean) return null
    return path.join(usersDir, `${clean}.json`)
  }

  const loadUserFile = (code) => {
    const fp = getUserFilePath(code)
    if (!fp || !fs.existsSync(fp)) return null
    try {
      return JSON.parse(fs.readFileSync(fp, 'utf-8'))
    } catch {
      return null
    }
  }

  const saveUserFile = (code, userObj) => {
    const fp = getUserFilePath(code)
    if (!fp) return null
    const next = {
      ...userObj,
      code: sanitizeCode(code),
      updatedAt: Date.now(),
    }
    fs.writeFileSync(fp, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }

  const loadJsonArrayFile = (filePath) => {
    ensureDir()
    if (!fs.existsSync(filePath)) return []
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const saveJsonArrayFile = (filePath, arr) => {
    ensureDir()
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf-8')
  }

  const addCardsToUserCollection = (collection = [], cardsToAdd = []) => {
    const map = new Map(collection.map((item) => [String(item.id), { ...item }]))
    const now = Date.now()
    cardsToAdd.forEach((entry, idx) => {
      const card = entry.card || entry
      const qty = Math.max(1, Number(entry.qty || 1))
      const idKey = String(card.id)
      if (map.has(idKey)) {
        const existing = map.get(idKey)
        map.set(idKey, {
          ...existing,
          count: (existing.count || 1) + qty,
          obtainedAt: now + idx,
        })
      } else {
        map.set(idKey, {
          ...card,
          count: qty,
          obtainedAt: now + idx,
        })
      }
    })
    return Array.from(map.values())
  }

  const removeCardsFromUserCollection = (collection = [], cardsToRemove = []) => {
    const removeMap = {}
    cardsToRemove.forEach((entry) => {
      const idKey = String(entry.id || entry.card?.id)
      const qty = Math.max(1, Number(entry.qty || 1))
      removeMap[idKey] = (removeMap[idKey] || 0) + qty
    })

    // Vérifier que l'utilisateur possède bien tous les exemplaires demandés
    for (const [idKey, neededQty] of Object.entries(removeMap)) {
      const found = collection.find((c) => String(c.id) === idKey)
      if (!found || (found.count || 1) < neededQty) {
        return { ok: false, collection }
      }
    }

    const nextCollection = collection
      .map((item) => {
        const toRem = removeMap[String(item.id)] || 0
        if (toRem <= 0) return item
        return {
          ...item,
          count: Math.max(0, (item.count || 1) - toRem),
        }
      })
      .filter((item) => (item.count || 0) > 0)

    return { ok: true, collection: nextCollection }
  }

  const readJsonBody = (req) =>
    new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (err) {
          reject(err)
        }
      })
      req.on('error', reject)
    })

export async function handleApiRequest(req, res) {
  if (
    !req.url ||
    (!req.url.startsWith('/api/users') &&
      !req.url.startsWith('/api/trades') &&
      !req.url.startsWith('/api/market'))
  ) {
    return false;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

        try {
          const urlObj = new URL(req.url, 'http://localhost')
          const pathname = urlObj.pathname

          // ===================================================================
          // 1. UTILISATEURS (/api/users)
          // ===================================================================
          if (req.method === 'GET' && pathname === '/api/users') {
            ensureDir()
            const files = fs
              .readdirSync(usersDir)
              .filter((f) => f.endsWith('.json'))
            const users = []
            for (const file of files) {
              try {
                const raw = fs.readFileSync(path.join(usersDir, file), 'utf-8')
                const parsed = JSON.parse(raw)
                const col = Array.isArray(parsed.collection)
                  ? parsed.collection
                  : []
                const showcaseIds = Array.isArray(parsed.profile?.showcaseIds)
                  ? parsed.profile.showcaseIds
                  : []
                const showcaseCards = showcaseIds
                  .map((id) =>
                    id ? col.find((c) => String(c.id) === String(id)) || null : null
                  )
                  .filter(Boolean)

                users.push({
                  code: parsed.code,
                  username: parsed.profile?.username || 'Wikipédien',
                  avatar:
                    parsed.profile?.avatar ||
                    'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
                  bio: parsed.profile?.bio || '',
                  showcaseIds,
                  showcaseCards,
                  uniqueCardsCount: col.length,
                  totalCardsCount: col.reduce(
                    (s, c) => s + (c.count || 1),
                    0
                  ),
                  legendaryCount: col.filter((c) => c.rarity === 'L').length,
                  wikithunes:
                    typeof parsed.wikithunes === 'number'
                      ? parsed.wikithunes
                      : 0,
                  updatedAt: parsed.updatedAt || 0,
                })
              } catch {
                // ignore malformed file
              }
            }
            users.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, users }))
            return
          }

          const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/)
          if (userMatch) {
            const code = decodeURIComponent(userMatch[1])
            const filePath = getUserFilePath(code)
            if (!filePath) {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'Code invalide' }))
              return
            }

            if (req.method === 'GET') {
              if (!fs.existsSync(filePath)) {
                res.statusCode = 404
                res.end(
                  JSON.stringify({ ok: false, error: 'Utilisateur introuvable' })
                )
                return
              }
              const raw = fs.readFileSync(filePath, 'utf-8')
              res.statusCode = 200
              res.end(JSON.stringify({ ok: true, user: JSON.parse(raw) }))
              return
            }

            if (req.method === 'POST' || req.method === 'PUT') {
              const body = await readJsonBody(req)
              const cleanCode = sanitizeCode(code)
              const fileExists = fs.existsSync(filePath)
              let existing = {}
              if (fileExists) {
                try {
                  existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                } catch {
                  existing = {}
                }
              }

              // Protection anti-écrasement : si un appareil obsolète (ex: PC resté ouvert)
              // tente d'envoyer une sauvegarde moins avancée que celle déjà sur le serveur (ex: jouée sur téléphone)
              if (fileExists && existing.code && !body.forceOverwrite) {
                const existingDraws = Number(existing.stats?.totalCardsDrawn || 0)
                const existingBoosters = Number(existing.stats?.boostersOpened || 0)
                const incomingDraws = Number(body.stats?.totalCardsDrawn || 0)
                const incomingBoosters = Number(body.stats?.boostersOpened || 0)
                const existingColLen = Array.isArray(existing.collection) ? existing.collection.length : 0
                const incomingColLen = Array.isArray(body.collection) ? body.collection.length : 0
                const existingTotalCopies = Array.isArray(existing.collection)
                  ? existing.collection.reduce((s, c) => s + (c.count || 1), 0)
                  : 0
                const incomingTotalCopies = Array.isArray(body.collection)
                  ? body.collection.reduce((s, c) => s + (c.count || 1), 0)
                  : 0
                const existingUpdatedAt = Number(existing.updatedAt || 0)
                const incomingUpdatedAt = Number(
                  body.clientUpdatedAt || body.updatedAt || 0
                )

                const isIncomingBehindInProgress =
                  incomingColLen < existingColLen ||
                  incomingTotalCopies < existingTotalCopies ||
                  incomingDraws < existingDraws ||
                  incomingBoosters < existingBoosters

                const isIncomingEqualProgressButOlderTimestamp =
                  incomingColLen === existingColLen &&
                  incomingTotalCopies === existingTotalCopies &&
                  incomingDraws === existingDraws &&
                  incomingBoosters === existingBoosters &&
                  incomingUpdatedAt > 0 &&
                  existingUpdatedAt > incomingUpdatedAt

                if (
                  isIncomingBehindInProgress ||
                  isIncomingEqualProgressButOlderTimestamp
                ) {
                  res.statusCode = 200
                  res.end(
                    JSON.stringify({
                      ok: true,
                      user: existing,
                      serverIsNewer: true,
                    })
                  )
                  return
                }
              }

              const now = Date.now()
              const clientTimestamp = Number(
                body.clientUpdatedAt || body.updatedAt || 0
              )
              const { clientUpdatedAt: _omitClientTs, forceOverwrite: _omitForce, ...cleanBody } = body

              const existingClaimDate = String(existing.lastDailyClaimDate || '')
              const incomingClaimDate = String(cleanBody.lastDailyClaimDate || '')
              const resolvedClaimDate =
                incomingClaimDate > existingClaimDate
                  ? incomingClaimDate
                  : existingClaimDate

              const merged = {
                ...existing,
                ...cleanBody,
                code: cleanCode,
                lastDailyClaimDate: resolvedClaimDate,
                createdAt: existing.createdAt || cleanBody.createdAt || now,
                updatedAt: existing.updatedAt || clientTimestamp || now,
              }

              const prevComparable = JSON.stringify({
                ...existing,
                updatedAt: 0,
              })
              const nextComparable = JSON.stringify({
                ...merged,
                updatedAt: 0,
              })

              if (prevComparable !== nextComparable || !fileExists) {
                merged.updatedAt = fileExists
                  ? Math.max(now, clientTimestamp)
                  : clientTimestamp || now
                fs.writeFileSync(
                  filePath,
                  JSON.stringify(merged, null, 2),
                  'utf-8'
                )
              }
              res.statusCode = 200
              res.end(
                JSON.stringify({
                  ok: true,
                  user: merged,
                  serverIsNewer: false,
                })
              )
              return
            }
          }

          // ===================================================================
          // 2. ÉCHANGES ENTRE JOUEURS (/api/trades)
          // ===================================================================
          if (req.method === 'GET' && pathname === '/api/trades') {
            const filterCode = sanitizeCode(urlObj.searchParams.get('code') || '')
            const allTrades = loadJsonArrayFile(tradesFile)
            const filtered = filterCode
              ? allTrades.filter(
                  (t) =>
                    t.fromCode === filterCode || t.toCode === filterCode
                )
              : allTrades
            filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, trades: filtered }))
            return
          }

          if (req.method === 'POST' && pathname === '/api/trades') {
            const body = await readJsonBody(req)
            const fromCode = sanitizeCode(body.fromCode)
            const toCode = sanitizeCode(body.toCode)
            if (!fromCode || !toCode || fromCode === toCode) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Codes utilisateurs invalides pour cet échange.',
                })
              )
              return
            }

            const fromUser = loadUserFile(fromCode)
            const toUser = loadUserFile(toCode)
            if (!fromUser || !toUser) {
              res.statusCode = 404
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Un des deux profils est introuvable.',
                })
              )
              return
            }

            const offeredCards = Array.isArray(body.offeredCards)
              ? body.offeredCards
              : []
            const requestedCards = Array.isArray(body.requestedCards)
              ? body.requestedCards
              : []

            if (offeredCards.length === 0 && requestedCards.length === 0) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Sélectionnez au moins une carte pour créer une offre.',
                })
              )
              return
            }

            const allTrades = loadJsonArrayFile(tradesFile)
            const newTrade = {
              id: `TRD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              fromCode,
              fromUsername: fromUser.profile?.username || fromCode,
              fromAvatar:
                fromUser.profile?.avatar ||
                'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
              toCode,
              toUsername: toUser.profile?.username || toCode,
              toAvatar:
                toUser.profile?.avatar ||
                'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
              offeredCards,
              requestedCards,
              status: 'pending', // 'pending' | 'accepted' | 'declined' | 'cancelled'
              createdAt: Date.now(),
            }

            allTrades.unshift(newTrade)
            saveJsonArrayFile(tradesFile, allTrades)
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, trade: newTrade }))
            return
          }

          const tradeActionMatch = pathname.match(
            /^\/api\/trades\/([^/]+)\/(accept|decline|cancel)$/
          )
          if (req.method === 'POST' && tradeActionMatch) {
            const tradeId = decodeURIComponent(tradeActionMatch[1])
            const action = tradeActionMatch[2]
            const allTrades = loadJsonArrayFile(tradesFile)
            const idx = allTrades.findIndex((t) => t.id === tradeId)
            if (idx === -1) {
              res.statusCode = 404
              res.end(
                JSON.stringify({ ok: false, error: 'Offre introuvable.' })
              )
              return
            }

            const trade = allTrades[idx]
            if (trade.status !== 'pending') {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Cette offre a déjà été traitée.',
                })
              )
              return
            }

            if (action === 'decline' || action === 'cancel') {
              trade.status = action === 'decline' ? 'declined' : 'cancelled'
              trade.resolvedAt = Date.now()
              saveJsonArrayFile(tradesFile, allTrades)
              res.statusCode = 200
              res.end(JSON.stringify({ ok: true, trade }))
              return
            }

            // Action === 'accept' : transfert atomique des cartes entre fromUser et toUser
            const fromUser = loadUserFile(trade.fromCode)
            const toUser = loadUserFile(trade.toCode)
            if (!fromUser || !toUser) {
              res.statusCode = 404
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Un des joueurs est introuvable.',
                })
              )
              return
            }

            const remFrom = removeCardsFromUserCollection(
              fromUser.collection || [],
              trade.offeredCards || []
            )
            if (!remFrom.ok) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: `${trade.fromUsername} ne possède plus toutes les cartes proposées.`,
                })
              )
              return
            }

            const remTo = removeCardsFromUserCollection(
              toUser.collection || [],
              trade.requestedCards || []
            )
            if (!remTo.ok) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    'Vous ne possédez plus toutes les cartes demandées dans cet échange.',
                })
              )
              return
            }

            const nextFromCol = addCardsToUserCollection(
              remFrom.collection,
              trade.requestedCards || []
            )
            const nextToCol = addCardsToUserCollection(
              remTo.collection,
              trade.offeredCards || []
            )

            const updatedFrom = saveUserFile(trade.fromCode, {
              ...fromUser,
              collection: nextFromCol,
            })
            const updatedTo = saveUserFile(trade.toCode, {
              ...toUser,
              collection: nextToCol,
            })

            trade.status = 'accepted'
            trade.resolvedAt = Date.now()
            saveJsonArrayFile(tradesFile, allTrades)

            res.statusCode = 200
            res.end(
              JSON.stringify({
                ok: true,
                trade,
                updatedFrom,
                updatedTo,
              })
            )
            return
          }

          // ===================================================================
          // 3. MARCHÉ AUX ENCHÈRES & VENTES DIRECTES (/api/market)
          // ===================================================================
          // Clôture automatiquement les enchères dont le délai de 24h est écoulé
          const resolveExpiredMarketAuctions = (listings) => {
            const now = Date.now()
            let changed = false
            for (const listing of listings) {
              if (
                listing.status === 'active' &&
                listing.highestBidderCode &&
                listing.bidExpiresAt &&
                now >= listing.bidExpiresAt
              ) {
                const seller = loadUserFile(listing.sellerCode)
                const winner = loadUserFile(listing.highestBidderCode)

                if (seller) {
                  saveUserFile(listing.sellerCode, {
                    ...seller,
                    wikithunes: (seller.wikithunes || 0) + listing.currentBid,
                  })
                }

                if (winner) {
                  const nextCol = addCardsToUserCollection(
                    winner.collection || [],
                    [{ card: listing.card, qty: 1 }]
                  )
                  saveUserFile(listing.highestBidderCode, {
                    ...winner,
                    collection: nextCol,
                  })
                }

                listing.status = 'sold'
                listing.buyerCode = listing.highestBidderCode
                listing.buyerUsername = listing.highestBidderUsername
                listing.finalPrice = listing.currentBid
                listing.resolvedAt = listing.bidExpiresAt
                changed = true
              }
            }
            if (changed) {
              saveJsonArrayFile(marketFile, listings)
            }
            return listings
          }

          if (req.method === 'GET' && pathname === '/api/market') {
            let listings = loadJsonArrayFile(marketFile)
            listings = resolveExpiredMarketAuctions(listings)
            listings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, listings }))
            return
          }

          // Créer une annonce (vente directe / enchère avec achat immédiat)
          if (req.method === 'POST' && pathname === '/api/market') {
            const body = await readJsonBody(req)
            const sellerCode = sanitizeCode(body.sellerCode)
            const cardId = String(body.cardId || '')
            const buyoutPrice = Math.max(10, Math.round(Number(body.buyoutPrice || 100)))
            const startingBid = Math.max(
              5,
              Math.min(
                buyoutPrice,
                Math.round(Number(body.startingBid || Math.floor(buyoutPrice * 0.6)))
              )
            )

            const seller = loadUserFile(sellerCode)
            if (!seller) {
              res.statusCode = 404
              res.end(
                JSON.stringify({ ok: false, error: 'Vendeur introuvable.' })
              )
              return
            }

            const cardObj = (seller.collection || []).find(
              (c) => String(c.id) === cardId
            )
            if (!cardObj) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Carte introuvable dans votre classeur.',
                })
              )
              return
            }

            // Retirer 1 exemplaire du classeur du vendeur pour le mettre en vente
            const rem = removeCardsFromUserCollection(seller.collection || [], [
              { id: cardId, qty: 1 },
            ])
            if (!rem.ok) {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Exemplaire indisponible.',
                })
              )
              return
            }

            const updatedSeller = saveUserFile(sellerCode, {
              ...seller,
              collection: rem.collection,
            })

            const listings = loadJsonArrayFile(marketFile)
            const newListing = {
              id: `MKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              sellerCode,
              sellerUsername: seller.profile?.username || sellerCode,
              sellerAvatar:
                seller.profile?.avatar ||
                'https://fr.wikipedia.org/static/images/icons/wikipedia.png',
              card: { ...cardObj, count: 1 },
              startingBid,
              currentBid: startingBid,
              highestBidderCode: null,
              highestBidderUsername: null,
              bidExpiresAt: null, // Compte à rebours de 24h qui démarre dès la 1ère enchère
              buyoutPrice,
              status: 'active', // 'active' | 'sold' | 'cancelled'
              createdAt: Date.now(),
            }

            listings.unshift(newListing)
            saveJsonArrayFile(marketFile, listings)

            res.statusCode = 200
            res.end(
              JSON.stringify({
                ok: true,
                listing: newListing,
                updatedUser: updatedSeller,
              })
            )
            return
          }

          // Actions sur une annonce : /api/market/:id/(buy|bid|cancel|claim)
          const marketActionMatch = pathname.match(
            /^\/api\/market\/([^/]+)\/(buy|bid|cancel|accept_bid)$/
          )
          if (req.method === 'POST' && marketActionMatch) {
            const listingId = decodeURIComponent(marketActionMatch[1])
            const action = marketActionMatch[2]
            const body = await readJsonBody(req)
            const actorCode = sanitizeCode(body.userCode)

            let listings = loadJsonArrayFile(marketFile)
            listings = resolveExpiredMarketAuctions(listings)
            const idx = listings.findIndex((l) => l.id === listingId)
            if (idx === -1) {
              res.statusCode = 404
              res.end(
                JSON.stringify({ ok: false, error: 'Annonce introuvable.' })
              )
              return
            }

            const listing = listings[idx]
            if (listing.status !== 'active') {
              res.statusCode = 400
              res.end(
                JSON.stringify({
                  ok: false,
                  error: 'Cette vente est déjà terminée.',
                })
              )
              return
            }

            // Annuler son annonce (seulement s'il n'y a pas encore d'enchérisseur ou remboursement)
            if (action === 'cancel') {
              if (listing.sellerCode !== actorCode) {
                res.statusCode = 403
                res.end(
                  JSON.stringify({ ok: false, error: 'Action non autorisée.' })
                )
                return
              }

              // Si quelqu'un avait enchéri, on lui rembourse sa mise
              if (listing.highestBidderCode) {
                const prevBidder = loadUserFile(listing.highestBidderCode)
                if (prevBidder) {
                  saveUserFile(listing.highestBidderCode, {
                    ...prevBidder,
                    wikithunes:
                      (prevBidder.wikithunes || 0) + (listing.currentBid || 0),
                  })
                }
              }

              const seller = loadUserFile(listing.sellerCode)
              let updatedSeller = null
              if (seller) {
                const nextCol = addCardsToUserCollection(
                  seller.collection || [],
                  [{ card: listing.card, qty: 1 }]
                )
                updatedSeller = saveUserFile(listing.sellerCode, {
                  ...seller,
                  collection: nextCol,
                })
              }

              listing.status = 'cancelled'
              listing.resolvedAt = Date.now()
              saveJsonArrayFile(marketFile, listings)

              res.statusCode = 200
              res.end(
                JSON.stringify({
                  ok: true,
                  listing,
                  updatedUser: updatedSeller,
                })
              )
              return
            }

            // Accepter l'enchère actuelle par le vendeur
            if (action === 'accept_bid') {
              if (
                listing.sellerCode !== actorCode ||
                !listing.highestBidderCode
              ) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Aucune enchère active à accepter.',
                  })
                )
                return
              }

              const seller = loadUserFile(listing.sellerCode)
              const winner = loadUserFile(listing.highestBidderCode)
              if (!seller || !winner) {
                res.statusCode = 404
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Profil acheteur ou vendeur introuvable.',
                  })
                )
                return
              }

              const updatedSeller = saveUserFile(listing.sellerCode, {
                ...seller,
                wikithunes: (seller.wikithunes || 0) + listing.currentBid,
              })

              const nextWinnerCol = addCardsToUserCollection(
                winner.collection || [],
                [{ card: listing.card, qty: 1 }]
              )
              saveUserFile(listing.highestBidderCode, {
                ...winner,
                collection: nextWinnerCol,
              })

              listing.status = 'sold'
              listing.buyerCode = listing.highestBidderCode
              listing.buyerUsername = listing.highestBidderUsername
              listing.finalPrice = listing.currentBid
              listing.resolvedAt = Date.now()
              saveJsonArrayFile(marketFile, listings)

              res.statusCode = 200
              res.end(
                JSON.stringify({
                  ok: true,
                  listing,
                  updatedUser: updatedSeller,
                })
              )
              return
            }

            // Placer une enchère (action === 'bid')
            if (action === 'bid') {
              if (listing.sellerCode === actorCode) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Vous ne pouvez pas enchérir sur votre propre carte.',
                  })
                )
                return
              }

              const bidAmount = Math.round(Number(body.bidAmount || 0))
              const minRequired = listing.highestBidderCode
                ? listing.currentBid + 10
                : listing.startingBid

              if (bidAmount < minRequired) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: `L'enchère minimale est de ${minRequired} ₩.`,
                  })
                )
                return
              }

              const bidder = loadUserFile(actorCode)
              if (!bidder) {
                res.statusCode = 404
                res.end(
                  JSON.stringify({ ok: false, error: 'Profil introuvable.' })
                )
                return
              }

              // Si c'est le même joueur qui surenchérit, il ne paie que la différence
              const alreadyLocked =
                listing.highestBidderCode === actorCode ? listing.currentBid : 0
              const toPayNow = bidAmount - alreadyLocked

              if ((bidder.wikithunes || 0) < toPayNow) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Solde de Wikithunes insuffisant.',
                  })
                )
                return
              }

              // Rembourser l'ancien enchérisseur s'il est différent
              if (
                listing.highestBidderCode &&
                listing.highestBidderCode !== actorCode
              ) {
                const prevBidder = loadUserFile(listing.highestBidderCode)
                if (prevBidder) {
                  saveUserFile(listing.highestBidderCode, {
                    ...prevBidder,
                    wikithunes:
                      (prevBidder.wikithunes || 0) + listing.currentBid,
                  })
                }
              }

              const updatedBidder = saveUserFile(actorCode, {
                ...bidder,
                wikithunes: (bidder.wikithunes || 0) - toPayNow,
              })

              listing.currentBid = bidAmount
              listing.highestBidderCode = actorCode
              listing.highestBidderUsername =
                bidder.profile?.username || actorCode
              // Lance le compte à rebours de 24h dès qu'une enchère est posée
              listing.bidExpiresAt = Date.now() + 24 * 60 * 60 * 1000
              listing.lastBidAt = Date.now()

              // Si l'enchère atteint ou dépasse le prix d'achat immédiat, la vente est conclue !
              if (bidAmount >= listing.buyoutPrice) {
                const seller = loadUserFile(listing.sellerCode)
                if (seller) {
                  saveUserFile(listing.sellerCode, {
                    ...seller,
                    wikithunes: (seller.wikithunes || 0) + bidAmount,
                  })
                }
                const nextBidderCol = addCardsToUserCollection(
                  updatedBidder.collection || [],
                  [{ card: listing.card, qty: 1 }]
                )
                const finalBidder = saveUserFile(actorCode, {
                  ...updatedBidder,
                  collection: nextBidderCol,
                })
                listing.status = 'sold'
                listing.buyerCode = actorCode
                listing.buyerUsername = bidder.profile?.username || actorCode
                listing.finalPrice = bidAmount
                listing.resolvedAt = Date.now()
                saveJsonArrayFile(marketFile, listings)
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    ok: true,
                    listing,
                    updatedUser: finalBidder,
                  })
                )
                return
              }

              saveJsonArrayFile(marketFile, listings)
              res.statusCode = 200
              res.end(
                JSON.stringify({
                  ok: true,
                  listing,
                  updatedUser: updatedBidder,
                })
              )
              return
            }

            // Achat immédiat (action === 'buy')
            if (action === 'buy') {
              if (listing.sellerCode === actorCode) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Vous ne pouvez pas acheter votre propre carte.',
                  })
                )
                return
              }

              const buyer = loadUserFile(actorCode)
              if (!buyer) {
                res.statusCode = 404
                res.end(
                  JSON.stringify({ ok: false, error: 'Acheteur introuvable.' })
                )
                return
              }

              const alreadyLocked =
                listing.highestBidderCode === actorCode ? listing.currentBid : 0
              const priceToPay = listing.buyoutPrice - alreadyLocked

              if ((buyer.wikithunes || 0) < priceToPay) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: 'Solde de Wikithunes insuffisant.',
                  })
                )
                return
              }

              // Rembourser l'ancien enchérisseur s'il est différent
              if (
                listing.highestBidderCode &&
                listing.highestBidderCode !== actorCode
              ) {
                const prevBidder = loadUserFile(listing.highestBidderCode)
                if (prevBidder) {
                  saveUserFile(listing.highestBidderCode, {
                    ...prevBidder,
                    wikithunes:
                      (prevBidder.wikithunes || 0) + listing.currentBid,
                  })
                }
              }

              const seller = loadUserFile(listing.sellerCode)
              if (seller) {
                saveUserFile(listing.sellerCode, {
                  ...seller,
                  wikithunes: (seller.wikithunes || 0) + listing.buyoutPrice,
                })
              }

              const nextBuyerCol = addCardsToUserCollection(
                buyer.collection || [],
                [{ card: listing.card, qty: 1 }]
              )
              const updatedBuyer = saveUserFile(actorCode, {
                ...buyer,
                wikithunes: (buyer.wikithunes || 0) - priceToPay,
                collection: nextBuyerCol,
              })

              listing.status = 'sold'
              listing.buyerCode = actorCode
              listing.buyerUsername = buyer.profile?.username || actorCode
              listing.finalPrice = listing.buyoutPrice
              listing.resolvedAt = Date.now()
              saveJsonArrayFile(marketFile, listings)

              res.statusCode = 200
              res.end(
                JSON.stringify({
                  ok: true,
                  listing,
                  updatedUser: updatedBuyer,
                })
              )
              return
            }
          }

          res.statusCode = 404
          res.end(JSON.stringify({ ok: false, error: 'Route inconnue' }))
        } catch (err) {
          res.statusCode = 500
          res.end(
            JSON.stringify({
              ok: false,
              error: err?.message || 'Erreur serveur',
            })
          )
        }

  return true;
}
