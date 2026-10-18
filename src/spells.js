// The six auto-reply themes ("spells"). The feature leads; the spell is flavour.
// patronus: the silhouette its Patronus takes (sampled for particles, never shown).
// Edge cases from the CRM-11128 spec: when each one goes to a human instead.
export const SPELLS = [
  {
    code: 'T1', patronus: '🦌', theme: 'Remittance acknowledgement', short: 'Remittance', spell: 'Mischief Managed', color: '#ffd27a',
    ask: '“We paid INV-000160 yesterday.”', sends: 'A thank-you, no attachment', chip: null,
    human: 'They ask “did you receive it?”, or mention a short-pay or refund',
  },
  {
    code: 'T2', patronus: '🐕', theme: 'Invoice copy', short: 'Invoice copy', spell: 'Accio Invoice', color: '#7fd6ff',
    ask: '“Can you resend INV-000201?”', sends: 'The invoice PDFs', chip: 'INV-000201.pdf',
    human: 'No invoice number, “all my invoices”, or a POD / BOL',
  },
  {
    code: 'T3', patronus: '🐇', theme: 'Statement of account', short: 'Statement', spell: 'Revelio', color: '#c49bff',
    ask: '“Please send our statement of account.”', sends: 'A freshly generated SOA', chip: 'Statement.pdf',
    human: 'A date range, “in Excel”, or “only past-due”',
  },
  {
    code: 'T4', patronus: '🦅', theme: 'Payment instructions', short: 'Payment instructions', spell: 'Gringotts Directions', color: '#5fe0a8',
    ask: '“How do we pay you?”', sends: 'The payment-instructions file', chip: 'Payment-instructions.pdf',
    human: 'Verify or confirm bank details (always), or an unconfigured currency',
  },
  {
    code: 'T5', patronus: '🐈', theme: 'Stored documents', short: 'Documents', spell: 'Room of Requirement', color: '#ff9f6b',
    ask: '“Could you share your W-9?”', sends: 'The stored document', chip: 'W-9.pdf',
    human: 'A custom or filled-in form, or a type that isn’t configured',
  },
  {
    code: 'T6', patronus: '🦦', theme: 'FAQ', short: 'FAQ', spell: 'Ask Hermione', color: '#ff86c8',
    ask: '“What are your payment terms?”', sends: 'The configured FAQ answer', chip: null,
    human: 'No confident match, or the answer says “contact your account manager”',
  },
]
