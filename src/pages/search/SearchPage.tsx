import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { CodeExplainer } from '../../components/CodeExplainer'
import { PageLayout } from '../../components/PageLayout'
import { findByCode, spaces, towerPlot, underground, type Plot, type Space, type UndergroundAsset } from '../../data'
import { LEVELS } from '../../data/tower'
import { depthRange, heightRange, levelName, num, spaceName } from '../../lib/format'
import { lookup, type Lookup, type Mark } from '../../lib/lookup'
import { sitePlace, useLocalData } from '../../i18n/localData'
import { useDemoState } from '../../state/demo'
import s from './SearchPage.module.css'

// Search land records: one box for a plot number, a ULPIN or a 3D-ULPIN. A 3D-ULPIN with a typing
// mistake is caught by its check character, and the wrong part is marked.

const FLAT_502 = spaces.find((sp) => sp.kind === 'flat' && sp.number === '502')!
/** Flat 502 with the two floor digits swapped (05 typed as 50): a typical typing mistake. */
const TYPO_EXAMPLE = FLAT_502.code.replace('-U105', '-U150')
const LEAF = new Set(['U', 'L', 'P', 'C'])
const LEVEL_ORDER = [...LEVELS.map((l) => l.level)].reverse()

export function SearchPage() {
  const { t } = useTranslation()
  const { towerRegistered } = useDemoState()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [text, setText] = useState(q)
  const [lastQ, setLastQ] = useState(q)
  // Follow the URL when it changes from outside the box (a link, the back button).
  if (q !== lastQ) {
    setLastQ(q)
    setText(q)
  }
  const search = (value: string) => setParams(value.trim() ? { q: value.trim() } : {})
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    search(text)
  }
  const result = lookup(q, towerRegistered)

  return (
    <PageLayout title={t('search.title')} intro={t('search.intro')}>
      <form className={s.form} role="search" onSubmit={onSubmit}>
        <label htmlFor="search-box" className={s.label}>
          {t('search.label')}
        </label>
        <div className={s.box}>
          <input
            id="search-box"
            className={s.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('search.placeholder')}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={s.submit}>
            {t('search.submit')}
          </button>
        </div>
        <p className={s.examples}>
          <span>{t('search.try')}</span>
          <button type="button" onClick={() => search(`CTS ${towerPlot.cts}`)}>
            CTS {towerPlot.cts}
          </button>
          <button type="button" onClick={() => search(FLAT_502.code)}>
            {spaceName(t, FLAT_502)}
          </button>
          <button type="button" onClick={() => search(underground[0].code)}>
            {t(`underground.${underground[0].key}`)}
          </button>
          <button type="button" onClick={() => search(TYPO_EXAMPLE)}>
            {t('search.typoExample')}
          </button>
        </p>
      </form>

      <div className={s.result} aria-live="polite">
        <Result result={result} search={search} />
      </div>
    </PageLayout>
  )
}

function Result({ result, search }: { result: Lookup; search: (q: string) => void }) {
  const { t } = useTranslation()
  switch (result.kind) {
    case 'empty':
      return (
        <section className={s.explainCard}>
          <h2 className={s.subhead}>{t('search.emptyTitle')}</h2>
          <CodeExplainer code={FLAT_502.code} />
          <p className={s.hint}>{t('search.emptyText')}</p>
        </section>
      )
    case 'plot':
      return <PlotResult plot={result.plot} />
    case 'space':
      return <SpaceResult space={result.space} />
    case 'line':
      return <LineResult line={result.line} />
    case 'network':
      return (
        <section className={s.card}>
          <p className={s.eyebrow}>{t('search.networkRoot')}</p>
          <h2 className={s.title}>{result.root}</h2>
          <ul className={s.lines}>
            {result.lines.map((u) => (
              <li key={u.code}>
                <Link to={`/search?q=${u.code}`}>{t(`underground.${u.key}`)}</Link>
                <CodeChip code={u.code} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )
    case 'not-issued':
      return (
        <>
          <section className={`${s.card} ${s.notice}`}>
            <h2 className={s.title}>{t('search.notIssuedTitle')}</h2>
            <p className={s.text}>{t('search.notIssuedText', { cts: towerPlot.cts })}</p>
            <Link to={`/register?plot=${towerPlot.cts}`} className={s.primary}>
              {t('plot.register')}
            </Link>
          </section>
          <Explained code={result.space.code} />
        </>
      )
    case 'unknown-code':
      return (
        <>
          <section className={`${s.card} ${s.notice}`}>
            <h2 className={s.title}>{t('search.unknownCodeTitle')}</h2>
            <p className={s.text}>{t('search.unknownCodeText')}</p>
          </section>
          <Explained code={result.code} />
        </>
      )
    case 'typo':
      return (
        <section className={`${s.card} ${s.error}`}>
          <h2 className={s.title}>{t('search.typoTitle')}</h2>
          <MarkedCode text={result.typed} marks={result.marks} />
          <p className={s.text}>{result.marks.length ? t('search.typoMarked') : t('search.typoUnmarked')}</p>
          {result.suggestions.length > 0 && (
            <>
              <p className={s.didYouMean}>{t('search.didYouMean')}</p>
              <ul className={s.suggestions}>
                {result.suggestions.map((code) => (
                  <li key={code}>
                    <button type="button" onClick={() => search(code)}>
                      <span>{nameOf(t, code)}</span>
                      <CodeChip code={code} size="md" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )
    case 'format':
      return (
        <section className={`${s.card} ${s.error}`}>
          <h2 className={s.title}>{t('search.formatTitle')}</h2>
          <MarkedCode text={result.typed} marks={[result.mark]} />
          <p className={s.text}>{t(`search.formatParts.${result.part}`)}</p>
          <p className={s.hint}>{t('search.formatHint')}</p>
        </section>
      )
    case 'unknown-ulpin':
      return (
        <section className={`${s.card} ${s.notice}`}>
          <h2 className={s.title}>{t('search.unknownUlpinTitle')}</h2>
          <p className={s.text}>{t('search.unknownUlpinText', { ulpin: result.ulpin })}</p>
          {result.suggestions.length > 0 && (
            <p className={s.text}>
              {t('search.didYouMean')}{' '}
              {result.suggestions.map((p) => (
                <button key={p.cts} type="button" className={s.link} onClick={() => search(p.ulpin)}>
                  {t('plot.title', { cts: p.cts })} ({p.ulpin})
                </button>
              ))}
            </p>
          )}
        </section>
      )
    case 'none':
      return (
        <section className={`${s.card} ${s.notice}`}>
          <h2 className={s.title}>{t('search.noneTitle', { q: result.query })}</h2>
          <p className={s.text}>{t('search.noneText')}</p>
        </section>
      )
  }
}

/** The name of whatever a code belongs to: a space or an underground line. */
function nameOf(t: ReturnType<typeof useTranslation>['t'], code: string) {
  const found = findByCode(code)
  if (!found) return code
  return 'type' in found ? spaceName(t, found) : t(`underground.${found.key}`)
}

/** The typed code with the wrong characters marked. */
function MarkedCode({ text, marks }: { text: string; marks: Mark[] }) {
  const marked = (i: number) => marks.some((m) => i >= m.start && i < m.end)
  const extra = Math.max(0, ...marks.map((m) => m.end)) - text.length
  return (
    <p className={s.marked} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className={marked(i) ? s.wrong : undefined}>
          {ch}
        </span>
      ))}
      {extra > 0 && <span className={`${s.wrong} ${s.missing}`}>{'_'.repeat(extra)}</span>}
    </p>
  )
}

function Explained({ code }: { code: string }) {
  const { t } = useTranslation()
  return (
    <section className={s.explainCard}>
      <h3 className={s.subhead}>{t('search.explainTitle')}</h3>
      <CodeExplainer code={code} />
    </section>
  )
}

function PlotResult({ plot }: { plot: Plot }) {
  const { t, i18n } = useTranslation()
  const ld = useLocalData()
  const { towerRegistered } = useDemoState()
  const lang = i18n.language
  const issued = plot.hasTower && towerRegistered
  const leaves = spaces.filter((sp) => LEAF.has(sp.type))
  const below = underground.filter((u) => u.underPlots.includes(plot.cts))

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <div>
          <p className={s.eyebrow}>{t('types.S')}</p>
          <h2 className={s.title}>{t('plot.title', { cts: plot.cts })}</h2>
          <p className={s.place}>
            {sitePlace(ld)}
          </p>
        </div>
        <Link to={`/map?plot=${plot.cts}${issued ? '&view=3d' : ''}`} className={s.secondary}>
          {t('search.showOnMap')}
        </Link>
      </div>

      <dl className={s.facts}>
        <dt>{t('plot.ulpin')}</dt>
        <dd className={s.mono}>{plot.ulpin}</dd>
        <dt>{t('plot.area')}</dt>
        <dd>{num(lang, plot.areaM2, 0)} m²</dd>
        <dt>{t('plot.restrictions')}</dt>
        <dd>
          {below.length === 0
            ? t('plot.noRestrictions')
            : below.map((u) => (
                <span key={u.code} className={s.block}>
                  {t(`rights.${plot.restrictions.find((r) => r.segmentCode === u.code)?.kind ?? 'right-of-user'}`)}:{' '}
                  <Link to={`/search?q=${u.code}`}>{t(`underground.${u.key}`)}</Link>
                  <span className={s.muted}>, {depthRange(t, lang, u)}</span>
                </span>
              ))}
        </dd>
      </dl>

      {plot.hasTower && !towerRegistered && (
        <div className={s.noticeBox}>
          <p>{t('search.towerNotIssued')}</p>
          <Link to={`/register?plot=${plot.cts}`} className={s.primary}>
            {t('plot.register')}
          </Link>
        </div>
      )}
      {!plot.hasTower && <p className={s.muted}>{t('plot.noCodes')}</p>}

      {issued && (
        <>
          <h3 className={s.subhead}>
            {t('plot.spaces')} <span className={s.count}>{t('plot.spaceCount', { count: leaves.length })}</span>
          </h3>
          <div className={s.levels}>
            {[...LEVEL_ORDER, 'XX' as const].map((level) => {
              const here: Space[] = leaves.filter((sp) => sp.level === level)
              if (!here.length) return null
              return (
                <div key={level} className={s.level}>
                  <p className={s.levelName}>{levelName(t, level)}</p>
                  <ul className={s.levelSpaces}>
                    {here.map((sp) => (
                      <li key={sp.code}>
                        <Link to={`/card/${sp.code}`} title={sp.code}>
                          <span className={s.swatch} style={{ background: `var(--type-${sp.type.toLowerCase()})` }} />
                          {spaceName(t, sp)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function SpaceResult({ space }: { space: Space }) {
  const { t, i18n } = useTranslation()
  const ld = useLocalData()
  const lang = i18n.language
  return (
    <>
      <section className={s.card}>
        <div className={s.cardHead}>
          <div>
            <p className={s.eyebrow}>
              <span className={s.swatch} style={{ background: `var(--type-${space.type.toLowerCase()})` }} />
              {t(`types.${space.type}`)}
            </p>
            <h2 className={s.title}>{spaceName(t, space)}</h2>
          </div>
          <div className={s.buttons}>
            <Link to={`/card/${space.code}`} className={s.primary}>
              {t('details.openCard')}
            </Link>
            <Link to={`/map?code=${space.code}`} className={s.secondary}>
              {t('search.showOnMap')}
            </Link>
          </div>
        </div>
        <dl className={s.facts}>
          <dt>{t('search.plot')}</dt>
          <dd>
            <Link to={`/search?q=CTS ${towerPlot.cts}`}>{t('plot.title', { cts: towerPlot.cts })}</Link>
            <span className={s.muted}>, {towerPlot.ulpin}</span>
          </dd>
          <dt>{t('details.level')}</dt>
          <dd>{levelName(t, space.level)}</dd>
          <dt>{t('details.height')}</dt>
          <dd>{heightRange(t, lang, space)}</dd>
          <dt>{t('details.floorArea')}</dt>
          <dd>{num(lang, space.floorAreaM2)} m²</dd>
          {space.holder && (
            <>
              <dt>{t('details.holder')}</dt>
              <dd>{ld(space.holder)}</dd>
            </>
          )}
        </dl>
      </section>
      <Explained code={space.code} />
    </>
  )
}

function LineResult({ line }: { line: UndergroundAsset }) {
  const { t, i18n } = useTranslation()
  const ld = useLocalData()
  const lang = i18n.language
  return (
    <>
      <section className={s.card}>
        <div className={s.cardHead}>
          <div>
            <p className={s.eyebrow}>
              <span className={s.swatch} style={{ background: 'var(--type-g)' }} />
              {t('types.G')}
            </p>
            <h2 className={s.title}>{t(`underground.${line.key}`)}</h2>
          </div>
          <div className={s.buttons}>
            <Link to={`/card/${line.code}`} className={s.primary}>
              {t('details.openCard')}
            </Link>
            <Link to={`/map?code=${line.code}`} className={s.secondary}>
              {t('search.showOnMap')}
            </Link>
          </div>
        </div>
        <dl className={s.facts}>
          <dt>{t('details.depth')}</dt>
          <dd>{depthRange(t, lang, line)}</dd>
          <dt>{t('details.runsUnder')}</dt>
          <dd>
            {line.underPlots.map((cts, i) => (
              <span key={cts}>
                {i > 0 && ', '}
                <Link to={`/search?q=CTS ${cts}`}>{t('plot.title', { cts })}</Link>
              </span>
            ))}
          </dd>
          <dt>{t('details.holder')}</dt>
          <dd>{ld(line.rights[0]?.holder ?? '')}</dd>
        </dl>
      </section>
      <Explained code={line.code} />
    </>
  )
}
