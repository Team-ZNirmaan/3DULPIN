import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BeingBuilt, PageLayout } from '../components/PageLayout'
import s from './placeholders.module.css'

// These screens are filled in by later chunks (Register: chunk 5, Search and Card: chunk 6).

export function SearchPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('search.title')} intro={t('search.intro')}>
      <BeingBuilt />
    </PageLayout>
  )
}

export function RegisterPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('register.title')} intro={t('register.intro')}>
      <BeingBuilt />
    </PageLayout>
  )
}

export function CardPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  return (
    <PageLayout title={t('card.title')} intro={t('card.intro')}>
      <BeingBuilt>
        <p className={s.codeRow}>
          <span className={s.codeLabel}>{t('card.codeLabel')}</span>
          <code className={s.code}>{code}</code>
        </p>
      </BeingBuilt>
    </PageLayout>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <PageLayout title={t('notFound.title')}>
      <Link to="/map" className={s.back}>
        {t('notFound.back')}
      </Link>
    </PageLayout>
  )
}
