// A local stand-in for the real pipeline (neural-hub classifier +
// AutoReplyDecisionResolver). Same precedence, same outcome names, runs offline
// so the live demo can never stall on stage.
//
// classify({ to, body }, doors) -> { house, status, hatSays, actions, reply, reason }
//   to:    'ar' (the AR mailbox) | 'collector' (a Growfin user's own address)
//   doors: { ar: bool, users: bool } from AI Controls

// Invoices that already have an open dispute (staging: INV-000160 had four).
const OPEN_DISPUTES = new Set(['INV-000160'])
// This customer's invoices run INV-000100…INV-000499; any other number isn't theirs.
const ours = (inv) => { const n = +inv.replace(/\D/g, ''); return n >= 100 && n < 500 }

let nextId = 18267

const RX = {
  noise: /\b(out of (the )?office|automatic reply|auto-?reply|on (annual )?leave|away from (my|the) desk|do not reply|undeliverable|delivery (status|failure)|mailer-daemon)\b/i,
  fraud: /\b(bank|account|routing|iban|swift|sort code|beneficiary|wire)\b[^.?!]*\b(details?|numbers?|chang|updat|verif|confirm|instructions?|new)\w*|\b(new|changed|updated|verify|confirm)\b[^.?!]*\b(bank|beneficiary|account details)\b/i,
  promise: /\b(will|shall|going to|plan(ning)? to|scheduled?|intend to|expect to|promise to|commit to)\b[^.?!]*\b(pay|payment|settle|clear|remit|transfer)\w*/i,
  dispute: /\b(disput\w*|disagree|incorrect|wrong(ly)?|overcharg\w*|higher than agreed|not (been )?received|damaged|discrepanc\w*|short[- ]?shipped|error in|billed twice|duplicate (charge|invoice))\b/i,
  remittance: /\b(we (have |'ve )?paid|has been paid|have paid|paid (in full|today|yesterday)|payment (has been |was )?(made|released|sent|processed|initiated)|remitted|remittance|utr|neft|ach|wire ref\w*|transaction (id|ref\w*))\b/i,
  invoiceCopy: /\b(copy|copies|resend|re-send|send( us| me)?|share)\b[^.?!]*\b(invoices?|INV-?\d{3,})\b|\binvoice cop(y|ies)\b/i,
  statement: /\b(statement of account|soa|account statement|statement)\b/i,
  payHow: /\b(how|where) (can|do|should) (we|i) (make )?(the )?pay|\bpayment (instructions|methods|options)\b|\bremit[- ]to\b/i,
  // T5 stored documents and T6 FAQ
  document: /\b(w-?9|w-?8|coi|certificate of insurance|msa|master services agreement|tax (form|certificate)|vendor form|nda)\b/i,
  faq: /\b(payment terms|net ?\d{2}|early[- ]payment discount|late (fee|fees|payment fee)|credit limit|accept (credit )?cards?|which currenc(y|ies)|tax id|vat (number|id))\b/i,
  // each theme's "send it to a human instead" edges (CRM-11128 spec)
  askedReceipt: /\b(did you (receive|get)|have you received|can you confirm (receipt|you received)|was it received)\b/i,
  shortPay: /\b(short[- ]?pa(y|id)|partial(ly)? paid|refund|overpa(id|y)|deduct(ed|ion))\b/i,
  vagueInvoices: /\b(all (my |our |the )?invoices|every invoice|open invoices)\b/i,
  shippingDoc: /\b(pod|bol|proof of delivery|bill of lading)\b/i,
  soaFilter: /\b(from \w+ (to|until) \w+|between \w+ and \w+|in excel|as (a )?(csv|xlsx|spreadsheet)|only (the )?(past[- ]?due|overdue|open))\b/i,
  customForm: /\b(fill(ed)?[- ]?(in|out)|complete (our|the|this) form|sign (our|the|this))\b/i,
}

const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DATE = new RegExp(`\\b(\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})(?:\\s+\\d{4})?|(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|tomorrow|next week|end of (?:the )?month|(?:this|next) (?:monday|tuesday|wednesday|thursday|friday))\\b`, 'i')
const AMOUNT = /(?:\b(INR|USD|EUR|GBP|AUD|CAD)\s?|([$€£₹])\s?)([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?(INR|USD|EUR|GBP|AUD|CAD)\b/i
const INVOICE = /\bINV-?\d{3,}\b/gi

const sentences = (s) => s.split(/(?<=[.?!])\s+|\n+/).map((x) => x.trim()).filter(Boolean)
const invoicesIn = (s) => [...new Set((s.match(INVOICE) || []).map((i) => i.toUpperCase().replace(/^INV(\d)/, 'INV-$1')))]
const amountIn = (s) => {
  const m = s.match(AMOUNT)
  if (!m) return null
  return m[3] ? `${m[1] || m[2]} ${m[3]}`.trim() : `${m[5]} ${m[4]}`
}
const dateIn = (s) => s.match(DATE)?.[0] ?? null

export function classify({ to, body }, doors) {
  const text = body.trim()
  const toLabel = to === 'ar' ? 'AR mailbox' : 'Growfin users'

  // 1. who may act. The email source (AI Controls) gates ACTIONS only, matched on
  //    To or CC. A reply never depends on it: it only needs the AR mailbox in To.
  const replyTrack = to === 'ar'
  const actionsTrack = to === 'ar' ? doors.ar : doors.users
  if (!replyTrack && !actionsTrack) {
    return result('slytherin', 'DROPPED_INELIGIBLE', 'That door is shut tonight… SLYTHERIN!',
      { voice: 'slytherin-door', reason: `no track qualifies: actions source excludes ${toLabel}, and no AR mailbox in To to reply from` })
  }

  // 2. the guard: noise never reaches the Hat
  if (RX.noise.test(text)) {
    return result('slytherin', 'DROPPED_HEADER', 'An echo, not a person… SLYTHERIN!',
      { voice: 'slytherin-autoreply', reason: 'automated reply (auto-submitted); not a customer message' })
  }
  if (text.length < 12) {
    return result('ravenclaw', 'ABSTAINED_LOW_CONFIDENCE', 'Hmm… there is barely anything here. RAVENCLAW.',
      { voice: 'ravenclaw-empty', reason: 'no clear intent' })
  }

  // 3. fraud guard beats everything that could act or reply
  if (RX.fraud.test(text)) {
    return result('ravenclaw', 'ABSTAINED_FRAUD_RISK', 'Bank details? That smells of Polyjuice… RAVENCLAW. Fetch a human.',
      { voice: 'ravenclaw-fraud', reason: 'requires human verification due to fraud risk' })
  }

  // 4. actions: a PTP per promise, a dispute per disputed invoice
  const actions = []
  for (const s of actionsTrack ? sentences(text) : []) {
    if (RX.promise.test(s)) {
      const invs = invoicesIn(s)
      const amount = amountIn(s)
      const date = dateIn(s)
      if (invs.length === 0) actions.push({ type: 'PROMISE_TO_PAY', scope: 'account', amount, date, id: nextId++ })
      for (const inv of invs) actions.push({ type: 'PROMISE_TO_PAY', scope: inv, amount: amount ?? 'full balance', date, id: nextId++ })
    } else if (RX.dispute.test(s)) {
      for (const inv of invoicesIn(s)) {
        if (OPEN_DISPUTES.has(inv)) actions.push({ type: 'DISPUTE', scope: inv, skipped: 'invoice already has an open dispute' })
        else {
          OPEN_DISPUTES.add(inv)
          actions.push({ type: 'DISPUTE', scope: inv, id: nextId++, note: s })
        }
      }
    }
  }
  const created = actions.filter((a) => !a.skipped)
  const wouldAct = !actionsTrack && sentences(text).some((x) => RX.promise.test(x) || (RX.dispute.test(x) && invoicesIn(x).length))

  // 5. reply themes (only the AR mailbox can answer)
  const themes = []
  const remit = RX.remittance.test(text) && !RX.promise.test(text)
  if (remit) themes.push('Remittance acknowledgement')
  if (RX.invoiceCopy.test(text) || RX.vagueInvoices.test(text)) themes.push('Invoice copy')
  if (RX.statement.test(text)) themes.push('Statement of account')
  if (RX.payHow.test(text)) themes.push('Payment instructions')
  if (RX.document.test(text)) themes.push('Stored document')
  if (RX.faq.test(text)) themes.push('FAQ')

  // 6. all or nothing: one theme that must go to a human holds the whole reply
  const human = []
  if (remit && RX.askedReceipt.test(text)) human.push('T1: they ask whether the payment arrived')
  if (remit && RX.shortPay.test(text)) human.push('T1: short-pay / refund language')
  if (themes.includes('Invoice copy') && RX.vagueInvoices.test(text)) human.push('T2: no invoice number ("all invoices")')
  if (themes.includes('Invoice copy') && RX.shippingDoc.test(text)) human.push('T2: asks for a POD / BOL')
  if (themes.includes('Statement of account') && RX.soaFilter.test(text)) human.push('T3: date range, format or filter requested')
  if (themes.includes('Stored document') && RX.customForm.test(text)) human.push('T5: a custom or filled-in form')
  const foreign = themes.includes('Invoice copy') ? invoicesIn(text).filter((i) => !ours(i)) : []

  const actionLog = actions.map((a) => a.skipped
    ? `${a.type} ${a.scope}: skipped, ${a.skipped}`
    : `${a.type}${a.scope === 'account' ? '' : ' ' + a.scope}: created ${a.id}`)

  if (themes.length && to === 'ar' && human.length) {
    return result('ravenclaw', 'ABSTAINED_AMBIGUOUS', 'There is more to this one than meets the Hat… RAVENCLAW.', {
      voice: 'ravenclaw-ambiguous', actions, reason: [`held for a human: ${human.join('; ')}`, ...actionLog].join(' | '),
    })
  }
  if (themes.length && to === 'ar' && foreign.length) {
    return result('ravenclaw', 'ABSTAINED_GROUNDING', "I can't send what isn't theirs… RAVENCLAW.", {
      voice: 'ravenclaw-grounding', actions, reason: [`grounding failed: ${foreign.join(', ')} not found for this customer`, ...actionLog].join(' | '),
    })
  }
  if (themes.length && to === 'ar') {
    return result('gryffindor', 'SENT', ...hatLine('gryffindor', themes, created), {
      actions, reply: replyFor(themes, text),
      reason: [`AI replied: ${themes.join(', ')}`, ...actionLog].join(' | '),
    })
  }
  if (created.length) {
    return result('hufflepuff', 'ACTIONED', ...hatLine('hufflepuff', themes, created), {
      actions, reason: ['AI created actions; no reply attempted', ...actionLog].join(' | '),
    })
  }
  if (actions.length) {
    return result('ravenclaw', 'ABSTAINED_ACTIONS_SKIPPED', 'This vault already has a key… RAVENCLAW.', {
      voice: 'ravenclaw-skipped', actions, reason: actionLog.join(' | '),
    })
  }
  if (wouldAct && !themes.length) {
    // The action creator never runs here (no track for actions), so the real
    // resolver falls through to LOW_CONFIDENCE, not ACTIONS_SKIPPED.
    const source = doors.users ? 'GROWFIN_USERS' : 'AR_EMAIL'
    return result('ravenclaw', 'ABSTAINED_LOW_CONFIDENCE', 'Difficult. Very difficult… a human should decide. RAVENCLAW.', {
      voice: 'ravenclaw-unsure',
      reason: `Model detected no auto-replyable theme | actions: no recipient matches AI actions sources ${source}`,
    })
  }
  if (themes.length) {
    return result('ravenclaw', 'ABSTAINED_NO_REPLY_IDENTITY', "I'd answer, but there's no Owlery to send it from… RAVENCLAW.", {
      voice: 'ravenclaw-no-mailbox', reason: `reply would help (${themes.join(', ')}), but the AR mailbox is not in To`,
    })
  }
  return result('ravenclaw', 'ABSTAINED_LOW_CONFIDENCE', 'Difficult. Very difficult… a human should decide. RAVENCLAW.', {
    voice: 'ravenclaw-unsure', reason: 'no confident intent',
  })
}

function result(house, status, hatSays, extra, more) {
  // hatLine() returns [line, clip]; spread into hatSays + a voice field
  if (more) return { house, status, hatSays, actions: [], reply: null, voice: extra, ...more }
  return { house, status, hatSays, actions: [], reply: null, ...extra }
}

// The Hat's line and the voice clip that speaks it (public/voice/<clip>.mp3).
function hatLine(house, themes, created) {
  if (house === 'gryffindor') {
    const first = themes[0]
    if (first === 'Remittance acknowledgement') return ['Paid, and polite about it… I shall answer myself. GRYFFINDOR!', 'gryffindor-remittance']
    if (first === 'Invoice copy') return ['A copy of an invoice? Easily fetched… GRYFFINDOR!', 'gryffindor-invoice']
    if (first === 'Statement of account') return ['The whole ledger, wanted… GRYFFINDOR!', 'gryffindor-statement']
    if (first === 'Payment instructions') return ['Where to pay? I know just the parchment… GRYFFINDOR!', 'gryffindor-payment']
    if (first === 'Stored document') return ['The very document, exactly as kept… GRYFFINDOR!', 'gryffindor-document']
    return ['A question already answered… GRYFFINDOR!', 'gryffindor-faq']
  }
  const ptps = created.filter((a) => a.type === 'PROMISE_TO_PAY').length
  const disputes = created.length - ptps
  if (ptps === 2 && !disputes) return ['Hmm… a promise to pay. Two of them… HUFFLEPUFF!', 'hufflepuff-two-promises']
  if (ptps && disputes) return ['A promise, and a grievance… HUFFLEPUFF!', 'hufflepuff-mixed']
  if (ptps) return ['Hmm… a promise to pay… HUFFLEPUFF!', 'hufflepuff-promise']
  return ['A grievance, plainly put… HUFFLEPUFF!', 'hufflepuff-dispute']
}

function replyFor(themes, text) {
  const invs = invoicesIn(text)
  const lines = []
  if (themes.includes('Remittance acknowledgement')) lines.push(`Thank you for confirming your payment${invs.length ? ` for ${invs.join(', ')}` : ''}. We'll apply it to your account.`)
  if (themes.includes('Invoice copy')) lines.push(`Please find attached ${invs.length ? invs.join(', ') : 'the requested invoices'}.`)
  if (themes.includes('Statement of account')) lines.push('Your current statement of account is attached.')
  if (themes.includes('Payment instructions')) lines.push('Our payment instructions are attached as a PDF.')
  if (themes.includes('Stored document')) lines.push('Please find the requested document attached.')
  if (themes.includes('FAQ')) lines.push('Our payment terms are Net 30 from the invoice date.')
  return lines.join(' ')
}

// Quick-fill letters for the live demo.
export const presets = [
  { label: 'Promise to pay', to: 'collector', body: 'Hi, we have scheduled a payment of INR 2,000 towards our overall account balance for 26 October 2026. Separately, we plan to settle invoice INV-000150 in full on 30 October 2026.' },
  { label: 'Remittance', to: 'ar', body: 'Payment released for INV-000160, reference NEFT-73918462.' },
  { label: 'Invoice copy', to: 'ar', body: 'Could you resend INV-000201? We can not find it in our system.' },
  { label: 'W-9', to: 'ar', body: 'Our vendor onboarding needs your W-9. Could you share it?' },
  { label: 'Payment terms', to: 'ar', body: 'Quick question: what are your payment terms?' },
  { label: 'Paid + terms', to: 'ar', body: 'We paid INV-000172 yesterday. Also, what are your payment terms going forward?' },
  { label: 'Dispute', to: 'ar', body: 'We are disputing INV-000160: the unit rate billed is higher than agreed.' },
  { label: 'Did you get it?', to: 'ar', body: 'We paid INV-000172 last week. Did you receive it?' },
  { label: 'SOA in Excel', to: 'ar', body: 'Please send our statement of account in Excel, only the past-due items.' },
  { label: 'Not our invoice', to: 'ar', body: 'Please send a copy of INV-009999.' },
  { label: 'Bank details', to: 'ar', body: 'Our saved bank details are no longer visible. Please send the current instructions for an international transfer, including the beneficiary name.' },
  { label: 'Out of office', to: 'ar', body: 'Automatic reply: I am out of the office until Monday with limited access to email.' },
]
