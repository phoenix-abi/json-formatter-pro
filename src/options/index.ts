import { render, h } from 'preact'
import { OptionsApp } from '../components/options/OptionsApp'

// Render the OptionsApp component
const root = document.getElementById('app')
if (root) {
  render(h(OptionsApp), root)
}
