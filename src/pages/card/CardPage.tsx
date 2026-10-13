import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import { QrCode } from '../../components/QrCode'
import { findByCode, SITE, TOWER, towerPlot, underground, type Space, type UndergroundAsset } from '../../data'
import { depthRange, heightRange, levelName, lineLength, num, spaceName } from '../../lib/format'
import { parseCode } from '../../lib/ulpin'
import { useDemoState } from '../../state/demo'
import { RightsList } from '../../map/panels/RightsList'
import { TowerDrawing } from './TowerDrawing'
import s from './CardPage.module.css'

// The 3D property card: the record of one 3D space, laid out like a property card. It opens from the
// map, from Search, and from its QR code.

/** The address of this card, for the QR code. */
const cardUrl = (code: string) => `${window.location.origin}${window.location.pathname}#/card/${code}`

export function CardPage() {
  const { t } = useTranslation()
  const { towerRegistered } = useDemoState()
  const { code: raw = '' } = useParams()
  const parsed = parseCode(raw)
  const code = parsed.ok ? parsed.parts.code : raw
  const found = parsed.ok ? findByCode(code) : undefined

  if (!found) {
    return (
      <Shell>
        <section className={`${s.sheet} ${s.message}`}>
          <h1 className={s.messageTitle}>{t('card.notFoundTitle')}</h1>
          <p className={s.code}>{raw}</p>
          <p className={s.messageText}>{t('card.notFoundText')}</p>
          <Link to={`/search?q=${encodeURIComponent(raw)}`} className={s.primary}>
            {t('card.checkInSearch')}
          </Link>
        </section>
      </Shell>
    )
  }

  if ('type' in found && !towerRegistered) {
    return (
      <Shell>
        <section className={`${s.sheet} ${s.message}`}>
          <h1 className={s.messageTitle}>{t('search.notIssuedTitle')}</h1>
          <CodeChip code={code} size="md" />
          <p className={s.messageText}>{t('search.notIssuedText', { cts: towerPlot.cts })}</p>
          <Link to={`/register?plot=${towerPlot.cts}`} className={s.primary}>
            {t('plot.register')}
          </Link>
        </section>
      </Shell>
    )
  }

  return <Shell>{'type' in found ? <SpaceCard space={found} /> : <LineCard line={found} />}</Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.page}>
      <div className={s.inner}>{children}</div>
    </div>
  )
}

/** The top of the card: what it is, the space's name, and its 3D-ULPIN. */
function Head({ type, name, sub, code }: { type: string; name: string; sub: string; code: string }) {
  const { t } = useTranslation()
  return (
    <header className={s.head}>
      <div className={s.headTop}>
        <p className={s.kicker}>{t('card.title')}</p>
        <p className={s.issuer}>{t('card.issuer')}</p>
      </div>
      <div className={s.headMain}>
        <div>
          <p className={s.type}>
            <span className={s.swatch} style={{ background: `var(--type-${type.toLowerCase()})` }} />
            {t(`types.${type}`)}
          </p>
          <h1 className={s.name}>{name}</h1>
          <p className={s.sub}>{sub}</p>
        </div>
        <div className={s.codeBox}>
          <span className={s.codeLabel}>{t('card.codeLabel')}</span>
          <CodeChip code={code} size="lg" />
        </div>
      </div>
    </header>
  )
}

function Side({ code, drawing, caption, mapLink }: { code: string; drawing: React.ReactNode; caption: string; mapLink: string }) {
  const { t } = useTranslation()
  return (
    <aside className={s.side}>
      <figure className={s.drawing}>
        {drawing}
        <figcaption>{caption}</figcaption>
      </figure>
      <div className={s.qr}>
        <QrCode text={cardUrl(code)} label={t('card.qrLabel')} />
        <p>{t('card.qrText')}</p>
      </div>
      <Link to={mapLink} className={s.secondary}>
        {t('search.showOnMap')}
      </Link>
    </aside>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

function SpaceCard({ space }: { space: Space }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const name = spaceName(t, space)
  const linked = (c: string) => findByCode(c) as Space | undefined
  const below = underground.filter((u) => u.underPlots.includes(towerPlot.cts))

  return (
    <article className={s.sheet}>
      <Head type={space.type} name={name} sub={`${TOWER.name}, ${t('plot.title', { cts: towerPlot.cts })}`} code={space.code} />
      <div className={s.body}>
        <div className={s.main}>
          <section>
            <h2 className={s.section}>{t('card.location')}</h2>
            <dl className={s.fields}>
              <Row label={t('card.address')}>
                {name}, {TOWER.name}, {TOWER.road}, {t('map.place')} {SITE.pincode}
              </Row>
              <Row label={t('card.village')}>
                {SITE.village}, {SITE.taluka}, {SITE.district}
              </Row>
              <Row label={t('card.plot')}>{t('plot.title', { cts: towerPlot.cts })}</Row>
              <Row label={t('card.parentUlpin')}>
                <span className={s.mono}>{towerPlot.ulpin}</span>
              </Row>
              <Row label={t('card.building')}>{TOWER.name}</Row>
              <Row label={t('details.level')}>{levelName(t, space.level)}</Row>
              <Row label={t('details.height')}>{heightRange(t, lang, space)}</Row>
            </dl>
          </section>

          <section>
            <h2 className={s.section}>{t('card.area')}</h2>
            <dl className={s.fields}>
              <Row label={t('details.floorArea')}>{num(lang, space.floorAreaM2)} m²</Row>
              {space.carpetAreaM2 !== undefined && <Row label={t('details.carpetArea')}>{num(lang, space.carpetAreaM2)} m²</Row>}
              {space.undividedSharePct !== undefined && <Row label={t('details.share')}>{num(lang, space.undividedSharePct, 3)}%</Row>}
            </dl>
          </section>

          <section>
            <h2 className={s.section}>{t('card.holderSection')}</h2>
            <dl className={s.fields}>
              <Row label={t('details.holder')}>{space.holder ?? space.rights[0]?.holder}</Row>
              {space.type === 'U' && (
                <Row label={t('details.parking')}>
                  {space.parkingCodes?.length
                    ? space.parkingCodes.map((c) => (
                        <Link key={c} to={`/card/${c}`} className={s.link}>
                          {spaceName(t, linked(c)!)}
                        </Link>
                      ))
                    : t('details.noParking')}
                </Row>
              )}
              {space.allottedTo && (
                <Row label={t('details.allottedTo')}>
                  <Link to={`/card/${space.allottedTo}`} className={s.link}>
                    {spaceName(t, linked(space.allottedTo)!)}
                  </Link>
                </Row>
              )}
            </dl>
            <div className={s.rights}>
              <RightsList rights={space.rights} heading={false} />
            </div>
          </section>

          <section>
            <h2 className={s.section}>{t('card.restrictions')}</h2>
            {below.length ? (
              <ul className={s.restrictions}>
                {below.map((u) => (
                  <li key={u.code}>
                    <b>{t(`underground.${u.key}`)}</b>
                    <span>
                      {t(`rights.${u.rights[0].kind}`)}, {u.rights[0].holder}
                    </span>
                    <span>{depthRange(t, lang, u)}</span>
                    <Link to={`/card/${u.code}`} className={s.link}>
                      <CodeChip code={u.code} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.muted}>{t('plot.noRestrictions')}</p>
            )}
          </section>
        </div>

        <Side
          code={space.code}
          drawing={<TowerDrawing space={space} label={t('card.drawingLabel', { name })} />}
          caption={t('card.drawingCaption', { name, level: levelName(t, space.level) })}
          mapLink={`/map?code=${space.code}`}
        />
      </div>
      <p className={s.foot}>{t('card.foot')}</p>
    </article>
  )
}

function LineCard({ line }: { line: UndergroundAsset }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const name = t(`underground.${line.key}`)
  const root = line.code.slice(0, 14)

  return (
    <article className={s.sheet}>
      <Head type="G" name={name} sub={t('card.networkSub', { root })} code={line.code} />
      <div className={s.body}>
        <div className={s.main}>
          <section>
            <h2 className={s.section}>{t('card.location')}</h2>
            <dl className={s.fields}>
              <Row label={t('details.runsUnder')}>
                {line.underPlots.map((cts, i) => (
                  <span key={cts}>
                    {i > 0 && ', '}
                    {t('plot.title', { cts })}
                  </span>
                ))}
              </Row>
              <Row label={t('card.village')}>
                {SITE.village}, {SITE.taluka}, {SITE.district}
              </Row>
              <Row label={t('details.depth')}>{depthRange(t, lang, line)}</Row>
              <Row label={t('details.height')}>{heightRange(t, lang, { zBottom: -(line.axisDepthM + line.radiusM), zTop: -(line.axisDepthM - line.radiusM) })}</Row>
            </dl>
          </section>
          <section>
            <h2 className={s.section}>{t('card.size')}</h2>
            <dl className={s.fields}>
              <Row label={t('details.diameter')}>{num(lang, line.radiusM * 2, 2)} m</Row>
              <Row label={t('details.length')}>{num(lang, lineLength(line), 0)} m</Row>
            </dl>
          </section>
          <section>
            <h2 className={s.section}>{t('details.rights')}</h2>
            <RightsList rights={line.rights} heading={false} />
          </section>
        </div>
        <Side
          code={line.code}
          drawing={<TowerDrawing line={line} label={t('card.drawingLabel', { name })} />}
          caption={t('card.lineCaption', { name, cts: towerPlot.cts })}
          mapLink={`/map?code=${line.code}`}
        />
      </div>
      <p className={s.foot}>{t('card.foot')}</p>
    </article>
  )
}
