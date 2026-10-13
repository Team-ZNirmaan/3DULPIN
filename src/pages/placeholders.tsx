import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '../components/PageLayout'
import s from './placeholders.module.css'

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
