import * as React from 'react';
import { ScrollablePaneBase } from './ScrollablePane.base';
import { IStyle, ITheme } from '../../Styling';
import { IRefObject, IStyleFunctionOrObject } from '../../Utilities';

/**
 * {@docCategory ScrollablePane}
 */
export interface IScrollablePane {
  /** Triggers a layout update for the pane. */
  forceLayoutUpdate(): void;
  /** Gets the current scroll position of the scrollable pane */
  getScrollPosition(horizontal?: boolean): number;
}

/**
 * {@docCategory ScrollablePane}
 */
export interface IScrollablePaneProps extends React.HTMLAttributes<HTMLElement | ScrollablePaneBase> {
  // export interface IScrollablePaneProps extends React.Props<ScrollablePaneBase> {
  /**
   * Optional callback to access the IScrollablePane interface. Use this instead of ref for accessing
   * the public methods and properties of the component.
   */
  componentRef?: IRefObject<IScrollablePane>;

  /**
   * Call to provide customized styling that will layer on top of the variant rules
   */
  styles?: IStyleFunctionOrObject<IScrollablePaneStyleProps, IScrollablePaneStyles>;

  /**
   * Theme provided by HOC.
   */
  theme?: ITheme;

  /**
   * Additional css class to apply to the ScrollablePane
   * @defaultvalue undefined
   */
  className?: string;

  /**
   * Sets the initial scroll position of the ScrollablePane
   */
  initialScrollPosition?: number;

  scrollbarVisibility?: ScrollbarVisibility;

  /**
   * If true, it replicates actual element instead of keeping placeholder
   * Best Practices: Perf reasons
   */
  notUsePlaceholderForStickyTop?: boolean;

  /**
   * If true, it replicates actual element instead of keeping placeholder
   * Best Practices: Perf reasons
   */
  notUsePlaceholderForStickyBottom?: boolean;

  /**
   * If it is provided, stickies' stickyPosition must not be 'Both'
   */
  stickiesTopBehaviorType?: StickyContainerBehaviorType;

  /**
   * If it is provided, stickies' stickyPosition must not be 'Both'
   */
  stickiesBottomBehaviorType?: StickyContainerBehaviorType;
}

export enum StickyContainerBehaviorType {
  // Perf reasons
  StickyOnScroll = 1,
  /**
   * If it is provided, stickies' stickyPosition must not be 'Both'
   */
  StickyAlways = 2
}

/**
 * {@docCategory ScrollablePane}
 */
export interface IScrollablePaneStyleProps {
  /**
   * Accept theme prop.
   */
  theme: ITheme;

  /**
   * Accept custom classNames
   */
  className?: string;

  scrollbarVisibility?: IScrollablePaneProps['scrollbarVisibility'];

  // Insert ScrollablePane style props below
}

/**
 * {@docCategory ScrollablePane}
 */
export interface IScrollablePaneStyles {
  /**
   * Style set for the root element.
   */
  root: IStyle;
  /**
   * Style set for the stickyAbove element.
   */
  stickyAbove: IStyle;
  /**
   * Style set for the stickyBelow element.
   */
  stickyBelow: IStyle;
  /**
   * Style set for the stickyBelowItems element.
   */
  stickyBelowItems: IStyle;
  /**
   * Style set for the contentContainer element.
   */
  contentContainer: IStyle;
}

/**
 * {@docCategory ScrollablePane}
 */
export const ScrollbarVisibility = {
  auto: 'auto' as 'auto',
  always: 'always' as 'always'
};

/**
 * {@docCategory ScrollablePane}
 */
export type ScrollbarVisibility = typeof ScrollbarVisibility[keyof typeof ScrollbarVisibility];
