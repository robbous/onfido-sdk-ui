import { h, createContext, FunctionComponent, ComponentType, VNode } from 'preact'
import { parseTags } from '~utils/index'
import initializePolyglot from './polyglot'

import type { SupportedLanguages, LocaleConfig } from '~types/locales'

type TranslatedTagParser = (key: string, handler: (text: string) => ChildNode) => ChildNode[]

type ProviderProps = {
  language: SupportedLanguages | LocaleConfig
  children: VNode
}

export const LocaleProvider: FunctionComponent<ProviderProps> = ({ language, children }) => {
  const polyglot = initializePolyglot(language)
  const translate = polyglot.t.bind(polyglot)
  const parseTranslatedTags: TranslatedTagParser = (key, handler) => parseTags(translate(key), handler)

  return (
    <LocaleContext.Provider value={{language: polyglot.currentLocale, translate, parseTranslatedTags}}>
      {children}
    </LocaleContext.Provider>
  )
}

export type LocalisedType = {
  language: SupportedLanguages
  parseTranslatedTags: TranslatedTagParser
  translate: (key: string, options?: Record<string, unknown>) => string
}

const LocaleContext = createContext<LocalisedType>(null)

export const localised = <P extends LocalisedType>(WrappedComponent: ComponentType<P>): ComponentType<P> => {
  const LocalisedComponent: FunctionComponent<P> = (props) => (
    <LocaleContext.Consumer>
      {(injectedProps) => <WrappedComponent {...props} {...injectedProps} />}
    </LocaleContext.Consumer>
  )

  return LocalisedComponent
}