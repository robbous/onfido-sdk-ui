import { h, FunctionComponent } from 'preact'
import { memo } from 'preact/compat'

import { useLocales } from '~locales'
import { ToggleFullScreen } from '../FullScreen'
import DocumentOverlay from '../Overlay/DocumentOverlay'
import style from './style.scss'

import type { CaptureFlows } from '~types/docVideo'
import type { DocumentTypes } from '~types/steps'

export type Props = {
  documentType: DocumentTypes
  onSelectFlow: (
    captureFlow: Extract<CaptureFlows, 'cardId' | 'paperId'>
  ) => void
}

const TITLE_KEY_BY_DOCUMENT_TYPE: Partial<Record<DocumentTypes, string>> = {
  driving_licence: 'doc_video_capture.paper_id_flow_selector.title_license',
  national_identity_card: 'doc_video_capture.paper_id_flow_selector.title_id',
}

const PaperIdFlowSelector: FunctionComponent<Props> = ({
  documentType,
  onSelectFlow,
}) => {
  const { translate } = useLocales()

  const { [documentType]: titleKey } = TITLE_KEY_BY_DOCUMENT_TYPE

  if (!titleKey) {
    return null
  }

  return (
    <div className={style.paperIdFlowSelector}>
      <DocumentOverlay marginBottom={0.5} />
      <ToggleFullScreen />
      <div className={style.footer}>
        <span className={style.title}>{translate(titleKey)}</span>
        <button className={style.cardId} onClick={() => onSelectFlow('cardId')}>
          {translate('doc_video_capture.paper_id_flow_selector.button_card')}
        </button>
        <button
          className={style.paperId}
          onClick={() => onSelectFlow('paperId')}
        >
          {translate('doc_video_capture.paper_id_flow_selector.button_paper')}
        </button>
      </div>
    </div>
  )
}

export default memo(PaperIdFlowSelector)