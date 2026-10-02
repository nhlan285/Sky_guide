import { useLocale } from '../../shared/i18n/useLocale'
import { ConstellationScene } from './ConstellationScene'
import { SkyControls } from './SkyControls'

export function ConstellationLanding() {
  const { t } = useLocale()
  return <div className="constellation-landing">
    <div className="landing-toolbar"><span className="landing-signature">Sky Guide</span><SkyControls /></div>
    <ConstellationScene />
    <p className="landing-disclosure">{t('landing.note')}</p>
  </div>
}
