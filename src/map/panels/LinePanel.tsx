import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CodeChip } from '../../components/CodeChip'
import type { UndergroundAsset } from '../../data'
import { depthRange, heightRange, lineLength, num } from '../../lib/format'
import { RightsList } from './RightsList'
import s from './Panels.module.css'

type Props = {
  line: UndergroundAsset
  onClose: () => void
  onSelectPlot: (cts: string) => void
}

/** Details of an underground line (a metro tunnel or the water main) as a 3D space of its own. */
export function LinePanel({ line, onClose, onSelectPlot }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <section className={`${s.panel} ${s.right}`} aria-labelledby="space-title">
      <header className={s.head}>
        <div>
          <p className={s.eyebrow}>
            <span className={s.swatch} style={{ background: 'var(--type-g)' }} />
            {t('types.G')}
          </p>
          <h2 id="space-title" className={s.title}>
            {t(`underground.${line.key}`)}
          </h2>
        </div>
        <button type="button" className={s.close} onClick={onClose} aria-label={t('details.close')}>
          ×
        </button>
      </header>

      <CodeChip code={line.code} size="md" />

      <dl className={s.facts}>
        <dt>{t('details.depth')}</dt>
        <dd>{depthRange(t, lang, line)}</dd>
        <dt>{t('details.height')}</dt>
        <dd>{heightRange(t, lang, { zBottom: -(line.axisDepthM + line.radiusM), zTop: -(line.axisDepthM - line.radiusM) })}</dd>
        <dt>{t('details.diameter')}</dt>
        <dd>{num(lang, line.radiusM * 2, 2)} m</dd>
        <dt>{t('details.length')}</dt>
        <dd>{num(lang, lineLength(line), 0)} m</dd>
        <dt>{t('details.runsUnder')}</dt>
        <dd className={s.plotLinks}>
          {line.underPlots.map((cts) => (
            <button key={cts} type="button" className={s.linkButton} onClick={() => onSelectPlot(cts)}>
              {t('plot.title', { cts })}
            </button>
          ))}
        </dd>
      </dl>

      <RightsList rights={line.rights} />

      <Link to={`/card/${line.code}`} className={s.primary}>
        {t('details.openCard')}
      </Link>
    </section>
  )
}
