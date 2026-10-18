import { motion } from 'framer-motion'
import { Mail, DoorOpen, Filter, WandSparkles, Send, ListChecks, UserRound, Ban, Gauge, ToggleRight, Paperclip, Inbox, KeyRound, UserCheck, CopyCheck, Contact, Repeat, Bot, History, Clock, Check, Crown, Mails } from 'lucide-react'
import { hall as t, houses } from '../theme'
import { Scroll, Seal, Link, hand, ink } from './Scroll'

const ease = [0.22, 1, 0.36, 1]
const rise = (delay, y = 14) => ({ initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7, ease } })
const ROMAN = ['I', 'II', 'III', 'IV', 'V']

// Plain slides sit on an opaque night sky above the (already loaded) 3D hall.
function Plain({ eyebrow, title, sub, children, foot }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 5vw', gap: '5vh' }}>
      {/* the 3D moonlit sky shows through; a soft veil keeps the scrolls readable */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 80% at 50% 55%, rgba(5,7,14,0.55), rgba(5,7,14,0.25) 70%, rgba(5,7,14,0.45))' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <motion.div {...rise(0, 8)} style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: t.display, fontSize: 14, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: t.gold }}>
          <span style={{ width: 40, height: 1, background: t.gold }} />{eyebrow}
        </motion.div>
        <motion.h1 {...rise(0.08)} style={{ fontFamily: t.display, fontWeight: 600, fontSize: 'clamp(40px, 4.6vw, 76px)', lineHeight: 1.05, color: t.ink, margin: 0 }}>{title}</motion.h1>
        {sub && <motion.div {...rise(0.3, 8)} style={{ fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(19px, 1.6vw, 26px)', color: t.goldBright, opacity: 0.85 }}>{sub}</motion.div>}
      </div>
      <div style={{ position: 'relative' }}>{children}</div>
      {foot && <motion.div {...rise(2, 6)} style={{ position: 'relative', fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(18px, 1.5vw, 24px)', color: t.muted, maxWidth: '70ch' }}>{foot}</motion.div>}
    </div>
  )
}

// Card text on parchment.
const cardTitle = { fontFamily: t.display, fontWeight: 700, fontSize: 'clamp(17px, 1.45vw, 24px)', lineHeight: 1.15, color: t.parchmentInk }
const cardBody = { fontFamily: t.serif, fontSize: 'clamp(16px, 1.25vw, 21px)', lineHeight: 1.3, color: '#4a3820' }
const cardHand = { fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(15px, 1.15vw, 19px)', color: '#8a6410' }
const numeral = { fontFamily: t.display, fontSize: 13, fontWeight: 600, letterSpacing: '0.2em', color: t.parchmentMuted }

// ── slide 1: the pipeline ────────────────────────────────────────

const STEPS = [
  { Icon: Mail, title: 'Customer email', sub: 'Any inbound reply', note: 'The owl lands' },
  { Icon: DoorOpen, title: 'Source gate', sub: 'AR mailbox · Growfin users', note: 'Only known owls pass' },
  { Icon: Filter, title: 'Noise filter', sub: 'Auto-replies · loops · stale', note: 'Howlers & echoes cast out' },
  { Icon: WandSparkles, title: 'Classifier', sub: 'The Sorting Hat', note: 'Decides where it belongs' },
]

const OUTCOMES = [
  { house: 'gryffindor', Icon: Send, title: 'Reply' },
  { house: 'hufflepuff', Icon: ListChecks, title: 'Create PTP / dispute' },
  { house: 'ravenclaw', Icon: UserRound, title: 'Leave for a human' },
  { house: 'slytherin', Icon: Ban, title: 'Ignore' },
]

export function Pipeline() {
  return (
    <Plain eyebrow="How it works" title="From inbox to action" sub="Every owl that lands is checked, sifted, and sorted.">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STEPS.map(({ Icon, title, sub, note }, i) => (
          <div key={title} style={{ display: 'contents' }}>
            <Scroll delay={0.4 + i * 0.3} glow={i === 3 ? 'rgba(241,210,122,0.25)' : undefined} style={{ flex: '1 1 0', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Icon size={24} color="#8a6410" strokeWidth={1.5} />
                  <span style={numeral}>{ROMAN[i]}</span>
                </div>
                <div style={{ marginTop: 'auto', ...cardTitle }}>{title}</div>
                <div style={cardBody}>{sub}</div>
                <div style={cardHand}>{note}</div>
              </div>
            </Scroll>
            <Link delay={0.7 + i * 0.3} />
          </div>
        ))}
        <Scroll delay={1.7} style={{ flex: '1.55 1 0', minWidth: 0 }} pad="14px 22px">
          {OUTCOMES.map(({ house, Icon, title }, i) => (
            <motion.div key={house} {...rise(2.1 + i * 0.12, 6)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderTop: i ? `1px dashed ${t.parchmentMuted}66` : 'none' }}>
              <Seal color={houses[house].main === '#e0a915' ? '#b8860b' : houses[house].main} Icon={Icon} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ ...cardTitle, fontSize: 'clamp(16px, 1.3vw, 21px)' }}>{title}</span>
                <span style={{ fontFamily: t.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.24em', color: ink[house] }}>{houses[house].status}</span>
              </div>
            </motion.div>
          ))}
        </Scroll>
      </div>
    </Plain>
  )
}

// ── slide 2: what each outcome means ─────────────────────────────

const MEANING = [
  { house: 'gryffindor', Icon: Send, code: 'SENT', eg: 'Remittance thanks, invoice copy, statement' },
  { house: 'hufflepuff', Icon: ListChecks, code: 'ACTIONED', eg: '“We’ll pay INV-150 on 30 Oct”' },
  { house: 'ravenclaw', Icon: UserRound, code: 'ABSTAINED_*', eg: 'Fraud risk, low confidence, nothing to send' },
  { house: 'slytherin', Icon: Ban, code: 'DROPPED_*', eg: 'Auto-replies, loops, stale mail, closed gate' },
]

export function Houses() {
  return (
    <Plain eyebrow="The outcomes" title="Every email lands in one of four" sub="Four houses. One decision per email.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '2vw' }}>
        {MEANING.map(({ house, Icon, code, eg }, i) => {
          const h = houses[house]
          return (
            <Scroll key={house} delay={0.4 + i * 0.25}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, minHeight: 330 }}>
                <img src={h.crest} alt="" style={{ width: 'clamp(70px, 6vw, 104px)', height: 'auto', filter: 'drop-shadow(0 6px 10px rgba(60,40,10,0.35))' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: t.mono, fontSize: 14, fontWeight: 600, color: ink[house] }}>
                  <Icon size={16} strokeWidth={2} /> {code}
                </span>
                <div style={{ ...cardTitle, fontSize: 'clamp(19px, 1.6vw, 26px)' }}>{h.does}</div>
                <div style={{ ...cardHand, color: '#6b5232' }}>{eg}</div>
                <div style={{ marginTop: 'auto', fontFamily: t.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: t.parchmentMuted }}>{h.name}</div>
              </div>
            </Scroll>
          )
        })}
      </div>
    </Plain>
  )
}

// ── slide 3: all-or-nothing reply checks ─────────────────────────

const CHECKS = [
  { Icon: WandSparkles, check: 'Model recommends sending', fail: 'ABSTAINED' },
  { Icon: Gauge, check: 'Confidence ≥ 0.80', fail: 'ABSTAINED' },
  { Icon: ToggleRight, check: 'Theme switched on', fail: 'SHADOW' },
  { Icon: Paperclip, check: 'Attachment found', fail: 'ABSTAINED_GROUNDING' },
  { Icon: Inbox, check: 'AR mailbox in To', fail: 'ABSTAINED_NO_REPLY_IDENTITY' },
]

export function AllOrNothing() {
  return (
    <Plain eyebrow="Auto-reply" title="All checks pass, or nothing is sent" sub="Five trials. Fail one, and the Hat holds its tongue."
      foot="Every check, for every theme in the email. One miss and the email goes to a human. The Hat never replies halfway.">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {CHECKS.map(({ Icon, check, fail }, i) => (
          <div key={check} style={{ display: 'contents' }}>
            <Scroll delay={0.4 + i * 0.22} style={{ flex: '1 1 0', minWidth: 0 }} pad="18px 18px">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Icon size={22} color="#8a6410" strokeWidth={1.5} />
                  <span style={numeral}>{ROMAN[i]}</span>
                </div>
                <div style={{ ...cardTitle, fontSize: 'clamp(15px, 1.25vw, 20px)' }}>{check}</div>
                <div style={{ marginTop: 'auto', fontFamily: t.mono, fontSize: 11, lineHeight: 1.4, color: ink.ravenclaw }}>
                  else {fail.replaceAll('_', '_​')}
                </div>
              </div>
            </Scroll>
            <Link delay={0.7 + i * 0.22} />
          </div>
        ))}
        <Scroll delay={1.7} glow="rgba(253,115,102,0.3)" style={{ flex: '1 1 0', minWidth: 0 }} pad="18px 18px">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, minHeight: 170 }}>
            <Seal color={houses.gryffindor.main} Icon={Send} size={54} />
            <div style={{ ...cardTitle }}>One reply</div>
            <div style={{ fontFamily: t.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.24em', color: ink.gryffindor }}>SENT</div>
          </div>
        </Scroll>
      </div>
    </Plain>
  )
}

// ── the castle gates: pre-classification checks ─────────────────

const AT_DOOR = [
  { Icon: KeyRound, gate: 'Licence', note: 'AI auto-reply or auto-actions' },
  { Icon: UserCheck, gate: 'From a customer', note: 'sender is a customer contact' },
  { Icon: CopyCheck, gate: 'Not already sorted', note: 'each email is sorted once' },
]

const TURNED_AWAY = [
  { Icon: Contact, gate: 'Known customer', code: 'DROPPED_INELIGIBLE' },
  { Icon: Repeat, gate: 'No echo loop', code: 'DROPPED_LOOP' },
  { Icon: Bot, gate: 'Not a robot', code: 'DROPPED_HEADER' },
  { Icon: DoorOpen, gate: 'Someone may act', code: 'DROPPED_INELIGIBLE' },
  { Icon: History, gate: 'Not from the past', code: 'DROPPED_HISTORICAL' },
  { Icon: Clock, gate: 'Fresh: under 24 hours', code: 'DROPPED_STALE' },
]

function GateRow({ n, Icon, gate, right, delay, last }) {
  return (
    <motion.div {...rise(delay, 6)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: last ? 'none' : `1px dashed ${t.parchmentMuted}55` }}>
      <span style={{ ...numeral, width: 18, textAlign: 'right' }}>{n}</span>
      <Icon size={18} color="#8a6410" strokeWidth={1.6} />
      <span style={{ ...cardTitle, fontSize: 'clamp(14px, 1.15vw, 18px)', flex: 1 }}>{gate}</span>
      {right}
    </motion.div>
  )
}

export function Gates() {
  return (
    <Plain eyebrow="Before the Hat" title="The castle gates"
      sub="Most owls never reach the Hat. The gates are free; the Hat costs galleons."
      foot="We only wake the Hat when someone is actually allowed to act.">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Scroll delay={0.4} style={{ flex: '1 1 0', minWidth: 0 }} pad="16px 22px">
          <div style={{ ...cardHand, marginBottom: 6 }}>At the door: ignored silently, nothing recorded</div>
          {AT_DOOR.map((g, i) => (
            <GateRow key={g.gate} n={i + 1} {...g} delay={0.8 + i * 0.12} last={i === AT_DOOR.length - 1}
              right={<span style={{ ...cardHand, fontSize: 'clamp(13px, 1vw, 16px)', color: '#6b5232' }}>{g.note}</span>} />
          ))}
        </Scroll>
        <Link delay={1.2} />
        <Scroll delay={1.0} style={{ flex: '1.25 1 0', minWidth: 0 }} pad="16px 22px">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <img src={houses.slytherin.crest} alt="" style={{ width: 26 }} />
            <span style={{ ...cardHand }}>Turned away to Slytherin, recorded with the reason</span>
          </div>
          {TURNED_AWAY.map((g, i) => (
            <GateRow key={g.gate} n={i + 4} {...g} delay={1.4 + i * 0.12} last={i === TURNED_AWAY.length - 1}
              right={<span style={{ fontFamily: t.mono, fontSize: 'clamp(10px, 0.8vw, 12px)', color: ink.slytherin }}>{g.code}</span>} />
          ))}
        </Scroll>
        <Link delay={2.2} />
        <Scroll delay={2.1} glow="rgba(241,210,122,0.3)" style={{ flex: '0.7 1 0', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, minHeight: 230, justifyContent: 'center' }}>
            <Seal color="#8a6410" Icon={WandSparkles} size={58} />
            <div style={cardTitle}>The Sorting Hat</div>
            <div style={cardBody}>One LLM call</div>
            <div style={{ fontFamily: t.mono, fontSize: 13, color: '#8a6410' }}>~$0.019</div>
          </div>
        </Scroll>
      </div>
    </Plain>
  )
}

// ── who may the Hat act for? (the actions email source) ──────────

function Door({ label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0' }}>
      <span style={{ width: 26, height: 26, borderRadius: 6, background: '#8a6410', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={17} color="#f6ead0" strokeWidth={3} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ ...cardTitle, fontSize: 'clamp(16px, 1.35vw, 22px)' }}>{label}</span>
        <span style={{ ...cardHand, color: '#6b5232' }}>{sub}</span>
      </div>
    </div>
  )
}

const RULES = [
  { Icon: ListChecks, rule: 'Actions only', note: 'PTPs and disputes. Never replies.' },
  { Icon: Mails, rule: 'Matched on To or CC', note: 'any recipient that opens a door' },
  { Icon: Crown, rule: 'Both match? The AR mailbox wins', code: 'qualified_by = AR_EMAIL', note: 'actions are still created once' },
]

export function Doors() {
  return (
    <Plain eyebrow="AI actions" title="Who may the Hat act for?" sub="The headmaster opens the doors on the AI Controls page.">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Scroll delay={0.4} style={{ flex: '0.9 1 0', minWidth: 0 }}>
          <div style={{ ...numeral, marginBottom: 4 }}>AI ACTIONS EMAIL SOURCE</div>
          <Door label="AR mailbox" sub="owls to the Owlery" />
          <div style={{ height: 1, background: `${t.parchmentMuted}55` }} />
          <Door label="Growfin users" sub="owls straight to a collector" />
          <div style={{ ...cardHand, marginTop: 8 }}>Both ticked means Both</div>
        </Scroll>
        <Link delay={0.9} />
        <Scroll delay={0.8} style={{ flex: '1.2 1 0', minWidth: 0 }} pad="16px 24px">
          {RULES.map(({ Icon, rule, code, note }, i) => (
            <motion.div key={rule} {...rise(1.2 + i * 0.2, 6)}
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '11px 0', borderTop: i ? `1px dashed ${t.parchmentMuted}55` : 'none' }}>
              <Icon size={20} color="#8a6410" strokeWidth={1.6} style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ ...cardTitle, fontSize: 'clamp(15px, 1.3vw, 21px)' }}>{rule}</span>
                {code && <span style={{ fontFamily: t.mono, fontSize: 12, color: '#8a6410' }}>{code}<span style={{ color: t.parchmentMuted }}>, otherwise GROWFIN_USER</span></span>}
                <span style={{ ...cardHand, color: '#6b5232' }}>{note}</span>
              </div>
            </motion.div>
          ))}
        </Scroll>
        <Link delay={1.9} />
        <Scroll delay={1.8} glow="rgba(253,192,85,0.28)" style={{ flex: '0.9 1 0', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
            <img src={houses.hufflepuff.crest} alt="" style={{ width: 'clamp(60px, 5vw, 84px)' }} />
            <div style={{ ...cardHand, color: '#6b5232' }}>A customer replies to their collector</div>
            <div style={{ ...cardTitle, fontSize: 'clamp(15px, 1.3vw, 21px)' }}>Growfin users door</div>
            <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: ink.hufflepuff }}>ACTIONED</div>
            <div style={cardBody}>Two PTPs by AI Assistant</div>
            <div style={{ ...cardHand }}>No reply</div>
          </div>
        </Scroll>
      </div>
    </Plain>
  )
}
