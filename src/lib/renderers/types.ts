/**
 * Options for rendering JSON values, including lazy rendering configuration.
 */
export type RenderOptions = {
  /**
   * If set, collections with size >= threshold will render lazily.
   * Children are deferred until the collection is expanded.
   * Default: undefined (eager rendering).
   */
  lazyThreshold?: number

  /**
   * Optional callback for custom expansion behavior.
   * If not provided, a default click handler will be used.
   */
  onDemandRender?: (entry: HTMLSpanElement, populate: () => void) => void
}
