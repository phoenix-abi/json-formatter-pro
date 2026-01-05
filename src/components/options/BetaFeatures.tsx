import { h } from 'preact'
import { Toggle } from '../Toggle'

export interface BetaFeaturesProps {
  rolloutPercentage: number
  betaEnrollment: boolean
  onBetaEnrollmentChange: (enabled: boolean) => void
}

/**
 * Beta features section for gradual rollout controls
 */
export function BetaFeatures({
  rolloutPercentage,
  betaEnrollment,
  onBetaEnrollmentChange,
}: BetaFeaturesProps) {
  // ExactJSON is now fully rolled out (100%), so hide the beta UI
  // Keep the component structure for future beta features
  if (rolloutPercentage >= 100) {
    return null
  }

  return h(
    'div',
    { className: 'settings-group', id: 'beta-features-group' },
    h('h3', null, '🚀 Beta Features'),
    h('p', { className: 'description' }, 'Try new features before they roll out to everyone'),

    // Beta notice
    h(
      'div',
      { className: 'beta-notice' },
      h(
        'p',
        null,
        h('strong', null, 'ExactJSON Beta:'),
        ' We\'re gradually rolling out ExactJSON to users. You can enroll in the beta to try it early, or opt out if you experience issues.'
      ),
      h(
        'p',
        { className: 'rollout-status' },
        'Current rollout: ',
        h('span', { id: 'rollout-percentage' }, String(rolloutPercentage)),
        '%'
      )
    ),

    // Beta enrollment toggle
    h('div', { className: 'beta-toggle-container' },
      h(Toggle, {
        label: 'ExactJSON Beta',
        checked: betaEnrollment,
        onChange: onBetaEnrollmentChange,
        ariaLabel: `ExactJSON Beta ${betaEnrollment ? 'enabled' : 'disabled'}`,
      }),
      h(
        'p',
        { className: 'help-text' },
        betaEnrollment
          ? '✨ Enabled - Using ExactJSON with lossless number handling and key order preservation.'
          : 'Disabled - Using the fast native parser (JSON.parse).'
      )
    ),

    // Beta info
    h(
      'div',
      { className: 'beta-info' },
      h(
        'p',
        null,
        h(
          'small',
          null,
          h('strong', null, 'Note:'),
          ' Once ExactJSON reaches 100% rollout, this toggle will be removed and ExactJSON will become the default.'
        )
      )
    )
  )
}
